import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/workspace-design/**/*.spec.ts', '**/e2e/team-workspace-rebuild.spec.ts'],
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4192', ...devices['Desktop Chrome'], trace:'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4192',
    url: 'http://127.0.0.1:4192', reuseExistingServer: false,
    env: { AEVIC_DATABASE_URL:'', SUPABASE_URL:'', SUPABASE_PUBLISHABLE_KEY:'', SUPABASE_ANON_KEY:'' },
  },
});
