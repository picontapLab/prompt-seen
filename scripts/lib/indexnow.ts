// IndexNow (design doc §9.9): after a production deploy, tell Bing, Naver, Yandex and the other
// participating engines which addresses were added, changed or removed. The list comes from the
// site's own sitemaps before and after the deploy, so it is exactly the content difference.
// Pure helpers; scripts/indexnow.ts does the fetching and submitting.

/** Engines share submissions; one endpoint is enough (indexnow.org/documentation). */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
/** At most this many URLs per POST. */
export const INDEXNOW_BATCH = 10_000;

const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

/**
 * The deployment's key (environment INDEXNOW_KEY), or null when IndexNow is not set up. The key
 * is published in a file, so it is not a secret, but each instance needs its own.
 */
export function readIndexNowKey(env: Readonly<Record<string, string | undefined>>): string | null {
  const key = env.INDEXNOW_KEY?.trim();
  if (!key) return null;
  if (!KEY_PATTERN.test(key))
    throw new Error('INDEXNOW_KEY must be 8–128 characters of a–z, A–Z, 0–9 and "-", e.g. `openssl rand -hex 16`');
  return key;
}

/**
 * The key file sits at the base path, so it covers every address of the site and nothing else
 * of the host: an IndexNow key file vouches only for URLs in and below its own directory.
 */
export const keyFilePath = (key: string) => `/${key}.txt`;

export type SitemapEntry = { loc: string; lastmod: string | null };

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** `<sitemap><loc>` addresses of a sitemap index. */
export function sitemapIndexLocs(xml: string): string[] {
  return [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)]
    .map((m) => /<loc>([\s\S]*?)<\/loc>/.exec(m[1]!)?.[1])
    .filter((loc): loc is string => !!loc)
    .map((loc) => decode(loc.trim()));
}

/** `<url>` entries of a sitemap. Image entries inside a `<url>` are not addresses of their own. */
export function sitemapEntries(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap((m) => {
    const body = m[1]!.replace(/<image:image>[\s\S]*?<\/image:image>/g, '');
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(body)?.[1];
    if (!loc) return [];
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(body)?.[1]?.trim() ?? null;
    return [{ loc: decode(loc.trim()), lastmod }];
  });
}

export type UrlSnapshot = {
  /** The address the snapshot was read from. */
  sitemap: string;
  /** False when the site had no sitemap yet (first deploy). */
  found: boolean;
  urls: Record<string, string | null>;
};

export type UrlChanges = { added: string[]; changed: string[]; removed: string[] };

/**
 * What to submit. A first deploy (nothing before) submits every address. A changed `lastmod` is
 * a change; addresses without dates on either side cannot be compared and are left out.
 */
export function diffSnapshots(before: UrlSnapshot, after: UrlSnapshot): UrlChanges {
  const added: string[] = [];
  const changed: string[] = [];
  for (const [loc, lastmod] of Object.entries(after.urls)) {
    if (!(loc in before.urls)) added.push(loc);
    else if (lastmod !== before.urls[loc] && (lastmod || before.urls[loc])) changed.push(loc);
  }
  const removed = before.found ? Object.keys(before.urls).filter((loc) => !(loc in after.urls)) : [];
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

/** POST bodies for the changes, at most INDEXNOW_BATCH addresses each. */
export function submissions(
  changes: UrlChanges,
  opts: { host: string; key: string; keyLocation: string },
): { host: string; key: string; keyLocation: string; urlList: string[] }[] {
  const all = [...changes.added, ...changes.changed, ...changes.removed];
  const foreign = all.filter((u) => new URL(u).host !== opts.host);
  if (foreign.length) throw new Error(`addresses outside ${opts.host}: ${foreign.slice(0, 3).join(', ')}`);
  const out = [];
  for (let i = 0; i < all.length; i += INDEXNOW_BATCH)
    out.push({
      host: opts.host,
      key: opts.key,
      keyLocation: opts.keyLocation,
      urlList: all.slice(i, i + INDEXNOW_BATCH),
    });
  return out;
}

/** What each IndexNow status means (indexnow.org/documentation). */
export function describeStatus(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: 'submitted' };
    case 202:
      return { ok: true, message: 'received; the key is being validated' };
    case 400:
      return { ok: false, message: 'invalid format' };
    case 403:
      return { ok: false, message: 'key not valid: the key file is missing or does not contain the key' };
    case 422:
      return { ok: false, message: 'addresses do not belong to the host, or the key does not match' };
    case 429:
      return { ok: false, message: 'too many requests' };
    default:
      return { ok: false, message: `unexpected status ${status}` };
  }
}
