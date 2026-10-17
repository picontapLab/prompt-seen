import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    '.deploy/**',
    'public/generated/**',
    '.generated/**',
    'deploy/generated/**',
    'src/config/generated/**',
    'next-env.d.ts',
    'spikes/**',
    'design/**',
    'test-results/**',
    'playwright-report/**',
    'storybook-static/**',
    '.claude/**',
  ]),
  {
    // Static export has no image optimizer: media:import generates the display sizes and
    // `@/modules/media` builds srcset, so plain <img> is intended (design doc §10.2, §10.3).
    files: ['src/**/*.tsx'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // App code gets configuration from `@/config` and addresses from `@/modules/url` (§4.1).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/config/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration from `@/config`, not the environment (design doc §4.1).',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/config/**', 'src/modules/url/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration from `@/config`, not the environment (design doc §4.1).',
        },
        { object: 'config', property: 'origin', message: 'Build addresses with `@/modules/url` (design doc §4.1).' },
        { object: 'config', property: 'basePath', message: 'Build addresses with `@/modules/url` (design doc §4.1).' },
        {
          object: 'config',
          property: 'urlPattern',
          message: 'Build addresses with `@/modules/url` (design doc §4.1).',
        },
      ],
    },
  },
]);
