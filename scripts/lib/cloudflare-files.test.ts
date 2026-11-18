import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { shareLocalePayloads } from './cloudflare-files';

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

it('adds only fitting exact aliases, preserving different bytes, existing rules and excess copies', () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-alias-'));
  temporary.push(site);
  const redirects = path.join(site, '_redirects');
  const folder = (slug: string) => `ja/prompts/${slug}/__next.$d$locale.txt`;
  const files = ['a', 'b', 'c', 'd', 'e'].map(folder);
  for (const file of files) {
    fs.mkdirSync(path.join(site, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(site, file), file === folder('c') ? 'different' : 'shared');
  }
  const claimed = `/sub/${folder('b')} /old-target 301`;
  const wildcard = '/other/* /else/:splat 200';
  const previous = Array.from({ length: 1998 }, (_, i) => `/old/${i} /new/${i} 301`);
  fs.writeFileSync(redirects, [...previous, claimed, wildcard, ''].join('\n'));
  expect(shareLocalePayloads(site, '/sub', redirects, files)).toBe(1);
  expect(fs.readFileSync(redirects, 'utf8').split('\n').slice(-4)).toEqual([
    claimed,
    `/sub/${folder('d')} /sub/${folder('a')} 200`,
    wildcard,
    '',
  ]);
  expect(files.filter((file) => !fs.existsSync(path.join(site, file)))).toEqual([folder('d')]);
});
