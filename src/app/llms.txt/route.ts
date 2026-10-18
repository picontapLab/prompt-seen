import { geo } from '@/modules/geo';

// llms.txt at the base path (design doc §9.10.4): the site and its published Markdown versions.
export const dynamic = 'force-static';

export function GET() {
  return new Response(geo.llms(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
