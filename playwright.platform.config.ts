import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/platform-browser',workers:1,fullyParallel:false,timeout:45_000,
 use:{baseURL:'http://127.0.0.1:4194',...devices['Desktop Chrome'],trace:'retain-on-failure'},
 outputDir:'/tmp/aevic-platform-browser-results',
 webServer:{command:'node tests/helpers/serve-platform-build.mjs',url:'http://127.0.0.1:4194',reuseExistingServer:false,timeout:60_000,env:{AEVIC_DATABASE_URL:'',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_ANON_KEY:''}},
});
