import { builtLocales, localeByPrefix } from '@/config';
import { indexableLocales, localeSitemapUrls } from '@/modules/seo/sitemaps';
import { urlsetXml } from '@/modules/seo/sitemap';
import { pageSections } from '@/ui/navigation/sections';

// One locale's sitemap (design doc §9.3, §9.7): its published pages with their last content
// change and main image. Only public locales have one; preview-only locales never do. Named
// sitemap-pages.xml because Next.js treats any …/sitemap.xml route as a metadata route and
// prerenders dynamic ones with a placeholder locale.
export const dynamic = 'force-static';
export const dynamicParams = false;

// Route handlers are outside the [locale] layout and get no parent params.
export const generateStaticParams = () => {
  const locales = indexableLocales();
  // Static export needs a param even when every external output is excluded in preview.
  // Packaging removes this empty placeholder sitemap.
  return (locales.length ? locales : builtLocales.slice(0, 1)).map((locale) => ({ locale: locale.pathPrefix }));
};

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const locale = localeByPrefix((await params).locale)!;
  return new Response(urlsetXml(localeSitemapUrls(locale, pageSections())), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
