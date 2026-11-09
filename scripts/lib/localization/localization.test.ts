import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { afterEach, expect, it, vi } from 'vitest';
import { checkLocale } from './check';
import { importTranslations } from './import';
import { templateContractHash } from '../content/template-contract';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
function write(root: string, file: string, value: string) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), value);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-workflow-'));
  roots.push(root);
  write(root, 'content/site.yaml', 'siteName: Test\norigin: https://example.com\nbasePath: ""\n');
  write(
    root,
    'content/locales.yaml',
    YAML.stringify({
      defaultLocale: 'en',
      locales: [
        {
          code: 'en',
          pathPrefix: 'en',
          nativeName: 'English',
          htmlLang: 'en',
          direction: 'ltr',
          enabled: true,
          phase: 1,
        },
        {
          code: 'ja',
          pathPrefix: 'ja',
          nativeName: '日本語',
          htmlLang: 'ja',
          direction: 'ltr',
          enabled: false,
          preview: true,
          phase: 1,
        },
      ],
    }),
  );
  for (const name of ['categories', 'styles', 'use-cases', 'field-groups'])
    write(root, `content/taxonomy/${name}.yaml`, '[]\n');
  write(
    root,
    'content/pages/about/locales/en.mdx',
    '---\ntitle: About\ndescription: About this library.\nstatus: published\nupdatedAt: 2026-01-01\n---\n\n## About\n\nRead and copy prompts.\n',
  );
  write(root, 'src/i18n/messages/en/common.json', JSON.stringify({ copy: 'Copy {name}' }));
  write(root, 'src/i18n/messages/ja/common.json', JSON.stringify({ copy: '{name}をコピー' }));
  return root;
}

it('reports the exact missing message field while retaining the disabled Japanese launch target', () => {
  const root = fixture();
  write(root, 'src/i18n/messages/ja/common.json', '{}');
  const report = checkLocale(root, 'ja');
  expect(report.items.map((item) => item.key)).toEqual(['page/about']);
  expect(report.ready).toBe(false);
  expect(report.blocking).toBe(true);
  expect(report.findings).toContainEqual(
    expect.objectContaining({ code: 'content.invalid', file: 'src/i18n/messages/ja/common.json', field: 'copy' }),
  );
});

async function publishedPage(root: string) {
  const report = checkLocale(root, 'ja');
  const source = report.items[0]!;
  write(
    root,
    'content/pages/about/locales/ja.mdx',
    `---\n${YAML.stringify({ title: 'このサイトについて', description: 'ライブラリの説明。', status: 'published', updatedAt: '2026-01-01', translation: { sourceLocale: 'en', sourceHash: source.sourceHash, reviewStatus: 'reviewed' } })}---\n\n## 使い方\n\nプロンプトをコピーします。\n`,
  );
}

function pageBatch(root: string, title = '使い方とサイトの紹介') {
  const item = checkLocale(root, 'ja').items[0]!;
  return {
    schemaVersion: 1,
    locale: 'ja',
    operations: [
      {
        key: item.key,
        sourceField: ['$page'],
        targetField: ['$page'],
        expectedSourceHash: item.sourceFingerprint,
        expectedTargetHash: item.targetHash,
        translation: { title, description: 'ライブラリの説明。', body: '## 使い方\n\nプロンプトをコピーします。' },
      },
    ],
  };
}

it('preserves a reviewer’s edits to an existing pending candidate instead of overwriting them on retry', async () => {
  const root = fixture();
  await publishedPage(root);
  const batch = pageBatch(root);
  const first = await importTranslations(root, batch, true);
  expect(first.pendingReview).toBe(true);
  const pendingRoot = path.join(root, '.artifacts/localization/ja/pending');
  const pending = path.join(pendingRoot, fs.readdirSync(pendingRoot)[0]!, 'content/pages/about/locales/ja.mdx');
  fs.appendFileSync(pending, '\n審校者が追加した説明。\n');
  await expect(importTranslations(root, batch, true)).rejects.toThrow(/pending.*conflict/i);
  expect(fs.readFileSync(pending, 'utf8')).toContain('審校者が追加した説明。');
});

