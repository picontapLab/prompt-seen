import type { StorybookConfig } from '@storybook/nextjs-vite';
import { CONFIG } from '../src/config/generated/config';

// Component state samples (design doc §11.1.7, §16.6): every primitive and brand element in
// light, dark, RTL and reduced motion, chosen from the toolbar.
const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  // Sample images (public/media/, committed) at the same addresses as on the site.
  staticDirs: [{ from: '../public', to: CONFIG.basePath || '/' }],
  // Storybook copies staticDirs. Vite's second public copy can race that copy and fail with EEXIST.
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    build: { ...viteConfig.build, copyPublicDir: false },
  }),
  core: { disableTelemetry: true },
};

export default config;
