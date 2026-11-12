import { defineConfig, devices, type Project } from '@playwright/test';
import { BASE, PORT } from './tests/e2e/support/artifact';

// Tests run against dist/ served by the reference nginx (scripts/nginx.sh); build first.
// PW_BROWSERS picks browser projects: CI runs chromium, firefox and webkit; locally the
// default is the installed Google Chrome ("chrome"). Raw HTTP checks run once, browser-free.
const browsers = (process.env.PW_BROWSERS ?? (process.env.CI ? 'chromium,firefox,webkit' : 'chrome'))
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const browserProjects: Record<string, Project> = {
  chrome: { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  chromium: { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] } },
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  globalTimeout: process.env.CI ? (browsers.includes('webkit') ? 45 : 30) * 60_000 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }], ['./scripts/lib/playwright-reporter.ts']]
    : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // A worker keeps every recorded trace (screencast frames included) on disk until it exits, even
    // for tests that pass. Recording every test previously filled the runner disk (ENOSPC).
    // CI records only the retry of a failed test; each browser job uses two workers.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    // Written only for a failed attempt, so a flaky test's first failure leaves evidence too.
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'http', testMatch: /\.http\.spec\.ts$/ },
    ...browsers.map((b) => {
      const project = browserProjects[b];
      if (!project) throw new Error(`PW_BROWSERS: unknown browser "${b}"`);
      return { ...project, testMatch: /\.browser\.spec\.ts$/ };
    }),
  ],
  webServer: {
    command: 'sh scripts/nginx.sh',
    url: `http://127.0.0.1:${PORT}${BASE}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // SIGTERM reaches `docker run` so the --rm container stops with the run.
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
