import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { writeGeneratedConfig } from './src/config/generate';

// Static export with a build-time base path (design doc §3.2, §15.4). Changing the base
// path requires a rebuild; `npm run build` packages out/ into dist/{basePath}/.
// Regenerating here keeps the app's constants (`@/config`) identical to this configuration,
// even when `next dev` or `next build` is started without `npm run gen`.
const site = writeGeneratedConfig();

const nextConfig: NextConfig = {
  output: 'export',
  basePath: site.basePath || undefined,
  trailingSlash: true,
  // Images are pre-sized at import time and served from the CDN (§10); no default loader.
  images: { unoptimized: true },
  // One build identifier for pages, generated data and indexes (§14.4).
  generateBuildId: () => site.buildId,
  poweredByHeader: false,
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
