import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',timeout:45_000,expect:{timeout:10_000},workers:1,retries:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4180',channel:'chrome',screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:[{name:'desktop-chrome',use:{...devices['Desktop Chrome']}},{name:'mobile-chrome',use:{...devices['Pixel 5']}}],
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4180 --strictPort',url:'http://127.0.0.1:4180',reuseExistingServer:!process.env.CI},
});