it('imports a missing page as a draft, is read-only by default, and retries without changing it', async () => {
  const root = fixture();
  const batch = pageBatch(root);
  const before = checkLocale(root, 'ja');
  expect((await importTranslations(root, batch)).conflicts).toEqual([]);
  expect(checkLocale(root, 'ja').items).toEqual(before.items);
  expect(fs.existsSync(path.join(root, '.artifacts'))).toBe(false);
  expect((await importTranslations(root, batch, true)).conflicts).toEqual([]);
  const item = checkLocale(root, 'ja').items[0]!;
  expect(item.pageStatus).toBe('draft');
  expect(item.reviewStatus).toBe('unreviewed');
  expect(fs.readFileSync(path.join(root, item.targetFile), 'utf8')).toContain('reviewStatus: machine-draft');
  expect((await importTranslations(root, batch, true)).changes).toEqual([]);
});

it('rejects stale source and target fingerprints, duplicate operations and status overrides without writing a batch', async () => {
  const root = fixture();
  const batch = pageBatch(root);
  const sourceFile = path.join(root, 'content/pages/about/locales/en.mdx');
  fs.appendFileSync(sourceFile, '\nMore source guidance.\n');
  expect((await importTranslations(root, batch, true)).conflicts).toEqual([
    expect.stringContaining('Source fingerprint changed'),
  ]);
  const current = pageBatch(root);
  expect(
    (await importTranslations(root, { ...current, operations: [...current.operations, ...current.operations] }, true))
      .conflicts,
  ).toEqual([expect.stringContaining('Duplicate operation')]);
  await expect(
    importTranslations(
      root,
      {
        ...current,
        operations: [
          { ...current.operations[0], translation: { ...current.operations[0]!.translation, status: 'published' } },
        ],
      },
      true,
    ),
  ).rejects.toThrow();
  await expect(
    importTranslations(
      root,
      { ...current, operations: [{ ...current.operations[0], expectedTargetHash: undefined }] },
      true,
    ),
  ).rejects.toThrow();
  await importTranslations(root, current, true);
  const stale = {
    ...current,
    operations: [
      { ...current.operations[0]!, translation: { ...current.operations[0]!.translation, title: '別の訳文' } },
    ],
  };
  expect((await importTranslations(root, stale, true)).conflicts).toEqual([
    expect.stringContaining('Target fingerprint changed'),
  ]);
  expect(checkLocale(root, 'ja').items[0]!.pageStatus).toBe('draft');
});

function reviewCurrent(root: string) {
  const report = checkLocale(root, 'ja');
  write(
    root,
    'production/localization/ja/scope.json',
    JSON.stringify({
      schemaVersion: 1,
      locale: 'ja',
      sourceRevision: report.sourceRevision,
      scopeFingerprint: report.scopeFingerprint,
      items: report.items.map((i) => ({ key: i.key, sourceHash: i.sourceFingerprint, dependencies: i.dependencies })),
      fields: report.fields.map((f) => ({
        key: f.key,
        sourceHash: f.sourceHash,
        sourceFile: f.sourceFile,
        sourceField: f.sourceField,
      })),
      removals: [],
    }),
  );
  const records = [
    ...report.items.map((i) => ({ key: i.key, sourceHash: i.sourceFingerprint, targetHash: i.targetHash })),
    ...report.fields.map((f) => ({ key: f.key, sourceHash: f.sourceHash, targetHash: f.targetHash })),
  ].map((record) => ({ ...record, reviewer: 'fixture', completedAt: '2026-01-02T01:00:00Z', conclusion: 'approved' }));
  write(root, 'production/localization/ja/reviews.json', JSON.stringify({ schemaVersion: 1, locale: 'ja', records }));
  return records;
}

