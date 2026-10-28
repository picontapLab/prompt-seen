import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { atomicWrite, digest, hashFile, readJson, within, writeJson } from './files';

export type Change = { file: string; after: string | null };
const journalSchema = z.object({
  phase: z.enum(['applying', 'applied', 'rolling_back', 'rolled_back']),
  entries: z.array(
    z.object({
      file: z.string(),
      before: z.string().nullable(),
      after: z.string().nullable(),
      beforeHash: z.string().nullable(),
      afterHash: z.string().nullable(),
    }),
  ),
});
type Journal = z.infer<typeof journalSchema>;
function currentHash(file: string) {
  return fs.existsSync(file) ? hashFile(file) : null;
}
function removeFile(root: string, file: string) {
  fs.rmSync(file, { force: true });
  let dir = path.dirname(file);
  while (dir !== path.resolve(root) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}
function put(root: string, relative: string, encoded: string | null) {
  const file = within(root, relative);
  if (encoded === null) removeFile(root, file);
  else atomicWrite(file, Buffer.from(encoded, 'base64'));
}
export async function rollbackChanges(root: string, journalFile: string) {
  const journal = journalSchema.parse(readJson(journalFile));
  if (journal.phase === 'rolled_back') return;
  journal.phase = 'rolling_back';
  writeJson(journalFile, journal);
  const conflicts: string[] = [];
  for (const entry of [...journal.entries].reverse()) {
    const hash = currentHash(within(root, entry.file));
    if (hash === entry.beforeHash) continue;
    if (hash !== entry.afterHash) {
      conflicts.push(entry.file);
      continue;
    }
    put(root, entry.file, entry.before);
  }
  if (conflicts.length) throw new Error(`Rollback conflict; preserve external edits: ${conflicts.join(', ')}`);
  journal.phase = 'rolled_back';
  writeJson(journalFile, journal);
}
export async function applyChanges(
  root: string,
  journalFile: string,
  changes: Change[],
  validate: () => void | Promise<void>,
) {
  let journal: Journal;
  if (fs.existsSync(journalFile)) {
    journal = journalSchema.parse(readJson(journalFile));
    if (journal.phase === 'applied') {
      for (const entry of journal.entries)
        if (currentHash(within(root, entry.file)) !== entry.afterHash)
          throw new Error(`Applied content conflict: ${entry.file}`);
      return;
    }
    if (journal.phase === 'rolling_back') throw new Error('Complete the pending rollback before applying');
    const expected = changes.map((c) => ({ file: c.file, after: c.after === null ? null : digest(c.after) }));
    if (JSON.stringify(expected) !== JSON.stringify(journal.entries.map((e) => ({ file: e.file, after: e.afterHash }))))
      throw new Error('Transaction plan differs from saved journal');
  } else {
    if (new Set(changes.map((c) => c.file)).size !== changes.length) throw new Error('Duplicate transaction target');
    journal = {
      phase: 'applying',
      entries: changes.map((change) => {
        const file = within(root, change.file);
        const before = fs.existsSync(file) ? fs.readFileSync(file) : null;
        return {
          file: change.file,
          before: before?.toString('base64') ?? null,
          after: change.after === null ? null : Buffer.from(change.after).toString('base64'),
          beforeHash: before === null ? null : digest(before),
          afterHash: change.after === null ? null : digest(change.after),
        };
      }),
    };
  }
  journal.phase = 'applying';
  writeJson(journalFile, journal);
  try {
    for (const entry of journal.entries) {
      const hash = currentHash(within(root, entry.file));
      if (hash === entry.afterHash) continue;
      if (hash !== entry.beforeHash) throw new Error(`Apply conflict: ${entry.file}`);
      put(root, entry.file, entry.after);
    }
    await validate();
    journal.phase = 'applied';
    writeJson(journalFile, journal);
  } catch (error) {
    try {
      await rollbackChanges(root, journalFile);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Apply failed; rollback requires conflict resolution');
    }
    throw error;
  }
}
