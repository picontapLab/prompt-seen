import { z } from 'zod';

// Schemas for content/site.yaml and content/locales.yaml (design doc §8.2, §15.4.2).
// Shared by the Node loader, the config generator and content:validate.

const basePath = z
  .string()
  .regex(/^(\/[a-z0-9][a-z0-9-]*)*$/, 'basePath is "" or lowercase segments like "/prompt-seen", no trailing slash');

const origin = z.url({ protocol: /^https?$/ }).refine((value) => {
  const url = new URL(value);
  return (url.pathname === '/' || url.pathname === '') && !value.endsWith('/') && !url.search && !url.hash;
}, 'origin is scheme + host only, e.g. "https://example.com" (no path, no trailing slash)');

const urlPattern = z
  .string()
  .refine(
    (value) => ['{basePath}', '{locale}', '{path}'].every((token) => value.includes(token)),
    'urlPattern must contain {basePath}, {locale} and {path}',
  );

/** An https address with an optional path and no trailing slash, e.g. "https://media.example.com/prompt-seen". */
const mediaBaseUrl = z.url({ protocol: /^https$/ }).refine((value) => {
  const url = new URL(value);
  return !value.endsWith('/') && !url.search && !url.hash;
}, 'media.baseUrl is an https address without a trailing slash, query or fragment, e.g. "https://media.example.com"');

const verificationToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, 'the content value of the verification meta tag, without quotes')
  .nullable()
  .default(null);

const analytics = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('none') }).strict(),
  // Cloudflare Web Analytics: visits, referrers and Core Web Vitals; `token` from its "Manage site".
  z
    .object({
      provider: z.literal('cloudflare'),
      token: z.string().regex(/^[0-9a-f]{32}$/, 'a 32-character site token'),
    })
    .strict(),
  // Plausible: `domain` is the site as registered there; `src` for a self-hosted script.
  z
    .object({
      provider: z.literal('plausible'),
      domain: z.string().min(1),
      src: z.url({ protocol: /^https$/ }).default('https://plausible.io/js/script.js'),
    })
    .strict(),
]);

// Entry IDs as content files write them; content:validate checks that they exist (§17.4).
const entryId = (prefix: 'p' | 't' | 'c') =>
  z.string().regex(new RegExp(`^${prefix}_\\d{3,}$`), `IDs look like "${prefix}_001"`);

/**
 * The list's showcase band (§11.8.2 "本周精选"): one annotated work shown large with its quote,
 * and up to two more beside it. The newest group whose `from` date has passed at build time is
 * shown; a group without a date is always eligible. Picks also lead the "featured" sort.
 */
const showcaseGroup = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are written YYYY-MM-DD')
      .optional(),
    lead: entryId('p'),
    works: z.array(entryId('p')).max(2).default([]),
  })
  .strict();

/**
 * A work on show on the home first screen (§11.8.1): an annotated prompt, from a date on. The
 * newest entry that has started at build time is shown first; "Another frame" steps through the
 * started entries, newest first. An entry without a date is always eligible, after dated ones.
 */
const featuredWork = z
  .object({
    prompt: entryId('p'),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are written YYYY-MM-DD')
      .optional(),
  })
  .strict();

/**
 * Editorial interludes between justified rows (§11.8.2), placed one per page of the list in
 * this order and repeated when the list is longer. Works wider than 2:1 or taller than 1:2 get
 * feature rows of their own wherever they fall (§11.1.4).
 */
const interlude = z.discriminatedUnion('type', [
  z.object({ type: z.literal('feature'), prompt: entryId('p') }).strict(),
  // Two or three templates; all templates (up to three) when omitted.
  z.object({ type: z.literal('templates'), templates: z.array(entryId('t')).min(2).max(3).optional() }).strict(),
  z.object({ type: z.literal('collection'), collection: entryId('c') }).strict(),
]);

