import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/quality',workers:1,timeout:120_000,reporter:[['list']],outputDir:'/tmp/aevic-quality-results',
 use:{baseURL:'http://127.0.0.1:4190',serviceWorkers:'block'},
 webServer:{command:'node tests/helpers/serve-public-build.mjs',env:{AEVIC_TEST_BUILD_PORT:'4190'},url:'http://127.0.0.1:4190',reuseExistingServer:false},
});
