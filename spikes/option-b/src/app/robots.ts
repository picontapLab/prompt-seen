import type { MetadataRoute } from 'next';
import { absUrl } from '@/lib/site.mjs';

export const dynamic = 'force-static';

// Only effective at a root deployment; under a subpath the host's /robots.txt rules (memo §1).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: absUrl('/sitemap.xml') };
}
