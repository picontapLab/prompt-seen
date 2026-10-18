import type { ImageRef, ImageVariant, PromptDetail, TemplateDetail } from '@/modules/content/types';
import type { SeoLocale } from './build';

// Structured data (design doc §9.6): schema.org JSON-LD describing what the page shows. Pure:
// addresses come from the functions in `LdContext`, so the mapping is tested without a build.
// Pages render the result with <JsonLd> (./JsonLd.tsx) through the wrappers in ./index.ts.
//
// Rules from §9.6: no HowTo, SearchAction or FAQPage; a prompt is a CreativeWork, never an
// Article or Product; `inLanguage` is the page's language even when the prompt is in another;
// unknown fields are left out, never filled with placeholders.

export type JsonLdNode = { [key: string]: JsonLdValue };
type JsonLdValue = string | number | boolean | JsonLdNode | JsonLdValue[];

export type LdContext = {
  siteName: string;
  /** Internal path → canonical URL (`@/modules/url`). */
  absoluteUrl: (path: string) => string;
  /** Image variant → URL on the canonical host (`@/modules/media`). */
  absoluteImageUrl: (variant: ImageVariant) => string;
  /** Internal path of the language entry: the site as a whole, across locales (§8.2). */
  entryPath: string;
  /** Internal path of the site icon, the Organization's logo. */
  logoPath: string;
  /** Profiles of the site elsewhere (`sameAs`), such as its repository once it is public. */
  sameAs?: readonly string[];
};

/** One item of a visible breadcrumb; `href` is an internal path, or null when shown as text. */
export type LdCrumb = { label: string; href: string | null };

/** Drops null and undefined values, so unknown fields never appear (§9.6). */
function node(fields: Record<string, JsonLdValue | null | undefined>): JsonLdNode {
  const out: JsonLdNode = {};
  for (const [key, value] of Object.entries(fields)) if (value !== null && value !== undefined) out[key] = value;
  return out;
}

/** One JSON-LD document holding every node of a page. */
export function graph(...nodes: (JsonLdNode | null | undefined)[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': nodes.filter((n): n is JsonLdNode => !!n) };
}

/**
 * JSON-LD as script text. `<` is escaped so no string in the data can close the script element
 * (Next.js JSON-LD guide); JSON parsers read `<` back as `<`.
 */
export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------------------------------------
// Licences: schema.org `license` is a URL (Google image licence metadata requires one). Content
// files name licences ("CC BY 4.0"); well-known names map to their deeds, others stay named.

const LICENSE_URLS: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC BY NC SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'CC BY ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
  'CC BY NC ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  MIT: 'https://opensource.org/license/mit',
  'APACHE 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};

/** "CC BY 4.0", "CC-BY-4.0" (SPDX) and "cc by 4.0" are the same licence. */
const licenseKey = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, ' ');

/** The deed URL of a well-known licence name, or null. */
export function licenseUrl(name: string | null | undefined): string | null {
  return name ? (LICENSE_URLS[licenseKey(name)] ?? null) : null;
}

/** A `license` value: the deed URL when known, else a named CreativeWork; undefined when unknown. */
export function licenseValue(name: string | null | undefined): JsonLdValue | undefined {
  if (!name) return undefined;
  return licenseUrl(name) ?? { '@type': 'CreativeWork', name };
}

// ---------------------------------------------------------------------------------------------
// Site

const organizationId = (ctx: LdContext) => `${ctx.absoluteUrl(ctx.entryPath)}#organization`;

/** The project as an Organization: name, address, logo and profiles (§9.6 "语言首页"). */
export function organization(ctx: LdContext): JsonLdNode {
  return node({
    '@type': 'Organization',
    '@id': organizationId(ctx),
    name: ctx.siteName,
    url: ctx.absoluteUrl(ctx.entryPath),
    logo: ctx.absoluteUrl(ctx.logoPath),
    sameAs: ctx.sameAs?.length ? [...ctx.sameAs] : undefined,
  });
}

/** The site in one language, published by the Organization; for a locale's home page. */
export function website(page: { path: string; locale: SeoLocale }, ctx: LdContext): JsonLdNode {
  const url = ctx.absoluteUrl(page.path);
  return node({
    '@type': 'WebSite',
    '@id': `${url}#website`,
    url,
    name: ctx.siteName,
    inLanguage: page.locale.htmlLang,
    publisher: { '@id': organizationId(ctx) },
  });
}

/**
 * Who made something, from a name in a content file. Files hold names only: the site's own name
 * is the Organization, any other name is taken to be a person.
 */
function agent(name: string, ctx: LdContext, url?: string | null): JsonLdNode {
  if (name === ctx.siteName) return { '@type': 'Organization', '@id': organizationId(ctx), name };
  return node({ '@type': 'Person', name, url });
}