it('invalidates only changed prose or message reviews, including independent SEO text and timezone-aware later rejections', async () => {
  const root = fixture();
  await publishedPage(root);
  const records = reviewCurrent(root);
  expect(checkLocale(root, 'ja').ready).toBe(true);
  write(
    root,
    'production/localization/ja/reviews.json',
    JSON.stringify({
      schemaVersion: 1,
      locale: 'ja',
      records: [
        ...records,
        { ...records[0], completedAt: '2026-01-01T20:30:00-08:00', conclusion: 'changes-requested' },
      ],
    }),
  );
  expect(checkLocale(root, 'ja').items[0]!.reviewStatus).toBe('unreviewed');
  reviewCurrent(root);
  write(root, 'src/i18n/messages/en/common.json', JSON.stringify({ copy: 'Copy {name} now' }));
  const messageChange = checkLocale(root, 'ja');
  expect(messageChange.ready).toBe(false);
  expect(messageChange.items[0]!.reviewStatus).toBe('approved');
  expect(messageChange.changes.changedFields).toEqual(['src/i18n/messages/ja/common.json#copy']);
  const source = path.join(root, 'content/pages/about/locales/en.mdx');
  fs.writeFileSync(
    source,
    fs.readFileSync(source, 'utf8').replace('status: published', 'seoTitle: About our library\nstatus: published'),
  );
  const seoChange = checkLocale(root, 'ja');
  expect(seoChange.items[0]!.reviewStatus).toBe('unreviewed');
  expect(seoChange.findings).toContainEqual(expect.objectContaining({ code: 'locale.seo', field: 'seoTitle' }));
});

it('rolls back the entire import after a filesystem failure and can then retry successfully', async () => {
  const root = fixture();
  write(
    root,
    'content/pages/license/locales/en.mdx',
    fs.readFileSync(path.join(root, 'content/pages/about/locales/en.mdx'), 'utf8'),
  );
  const report = checkLocale(root, 'ja');
  const batch = {
    schemaVersion: 1,
    locale: 'ja',
    operations: report.items.map((item) => ({
      key: item.key,
      sourceField: ['$page'],
      targetField: ['$page'],
      expectedSourceHash: item.sourceFingerprint,
      expectedTargetHash: null,
      translation: {
        title: '使い方',
        description: 'ライブラリの説明。',
        body: '## 使い方\n\nプロンプトをコピーします。',
      },
    })),
  };
  const rename = fs.renameSync;
  const secondTarget = path.join(root, 'content/pages/license/locales/ja.mdx');
  const failure = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
    if (to === secondTarget) throw new Error('Injected filesystem failure');
    return rename(from, to);
  });
  try {
    await expect(importTranslations(root, batch, true)).rejects.toThrow('Injected filesystem failure');
  } finally {
    failure.mockRestore();
  }
  expect(checkLocale(root, 'ja').items.map((i) => i.pageStatus)).toEqual(['missing', 'missing']);
  expect((await importTranslations(root, batch, true)).conflicts).toEqual([]);
  expect(checkLocale(root, 'ja').items.map((i) => i.pageStatus)).toEqual(['draft', 'draft']);
});

function figure(root: string) {
  const original = 'media/a_001/original.png';
  const variants = Object.fromEntries(
    ['thumbnail', 'card', 'detail', 'og'].map((name) => [
      name,
      { key: `media/a_001/${name}.webp`, width: 32, height: 32, mimeType: 'image/webp' },
    ]),
  );
  for (const key of [original, ...Object.values(variants).map((v) => v.key)])
    write(root, `public/${key}`, 'fixture media');
  write(
    root,
    'content/media/a_001.yaml',
    YAML.stringify({
      id: 'a_001',
      contentHash: `sha256:${'a'.repeat(64)}`,
      mimeType: 'image/png',
      width: 32,
      height: 32,
      original: { key: original },
      variants,
      placeholder: { color: '#888888' },
      alt: { en: 'An open book', ja: '開いた本' },
      caption: { en: 'Read the instructions.', ja: '説明を読みます。' },
    }),
  );
}

it('stages shared text used by an outdated Japanese-only published page and preserves unrelated YAML edits', async () => {
  const root = fixture();
  await publishedPage(root);
  figure(root);
  const source = path.join(root, 'content/pages/about/locales/en.mdx');
  fs.appendFileSync(source, '\n<Figure asset="a_001" />\n');
  fs.appendFileSync(path.join(root, 'content/pages/about/locales/ja.mdx'), '\n<Figure asset="a_001" />\n');
  write(root, 'content/pages/license/locales/en.mdx', fs.readFileSync(source, 'utf8'));
  fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('status: published', 'status: draft'));
  const report = checkLocale(root, 'ja');
  expect(report.blocking).toBe(false);
  expect(report.items.map((i) => i.key)).toEqual(['page/license']);
  const field = report.fields.find((f) => f.key === 'content/media/a_001.yaml#caption')!;
  expect(field).toBeDefined();
  const batch = {
    schemaVersion: 1,
    locale: 'ja',
    operations: [
      {
        key: field.key,
        sourceField: field.sourceField,
        targetField: field.targetField,
        expectedSourceHash: field.sourceHash,
        expectedTargetHash: field.targetHash,
        translation: '使い方を確認します。',
      },
    ],
  };
  const before = fs.readFileSync(path.join(root, field.file), 'utf8');
  expect((await importTranslations(root, batch, true)).pendingReview).toBe(true);
  expect(fs.readFileSync(path.join(root, field.file), 'utf8')).toBe(before);
});

