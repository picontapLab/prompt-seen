import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import YAML from 'yaml';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const yaml = (file) => YAML.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const allItems = read(path.join(base, 'adaptations/content-map.json'));
const items = allItems.filter((item) => item.status === 'accepted');
const results = [];
for (const item of items) {
  assert.equal(item.status, 'accepted');
  const folder = path.join(base, item.folder);
  const state = read(path.join(folder, 'state.json'));
  const claim = read(path.join(folder, 'claim.json'));
  const entry = yaml(`content/prompts/${item.ids.prompt}/entry.yaml`);
  const run = yaml(`content/examples/${item.ids.example}/run.yaml`);
  assert.equal(entry.promptProvenance, 'independent-adaptation');
  assert.equal(entry.promptSource.language, item.language);
  assert.equal(run.promptLanguage, item.language);
  assert.equal(run.model.providerModelId, null);
  assert.equal(claim.prompt, state.definition.prompt);
  assert.equal(run.promptSha256, hash(claim.prompt));
  assert.deepEqual(claim.references, state.references);
  assert.deepEqual(
    run.referenceBindings,
    state.references.map((r, referenceIndex) => ({ slotId: r.slotId, referenceIndex })),
  );
  for (const file of [
    `content/prompts/${item.ids.prompt}/prompt.txt`,
    `content/examples/${item.ids.example}/prompt.txt`,
  ]) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8').trim(), claim.prompt.trim());
  }
  const outputs = [state.receipt.output, ...state.references];
  const mediaIds = [...run.outputAssetIds, ...run.referenceAssetIds];
  for (const [index, id] of mediaIds.entries()) {
    const asset = yaml(`content/media/${id}.yaml`);
    assert.equal(hash(fs.readFileSync(path.join(root, 'public', asset.original.key))), outputs[index].sha256);
    assert.equal(hash(fs.readFileSync(outputs[index].path)), outputs[index].sha256);
  }
  const media = yaml(`content/media/${mediaIds[0]}.yaml`);
  if (item.sourceCase === 'W01') {
    const workflow = read(path.join(folder, 'workflow.json'));
    assert.equal(workflow.imageCallsExecuted, 1);
    assert.equal(workflow.imageRetries, 0);
    assert.equal(workflow.scheduled, false);
    assert.equal(fs.readFileSync(path.join(folder, 'message-ja.txt'), 'utf8').trim(), workflow.message);
    assert.equal(workflow.referenceMapping[workflow.referenceName], state.references[0].path);
    results.push({ unitId: item.unitId, type: 'direct-upload-workflow', imageCalls: 1, separateMessage: true });
    continue;
  }
  if (item.sourceCase.startsWith('S')) {
    const audit = read(path.join(folder, 'audit.json'));
    const intent = read(path.join(folder, 'intent.json'));
    assert.equal(intent.provenance, 'independent-adaptation');
    assert.equal(intent.sourceCase, item.sourceCase);
    assert.equal(audit.tool, 'image_gen.imagegen');
    assert.equal(audit.frames, 1);
    assert.equal(audit.outputSha256, state.receipt.output.sha256);
    assert.equal(state.references.length, 0);
    assert.equal((await sharp(state.receipt.output.path).metadata()).pages ?? 1, 1);
    assert.equal(media.mimeType, 'image/png');
    assert.equal(media.animation, undefined);
    results.push({ unitId: item.unitId, type: 'independent-static-adaptation', mediaId: media.id, imageCalls: 1 });
    continue;
  }
  const encoding = read(path.join(folder, 'output-encoding.json'));
  const composition = read(path.join(folder, 'composition.json'));
  const sourceEncoding = read(path.join(base, composition.sourceFolder, 'output-encoding.json'));
  assert.equal(encoding.frameCount, 9);
  assert.equal(encoding.durationMs, sourceEncoding.durationMs);
  assert.equal(encoding.loop, sourceEncoding.loop);
  assert.equal(composition.sequence.length, 9);
  assert.equal(claim.prompt, composition.sourceClaim.prompt);
  assert.equal(
    hash(fs.readFileSync(path.join(base, composition.sourceFolder, 'sheet.png'))),
    composition.sourceSheetSha256,
  );
  const expectedDistinct = composition.sourceFrameCount === 8 ? 8 : 9;
  assert.equal(encoding.distinctFrameCount, expectedDistinct);
  const gif = path.join(folder, 'output.gif');
  const sheet = path.join(folder, 'sheet.png');
  assert.equal(hash(fs.readFileSync(sheet)), encoding.sheetSha256);
  assert.equal(hash(fs.readFileSync(gif)), encoding.outputSha256);
  assert.equal(encoding.outputSha256, state.receipt.output.sha256);
  assert.equal((await sharp(sheet).metadata()).pages ?? 1, 1);
  for (const [i, rect] of encoding.rectangles.entries()) {
    assert.equal(hash(await sharp(sheet).extract(rect).ensureAlpha().raw().toBuffer()), encoding.frameHashes[i]);
  }
  assert(encoding.distinctFrameCount >= 2);
  assert.equal(media.mimeType, 'image/gif');
  assert.deepEqual(media.animation, {
    frameCount: encoding.frameCount,
    durationMs: encoding.durationMs,
    loopCount: encoding.loop,
  });
  const animated = [media.original, ...['thumbnail', 'card', 'detail'].map((name) => media.variants[name])];
  for (const asset of animated) {
    const file = path.join(root, 'public', asset.key);
    const metadata = await sharp(file, { animated: true }).metadata();
    if (asset === media.original) {
      assert.equal(metadata.pages, 9);
      assert.deepEqual(metadata.delay, encoding.frameDelaysMs);
    } else {
      // WebP merges identical held poses; visual timing and animation must survive.
      assert.equal(metadata.pages, expectedDistinct);
      const expectedDelays = [];
      for (const [i, step] of composition.sequence.entries()) {
        if (step.holdFraction) expectedDelays[expectedDelays.length - 1] += encoding.frameDelaysMs[i];
        else expectedDelays.push(encoding.frameDelaysMs[i]);
      }
      assert.deepEqual(metadata.delay, expectedDelays);
    }
    assert.equal(metadata.loop, encoding.loop);
    assert.equal(metadata.width, asset.width ?? media.width);
    assert.equal(metadata.pageHeight, asset.height ?? media.height);
    if (encoding.hasTransparency) {
      assert.equal(metadata.hasAlpha, true);
      const pixels = await sharp(file).ensureAlpha().raw().toBuffer();
      assert(pixels.some((n, i) => i % 4 === 3 && n === 0));
    }
  }
  assert.equal((await sharp(path.join(root, 'public', media.variants.og.key)).metadata()).pages ?? 1, 1);
  assert.deepEqual(
    await sharp(path.join(folder, 'output-poster.png')).ensureAlpha().raw().toBuffer(),
    await sharp(gif, { page: 0, pages: 1 }).ensureAlpha().raw().toBuffer(),
  );
  results.push({
    unitId: item.unitId,
    mediaId: media.id,
    frameCount: encoding.frameCount,
    width: media.width,
    height: media.height,
    durationMs: encoding.durationMs,
    loop: encoding.loop,
    transparent: encoding.hasTransparency,
  });
}
const withdrawal = read(path.join(base, 'audit/withdrawn-composites/withdrawal.json'));
assert.equal(withdrawal.status, 'withdrawn');
assert.equal(allItems.filter((item) => item.status === 'withdrawn-user-request').length, 0);
assert.equal(fs.existsSync(path.join(root, 'content/collections/c_014')), false);
for (const item of withdrawal.runtimeFiles) {
  assert.equal(fs.existsSync(path.join(root, item.file)), false, item.file);
  assert.equal(hash(fs.readFileSync(path.join(base, 'audit/withdrawn-composites/runtime', item.file))), item.sha256);
}
assert.equal(items.length, 31);
assert.equal(results.filter((r) => r.type === 'independent-static-adaptation').length, 4);
assert.equal(results.filter((r) => r.frameCount === 9).length, 26);
const probe = read(path.join(base, 'jobs/g13-direct-gif-v1/audit.json'));
const returned = path.join(base, 'audit/jobs/gpt26-social-g13-direct-gif-v1/returned.png');
assert.equal(hash(fs.readFileSync(returned)), probe.outputSha256);
const metadata = await sharp(returned, { animated: true }).metadata();
assert.equal(metadata.format, probe.format);
assert.equal(metadata.pages ?? 1, probe.frames);
const report = {
  importedAdaptations: items.length,
  composedGifs: 26,
  withdrawnComposedGifs: withdrawal.items.length,
  withdrawalArchiveFilesVerified: withdrawal.runtimeFiles.length,
  currentWorkflowPromptAndOrderedInputsVerified: true,
  directGifProbe: { format: metadata.format, frames: metadata.pages ?? 1, accepted: false },
  results,
};
fs.writeFileSync(path.join(base, 'audit/adaptation-integrity.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
