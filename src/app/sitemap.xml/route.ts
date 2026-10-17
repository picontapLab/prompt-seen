import { sitemapRefs } from '@/modules/seo/sitemaps';
import { sitemapIndexXml } from '@/modules/seo/sitemap';
import { pageSections } from '@/ui/navigation/sections';

// The sitemap index at the base path (design doc §9.3): one sitemap per public locale. Named in
// robots.txt (or the host's, §15.4.3) and submitted to Search Console.
export const dynamic = 'force-static';

export function GET() {
  return new Response(sitemapIndexXml(sitemapRefs(pageSections())), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
