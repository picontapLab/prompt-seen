import { markdownDocument, markdownParams } from '@/modules/geo';

// The Markdown version of a prompt page (design doc §9.10.4), for AI tools and agents. Written at
// build time for published versions only; the HTML page declares it with rel="alternate", and
// the host adds a Link header pointing back at the HTML page as canonical (deploy/generated/).
export const dynamic = 'force-static';
export const dynamicParams = false;

// Route handlers are outside the [locale] layout and get no parent params: return both.
export const generateStaticParams = () => markdownParams('prompt');

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  return new Response(markdownDocument('prompt', locale, slug) ?? '', {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}
