import { defineConfig } from '@playwright/test';
import base from './playwright.global-design.config';

export default defineConfig({
  ...base,
  testMatch: /mobile-(experience|remediation)\.spec\.ts/,
  workers: 2,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4201' },
  projects: [
    { name: 'mouse', use: { hasTouch: false } },
    { name: 'touch', use: { hasTouch: true, isMobile: true } },
  ],
  webServer: {
    ...base.webServer,
    command: 'npm run dev -- --host 127.0.0.1 --port 4201',
    url: 'http://127.0.0.1:4201',
  },
});
