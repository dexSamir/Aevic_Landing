import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'public-shell-contract.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: { channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'mock-desktop', use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 900 } } },
    { name: 'mock-mobile', use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 } } },
    { name: 'api-desktop', use: { baseURL: 'http://127.0.0.1:4176', viewport: { width: 1440, height: 900 } } },
    { name: 'api-mobile', use: { baseURL: 'http://127.0.0.1:4176', viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
    { command: 'node tests/helpers/serve-public-build.mjs', url: 'http://127.0.0.1:4176', reuseExistingServer: !process.env.CI },
  ],
});
