// IndexNow submission after a production deploy (design doc §9.9). Two steps around the deploy:
//
//   npm run indexnow -- snapshot --out .deploy/urls-before.json   before: the live sitemaps
//   npm run indexnow -- submit --before .deploy/urls-before.json  after: diff and submit
//
// Both read the sitemaps of the canonical site (SITE_ORIGIN + base path), so the list is the
// content difference the deploy made: new, changed (lastmod) and removed addresses. `--dry-run`
// prints the list without submitting. Without INDEXNOW_KEY, `submit` reports a notice and exits 0.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import {
  describeStatus,
  diffSnapshots,
  INDEXNOW_ENDPOINT,
  keyFilePath,
  readIndexNowKey,
  sitemapEntries,
  sitemapIndexLocs,
  submissions,
  type UrlSnapshot,
} from './lib/indexnow';
import { ROOT } from './lib/paths';

const config = loadConfig(ROOT);
const url = createUrlModule(urlConfigOf(config));

function fail(message: string): never {
  console.error(`indexnow: ${message}`);
  process.exit(1);
}

async function get(address: string): Promise<Response> {
  return fetch(address, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'prompt-seen-indexnow' } });
}

/** Every address in the live sitemaps, with its lastmod. A missing index is a first deploy. */
async function snapshot(opts: { tolerant: boolean }): Promise<UrlSnapshot> {
  const sitemap = url.absoluteUrl(url.paths.sitemapIndex());
  const res = await get(sitemap).catch((error: Error) => error);
  // Before the first deploy (or while the host does not forward yet) there is nothing to compare;
  // submitting every address then is harmless.
  if (res instanceof Error || res.status === 404 || (opts.tolerant && !res.ok)) {
    if (res instanceof Error || res.status !== 404)
      console.log(
        `::warning::${sitemap}: ${res instanceof Error ? res.message : res.status}; treating the site as new`,
      );
    return { sitemap, found: false, urls: {} };
  }
  if (!res.ok) fail(`${sitemap} answered ${res.status}`);
  const urls: Record<string, string | null> = {};
  for (const loc of sitemapIndexLocs(await res.text())) {
    const part = await get(loc);
    if (!part.ok) fail(`${loc} answered ${part.status}`);
    for (const e of sitemapEntries(await part.text())) urls[e.loc] = e.lastmod;
  }
  return { sitemap, found: true, urls };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string' }, before: { type: 'string' }, 'dry-run': { type: 'boolean' } },
  });
  const command = positionals[0];
  if (config.buildMode !== 'production' && !values['dry-run'])
    fail('only production builds submit (BUILD_MODE=production); use --dry-run to look');

  if (command === 'snapshot') {
    if (!values.out) fail('snapshot needs --out <file>');
    const snap = await snapshot({ tolerant: true });
    fs.mkdirSync(path.dirname(values.out), { recursive: true });
    fs.writeFileSync(values.out, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(
      `indexnow: ${snap.found ? `${Object.keys(snap.urls).length} addresses` : 'no sitemap yet (first deploy)'} in ${values.out}`,
    );
    return;
  }

  if (command !== 'submit') fail('usage: indexnow snapshot --out <file> | indexnow submit --before <file> [--dry-run]');
  const key = readIndexNowKey(process.env);
  if (!key && !values['dry-run']) {
    console.log('::notice::IndexNow skipped: set INDEXNOW_KEY to submit changed addresses (docs/operations.md).');
    return;
  }
  if (!values.before || !fs.existsSync(values.before)) fail('submit needs --before <file> from `indexnow snapshot`');
  const before = JSON.parse(fs.readFileSync(values.before, 'utf8')) as UrlSnapshot;
  const after = await snapshot({ tolerant: false });
  if (!after.found) fail(`${after.sitemap} is missing after the deploy`);
  const changes = diffSnapshots(before, after);
  const count = changes.added.length + changes.changed.length + changes.removed.length;
  console.log(
    `indexnow: ${changes.added.length} new, ${changes.changed.length} changed, ${changes.removed.length} removed address(es)`,
  );
  if (values['dry-run']) {
    for (const [kind, list] of Object.entries(changes)) for (const u of list) console.log(`  ${kind.padEnd(7)} ${u}`);
    return;
  }
  if (!count) return;

  const keyLocation = url.absoluteUrl(keyFilePath(key!));
  const file = await get(keyLocation);
  if (!file.ok || (await file.text()).trim() !== key)
    fail(`${keyLocation} does not serve the key; was the build made with INDEXNOW_KEY?`);
  const host = new URL(config.origin).host;
  for (const body of submissions(changes, { host, key: key!, keyLocation })) {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const status = describeStatus(res.status);
    if (!status.ok) fail(`${body.urlList.length} address(es): ${res.status} ${status.message}`);
    console.log(`indexnow: ${body.urlList.length} address(es) ${status.message} (${res.status})`);
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
