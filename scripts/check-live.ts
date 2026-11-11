// check:live: checks a deployed site from outside (design doc §15.2, §15.4.4, §9.10.2, §9.7).
// The deploy runs it after every production deploy; maintainers run it against the host site.
//
//   npm run check:live                           the canonical site (SITE_ORIGIN, base path)
//   npm run check:live -- --site <url> --platform  a platform address (e.g. *.pages.dev): expects noindex
//   npm run check:live -- --expect-build <id>      and that this build is the one being served
//   npm run check:live -- --expect-build <id> --wait 180   first wait up to 180 s for it (host caches)
//
// Checks: the build's own build.json; default home, every public locale's home, a Prompt and
// a template per locale and a list page answer 200 with the canonical address and the right
// indexing; sitemaps; Markdown and llms.txt types; a redirect, a removed address and an unknown
// one; the host's robots.txt carries this site's rules and sitemap; pages answer search and AI
// crawlers' user agents with the full page (edge rules, §9.10.2); images on the CDN. Prints ✓, !
// (warning) or ✗ per check and exits 1 when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import type { ContentManifest } from '../src/modules/content/types';
import { CRAWLERS } from '../src/modules/geo/robots';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { isAllowed, parseRobots } from './lib/live/robots';
import { ROOT } from './lib/paths';
import { sitemapEntries, sitemapIndexLocs } from './lib/indexnow';

const { values } = parseArgs({
  options: {
    site: { type: 'string' },
    platform: { type: 'boolean' },
    'expect-build': { type: 'string' },
    wait: { type: 'string' },
  },
});
const config = loadConfig(ROOT);
const site = (values.site ?? config.origin).replace(/\/+$/, '');
const platform = !!values.platform;

type Result = 'pass' | 'warn' | 'fail';
const results: { result: Result; message: string }[] = [];
const report = (result: Result, message: string) => {
  results.push({ result, message });
  console.log(`${{ pass: '✓', warn: '!', fail: '✗' }[result]} ${message}`);
};

const UA = 'Mozilla/5.0 (compatible; prompt-seen-check-live/1.0)';
async function get(address: string, init: { method?: string; agent?: string } = {}) {
  return fetch(address, {
    method: init.method ?? 'GET',
    redirect: 'manual',
    headers: { 'user-agent': init.agent ?? UA, 'accept-language': 'de-DE,de;q=0.9' },
    signal: AbortSignal.timeout(20_000),
  });
}

const canonicalOf = (html: string) =>
  /<link[^>]+rel="canonical"[^>]*href="([^"]+)"/.exec(html)?.[1] ??
  /<link[^>]+href="([^"]+)"[^>]*rel="canonical"/.exec(html)?.[1] ??
  null;
const metaRobots = (html: string) =>
  [...html.matchAll(/<meta[^>]+name="robots"[^>]*content="([^"]+)"/g)].map((m) => m[1]!.toLowerCase()).join(', ');

