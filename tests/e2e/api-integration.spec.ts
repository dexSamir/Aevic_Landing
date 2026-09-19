// Actual API adapter / route guards; explicit HTTP fixtures. No live Supabase claim.
import {test,expect} from '@playwright/test';
const empty=Object.fromEntries(['tournaments','teams','organizations','leaderboard','leaderboardTeams','playerPerformances','teamComparisonRecords','teamAchievements'].map(key=>[key,[]]));
test('local Hono returns a clear configuration error without fixture fallback',async({page})=>{
 const response=await page.request.get('/api/public/context');expect(response.status()).toBe(503);expect(await response.json()).toMatchObject({code:'SERVER_NOT_CONFIGURED'});
 await page.goto('/teams');await expect(page.getByText('Platform xidməti hələ konfiqurasiya edilməyib.')).toBeVisible();await expect(page.getByRole('button',{name:'Yenidən yoxla'})).toBeVisible();
});
test('empty public data renders a truthful empty directory',async({page})=>{
 await page.route('**/api/public/context',route=>route.fulfill({json:empty}));await page.goto('/teams');await expect(page.getByText('İlk komanda kimlikləri üçün yer açıqdır')).toBeVisible();await expect(page.getByText('Caspian Wolves',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('direct team and admin routes require a real session response',async({page})=>{
 await page.route('**/api/me/session',route=>route.fulfill({status:401,json:{code:'UNAUTHORIZED'}}));
 await page.goto('/team/profile');await expect(page).toHaveURL(/\/login$/);await expect(page.getByLabel('E-poçt')).toBeEditable();
 await page.goto('/admin/results');await expect(page).toHaveURL(/\/admin\/login$/);await expect(page.getByLabel('E-poçt')).toBeEditable();
});
