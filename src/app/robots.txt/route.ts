import { robotsDocument } from '@/modules/geo';

// robots.txt (design doc §9.10.2, §15.4.3). It takes effect only at the root of a host; under a
// subpath the host merges deploy/generated/robots-snippet.txt into its own file instead.
export const dynamic = 'force-static';

export function GET() {
  return new Response(robotsDocument(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