async function main() {
  // The build being served tells the rest: its origin, base path, locales and image host.
  const local = createUrlModule(urlConfigOf(config));
  const at = (internal: string) => `${site}${local.withBasePath(internal)}`;
  const infoAddress = at(local.paths.generated('build.json'));
  // After a deploy the host's cache may still serve the previous build for a moment.
  const deadline = Date.now() + Number(values.wait ?? 0) * 1000;
  while (values['expect-build'] && Date.now() < deadline) {
    const res = await get(infoAddress).catch(() => null);
    const served = res?.ok ? ((await res.json()) as { buildId?: string }).buildId : null;
    if (served === values['expect-build']) break;
    console.log(`  waiting for build ${values['expect-build']} (serving ${served ?? 'nothing'})…`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const infoRes = await get(infoAddress).catch((e: Error) => e);
  if (infoRes instanceof Error || !infoRes.ok) {
    report('fail', `${infoAddress}: ${infoRes instanceof Error ? infoRes.message : infoRes.status}`);
    return;
  }
  const build = (await infoRes.json()) as {
    buildId: string;
    buildMode: string;
    origin: string;
    basePath: string;
    urlPattern: string;
    defaultLocale: string;
    mediaBaseUrl?: string | null;
    locales: { code: string; pathPrefix: string; enabled: boolean; localization?: { coverage: string } }[];
  };
  const url = createUrlModule(
    urlConfigOf({
      origin: build.origin,
      basePath: build.basePath,
      urlPattern: build.urlPattern,
      defaultLocale: build.defaultLocale,
      locales: build.locales as never,
      media: { baseUrl: build.mediaBaseUrl ?? null },
    }),
  );
  const fetchUrl = (internal: string) => `${site}${url.withBasePath(internal)}`;

  report(
    build.buildMode === 'production' ? 'pass' : 'fail',
    `build ${build.buildId} (${build.buildMode}) for ${build.origin}${build.basePath}/`,
  );
  if (values['expect-build'])
    report(
      build.buildId === values['expect-build'] ? 'pass' : 'fail',
      `serves build ${values['expect-build']}${build.buildId === values['expect-build'] ? '' : ` (found ${build.buildId})`}`,
    );

  /** Page metadata must agree with its sitemap eligibility; platform headers always prevent indexing. */
  async function page(internal: string, label: string, opts: { quiet?: boolean; indexable?: boolean } = {}) {
    const address = fetchUrl(internal);
    const res = await get(address);
    if (res.status !== 200) return (report('fail', `${label}: ${res.status} ${address}`), null);
    const html = await res.text();
    const problems: string[] = [];
    if (!(res.headers.get('content-type') ?? '').startsWith('text/html'))
      problems.push(`type ${res.headers.get('content-type')}`);
    const canonical = canonicalOf(html);
    if (canonical !== url.absoluteUrl(internal)) problems.push(`canonical ${canonical ?? 'missing'}`);
    const header = (res.headers.get('x-robots-tag') ?? '').toLowerCase();
    const meta = metaRobots(html);
    const indexable = opts.indexable !== false;
    if (platform && !header.includes('noindex')) problems.push('no X-Robots-Tag: noindex on the platform address');
    if (!platform && header.includes('noindex'))
      problems.push(`X-Robots-Tag: ${header} on the canonical host; does the host forward the platform header?`);
    if (indexable && meta.includes('noindex')) problems.push('noindex metadata on a sitemap-listed page');
    if (!indexable && !meta.includes('noindex'))
      problems.push('missing noindex metadata on a home outside its sitemap');
    if (problems.length) report('fail', `${label}: ${problems.join('; ')} (${address})`);
    else if (!opts.quiet)
      report('pass', `${label}: 200, canonical, ${platform || !indexable ? 'noindex' : 'indexable'}`);
    return problems.length ? null : html;
  }

  const publicLocales = build.locales.filter((l) => l.enabled);
  const homeEligibility = new Map<string, boolean>();

  // Sitemaps: index, one per public locale; representative pages from them.
  const indexAddress = fetchUrl(url.paths.sitemapIndex());
  const indexRes = await get(indexAddress);
  const samples: { label: string; internal: string }[] = [];
  if (!indexRes.ok) report('fail', `sitemap index: ${indexRes.status} ${indexAddress}`);
  else {
    const prefix = url.absoluteUrl('/');
    const locs = sitemapIndexLocs(await indexRes.text());
    const outside: string[] = [];
    let count = 0;
    for (const loc of locs) {
      const res = await get(`${site}${new URL(loc).pathname}`);
      if (!res.ok) {
        report('fail', `sitemap ${loc}: ${res.status}`);
        continue;
      }
      for (const e of sitemapEntries(await res.text())) {
        count++;
        if (!e.loc.startsWith(prefix)) outside.push(e.loc);
      }
    }
    report(
      locs.length === publicLocales.length && !outside.length ? 'pass' : 'fail',
      `sitemaps: ${locs.length} for ${publicLocales.length} public locale(s), ${count} addresses` +
        (outside.length ? `; ${outside.length} outside ${prefix}, e.g. ${outside[0]}` : ''),
    );
    for (const l of publicLocales) {
      const res = await get(fetchUrl(url.paths.sitemap(l.pathPrefix)));
      const entries = res.ok ? sitemapEntries(await res.text()) : [];
      // Incremental locales can have a browsable, non-indexable home (§5.2). Its
      // metadata must match the served sitemap, not merely the enabled flag.
      homeEligibility.set(
        l.code,
        entries.some((entry) => entry.loc === url.absoluteUrl(url.paths.home(l.pathPrefix))),
      );
      if (l.localization?.coverage === 'complete' && !homeEligibility.get(l.code))
        report('fail', `${l.code}: complete locale home is absent from its sitemap`);
      const internal = (loc: string) => url.stripBasePath(new URL(loc).pathname) ?? new URL(loc).pathname;
      const prompt = entries.find((e) => /\/prompts\/(?!page\/)[^/]+\/$/.test(e.loc));
      const template = entries.find((e) => /\/templates\/[^/]+\/$/.test(e.loc));
      const listPage = entries.find((e) => /\/prompts\/page\/2\/$/.test(e.loc));
      if (prompt) samples.push({ label: `${l.code} Prompt`, internal: internal(prompt.loc) });
      if (template) samples.push({ label: `${l.code} template`, internal: internal(template.loc) });
      if (listPage) samples.push({ label: `${l.code} list page 2`, internal: internal(listPage.loc) });
    }
  }
  await page(url.paths.siteRoot(), 'default-language home', { indexable: homeEligibility.get(build.defaultLocale) });
  for (const l of publicLocales)
    await page(url.paths.home(l.pathPrefix), `${l.code} home`, { indexable: homeEligibility.get(l.code) });
  let detailHtml: string | null = null;
  for (const s of samples) {
    const html = await page(s.internal, s.label);
    if (s.label.endsWith('Prompt') && html && !detailHtml) detailHtml = html;
  }

  // Machine-readable versions (§9.10.4).
  const prompt = samples.find((s) => s.label.endsWith('Prompt'));
  if (prompt) {
    const md = await get(fetchUrl(`${prompt.internal}index.md`));
    const type = md.headers.get('content-type') ?? '';
    const link = md.headers.get('link') ?? '';
    if (md.status !== 200 || !type.startsWith('text/markdown')) report('fail', `index.md: ${md.status} ${type}`);
    else if (!link.includes('rel="canonical"'))
      report('warn', 'index.md: no Link rel="canonical" header (host configuration)');
    else report('pass', 'index.md: Markdown with a canonical Link header');
  }
  const llms = await get(fetchUrl(url.paths.llms()));
  report(
    llms.status === 200 && (llms.headers.get('content-type') ?? '').startsWith('text/plain') ? 'pass' : 'fail',
    `llms.txt: ${llms.status} ${llms.headers.get('content-type') ?? ''}`,
  );
  const icon = await get(fetchUrl(url.paths.siteIcon()));
  report(icon.status === 200 ? 'pass' : 'fail', `site icon: ${icon.status}`);

  // Address changes and errors (§9.5, §15.4.4). Examples come from this commit's content build.
  const manifestFile = path.join(ROOT, '.generated/content/manifest.json');
  const manifest = fs.existsSync(manifestFile)
    ? (JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as ContentManifest)
    : null;
  const redirect = manifest?.redirects.find((r) => publicLocales.some((l) => r.from.startsWith(`/${l.pathPrefix}/`)));
  if (redirect) {
    const res = await get(fetchUrl(redirect.from));
    const location = res.headers.get('location') ?? '';
    const ok =
      [301, 308].includes(res.status) && new URL(location, fetchUrl('/')).pathname === url.withBasePath(redirect.to);
    report(ok ? 'pass' : 'fail', `redirect ${redirect.from}: ${res.status} → ${location || 'no Location'}`);
  }
  const gone = manifest?.gone.find((g) => publicLocales.some((l) => g.path.startsWith(`/${l.pathPrefix}/`)));
  if (gone) {
    const res = await get(fetchUrl(gone.path));
    report(
      res.status === 410 ? 'pass' : res.status === 404 ? 'warn' : 'fail',
      `removed ${gone.path}: ${res.status}${res.status === 404 ? ' (this host cannot answer 410; Google treats both alike)' : ''}`,
    );
  }
  const first = publicLocales[0];
  if (first) {
    const missing = await get(fetchUrl(`/${first.pathPrefix}/check-live-no-such-page/`));
    const body = await missing.text();
    report(
      missing.status === 404 && body.includes('data-error="404"') ? 'pass' : 'fail',
      `unknown address: ${missing.status}${body.includes('data-error="404"') ? ", the site's 404 page" : ", not the site's 404 page"}`,
    );
    const errorPage = await get(fetchUrl(url.paths.notFound(first.pathPrefix)));
    report(
      errorPage.status === 200 ? 'warn' : 'pass',
      `error page address ${url.paths.notFound(first.pathPrefix)}: ${errorPage.status}` +
        (errorPage.status === 200 ? ' (served directly; it carries noindex, but an internal location is better)' : ''),
    );
  }

  // The host's robots.txt (§15.4.3): only on the canonical host.
  if (!platform) {
    const robotsAddress = `${new URL(build.origin).origin}/robots.txt`;
    const res = await get(robotsAddress);
    if (res.status !== 200)
      report('fail', `${robotsAddress}: ${res.status}; the host needs a robots.txt with this site's rules`);
    else {
      const robots = parseRobots(await res.text());
      const scope = url.withBasePath('/');
      const wrong = [
        ...['*', 'Googlebot', 'Bingbot', ...CRAWLERS.search, ...CRAWLERS.user].filter(
          (a) => !isAllowed(robots, a, scope),
        ),
        ...CRAWLERS.training.filter((a) => isAllowed(robots, a, scope) !== (config.robots.aiTraining === 'allow')),
      ];
      report(
        wrong.length ? 'fail' : 'pass',
        wrong.length
          ? `host robots.txt: wrong rule for ${scope} for ${wrong.join(', ')} (merge deploy/generated/robots-snippet.txt)`
          : `host robots.txt: search and AI search allowed, training ${config.robots.aiTraining === 'allow' ? 'allowed' : 'disallowed'} for ${scope}`,
      );
      const sitemap = url.absoluteUrl(url.paths.sitemapIndex());
      report(robots.sitemaps.includes(sitemap) ? 'pass' : 'fail', `host robots.txt: Sitemap: ${sitemap}`);
    }
  }

  // Edge rules (§9.10.2): crawlers that robots.txt allows must get the page, not a block or a
  // challenge. A user agent alone is not a verified crawler: a firewall that verifies crawlers
  // by IP can still treat the real ones differently; confirm in the platform's bot logs.
  if (prompt) {
    const allowed = [
      'Googlebot',
      'Bingbot',
      ...CRAWLERS.search,
      ...CRAWLERS.user,
      ...(config.robots.aiTraining === 'allow' ? CRAWLERS.training : []),
    ];
    const blocked: string[] = [];
    for (const agent of allowed) {
      const res = await get(fetchUrl(prompt.internal), { agent: `Mozilla/5.0 (compatible; ${agent}/1.0)` });
      const html = res.status === 200 ? await res.text() : '';
      if (res.status !== 200 || canonicalOf(html) !== url.absoluteUrl(prompt.internal))
        blocked.push(`${agent} ${res.status}`);
    }
    report(
      blocked.length ? 'fail' : 'pass',
      blocked.length
        ? `crawler user agents blocked or challenged: ${blocked.join(', ')}`
        : `${allowed.length} crawler user agents get the full page (confirm verified bots in the platform's logs)`,
    );
  }

  // Images on the CDN (§9.7, §10.1).
  if (build.mediaBaseUrl && detailHtml) {
    const image = /<meta[^>]+property="og:image"[^>]*content="([^"]+)"/.exec(detailHtml)?.[1];
    if (image) {
      const res = await get(image, { method: 'HEAD' });
      report(
        res.status === 200 && (res.headers.get('content-type') ?? '').startsWith('image/') ? 'pass' : 'fail',
        `CDN image: ${res.status} ${res.headers.get('content-type') ?? ''} ${image}`,
      );
    }
    const cdnRobots = await get(`${new URL(build.mediaBaseUrl).origin}/robots.txt`);
    if (cdnRobots.status === 200) {
      const robots = parseRobots(await cdnRobots.text());
      const mediaPath = `${new URL(build.mediaBaseUrl).pathname.replace(/\/$/, '')}/media/`;
      const ok = ['Googlebot-Image', 'Googlebot', 'Bingbot'].every((a) => isAllowed(robots, a, mediaPath));
      report(ok ? 'pass' : 'fail', `CDN robots.txt ${ok ? 'allows' : 'blocks'} image crawlers on ${mediaPath}`);
    } else report('pass', `CDN robots.txt: ${cdnRobots.status} (nothing blocks image crawlers)`);
  }
}

main()
  .catch((error: unknown) => report('fail', error instanceof Error ? error.message : String(error)))
  .finally(() => {
    const count = (r: Result) => results.filter((x) => x.result === r).length;
    console.log(`check:live: ${count('pass')} passed, ${count('warn')} warning(s), ${count('fail')} failed (${site})`);
    if (count('fail')) process.exit(1);
  });