it.each(['', '{other}', '{name, plural, one {a}}'])('blocks empty or incompatible ICU messages (%s)', (copy) => {
  const root = fixture();
  write(root, 'src/i18n/messages/ja/common.json', JSON.stringify({ copy }));
  const report = checkLocale(root, 'ja');
  expect(report.blocking).toBe(true);
  expect(report.findings).toContainEqual(expect.objectContaining({ code: 'content.invalid', field: 'copy' }));
});

it('reports additions and unexplained removals instead of silently shrinking the launch scope', async () => {
  const root = fixture();
  await publishedPage(root);
  reviewCurrent(root);
  write(
    root,
    'content/pages/license/locales/en.mdx',
    fs.readFileSync(path.join(root, 'content/pages/about/locales/en.mdx'), 'utf8'),
  );
  expect(checkLocale(root, 'ja').changes.added).toEqual(['page/license']);
  const source = path.join(root, 'content/pages/about/locales/en.mdx');
  fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('status: published', 'status: draft'));
  const removed = checkLocale(root, 'ja');
  expect(removed.changes.removed).toEqual([{ key: 'page/about', reason: null }]);
  expect(removed.findings).toContainEqual(expect.objectContaining({ code: 'locale.scope-removal' }));
});

it('merges only the selected Japanese YAML field and ignores unrelated YAML key order in source fingerprints', async () => {
  const root = fixture();
  figure(root);
  fs.appendFileSync(path.join(root, 'content/pages/about/locales/en.mdx'), '\n<Figure asset="a_001" />\n');
  const report = checkLocale(root, 'ja');
  const field = report.fields.find((f) => f.key === 'content/media/a_001.yaml#caption')!;
  const batch = {
    schemaVersion: 1,
    locale: 'ja',
    operations: [
      {
        key: field.key,
        sourceField: field.sourceField,
        targetField: field.targetField,
        expectedSourceHash: field.sourceHash,
        expectedTargetHash: field.targetHash,
        translation: '使い方を確認します。',
      },
    ],
  };
  const target = path.join(root, field.file);
  const media = YAML.parse(fs.readFileSync(target, 'utf8'));
  media.alt.ja = '読みかけの本';
  write(root, field.file, YAML.stringify(Object.fromEntries(Object.entries(media).reverse())));
  expect(checkLocale(root, 'ja').scopeFingerprint).toBe(report.scopeFingerprint);
  expect((await importTranslations(root, batch, true)).pendingReview).toBe(false);
  const after = checkLocale(root, 'ja');
  expect(after.fields.find((f) => f.key === field.key)?.target).toBe('使い方を確認します。');
  expect(after.fields.find((f) => f.key === 'content/media/a_001.yaml#alt')?.target).toBe('読みかけの本');
  expect(YAML.parse(fs.readFileSync(target, 'utf8')).caption.en).toBe('Read the instructions.');
});

