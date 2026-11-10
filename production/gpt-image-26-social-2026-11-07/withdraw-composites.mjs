// Reversible withdrawal of this campaign's unpublished composed GIFs, as requested by the user.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const archive = path.join(base, 'audit/withdrawn-composites');
const manifestFile = path.join(archive, 'withdrawal.json');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
fs.mkdirSync(archive, { recursive: true });
let manifest;
if (fs.existsSync(manifestFile)) manifest = read(manifestFile);
else {
  const items = read(path.join(base, 'adaptations/content-map.json')).filter((a) => a.sourceCase.startsWith('G'));
  if (items.length !== 26 || items.some((a) => !a.ids)) throw new Error('Expected the 26 newly imported composed GIFs');
  const runtimeRoots = items.flatMap((a) => [`content/prompts/${a.ids.prompt}`, `content/examples/${a.ids.example}`]);
  runtimeRoots.push('content/collections/c_014');
  const otherContent = files(path.join(root, 'content'))
    .filter((file) => {
      const rel = path.relative(root, file);
      return !rel.startsWith('content/media/') && !runtimeRoots.some((dir) => rel.startsWith(dir + '/'));
    })
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const removedMedia = [];
  for (const id of new Set(items.flatMap((a) => a.ids.media))) {
    if (new RegExp(`\\b${id}\\b`).test(otherContent)) continue;
    removedMedia.push(id);
    runtimeRoots.push(`content/media/${id}.yaml`, `public/media/${id}`);
  }
  for (const relative of [
    'README.md',
    'verification.json',
    'content-map.json',
    'campaign.json',
    'import-plan.json',
    'adaptations/content-map.json',
    'adaptations/campaign.json',
    'audit/coverage.json',
    'audit/capability.json',
    'audit/adaptation-integrity.json',
    'audit/browser-tests.txt',
    'audit/build.txt',
    'audit/unit-tests.txt',
  ]) {
    const destination = path.join(archive, 'before', relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(base, relative), destination, fs.constants.COPYFILE_EXCL);
  }
  const runtimeFiles = runtimeRoots
    .flatMap((relative) => {
      const absolute = path.join(root, relative);
      return fs.statSync(absolute).isDirectory() ? files(absolute) : [absolute];
    })
    .map((absolute) => ({ file: path.relative(root, absolute), sha256: hash(fs.readFileSync(absolute)) }));
  manifest = {
    requestedAt: new Date().toISOString(),
    reason: 'User explicitly requested no composed GIFs; native GIF output only.',
    status: 'withdrawing',
    items,
    removedMedia,
    runtimeRoots,
    runtimeFiles,
    preserved: [
      'original author prompts',
      'all generation attempts and reviews',
      'applied receipts as historical attestations',
      'source sheets and composed outputs for audit',
      '11 original stills',
      'W01 one-shot selfie workflow',
    ],
  };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}
for (const item of manifest.runtimeFiles) {
  const source = path.join(root, item.file);
  const destination = path.join(archive, 'runtime', item.file);
  if (fs.existsSync(source)) {
    if (hash(fs.readFileSync(source)) !== item.sha256)
      throw new Error(`Changed since withdrawal planned: ${item.file}`);
    if (fs.existsSync(destination)) throw new Error(`Both source and archive exist: ${item.file}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(source, destination);
  }
  if (hash(fs.readFileSync(destination)) !== item.sha256) throw new Error(`Archive mismatch: ${item.file}`);
}
function removeEmpty(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
  for (const entry of fs.readdirSync(dir)) removeEmpty(path.join(dir, entry));
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}
for (const relative of manifest.runtimeRoots) removeEmpty(path.join(root, relative));
manifest.status = 'withdrawn';
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(
  path.join(base, 'generation-policy.json'),
  JSON.stringify(
    {
      animationDelivery: 'native-gif-only',
      allowComposedGifs: false,
      userInstruction: '不要合成, 你的gpt image 工具可以直接生成gif',
      withdrawalManifest: 'audit/withdrawn-composites/withdrawal.json',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    withdrawnPrompts: manifest.items.length,
    withdrawnMedia: manifest.removedMedia.length,
    archivedFiles: manifest.runtimeFiles.length,
  }),
);
