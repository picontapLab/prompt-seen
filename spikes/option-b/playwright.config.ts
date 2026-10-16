import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 8090);
// Default to the locally installed Google Chrome; PW_BROWSERS=all also runs
// Firefox and WebKit (needs `npx playwright install firefox webkit`).
const all = process.env.PW_BROWSERS === 'all';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome' } },
    ...(all
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  // Tests always run against the static export served by the reference nginx.
  webServer: {
    command: 'sh scripts/nginx.sh',
    url: `http://127.0.0.1:${port}/prompt-seen/`,
    reuseExistingServer: true,
    timeout: 60_000,
    // SIGTERM reaches `docker run` (sig-proxy) so the --rm container stops with the run.
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
