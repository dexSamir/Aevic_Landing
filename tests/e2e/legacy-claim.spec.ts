// Browser/API adapter integration with explicit HTTP fixtures, not live Supabase.
import {test,expect,type Page} from '@playwright/test';
const id='00000000-0000-4000-8000-000000000001';
const empty=Object.fromEntries(['tournaments','teams','organizations','leaderboard','leaderboardTeams','playerPerformances','teamComparisonRecords','teamAchievements'].map(key=>[key,[]]));
async function session(page:Page,role='visitor'){
 await page.route('**/api/admin/context',r=>r.fulfill({json:{currentTeam:null,tournaments:[],teams:[],slots:[],adminMessages:[],blacklist:[],organizations:[],teamAchievements:[]}}));
 await page.route('**/api/public/context',r=>r.fulfill({json:empty}));
 await page.route('**/api/me/session',r=>r.fulfill({json:{role,user:{id,role,firstName:'Synthetic',lastName:'Reviewer',email:'synthetic@example.test'}}}));
}
test('activation preserves input on backend error and gives a neutral accepted receipt',async({page})=>{
 await session(page);let fail=true;
 await page.route('**/api/auth/legacy-activation',r=>r.fulfill(fail?{status:503,json:{code:'SERVER_NOT_CONFIGURED'}}:{status:202,json:{accepted:true}}));
 await page.goto('/activate-legacy');await page.getByLabel('Email',{exact:true}).fill('synthetic@example.test');await page.getByLabel('Yeni şifrə').fill('Secure1234');await page.getByRole('button',{name:'Hesab üçün müraciət et'}).click();
 await expect(page.getByRole('alert')).toContainText('tamamlanmadı');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('synthetic@example.test');
 fail=false;await page.getByRole('button',{name:'Hesab üçün müraciət et'}).click();await expect(page.getByRole('status')).toContainText('çatdırılmasını');await expect(page.getByLabel('Yeni şifrə')).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('confirmed account submits a neutral claim and sees the server receipt after refresh',async({page})=>{
 await session(page);let claims:unknown[]=[];
 await page.route('**/api/me/legacy-roster',r=>r.fulfill({body:'null',contentType:'application/json'}));
 await page.route('**/api/me/legacy-claims',async r=>{if(r.request().method()==='POST'){expect(r.request().postDataJSON()).toEqual({sourceKey:'1'});claims=[{id,sourceKey:'1',status:'pending',createdAt:'2026-01-01'}];await r.fulfill({status:202,json:{accepted:true}});}else await r.fulfill({json:claims});});
 await page.goto('/account/legacy-claim');await page.getByLabel('Əvvəlki komanda nömrəsi').fill('1');await page.getByRole('button',{name:'Sahiblik yoxlaması istə'}).click();await expect(page.getByRole('status')).toContainText('mövcudluğunu');
 await page.reload();await expect(page.getByRole('combobox',{name:'Təsdiqlənən sorğu'}).locator('option').last()).toHaveText('1 · pending');await expect(page.getByRole('button',{name:'Komandanı bağla',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('admin review requires confirmation, uses backend version and displays a removable one-time code',async({page})=>{
 await session(page,'admin');await page.route('**/api/admin/legacy-teams',r=>r.fulfill({json:[]}));
 await page.route('**/api/admin/legacy-claims',r=>r.fulfill({json:[{id,userId:id,sourceKey:'1',status:'pending',version:3,createdAt:'2026-01-01',teamName:'Synthetic legacy',claimed:false,applicantEmail:'synthetic@example.test',legacyContact:{contact:'Synthetic test channel'}}]}));
 await page.route(`**/api/admin/legacy-claims/${id}/review`,r=>{expect(r.request().postDataJSON()).toEqual({decision:'approve',evidenceRef:id,expectedVersion:3});return r.fulfill({json:{code:'x'.repeat(43),expiresAt:'2026-09-21T12:00:00Z'}});});
 await page.goto('/admin/legacy-claims');await page.getByRole('combobox',{name:'Sahiblik sorğusu'}).selectOption(id);await page.getByLabel('Müstəqil yoxlama sübutunun UUID qeydi').fill(id);await expect(page.getByRole('button',{name:'Təsdiqlə və kod yarat'})).toBeDisabled();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Təsdiqlə və kod yarat'}).click();await expect(page.getByText('x'.repeat(43),{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Kodu ekrandan sil'}).click();await expect(page.getByText('x'.repeat(43),{exact:true})).toHaveCount(0);
});
