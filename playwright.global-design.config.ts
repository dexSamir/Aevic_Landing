import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/global-design',timeout:30000,expect:{timeout:8000},workers:1,
 reporter:'list',use:{baseURL:'http://127.0.0.1:4198',screenshot:'off',video:'off',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4198',url:'http://127.0.0.1:4198',reuseExistingServer:false,env:{AEVIC_DATABASE_URL:'',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_ANON_KEY:''}},
});
