import type { NextConfig } from 'next';

// BASE_PATH is inlined at build time (memo §1): changing it requires a rebuild.
const basePath = process.env.BASE_PATH ?? '/prompt-seen';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_ORIGIN: process.env.SITE_ORIGIN ?? 'https://example.com',
  },
};

export default nextConfig;
