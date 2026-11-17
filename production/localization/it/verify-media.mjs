import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import sharp from 'sharp';
import zlib from 'node:zlib';

const dir = 'production/localization/it';
const baseline = '0306b74b66ab9bf1f76eb5061bc466c3ebf86325';
const reportFile = `${dir}/evidence/baseline/complete-policy.json`;
const report = JSON.parse(fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : zlib.gunzipSync(fs.readFileSync(reportFile + '.gz')).toString());
const evidence = [1, 2, 3].map((n) => {
  const file = `production/localization/pt-BR/media-review-evidence-${n}.md`;
  return { file, text: fs.readFileSync(file, 'utf8') };
});
const records = [];
for (const field of report.fields.filter((f) => f.sourceFile.startsWith('content/media/'))) {
  const media = YAML.parse(fs.readFileSync(field.sourceFile, 'utf8'));
  const original = `public/${media.original.key}`;
  const bytes = fs.readFileSync(original);
  const sha256 = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
  if (sha256 !== media.contentHash) throw Error(`Current content hash mismatch: ${media.id}`);
  const old = execFileSync('git', ['rev-parse', `${baseline}:${original}`], { encoding: 'utf8' }).trim();
  const current = execFileSync('git', ['hash-object', original], { encoding: 'utf8' }).trim();
  if (old !== current) throw Error(`Asset changed since reviewed baseline: ${media.id}`);
  const prior = evidence.find((e) => new RegExp(`\\b${media.id}\\b`).test(e.text));
  if (!prior) throw Error(`No historical visual-review coverage: ${media.id}`);
  const metadata = media.mimeType === 'image/gif' ? await sharp(bytes, { animated: true }).metadata() : null;
  records.push({ key: field.key, sourceHash: field.sourceHash, asset: original, sha256, baselineGitBlob: old, priorVisualReview: prior.file, currentReinspection: ['a_269', 'a_280', 'a_282'].includes(media.id), ...(metadata ? { frames: metadata.pages, delays: metadata.delay, loop: metadata.loop } : {}) });
}
fs.writeFileSync(`${dir}/media-review-provenance.json`, JSON.stringify({ schemaVersion: 1, baseline, checkedAt: new Date().toISOString(), method: 'Current original SHA-256 and exact Git blob equality to previously visually reviewed baseline. Reuses prior visual facts, not Portuguese language approvals. Three corrected originals inspected again for Italian.', records }, null, 2) + '\n');
console.log({ assets: records.length, gifs: records.filter((r) => 'frames' in r).length });
