import { defineConfig } from '@playwright/test';
const port = process.env.PERF_PORT || '4186';

export default defineConfig({
  testDir: './tests/performance', timeout: 45_000, workers: 1,
  reporter: [['list']],
  outputDir: '/tmp/aevic-performance-results',
  use: { baseURL: `http://127.0.0.1:${port}`, channel: 'chrome', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: {
    command: 'node tests/helpers/serve-public-build.mjs',
    env: { AEVIC_TEST_BUILD_ROOT: process.env.PERF_BUILD_ROOT || 'dist', AEVIC_TEST_BUILD_PORT: port },
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false,
  },
});