// ---------------------------------------------------------------------------------------------
// Images (§9.6 "详情主图", §9.7)

/** The largest re-encoded variant: the one a page shows when viewed large. */
const mainVariant = (image: ImageRef) =>
  image.variants.detail ?? image.variants.card ?? image.variants.original ?? image.variants.thumbnail;

/**
 * An image with its credit and licence. Google Images shows "Licensable" when `license` or
 * `acquireLicensePage` is present (§9.6); both are left out when unknown.
 */
export function imageObject(image: ImageRef, ctx: LdContext): JsonLdNode | null {
  const variant = mainVariant(image);
  if (!variant) return null;
  const { credit } = image;
  return node({
    '@type': 'ImageObject',
    contentUrl: ctx.absoluteImageUrl(variant),
    width: variant.width,
    height: variant.height,
    caption: image.caption,
    creator: credit.creator ? agent(credit.creator, ctx) : undefined,
    creditText: credit.creditText,
    copyrightNotice: credit.copyrightNotice,
    license: credit.licenseUrl ?? licenseUrl(credit.license),
    acquireLicensePage: credit.acquireLicenseUrl,
  });
}

// ---------------------------------------------------------------------------------------------
// Pages

/**
 * The visible breadcrumb as a BreadcrumbList (§9.6: identical to what the page shows). Google
 * needs an address on every item but the last, so a breadcrumb whose middle items are plain
 * text has no structured version.
 */
export function breadcrumbList(crumbs: readonly LdCrumb[], ctx: LdContext): JsonLdNode | null {
  if (crumbs.length < 2 || crumbs.slice(0, -1).some((c) => !c.href)) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) =>
      node({ '@type': 'ListItem', position: i + 1, name: c.label, item: c.href ? ctx.absoluteUrl(c.href) : null }),
    ),
  };
}

/**
 * A Prompt detail page (§9.6 "Prompt 详情"): the prompt as a CreativeWork whose `text` is the
 * prompt, in the page's language; its source template as `isBasedOn`.
 */
export function promptWork(detail: PromptDetail, locale: SeoLocale, ctx: LdContext): JsonLdNode {
  const url = ctx.absoluteUrl(detail.path);
  const template = detail.template && detail.relatedTemplates.find((x) => x.id === detail.template!.id);
  return node({
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    url,
    name: detail.title,
    description: detail.description,
    text: detail.prompt.text,
    inLanguage: locale.htmlLang,
    datePublished: detail.createdAt,
    dateModified: detail.updatedAt,
    author: detail.source.author ? agent(detail.source.author, ctx, detail.source.url) : undefined,
    license: licenseValue(detail.source.license),
    isBasedOn: template ? ctx.absoluteUrl(template.path) : undefined,
    image: imageObject(detail.cover, ctx),
  });
}

/** A template page (§9.6 "模板详情"): `text` is the default sample's prompt, `version` the current version. */
export function templateWork(detail: TemplateDetail, locale: SeoLocale, ctx: LdContext): JsonLdNode {
  const url = ctx.absoluteUrl(detail.path);
  return node({
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    url,
    name: detail.title,
    description: detail.description,
    text: detail.version.defaultPrompt,
    version: detail.version.id,
    inLanguage: locale.htmlLang,
    datePublished: detail.createdAt,
    dateModified: detail.updatedAt,
    image: detail.cover ? imageObject(detail.cover, ctx) : undefined,
  });
}

export type ListItemInput = { path: string; name: string };

/**
 * A list, topic or collection page (§9.6): CollectionPage whose ItemList holds this page's
 * items in visible order, numbered from `offset` + 1 so pages of one list never repeat a position.
 */
export function collectionPage(
  page: {
    path: string;
    locale: SeoLocale;
    name: string;
    description: string;
    items: readonly ListItemInput[];
    /** Items in the list before this page (pagination). */
    offset?: number;
  },
  ctx: LdContext,
): JsonLdNode {
  const url = ctx.absoluteUrl(page.path);
  const offset = page.offset ?? 0;
  return node({
    '@type': 'CollectionPage',
    '@id': url,
    url,
    name: page.name,
    description: page.description,
    inLanguage: page.locale.htmlLang,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, i) => ({
        '@type': 'ListItem',
        position: offset + i + 1,
        url: ctx.absoluteUrl(item.path),
        name: item.name,
      })),
    },
  });
}

/** The about page (§9.6): AboutPage whose main entity is the site's Organization. */
export function aboutPage(
  page: { path: string; locale: SeoLocale; name: string; description: string },
  ctx: LdContext,
): JsonLdNode {
  const url = ctx.absoluteUrl(page.path);
  return node({
    '@type': 'AboutPage',
    '@id': url,
    url,
    name: page.name,
    description: page.description,
    inLanguage: page.locale.htmlLang,
    mainEntity: { '@id': organizationId(ctx) },
  });
}
