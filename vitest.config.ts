import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests sit next to the code they test (*.test.ts). Browser behaviour is tested with
// Playwright against the exported site in tests/e2e.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
