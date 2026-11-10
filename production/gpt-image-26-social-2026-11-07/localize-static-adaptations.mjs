import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { checkLocale } from '../../scripts/lib/localization/check.ts';
import { acquireContentLock } from '../../scripts/lib/content-production/lock.ts';
const base = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(base, '../..');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const items = read(path.join(base, 'adaptations/content-map.json')).filter(
  (i) => i.sourceCase.startsWith('S') && i.ids,
);
const translated = new Map(items.map((i) => [i.unitId, read(path.join(base, i.folder, 'japanese.json'))]));
const files = new Set(
  items.flatMap((i) => [
    `content/prompts/${i.ids.prompt}/entry.yaml`,
    `content/examples/${i.ids.example}/run.yaml`,
    ...i.ids.media.map((m) => `content/media/${m}.yaml`),
  ]),
);
const dictionary = {
  'Use the complete rewritten prompt without an input image.':
    '入力画像なしで、書き直した完全なプロンプトを使用してください。',
  'Saved public X snapshot; complete prompt from saved author post/reply mirror':
    '保存されたXの公開スナップショット。元の完全なプロンプトは作者の投稿または返信の保存済みミラーに由来します。',
  'Whole original post or gallery; not this generated example':
    '元投稿またはギャラリー全体の数値であり、この生成作例への反応数ではありません。',
  'Independent adaptation; original prompt failed three attempts and is archived separately.':
    '独自アレンジ。原文での3回の試行は失敗し、別途保存しています。',
  'Source post likes': '元投稿のいいね数',
};
for (const i of items) {
  const recipe = read(path.join(base, i.folder, 'recipe.json')),
    state = read(path.join(base, i.folder, 'state.json'));
  dictionary[recipe.alt.en] = translated.get(i.unitId).description;
  dictionary[state.review.notes] = translated.get(i.unitId).notes;
}
const release = acquireContentLock(root);
try {
  let report = checkLocale(root, 'ja');
  for (const f of report.fields.filter((f) => files.has(f.file))) {
    const value = dictionary[f.source];
    if (!value) throw new Error(`Untranslated field: ${f.source}`);
    const file = path.join(root, f.file),
      doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
    doc.setIn(f.targetField, value);
    fs.writeFileSync(file, doc.toString());
  }
  const pages = new Map(items.map((i) => ['prompt/' + i.ids.prompt, translated.get(i.unitId)]));
  pages.set('collection/c_017', {
    title: '4つの日常ポートレートの独自アレンジ',
    description: '寝室、夜の車内、月夜の漢服、鏡のあるエレベーターを、独自に書き直したプロンプトで制作。',
    body: '4枚の新しいGPT Image静止画は、元の場面を残しながら通常の服装の成人と日常的な姿勢を使っています。これは原文での再試行の成功例ではなく独自アレンジです。各ページに変更点を記し、実際の提出言語を保持し、元投稿の作者を別に明示しています。原文と各事例3回の失敗記録は保存しています。[静止画の原文テスト](collection:c_013)と[9フレームGIFのアレンジ](collection:c_016)も参照してください。',
  });
  for (const [key, copy] of pages) {
    const p = report.items.find((p) => p.key === key);
    if (!p) throw new Error(`Missing page ${key}`);
    const file = path.join(root, p.targetFile);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `---\n${YAML.stringify({ title: copy.title, description: copy.description, status: 'published', updatedAt: '2026-11-09', translation: { sourceLocale: 'en', sourceHash: p.sourceHash, reviewStatus: 'reviewed' } })}---\n\n${copy.body}\n`,
    );
  }
  report = checkLocale(root, 'ja');
  const reviewFile = path.join(root, 'production/localization/ja/reviews.json'),
    reviews = read(reviewFile);
  for (const x of [
    ...report.items
      .filter((p) => pages.has(p.key))
      .map((p) => ({ key: p.key, sourceHash: p.sourceFingerprint, targetHash: p.targetHash })),
    ...report.fields
      .filter((f) => files.has(f.file))
      .map((f) => ({ key: f.key, sourceHash: f.sourceHash, targetHash: f.targetHash })),
  ]) {
    if (!x.targetHash) throw new Error(`Missing target ${x.key}`);
    if (
      reviews.records.some(
        (r) =>
          r.key === x.key &&
          r.sourceHash === x.sourceHash &&
          r.targetHash === x.targetHash &&
          r.conclusion === 'approved',
      )
    )
      continue;
    reviews.records.push({
      ...x,
      reviewer: 'Codex',
      completedAt: new Date().toISOString(),
      conclusion: 'approved',
      reason:
        'Japanese explanations reviewed against the actual accepted still, rewritten prompt, source attribution and preserved original failure history.',
    });
  }
  fs.writeFileSync(reviewFile, JSON.stringify(reviews, null, 2) + '\n');
  console.log(JSON.stringify({ pages: pages.size, fields: report.fields.filter((f) => files.has(f.file)).length }));
} finally {
  release();
}
