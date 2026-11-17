// Offline authoring utility. Produces importer inputs only; it never approves or publishes translations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import YAML from 'yaml';

const directory = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(directory, '../../..');
const reportFile = path.join(directory, 'evidence/baseline/complete-policy.json');
const report = JSON.parse(fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : zlib.gunzipSync(fs.readFileSync(reportFile + '.gz')).toString());
const memoryFile = path.join(directory, 'translation-memory.json');
const memory = fs.existsSync(memoryFile) ? JSON.parse(fs.readFileSync(memoryFile, 'utf8')) : {};
const segments = new Map();
const slotsOf = (text) => {
  const values = [];
  const source = text.replace(/\]\(([^)\s]+)\)|\d+(?:[.,]\d+)*/g, (match, link) => {
    const slot = `__SLOT_${values.length}__`;
    values.push(link ?? match);
    return link ? `](${slot})` : slot;
  });
  return { source, values };
};
function translate(text, context) {
  const { source, values } = slotsOf(text);
  const id = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
  if (!segments.has(id)) segments.set(id, { id, source, contexts: [] });
  segments.get(id).contexts.push(context);
  // Some shared captions differ from their authored description only by a terminal period.
  // This copies a complete translated sentence; it does not translate or shorten prose.
  if (memory[id] === undefined && source.endsWith('.')) {
    const unpunctuated = crypto.createHash('sha256').update(source.slice(0, -1)).digest('hex').slice(0, 16);
    if (memory[unpunctuated] !== undefined) memory[id] = memory[unpunctuated] + '.';
  }
  // Collection reasons sometimes repeat an exact description with only a ranking prefix.
  // Reuse that authored sentence, never infer a translation from a partial word match.
  if (memory[id] === undefined && !source.includes('__SLOT_')) {
    const ranked = crypto.createHash('sha256').update(`#__SLOT_0__ · ${source}`).digest('hex').slice(0, 16);
    if (memory[ranked]?.startsWith('#__SLOT_0__ · ')) memory[id] = memory[ranked].slice('#__SLOT_0__ · '.length);
  }
  const translated = memory[id];
  if (translated === undefined) return null;
  if (typeof translated !== 'string' || !translated.trim()) throw Error(`Empty translation: ${id}`);
  const expected = source.match(/__SLOT_\d+__/g) ?? [];
  const actual = translated.match(/__SLOT_\d+__/g) ?? [];
  if (JSON.stringify(expected.toSorted()) !== JSON.stringify(actual.toSorted())) throw Error(`Changed placeholders: ${id}`);
  return translated.replace(/__SLOT_(\d+)__/g, (_, index) => values[Number(index)]);
}
const operations = [];
const missing = [];
for (const item of report.items) {
  const raw = fs.readFileSync(path.join(root, item.sourceFile), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw Error(`Missing frontmatter: ${item.sourceFile}`);
  const fm = YAML.parse(match[1]);
  const translation = {};
  let complete = true;
  for (const name of ['title', 'description', 'seoTitle', 'seoDescription']) {
    if (fm[name] === undefined) continue;
    translation[name] = translate(fm[name], `${item.key}#${name}`);
    if (translation[name] === null) complete = false;
  }
  if (fm.reasons) {
    translation.reasons = {};
    for (const [key, text] of Object.entries(fm.reasons)) {
      translation.reasons[key] = translate(text, `${item.key}#reasons.${key}`);
      if (translation.reasons[key] === null) complete = false;
    }
  }
  const paragraphs = match[2].trim().split(/\n\s*\n/).map((text, n) => translate(text, `${item.key}#body.${n}`));
  if (paragraphs.some((p) => p === null)) complete = false;
  translation.body = paragraphs.join('\n\n');
  if (!complete) missing.push(item.key);
  else operations.push({ key: item.key, sourceField: ['$page'], targetField: ['$page'], expectedSourceHash: item.sourceFingerprint, expectedTargetHash: item.targetHash, translation });
}
for (const field of report.fields.filter((field) => !field.sourceFile.startsWith('src/'))) {
  const translation = Array.isArray(field.source)
    ? field.source.map((text, n) => translate(text, `${field.key}[${n}]`))
    : translate(field.source, field.key);
  if (translation === null || (Array.isArray(translation) && translation.includes(null))) missing.push(field.key);
  else operations.push({ key: field.key, sourceField: field.sourceField, targetField: field.targetField, expectedSourceHash: field.sourceHash, expectedTargetHash: field.targetHash, expectedIdentity: field.identity, translation });
}
fs.mkdirSync(path.join(directory, 'authoring'), { recursive: true });
fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'authoring/segments.json'), JSON.stringify([...segments.values()], null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'authoring/missing.json'), JSON.stringify([...segments.values()].filter((s) => memory[s.id] === undefined), null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'authoring/ready-batch.json'), JSON.stringify({ schemaVersion: 1, locale: 'it', operations }, null, 2) + '\n');
console.log(JSON.stringify({ segments: segments.size, translated: [...segments.keys()].filter((id) => memory[id] !== undefined).length, readyOperations: operations.length, missingTargets: missing.length }));