it('follows a Chinese source rather than assuming English when importing a Japanese page', async () => {
  const root = fixture();
  const registryPath = path.join(root, 'content/locales.yaml');
  const registry = YAML.parse(fs.readFileSync(registryPath, 'utf8'));
  registry.locales.push({
    code: 'zh-Hans',
    pathPrefix: 'zh-hans',
    nativeName: '简体中文',
    htmlLang: 'zh-Hans',
    direction: 'ltr',
    enabled: true,
    phase: 1,
  });
  fs.writeFileSync(registryPath, YAML.stringify(registry));
  write(root, 'src/i18n/messages/zh-Hans/common.json', JSON.stringify({ copy: '复制{name}' }));
  fs.renameSync(
    path.join(root, 'content/pages/about/locales/en.mdx'),
    path.join(root, 'content/pages/about/locales/zh-Hans.mdx'),
  );
  const report = checkLocale(root, 'ja');
  expect(report.items[0]!.sourceLocale).toBe('zh-Hans');
  const result = await importTranslations(root, pageBatch(root), true);
  expect(result.conflicts).toEqual([]);
  expect(fs.readFileSync(path.join(root, report.items[0]!.targetFile), 'utf8')).toContain('sourceLocale: zh-Hans');
});

it('rejects escaped keys, protected fields and symlink targets', async () => {
  const root = fixture();
  const batch = pageBatch(root);
  for (const op of [
    { ...batch.operations[0]!, key: '../../outside' },
    { ...batch.operations[0]!, targetField: ['status'] },
    { ...batch.operations[0]!, key: 'content/prompts/p_001/prompt.txt' },
  ])
    expect((await importTranslations(root, { ...batch, operations: [op] }, true)).conflicts).toHaveLength(1);
  await publishedPage(root);
  const target = path.join(root, 'content/pages/about/locales/ja.mdx');
  const outside = path.join(root, 'outside.mdx');
  fs.renameSync(target, outside);
  fs.symlinkSync(outside, target);
  const original = fs.readFileSync(outside, 'utf8');
  expect((await importTranslations(root, pageBatch(root), true)).conflicts).toEqual([
    expect.stringContaining('Symlink'),
  ]);
  expect(fs.readFileSync(outside, 'utf8')).toBe(original);
});

it('stages an edit to a published page without breaking incoming Japanese links and retries without rewriting candidates', async () => {
  const root = fixture();
  await publishedPage(root);
  const source = fs.readFileSync(path.join(root, 'content/pages/about/locales/en.mdx'), 'utf8');
  write(root, 'content/pages/license/locales/en.mdx', source);
  write(
    root,
    'content/pages/license/locales/ja.mdx',
    fs.readFileSync(path.join(root, 'content/pages/about/locales/ja.mdx'), 'utf8') + '\n[サイトについて](page:about)\n',
  );
  const batch = pageBatch(root);
  const before = checkLocale(root, 'ja').items;
  expect((await importTranslations(root, batch, true)).pendingReview).toBe(true);
  const transactionDir = path.join(root, '.artifacts/localization/ja/transactions');
  const transactions = fs.readdirSync(transactionDir);
  expect((await importTranslations(root, batch, true)).pendingReview).toBe(true);
  expect(fs.readdirSync(transactionDir)).toEqual(transactions);
  expect(checkLocale(root, 'ja').items).toEqual(before);
});

function referencePrompt(root: string) {
  fs.copyFileSync('content/locales.yaml', path.join(root, 'content/locales.yaml'));
  for (const locale of ['zh-Hans', 'ar'])
    write(root, `src/i18n/messages/${locale}/common.json`, JSON.stringify({ copy: 'Copy {name}' }));
  for (const name of fs.readdirSync('content/taxonomy').filter((name) => name.endsWith('.yaml')))
    fs.copyFileSync(path.join('content/taxonomy', name), path.join(root, 'content/taxonomy', name));
  for (const relative of ['prompts/p_111', 'examples/x_156'])
    fs.cpSync(path.join('content', relative), path.join(root, 'content', relative), { recursive: true });
  for (const id of ['a_213', 'a_214']) {
    const media = YAML.parse(fs.readFileSync(`content/media/${id}.yaml`, 'utf8'));
    media.alt.ja = id === 'a_213' ? '雑誌の表紙用ポートレート' : '人物の参照画像';
    write(root, `content/media/${id}.yaml`, YAML.stringify(media));
    for (const variant of [media.original, ...Object.values(media.variants)] as { key: string }[])
      write(root, `public/${variant.key}`, 'fixture media');
  }
  const entryFile = path.join(root, 'content/prompts/p_111/entry.yaml');
  const entry = YAML.parse(fs.readFileSync(entryFile, 'utf8'));
  entry.inputRequirements.instructions.ja = '成人のポートレートを 1 枚アップロードしてください。';
  entry.inputRequirements.slots[0].labels.ja = '人物';
  fs.writeFileSync(entryFile, YAML.stringify(entry));
  const source = checkLocale(root, 'ja').items.find((i) => i.key === 'prompt/p_111')!;
  write(
    root,
    'content/prompts/p_111/locales/ja.mdx',
    `---\n${YAML.stringify({ title: '表紙用ポートレート', description: '表紙の文字を配置できるポートレート。', status: 'published', updatedAt: '2026-01-01', translation: { sourceLocale: 'en', sourceHash: source.sourceHash, reviewStatus: 'reviewed' } })}---\n\n## 使い方\n\n成人のポートレートを 1 枚アップロードしてください。\n`,
  );
}

