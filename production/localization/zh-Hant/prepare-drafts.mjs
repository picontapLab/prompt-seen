// Offline preparation recipe. It produces review inputs, never approvals or published content.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { checkLocale } from '../../../scripts/lib/localization/check.ts';
import { fingerprint, proseFingerprint } from '../../../scripts/lib/localization/fingerprint.ts';
import { splitFrontmatter } from '../../../scripts/lib/content/mdx.ts';

const root = process.cwd();
const dir = path.join(root, 'production/localization/zh-Hant');
if (fs.existsSync(path.join(dir, 'preparation/plan.json')))
  throw new Error(
    'A frozen preparation plan already exists. Archive and rebase its editorial overrides before preparing a new source snapshot.',
  );
const report = checkLocale(root, 'zh-Hant');
const converter = '/opt/homebrew/opt/icu4c/bin/uconv';
const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
const parsed = new Map();
const read = (file) => {
  if (!parsed.has(file)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    parsed.set(file, file.endsWith('.json') ? JSON.parse(text) : YAML.parse(text));
  }
  return parsed.get(file);
};
const at = (value, parts) => parts.reduce((v, p) => v?.[p], value);
const pairs = [];
const ids = new Map();
const refs = {};
const warnings = [];

// ICU changes literal Han text; terminology is editorial and reviewed after conversion.
const terms = [
  ['提示詞模板', '提示詞範本'],
  ['模板', '範本'],
  ['字段', '欄位'],
  ['字符', '字元'],
  ['搜索', '搜尋'],
  ['設置', '設定'],
  ['信息', '資訊'],
  ['文件', '檔案'],
  ['視頻', '影片'],
  ['鏈接', '連結'],
  ['軟件', '軟體'],
  ['鼠標', '滑鼠'],
  ['回車', 'Enter'],
  ['撤銷', '復原'],
  ['恢復默認', '重設為預設值'],
  ['默認', '預設'],
  ['屏幕', '螢幕'],
  ['點擊', '點選'],
  ['加載', '載入'],
  ['保存', '儲存'],
  ['佔位符', '預留位置'],
  ['剪貼板', '剪貼簿'],
  ['縮略圖', '縮圖'],
  ['添加', '新增'],
  ['產品攝影', '商品攝影'],
  ['產品海報', '商品海報'],
];
function literal(source, reference, context) {
  const key = JSON.stringify([source, reference]);
  const found = ids.get(key);
  if (found !== undefined) {
    pairs[found].contexts.push(context);
    return found;
  }
  const id = pairs.length;
  pairs.push({ id, source, reference, target: reference ?? source, contexts: [context] });
  ids.set(key, id);
  return id;
}
function natural(value, reference, key) {
  if (typeof value === 'string')
    return { literal: literal(value, typeof reference === 'string' ? reference : null, key) };
  if (Array.isArray(value)) return value.map((v, i) => natural(v, reference?.[i], `${key}[${i}]`));
  return value;
}
function page(file) {
  const split = splitFrontmatter(fs.readFileSync(path.join(root, file), 'utf8'));
  return { ...YAML.parse(split.frontmatter), body: split.body.trim() };
}
function bodyPlan(source, reference, key) {
  // Text-node edits leave URLs, code, attributes, directives and MDX syntax unchanged.
  // Unaligned translations are reviewed as whole prose against the canonical source below.
  const base = reference ?? source;
  const patches = [];
  function walk(node) {
    if (node.type === 'text')
      patches.push({
        start: node.position.start.offset,
        end: node.position.end.offset,
        literal: literal(reference === null ? node.value : source, reference === null ? null : node.value, key),
      });
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const attr of node.attributes ?? []) {
        if (attr.name === 'caption' && typeof attr.value === 'string')
          warnings.push({ key, reason: 'Review and translate Figure caption attribute explicitly.' });
      }
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(processor.parse(base));
  return { base, patches };
}

const fields = report.fields.map((field) => {
  const ui = field.file.startsWith('src/i18n/');
  const referenceFile = ui ? field.sourceFile.replace('/en/', '/zh-Hans/') : field.file;
  const referenceField = ui
    ? field.sourceField
    : field.sourceField.map((p) => (p === field.sourceLocale ? 'zh-Hans' : p));
  const reference = fs.existsSync(path.join(root, referenceFile)) ? at(read(referenceFile), referenceField) : null;
  refs[field.key] =
    reference == null ? null : { file: referenceFile, field: referenceField, hash: fingerprint(reference) };
  if (reference == null)
    warnings.push({ key: field.key, reason: 'No Simplified Chinese reference; translate canonical source directly.' });
  return { ...field, translationPlan: natural(field.source, reference, field.key) };
});
const items = report.items.map((item) => {
  const source = page(item.sourceFile);
  const referenceFile = item.sourceFile.replace(/\/[^/]+\.mdx$/, '/zh-Hans.mdx');
  const reference = fs.existsSync(path.join(root, referenceFile)) ? page(referenceFile) : null;
  refs[item.key] = reference ? { file: referenceFile, field: ['$page'], hash: proseFingerprint(reference) } : null;
  if (!reference || reference.status !== 'published' || reference.translation?.reviewStatus === 'outdated')
    warnings.push({
      key: item.key,
      reason: 'Missing/draft/outdated reference: verify all prose directly against canonical source.',
    });
  const plan = {};
  for (const key of ['title', 'description', 'seoTitle', 'seoDescription'])
    if (source[key] != null) plan[key] = natural(source[key], reference?.[key], `${item.key}.${key}`);
  if (source.reasons)
    plan.reasons = Object.fromEntries(
      Object.entries(source.reasons).map(([key, value]) => [
        key,
        natural(value, reference?.reasons?.[key], `${item.key}.reasons.${key}`),
      ]),
    );
  plan.body = bodyPlan(source.body, reference?.body ?? null, `${item.key}.body`);
  return { ...item, sourceProse: source, translationPlan: plan };
});
const converted = JSON.parse(
  execFileSync(converter, ['-x', 'Simplified-Traditional'], {
    input: JSON.stringify(pairs.map((pair) => pair.target)),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }),
);
for (const pair of pairs) {
  pair.target = converted[pair.id];
  for (const [from, to] of terms) pair.target = pair.target.replaceAll(from, to);
}
fs.mkdirSync(path.join(dir, 'preparation'), { recursive: true });
const save = (file, value) => fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
save('preparation/plan.json', {
  schemaVersion: 1,
  locale: 'zh-Hant',
  sourceRevision: report.sourceRevision,
  items,
  fields,
  refs,
});
save('preparation/text-pairs.json', { schemaVersion: 1, locale: 'zh-Hant', pairs });
save('preparation/warnings.json', warnings);
save('preparation/converter.json', {
  name: 'ICU uconv',
  version: execFileSync(converter, ['-V'], { encoding: 'utf8' }).trim(),
  config: 'Simplified-Traditional + explicitly listed editorial terminology',
  approvalsGenerated: false,
});
console.log(
  JSON.stringify({
    items: items.length,
    fields: fields.length,
    uniqueTextPairs: pairs.length,
    warnings: warnings.length,
  }),
);
