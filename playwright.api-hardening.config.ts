import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'api-hardening.spec.ts', timeout: 30_000,
  workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4181', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'api-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'api-mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'AEVIC_TEST_BUILD_PORT=4181 node tests/helpers/serve-public-build.mjs',
    url: 'http://127.0.0.1:4181', reuseExistingServer: !process.env.CI,
  },
});
