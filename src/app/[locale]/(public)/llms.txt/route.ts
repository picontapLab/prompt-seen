import { builtLocales, localeByPrefix } from '@/config';
import { geo } from '@/modules/geo';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  const locale = builtLocales.find((entry) => entry.code === 'zh-Hans') ?? builtLocales[0]!;
  return [{ locale: locale.pathPrefix }];
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const locale = localeByPrefix((await params).locale);
  return new Response(locale?.code === 'zh-Hans' ? geo.llms(locale.code) : '', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
