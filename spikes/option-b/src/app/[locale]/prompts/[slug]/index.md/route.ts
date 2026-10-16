import { toMarkdown } from '@/lib/detail-model.mjs';
import { getDetail, localeParams, slugParams } from '@/lib/content';
import { absUrl, detailPath } from '@/lib/site.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
// Route handlers are not under the [locale] layout, so they get no parent params.
export function generateStaticParams() {
  return localeParams().flatMap((l) => slugParams().map((s) => ({ ...l, ...s })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const d = getDetail(locale, slug);
  return new Response(toMarkdown(d, absUrl(detailPath(locale, slug))), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}
