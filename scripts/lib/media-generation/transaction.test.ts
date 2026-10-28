import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { applyChanges, rollbackChanges } from './transaction';

it('restores files after validation fails and preserves edits made after a successful apply', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generation-transaction-'));
  try {
    fs.writeFileSync(path.join(root, 'before.txt'), 'before');
    const journal = path.join(root, 'migration/journal.json');
    const changes = [
      { file: 'before.txt', after: 'after' },
      { file: 'content/examples/x_001/run.yaml', after: 'new' },
    ];
    await expect(
      applyChanges(root, journal, changes, () => {
        throw new Error('Invalid content');
      }),
    ).rejects.toThrow('Invalid content');
    expect(fs.readFileSync(path.join(root, 'before.txt'), 'utf8')).toBe('before');
    expect(fs.existsSync(path.join(root, 'content/examples/x_001'))).toBe(false);
    await applyChanges(root, journal, changes, () => {});
    await applyChanges(root, journal, changes, () => {});
    fs.writeFileSync(path.join(root, 'before.txt'), 'another editor');
    await expect(rollbackChanges(root, journal)).rejects.toThrow(/conflict/);
    expect(fs.readFileSync(path.join(root, 'before.txt'), 'utf8')).toBe('another editor');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
