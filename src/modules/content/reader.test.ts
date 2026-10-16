import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { detailFile, localeIndexFile, manifestFile } from './files';
import { ContentNotBuiltError, createContentReader } from './reader';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-reader-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const write = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(value));
};

describe('content reader', () => {
  it('asks for content:build when nothing is built', () => {
    expect(() => createContentReader(path.join(dir, 'missing')).manifest()).toThrow(ContentNotBuiltError);
  });

  it('reads summaries and detail models, and re-reads after a rebuild', () => {
    write(manifestFile(), { buildId: 'one', locales: ['en'] });
    write(localeIndexFile('en'), { locale: 'en', prompts: [{ id: 'p_001', slug: 'ink' }], templates: [], collections: [], topics: [], pages: [], terms: [] });
    write(detailFile('en', 'prompt', 'p_001'), { id: 'p_001', title: 'Ink' });
    const reader = createContentReader(dir);
    expect(reader.findBySlug('prompt', 'en', 'ink')).toMatchObject({ id: 'p_001' });
    expect(reader.getDetailModel('prompt', 'p_001', 'en')).toMatchObject({ title: 'Ink' });
    expect(reader.getEntry('p_001', 'ja')).toBeNull();
    expect(reader.localeIndex('ja').prompts).toEqual([]);

    write(detailFile('en', 'prompt', 'p_001'), { id: 'p_001', title: 'Ink, revised' });
    const later = new Date(Date.now() + 5000);
    write(manifestFile(), { buildId: 'two', locales: ['en'] });
    fs.utimesSync(path.join(dir, manifestFile()), later, later);
    expect(reader.manifest().buildId).toBe('two');
    expect(reader.getDetailModel('prompt', 'p_001', 'en')).toMatchObject({ title: 'Ink, revised' });
  });
});
