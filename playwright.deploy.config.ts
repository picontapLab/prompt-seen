import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/deploy',
  outputDir: '.artifacts/deploy-smoke',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalTimeout: 5 * 60_000,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  // Private injection must never end up in a public trace, screenshot, or HTML report.
  use: { ...devices['Desktop Chrome'], trace: 'off', screenshot: 'off', video: 'off' },
});
