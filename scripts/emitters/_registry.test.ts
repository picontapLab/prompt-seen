import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EMITTERS_DIR, loadEmitters } from './_registry';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function emitterDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-emitters-'));
  dirs.push(dir);
  for (const [name, source] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), source);
  return dir;
}

const emitter = (name: string, order?: number) =>
  `export default { name: '${name}', description: '${name}', ${order === undefined ? '' : `order: ${order},`} run() {} };`;

describe('emitter registry (§17.4)', () => {
  it('discovers every emitter file, so a new output is one new file', async () => {
    const dir = emitterDir({
      'feed.ts': emitter('feed'),
      'search.ts': emitter('search'),
      'first.ts': emitter('first', 0),
      '_helpers.ts': 'export const x = 1;',
      'feed.test.ts': 'export default 1;',
    });
    expect((await loadEmitters(dir)).map((e) => e.name)).toEqual(['first', 'feed', 'search']);
  });

  it('rejects files whose default export is not an emitter', async () => {
    const dir = emitterDir({ 'broken.ts': 'export default { name: "broken" };' });
    await expect(loadEmitters(dir)).rejects.toThrow(/broken\.ts: default export must be an Emitter/);
  });

  it('rejects duplicate names', async () => {
    const dir = emitterDir({ 'a.ts': emitter('same'), 'b.ts': emitter('same') });
    await expect(loadEmitters(dir)).rejects.toThrow(/duplicate emitter name "same"/);
  });

  it('loads the repository emitters', async () => {
    const names = (await loadEmitters(EMITTERS_DIR)).map((e) => e.name);
    expect(names[0]).toBe('build-info');
    expect(names).toEqual(expect.arrayContaining(['cloudflare', 'nginx']));
  });
});