it.each([
  ['content/media/a_214.yaml', ['alt', 'ja'], 'media.a_214.alt.ja'],
  [
    'content/prompts/p_111/entry.yaml',
    ['inputRequirements', 'instructions', 'ja'],
    'inputRequirements.instructions.ja',
  ],
  [
    'content/prompts/p_111/entry.yaml',
    ['inputRequirements', 'slots', 0, 'labels', 'ja'],
    'inputRequirements.slots.person.labels.ja',
  ],
] as const)('blocks a real reference-image prompt when %s loses %s', (file, field, findingField) => {
  const root = fixture();
  referencePrompt(root);
  expect(checkLocale(root, 'ja').blocking).toBe(false);
  const target = path.join(root, file);
  const doc = YAML.parseDocument(fs.readFileSync(target, 'utf8'));
  doc.deleteIn(field);
  fs.writeFileSync(target, doc.toString());
  const report = checkLocale(root, 'ja');
  expect(report.items.map((i) => i.key)).toContain('prompt/p_111');
  expect(report.blocking).toBe(true);
  expect(report.findings).toContainEqual(expect.objectContaining({ code: 'content.invalid', field: findingField }));
});

it('keeps CLI JSON parseable and distinguishes preparation gaps, strict failures and argument errors', () => {
  const root = fixture();
  const invoke = (...args: string[]) =>
    spawnSync(process.execPath, ['--import', 'tsx', path.resolve('scripts/locale-check.ts'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, CONTENT_DIR: path.join(root, 'content') },
    });
  const ordinary = invoke('--locale', 'ja', '--json');
  expect(ordinary.status).toBe(0);
  expect(JSON.parse(ordinary.stdout).ready).toBe(false);
  const strict = invoke('--locale', 'ja', '--strict', '--json');
  expect(strict.status).toBe(1);
  expect(JSON.parse(strict.stdout).items.map((i: { key: string }) => i.key)).toEqual(['page/about']);
  expect(invoke('--locale', 'not-registered').status).toBe(2);
});

it('stops a normal build with missing buildable-locale messages before replacing generated artifacts', () => {
  const root = fixture();
  const registryPath = path.join(root, 'content/locales.yaml');
  const registry = YAML.parse(fs.readFileSync(registryPath, 'utf8'));
  registry.locales.push({
    code: 'zz',
    pathPrefix: 'zz',
    nativeName: 'Fixture',
    htmlLang: 'zz',
    direction: 'ltr',
    enabled: true,
    phase: 1,
  });
  fs.writeFileSync(registryPath, YAML.stringify(registry));
  const marker = path.resolve(`public/generated/.locale-check-${process.pid}`);
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, 'previous successful build');
  try {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.resolve('scripts/content-build.ts')], {
      encoding: 'utf8',
      env: { ...process.env, CONTENT_DIR: path.join(root, 'content'), BUILD_MODE: 'production' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing namespace');
    expect(fs.readFileSync(marker, 'utf8')).toBe('previous successful build');
  } finally {
    fs.rmSync(marker, { force: true });
  }
});

