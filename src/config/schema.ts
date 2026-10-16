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

/** Keys reserved by step 1a for later steps (design doc §17.4); the owning step tightens each schema. */
const reserved = z.array(z.unknown()).default([]);

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
    // Home first screen showcase (§11.8.1), owned by step 4b.
    home: z.object({ featured: reserved }).strict().default({ featured: [] }),
    // List showcase band and editorial interludes (§11.8.2), owned by step 3a.
    feed: z.object({ showcase: reserved, interludes: reserved }).strict().default({ showcase: [], interludes: [] }),
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
