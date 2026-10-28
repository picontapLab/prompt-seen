// media:import (design doc §10.1, §14.1): process a local image, store the original and its
// display variants, and write content/media/<id>.yaml.
//
//   npm run media:import -- <image> --slug ink-portrait [--alt en="An ink portrait…"] [--alt zh-Hans="…"]
//        [--caption en="…"] [--creator "…"] [--credit "…"] [--copyright "…"] [--license "CC BY 4.0"]
//        [--license-url https://…] [--acquire-url https://…] [--source-url https://…]
//        [--source-type trainedAlgorithmicMedia] [--content-credentials unknown] [--id a_123] [--force]
//   npm run media:import -- --refresh a_001
//        regenerate the variants after editing focalPoint or credit in the YAML; new keys are
//        written and the old files are kept for rollback (§10.4).
// With MEDIA_STORAGE=s3 (and the S3_* variables, scripts/lib/media/storage.ts) files go to object
// storage instead of public/media/.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { contentDir } from '../src/config/load';
import { mediaSchema, processingSchema } from './lib/content/schemas';
import { importMedia, refreshMedia } from './lib/media/import';
import { localStorage, s3StorageFromEnv } from './lib/media/storage';
import { ROOT } from './lib/paths';

const usage = `Usage:
  npm run media:import -- <image> --slug <words-for-the-file-name> [--alt <locale>="text"]… [options]
  npm run media:import -- --refresh <asset-id>
Options: --caption <locale>="text"  --creator  --credit  --copyright  --license  --license-url
         --acquire-url  --source-url  --source-type <IPTC code>  --content-credentials present|absent|unknown
         --id a_123  --processing <yaml-file>  --force (import even if the same file was imported before)`;

function fail(message: string): never {
  console.error(`media:import: ${message}`);
  process.exit(1);
}

function localeMap(values: string[] | undefined, flag: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of values ?? []) {
    const m = /^([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)=(.+)$/s.exec(v);
    if (!m) fail(`--${flag} takes <locale>="text", e.g. --${flag} en="A quiet bamboo grove"`);
    map[m[1]!] = m[2]!.trim();
  }
  return map;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      slug: { type: 'string' },
      id: { type: 'string' },
      alt: { type: 'string', multiple: true },
      caption: { type: 'string', multiple: true },
      creator: { type: 'string' },
      credit: { type: 'string' },
      copyright: { type: 'string' },
      license: { type: 'string' },
      'license-url': { type: 'string' },
      'acquire-url': { type: 'string' },
      'source-url': { type: 'string' },
      'source-type': { type: 'string' },
      'content-credentials': { type: 'string' },
      refresh: { type: 'string' },
      processing: { type: 'string' },
      force: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }

  const dir = contentDir(ROOT);
  // MEDIA_STORAGE=s3 stores straight into object storage (§10.1); the default keeps files in
  // public/media/, committed with the content, and `media:sync` uploads them later.
  const storage = s3StorageFromEnv(process.env) ?? localStorage(path.join(ROOT, 'public'));
  if (values.refresh) {
    const media = await refreshMedia({ dir, storage, id: values.refresh });
    console.log(`media:import: refreshed ${media.id}`);
    return;
  }
  const source = positionals[0];
  if (!source || positionals.length !== 1 || !fs.existsSync(source)) fail(`give one existing image file\n${usage}`);
  const media = await importMedia({
    dir,
    storage,
    input: fs.readFileSync(source),
    slug: values.slug ?? '',
    id: values.id,
    force: values.force,
    metadata: {
      alt: localeMap(values.alt, 'alt'),
      caption: localeMap(values.caption, 'caption'),
      processing: values.processing
        ? processingSchema.parse(YAML.parse(fs.readFileSync(values.processing, 'utf8')))
        : undefined,
      credit: mediaSchema.shape.credit.parse({
        creator: values.creator ?? null,
        creditText: values.credit ?? null,
        copyrightNotice: values.copyright ?? null,
        sourceUrl: values['source-url'] ?? null,
        license: values.license ?? null,
        licenseUrl: values['license-url'] ?? null,
        acquireLicenseUrl: values['acquire-url'] ?? null,
      }),
      provenance: mediaSchema.shape.provenance.parse({
        digitalSourceType: values['source-type'] ?? 'trainedAlgorithmicMedia',
        contentCredentials: values['content-credentials'] ?? 'unknown',
      }),
    },
  });
  console.log(`media:import: ${media.id} (${media.width} × ${media.height}) stored in ${storage.name}`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
