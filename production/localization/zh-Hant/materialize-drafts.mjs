// Prepare complete UI catalogs and importer batches; publishing and review are separate steps.
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint, proseFingerprint } from '../../../scripts/lib/localization/fingerprint.ts';
import { checkLocale } from '../../../scripts/lib/localization/check.ts';

const root = process.cwd();
const dir = path.join(root, 'production/localization/zh-Hant');
const load = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const plan = load('preparation/plan.json');
const current = checkLocale(root, 'zh-Hant');
const currentSources = new Map([
  ...current.fields.map((field) => [field.key, field.sourceHash]),
  ...current.items.map((item) => [item.key, item.sourceFingerprint]),
]);
for (const entry of [...plan.fields, ...plan.items]) {
  if (currentSources.get(entry.key) !== (entry.sourceFingerprint ?? entry.sourceHash))
    throw new Error(`Source changed; rebase and review the candidate before regeneration: ${entry.key}`);
}
if (currentSources.size !== plan.fields.length + plan.items.length)
  throw new Error('Localization scope changed; prepare a new source snapshot.');
if (
  current.items.some((item) => item.targetHash !== null) ||
  current.fields.some((field) => !field.file.startsWith('src/i18n/') && field.targetHash !== null)
)
  throw new Error(
    'Targets already exist; do not overwrite imported or promoted candidates with the initial preparation plan.',
  );
const pairs = load('preparation/text-pairs.json').pairs;
const overrides = load('preparation/editorial-overrides.json');
for (const file of fs
  .readdirSync(path.join(dir, 'preparation'))
  .sort()
  .filter((file) => /^(run-notes|shared|pages)-\d+\.json$/.test(file)))
  Object.assign(overrides.pairs, load(`preparation/${file}`));
