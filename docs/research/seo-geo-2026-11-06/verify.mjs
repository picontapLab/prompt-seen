// Run after BUILD_MODE=production npm run build and PORT=8090 sh scripts/nginx.sh.
// node docs/research/seo-geo-2026-11-06/verify.mjs [http://127.0.0.1:8090] [output-directory]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import YAML from 'yaml';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const output = process.argv[3] ? path.resolve(process.argv[3]) : path.join(dir, 'evidence/local-after');
fs.mkdirSync(output, { recursive: true });
const base = process.argv[2] ?? 'http://127.0.0.1:8090';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const yaml = (file) => YAML.parse(read(file));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const pages = [['prompt', 'p_123'], ['template', 't_017'], ['prompt', 'p_153'], ['prompt', 'p_218'], ['prompt', 'p_151']];
const result = { capturedAt: new Date().toISOString(), base, pages: [], runs: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
try {
  const page = await context.newPage();
  for (const [kind, id] of pages) {
    const detail = JSON.parse(read(`.generated/content/en/${kind}/${id}.json`));
    const address = base + detail.path;
    const response = await page.goto(address, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    const html = await response.text();
    const headers = await response.allHeaders();
    fs.writeFileSync(path.join(output, `${id}.html`), html);
    fs.writeFileSync(path.join(output, `${id}.headers.json`), JSON.stringify(headers, null, 2));
    const dom = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      h1: document.querySelector('h1')?.textContent,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      alternates: Array.from(document.querySelectorAll('link[hreflang]')).map((e) => [e.hreflang, e.href]),
      robots: document.querySelector('meta[name=robots]')?.content ?? '',
      text: document.querySelector('main')?.textContent ?? '',
      images: Array.from(document.querySelectorAll('main img')).map((e) => e.src),
      jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((e) => JSON.parse(e.textContent)['@graph']),
    }));
    assert.equal(dom.lang, 'en');
    assert.equal(dom.h1, detail.title);
    assert.equal(dom.canonical, 'https://promptseen.dev' + detail.path);
    assert(!/noindex/i.test(dom.robots + (headers['x-robots-tag'] ?? '')));
    if (id !== 'p_151') assert(dom.text.includes('Generation evidence and limits'));
    const work = dom.jsonLd.find((node) => node['@type'] === 'CreativeWork');
    assert.equal(work.name, dom.h1);
    const prompt = kind === 'prompt' ? detail.prompt.text : detail.version.defaultPrompt;
    assert.equal(work.text, prompt);
    assert.equal(work.inLanguage, kind === 'prompt' ? detail.prompt.language : detail.promptLanguage);
    assert(dom.text.includes(prompt));
    const mdResponse = await fetch(address + 'index.md');
    const md = await mdResponse.text();
    assert.equal(mdResponse.status, 200);
    assert(mdResponse.headers.get('content-type').startsWith('text/markdown'));
    assert(mdResponse.headers.get('link').includes(`<${dom.canonical}>; rel="canonical"`));
    fs.writeFileSync(path.join(output, `${id}.md`), md);
    fs.writeFileSync(path.join(output, `${id}.txt`), dom.text);
    const records = md.split('## Test prints\n')[1] ?? '';
    for (const [i, run] of detail.examples.entries()) {
      const record = records.split('\n### ')[i + 1];
      assert(record, run.id);
      let previous = 0;
      for (const [j, ref] of run.references.entries()) {
        assert(dom.images.some((url) => url.includes(`/media/${ref.assetId}/`)));
        const original = ref.variants.original;
        const index = record.indexOf(original.key);
        assert(index > previous, `${run.id}: input ${j + 1} must retain its order`);
        previous = index;
        assert(record.includes(`${j + 1}. ${run.referenceLabels[j]}`));
        const response = await fetch(`${base}/${original.key}`);
        assert.equal(response.status, 200);
        assert.equal('sha256:' + hash(Buffer.from(await response.arrayBuffer())), yaml(`content/media/${ref.assetId}.yaml`).contentHash);
      }
      if (run.references.length) assert(record.indexOf('#### Output') > previous);
    }
    const en = dom.alternates.find(([lang]) => lang === 'en')[1];
    const zh = dom.alternates.find(([lang]) => lang === 'zh-Hans')[1];
    const zhResponse = await fetch(base + new URL(zh).pathname);
    const zhHtml = await zhResponse.text();
    assert.equal(zhResponse.status, 200);
    assert(zhHtml.includes('lang="zh-Hans"'));
    assert(zhHtml.includes(`hrefLang="en" href="${en}"`));
    assert(zhHtml.includes(`rel="canonical" href="${zh}"`));
    result.pages.push({ id, address, canonical: dom.canonical, status: 200, javaScriptEnabled: false, promptLanguage: work.inLanguage, inputCount: detail.examples.reduce((n, run) => n + run.references.length, 0), reciprocalHreflang: true });
    if (id === 'p_218') await page.screenshot({ path: path.join(output, 'p218-desktop.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/en/prompts/product-brand-story-grid/', { waitUntil: 'networkidle' });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(output, 'p123-mobile.png'), fullPage: true });

  for (const [id, receiptFile] of [
    ['x_168', 'docs/research/seo-geo-2026-11-06/evidence/receipts/x_168.json'],
    ['x_196', 'docs/research/seo-geo-2026-11-06/evidence/receipts/x_196.json'],
    ['x_269', 'production/design-ai-top60-2026-10/audit/design60-3-v6.json'],
    ['x_282', 'production/gpt-image-26-2026-11/audit/S10.json'],
  ]) {
    const run = yaml(`content/examples/${id}/run.yaml`);
    const prompt = read(`content/examples/${id}/prompt.txt`).trim();
    const receipt = JSON.parse(read(receiptFile));
    assert.equal(hash(prompt), run.promptSha256);
    assert.equal(prompt, receipt.definition.prompt.trim());
    const assets = [];
    for (const asset of [...run.referenceAssetIds, ...run.outputAssetIds]) {
      const media = yaml(`content/media/${asset}.yaml`);
      const digest = hash(fs.readFileSync(path.join(root, 'public', media.original.key)));
      assert.equal('sha256:' + digest, media.contentHash);
      assets.push({ asset, sha256: digest });
    }
    assert.deepEqual(assets.slice(0, run.referenceAssetIds.length).map((a) => a.sha256), receipt.references.map((r) => r.sha256));
    assert.equal(assets.at(-1).sha256, receipt.receipt.output.sha256);
    result.runs.push({ id, receiptFile, promptSha256: run.promptSha256, displayModel: run.model.displayName, receiptModel: receipt.receipt.model, providerModelId: run.model.providerModelId, parameters: run.parameters, assets, matched: true });
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