it('localizes labels without changing historical template contracts, while still rejecting semantic changes', async () => {
  const root = fixture();
  fs.copyFileSync('content/locales.yaml', path.join(root, 'content/locales.yaml'));
  for (const locale of ['zh-Hans', 'ar'])
    write(root, `src/i18n/messages/${locale}/common.json`, JSON.stringify({ copy: 'Copy {name}' }));
  for (const name of fs.readdirSync('content/taxonomy').filter((name) => name.endsWith('.yaml')))
    fs.copyFileSync(path.join('content/taxonomy', name), path.join(root, 'content/taxonomy', name));
  for (const relative of ['templates/t_004', 'prompts/p_101', 'examples/x_146'])
    fs.cpSync(path.join('content', relative), path.join(root, 'content', relative), { recursive: true });
  const media = YAML.parse(fs.readFileSync('content/media/a_203.yaml', 'utf8'));
  write(root, 'content/media/a_203.yaml', YAML.stringify(media));
  for (const variant of [media.original, ...Object.values(media.variants)] as { key: string }[])
    write(root, `public/${variant.key}`, 'fixture media');
  const version = 'content/templates/t_004/versions/v1';
  const fieldsFile = path.join(root, version, 'fields.yaml');
  const fields = YAML.parse(fs.readFileSync(fieldsFile, 'utf8')).fields;
  const body = fs.readFileSync(path.join(root, version, 'body.txt'), 'utf8');
  const inputs = YAML.parse(fs.readFileSync(path.join(root, version, 'inputs.yaml'), 'utf8'));
  write(
    root,
    `${version}/contract-baseline.yaml`,
    YAML.stringify({
      schemaVersion: 1,
      legacyHash: '2a2064f22aa63d936bacbf840fd9f9a2e39ea2db5e1f40311fd746d558af190e',
      semanticHash: templateContractHash(body, fields, inputs),
    }),
  );
  const report = checkLocale(root, 'ja');
  expect(report.blocking).toBe(false);
  const field = report.fields.find((f) => f.key === `${version}/fields.yaml#fields.0.labels`)!;
  const runBefore = fs.readFileSync(path.join(root, 'content/examples/x_146/run.yaml'), 'utf8');
  await importTranslations(
    root,
    {
      schemaVersion: 1,
      locale: 'ja',
      operations: [
        {
          key: field.key,
          sourceField: field.sourceField,
          targetField: field.targetField,
          expectedSourceHash: field.sourceHash,
          expectedTargetHash: field.targetHash,
          translation: '球内の風景',
        },
      ],
    },
    true,
  );
  expect(checkLocale(root, 'ja').blocking).toBe(false);
  expect(fs.readFileSync(path.join(root, 'content/examples/x_146/run.yaml'), 'utf8')).toBe(runBefore);
  const changed = YAML.parse(fs.readFileSync(fieldsFile, 'utf8'));
  changed.fields[0].default = 'a new default landscape';
  fs.writeFileSync(fieldsFile, YAML.stringify(changed));
  expect(checkLocale(root, 'ja').findings).toContainEqual(
    expect.objectContaining({ code: 'content.invalid', message: expect.stringContaining('contract changed') }),
  );
});

it('stages a reviewed publication set with new draft link targets, but still rejects missing targets', async () => {
  const root = fixture();
  await publishedPage(root);
  write(
    root,
    'content/pages/license/locales/en.mdx',
    '---\ntitle: License\ndescription: License terms.\nstatus: published\nupdatedAt: 2026-01-01\n---\n\n## License\n\nTerms.\n',
  );
  const report = checkLocale(root, 'ja');
  const batch = {
    schemaVersion: 1,
    locale: 'ja',
    operations: report.items.map((item) => ({
      key: item.key,
      sourceField: ['$page'],
      targetField: ['$page'],
      expectedSourceHash: item.sourceFingerprint,
      expectedTargetHash: item.targetHash,
      translation: {
        title: '利用案内',
        description: '利用に関する説明。',
        body: item.key === 'page/about' ? '## 案内\n\n[ライセンス](page:license)' : '## 条件\n\n利用条件です。',
      },
    })),
  };
  const before = fs.readFileSync(path.join(root, 'content/pages/about/locales/ja.mdx'), 'utf8');
  expect((await importTranslations(root, batch, true)).pendingReview).toBe(true);
  expect(fs.readFileSync(path.join(root, 'content/pages/about/locales/ja.mdx'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(root, 'content/pages/license/locales/ja.mdx'))).toBe(false);
  batch.operations[0]!.translation.body = '## 案内\n\n[リンク](page:missing)';
  await expect(importTranslations(root, batch, true)).rejects.toThrow('does not exist');
});