const converter = load('preparation/converter.json');
const notePrefixes = load('preparation/run-note-prefixes.json');
const sourceParagraphs = load('preparation/source-paragraphs.json');
for (const pair of pairs) {
  // Only reviewed prose literals are edited, never structural or Prompt files.
  for (const [from, to] of Object.entries(overrides.globalTerms)) pair.target = pair.target.replaceAll(from, to);
  if (overrides.pairs[String(pair.id)] !== undefined) pair.target = overrides.pairs[String(pair.id)];
  for (const [marker, value] of Object.entries(notePrefixes)) pair.target = pair.target.replaceAll(marker, value);
  if (pair.contexts.some((key) => key.startsWith('src/i18n/')))
    pair.target = pair.target.replaceAll('“', '「').replaceAll('”', '」');
}
function resolve(value) {
  if (value && typeof value === 'object' && typeof value.literal === 'number') return pairs[value.literal].target;
  if (value?.patches) {
    let text = value.base;
    for (const patch of [...value.patches].sort((a, b) => b.start - a.start))
      text = text.slice(0, patch.start) + pairs[patch.literal].target + text.slice(patch.end);
    return text;
  }
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, resolve(val)]));
  return value;
}
const catalogs = new Map();
const sharedTranslations = new Map(
  pairs
    .slice(0, 819)
    .toReversed()
    .map((pair) => [pair.source, pair.target]),
);
const operations = [];
const audit = [];
const pictureText = [
  '流体之间',
  '立即选购',
  '月光邮差',
  '温杯、投茶、注水',
  '周一不想上班',
  '立领、前襟、花卉刺绣、裙褶',
];
function preserved(source, translation, field) {
  const sourceText = JSON.stringify(source);
  const targetText = JSON.stringify(translation);
  return pictureText
    .filter((text) => sourceText.includes(text) && targetText.includes(text))
    .map((text) => ({
      field,
      text,
      reason:
        'Exact lettering quoted by the canonical source; preserve the recorded image text rather than converting it.',
    }));
}
for (const field of plan.fields) {
  const translation = resolve(field.translationPlan);
  if (field.file.startsWith('src/i18n/')) {
    if (!catalogs.has(field.file)) catalogs.set(field.file, {});
    let obj = catalogs.get(field.file);
    for (const part of field.targetField.slice(0, -1)) obj = obj[part] ??= {};
    obj[field.targetField.at(-1)] = translation;
  } else
    operations.push({
      key: field.key,
      sourceField: field.sourceField,
      targetField: field.targetField,
      expectedSourceHash: field.sourceHash,
      expectedTargetHash: field.targetHash,
      ...(field.identity ? { expectedIdentity: field.identity } : {}),
      translation,
    });
  const direct =
    typeof field.translationPlan?.literal === 'number' &&
    field.translationPlan.literal < 819 &&
    overrides.pairs[String(field.translationPlan.literal)] !== undefined;
  audit.push({
    key: field.key,
    sourceHash: field.sourceHash,
    targetHash: fingerprint({ field: field.targetField, value: translation }),
    method: direct ? 'direct' : 'conversion',
    reference: direct ? null : plan.refs[field.key],
    converter: direct ? null : converter,
    preserved: preserved(field.source, translation, field.targetField),
  });
}
// Create every namespace together; incomplete catalogs are invalid even for disabled locales.
for (const [file, catalog] of catalogs) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify(catalog, null, 2) + '\n');
}
for (const item of plan.items) {
  const translation = resolve(item.translationPlan);
  if (item.key === 'template/t_003')
    translation.body =
      '## 適合用在哪裡？\n\n適合頭像、專輯封面與角色預告等輪廓比臉部更重要的場合。\n\n## 如何填寫？\n\n- **人物**：人物身份與一個姿勢，例如「正在轉身的舞者」。\n- **輪廓光**：兩種顏色，左右各一。單一顏色看起來較像光暈，而非人物。\n- **情緒**：選填；一至兩個詞即可。';
  if (['prompt/p_312', 'prompt/p_313', 'prompt/p_314', 'prompt/p_315'].includes(item.key)) {
    const paragraph = item.sourceProse.body.split('\n\n')[4];
    const target = sharedTranslations.get(paragraph);
    if (!target) throw new Error(`Missing source observation: ${item.key}`);
    translation.body = translation.body.replace('\n\n## 來源與生成', `\n\n${target}\n\n## 來源與生成`);
  }
  if (
    item.key === 'prompt/p_273' ||
    (/^prompt\/p_\d+$/.test(item.key) && Number(item.key.slice(-3)) >= 286 && Number(item.key.slice(-3)) <= 311)
  ) {
    const sourceParagraphs = item.sourceProse.body.split('\n\n');
    const targetParagraphs = translation.body.split('\n\n');
    if (sourceParagraphs.length !== targetParagraphs.length)
      throw new Error(`Paragraph alignment changed: ${item.key}`);
    translation.body = sourceParagraphs
      .map((paragraph, index) => sharedTranslations.get(paragraph) ?? targetParagraphs[index])
      .join('\n\n');
  }
  if (['prompt/p_005', 'prompt/p_036', 'prompt/p_050', 'prompt/p_061', 'prompt/p_071'].includes(item.key))
    translation.body += '\n- 想更換主體或配色，可以使用[霓虹人像範本](template:t_003)。';
  // These pages had abbreviated references; reconstruct the complete canonical body.
  if (
    (/^template\/t_\d+$/.test(item.key) && Number(item.key.slice(-3)) >= 11 && Number(item.key.slice(-3)) <= 68) ||
    (/^prompt\/p_\d+$/.test(item.key) && Number(item.key.slice(-3)) >= 111 && Number(item.key.slice(-3)) <= 235)
  ) {
    translation.body = item.sourceProse.body
      .split('\n\n')
      .map((paragraph) => {
        const source =
          /^Independently adapted from the supplied design prompt collection, case (\d+)\. \[Source\]\(([^)]+)\)\. GPT Image returned no precise version identifier\.$/.exec(
            paragraph,
          );
        if (source)
          return `根據提供的設計提示詞合集第 ${source[1]} 個案例獨立改編。[來源](${source[2]})。GPT Image 未回傳精確的版本識別碼。`;
        const inspiration =
          /^See the \[tested case\]\((prompt:p_\d+)\) for original sources and dated attention metrics\.$/.exec(
            paragraph,
          );
        if (inspiration) return `請查看[已實測案例](${inspiration[1]})，了解原始來源與附有日期的關注度指標。`;
        const attribution =
          /^(The source provides an original prompt; this production uses the separately recorded working prompt\.|The original prompt was not found\. This is an independently inferred prompt\.) \[Source\]\(([^)]+)\)\. Source-post engagement does not measure this newly generated example\.$/.exec(
            paragraph,
          );
        if (attribution)
          return `${attribution[1].startsWith('The source') ? '來源提供原始提示詞；本次製作使用另行記錄的實際提示詞。' : '未找到原始提示詞。本次提示詞為獨立推導。'}[來源](${attribution[2]})。來源貼文互動數不代表這個新生成範例的熱度。`;
        const target = sourceParagraphs[paragraph] ?? sharedTranslations.get(paragraph);
        if (target === undefined) throw new Error(`Missing direct paragraph translation: ${item.key}: ${paragraph}`);
        return target;
      })
      .join('\n\n');
  }
  operations.push({
    key: item.key,
    sourceField: ['$page'],
    targetField: ['$page'],
    expectedSourceHash: item.sourceFingerprint,
    expectedTargetHash: item.targetHash,
    translation,
  });
  audit.push({
    key: item.key,
    sourceHash: item.sourceFingerprint,
    targetHash: proseFingerprint(translation),
    method: 'conversion',
    reference: plan.refs[item.key],
    converter,
    preserved: preserved(item.sourceProse, translation, ['$page']),
  });
}
const manifest = [];
const shared = operations.filter((op) => op.sourceField[0] !== '$page');
const pages = operations.filter((op) => op.sourceField[0] === '$page');
for (const [prefix, ops, size] of [
  ['fields', shared, 100],
  ['pages', pages, 20],
]) {
  for (let start = 0; start < ops.length; start += size) {
    const name = `${prefix}-${String(start / size + 1).padStart(2, '0')}`;
    const batch = { schemaVersion: 1, locale: 'zh-Hant', operations: ops.slice(start, start + size) };
    save(`batches/${name}.json`, batch);
    manifest.push({
      name,
      file: `production/localization/zh-Hant/batches/${name}.json`,
      batchId: fingerprint(batch).slice(7),
      keys: batch.operations.map((op) => op.key),
      status: 'draft-awaiting-review',
    });
  }
}
save('conversion-audit.json', { schemaVersion: 1, locale: 'zh-Hant', records: audit });
save('batch-plan.json', {
  schemaVersion: 1,
  locale: 'zh-Hant',
  sourceRevision: plan.sourceRevision,
  batches: manifest,
});
save('preparation/final-text-pairs.json', { schemaVersion: 1, locale: 'zh-Hant', pairs });
console.log(
  JSON.stringify({
    namespaces: catalogs.size,
    fields: shared.length,
    pages: pages.length,
    batches: manifest.length,
    approvalsGenerated: false,
  }),
);