export const siteSchema = z
  .object({
    siteName: z.string().min(1),
    origin,
    basePath,
    urlPattern: urlPattern.default('{basePath}/{locale}/{path}'),
    robots: z
      .object({
        // standalone: emit robots.txt; snippet: emit robots-snippet.txt for the host to merge (§15.4.3).
        mode: z.enum(['standalone', 'snippet']).default('standalone'),
        // Training crawlers (§9.10.2); search and user-triggered crawlers are always allowed.
        aiTraining: z.enum(['allow', 'disallow']).default('disallow'),
      })
      .strict()
      .default({ mode: 'standalone', aiTraining: 'disallow' }),
    shell: z
      .object({
        header: z.enum(['default', 'host']).default('default'),
        themeSource: z.string().min(1).default('system'),
      })
      .strict()
      .default({ header: 'default', themeSource: 'system' }),
    brand: z
      .object({
        // Overrides of brand-layer tokens (§11.1.9); must pass tokens-check again.
        tokens: z.string().nullable().default(null),
      })
      .strict()
      .default({ tokens: null }),
    // Home first screen showcase (§11.8.1), step 4b.
    home: z
      .object({ featured: z.array(featuredWork).default([]) })
      .strict()
      .default({ featured: [] }),
    // List showcase band and editorial interludes (§11.8.2), step 3a.
    feed: z
      .object({ showcase: z.array(showcaseGroup).default([]), interludes: z.array(interlude).default([]) })
      .strict()
      .default({ showcase: [], interludes: [] }),
    // Images (§10.1), step 5. `baseUrl` is the CDN address of the object storage, e.g.
    // "https://media.example.com"; keys are appended to it. null: images are files of the build
    // (local driver, public/media/), as in a fresh clone.
    media: z
      .object({ baseUrl: mediaBaseUrl.nullable().default(null) })
      .strict()
      .default({ baseUrl: null }),
    // Cookie-free visit statistics, AI referrals and real-user Core Web Vitals (§9.10.6, §16.1),
    // step 5. Production builds only; loaded after the page is idle (§16.4).
    analytics: analytics.default({ provider: 'none' }),
    // Site verification tags of webmaster tools (§9.9), step 5. Public values; null leaves the tag out.
    searchEngines: z
      .object({
        verification: z
          .object({
            google: verificationToken,
            bing: verificationToken,
            yandex: verificationToken,
            naver: verificationToken,
          })
          .strict()
          .default({ google: null, bing: null, yandex: null, naver: null }),
      })
      .strict()
      .default({ verification: { google: null, bing: null, yandex: null, naver: null } }),
  })
  .strict();

export const localeSchema = z
  .object({
    code: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/, 'BCP 47 tag such as "en", "zh-Hans" or "pt-BR"'),
    pathPrefix: z.string().regex(/^[a-z]{2,3}(-[a-z0-9]+)*$/, 'lowercase URL prefix such as "zh-hans"'),
    nativeName: z.string().min(1),
    htmlLang: z.string().min(1),
    direction: z.enum(['ltr', 'rtl']),
    // Meets the conditions to be public (§8.2). Production builds only these locales.
    enabled: z.boolean(),
    // Also built in preview mode, e.g. the Arabic draft used for layout testing (§17.3 step 2).
    preview: z.boolean().default(false),
    phase: z.union([z.literal(1), z.literal(2)]),
  })
  .strict()
  .refine((l) => l.pathPrefix === l.code.toLowerCase(), {
    message: 'pathPrefix must be the lowercase form of code (§8.2)',
    path: ['pathPrefix'],
  });

export const localesFileSchema = z
  .object({
    defaultLocale: z.string(),
    locales: z.array(localeSchema).min(1),
  })
  .strict()
  .superRefine((file, ctx) => {
    const codes = new Set<string>();
    file.locales.forEach((l, i) => {
      if (codes.has(l.code))
        ctx.addIssue({ code: 'custom', message: `duplicate locale code "${l.code}"`, path: ['locales', i, 'code'] });
      codes.add(l.code);
    });
    const def = file.locales.find((l) => l.code === file.defaultLocale);
    if (!def)
      ctx.addIssue({
        code: 'custom',
        message: `defaultLocale "${file.defaultLocale}" is not in locales`,
        path: ['defaultLocale'],
      });
    else if (!def.enabled)
      ctx.addIssue({ code: 'custom', message: 'defaultLocale must be enabled', path: ['defaultLocale'] });
  });

export const buildModeSchema = z.enum(['production', 'preview']);

export type SiteFile = z.infer<typeof siteSchema>;
export type LocaleEntry = z.infer<typeof localeSchema>;
export type LocalesFile = z.infer<typeof localesFileSchema>;
export type BuildMode = z.infer<typeof buildModeSchema>;

/** Fully resolved configuration: site.yaml + locales.yaml + environment overrides. */
export type ResolvedConfig = Omit<SiteFile, 'origin' | 'basePath'> & {
  origin: string;
  basePath: string;
  buildMode: BuildMode;
  buildId: string;
  defaultLocale: string;
  /** Every registered locale, in registry order. */
  locales: LocaleEntry[];
  /** Locales generated in this build: enabled ones, plus preview ones in preview mode. */
  builtLocales: LocaleEntry[];
};
