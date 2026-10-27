import { currentTeam, leaderboard } from '../fixtures/platform-data';
import { test, expect } from '../helpers/api-fixture-test';
const sizes = [[320,568],[360,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]];
test('responsive results, download options and rulebook at all requested sizes',async({page})=>{
 test.setTimeout(180000);
 await page.route('**/api/team/tournaments/summer-final-25/result-export', route=>route.fulfill({json:{teamId:currentTeam.id,result:leaderboard.find(row=>row.teamId===currentTeam.id&&row.tournamentId==='summer-final-25')}}));
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  await page.goto('/tournaments/summer-final-25');
  const table=page.locator('#results table');await expect(table).toBeVisible();
  await table.scrollIntoViewIfNeeded();
  if(width===390)await page.screenshot({path:'/tmp/aevic-standings-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`results ${width}`).toBeLessThanOrEqual(1);
  if(width<=430) expect((await table.locator('tbody tr').first().boundingBox())!.height).toBeLessThanOrEqual(64);
  await page.getByRole('button',{name:'Nəticələri yüklə',exact:true}).click();
  const cards=page.locator('.results-download-options > button');await expect(cards).toHaveCount(2);
  const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height,right:r.right};}));
  expect(boxes[0].y).toBe(boxes[1].y);
  if(width<=430)expect(boxes[0].height).toBeGreaterThanOrEqual(156);
  expect(boxes[1].right).toBeLessThanOrEqual(width);
  await page.keyboard.press('Escape');
  await page.goto('/regulations');await expect(page.locator('.regulations-layout article > section')).toHaveCount(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`rules ${width}`).toBeLessThanOrEqual(1);
  await page.locator('nav[aria-label="Reqlament bölmələri"] a').nth(8).click();await expect(page).toHaveURL(/#rule-9$/);
 }
});
test('match tabs and browser history preserve results viewport and page instance',async({page})=>{
 await page.goto('/tournaments/daily-cup-24');
 const tabs=page.getByRole('tablist',{name:'Nəticə üzrə matç seçimi'});await tabs.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{document.querySelector('#results')?.setAttribute('data-instance','retained');});
 const before=await page.evaluate(()=>scrollY);
 await page.getByRole('tab',{name:'Matç 1',exact:true}).click();await expect(page).toHaveURL(/match=/);
 await expect(page.locator('#results')).toHaveAttribute('data-instance','retained');
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(6);
 await page.goBack();await expect(page.getByRole('tab',{name:'Ümumi',exact:true})).toHaveAttribute('aria-selected','true');
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(6);
 await page.goForward();await expect(page.getByRole('tab',{name:'Matç 1',exact:true})).toHaveAttribute('aria-selected','true');
});
test('guest slash routes and dedicated Google MFA stay below navigation at every size',async({page})=>{
 test.setTimeout(180000);
 await page.route('**/api/me/session',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
 await page.route('**/api/auth/google/status',route=>route.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/google/continuation',route=>route.fulfill({json:{email:'fixture@example.test',mode:'login'}}));
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  await page.goto('/login/?google=continue&mfa=required');
  const code=page.getByLabel('Authenticator kodu',{exact:true});await expect(code).toBeVisible();
  await expect(page.getByLabel('E-poçt',{exact:true})).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  if(width===390||width===1440)await page.screenshot({path:`/tmp/aevic-mfa-${width}.png`});
  const header=await page.locator('.site-header').boundingBox(), title=await page.locator('.auth-header').boundingBox();
  expect(title!.y).toBeGreaterThanOrEqual(header!.y+header!.height-1);
  await code.fill('123456');await expect(code).toHaveValue('123456');
  await page.getByRole('button',{name:'Bərpa kodundan istifadə et'}).click();await expect(page.getByLabel('Bərpa kodu',{exact:true})).toBeVisible();
 }
 for(const path of ['/login','/login/','/register','/register/']){await page.goto(path);await expect(page.locator('.auth-form-shell,.register-shell').first()).toBeVisible();await expect(page.locator('.auth-session-check')).toHaveCount(0);}
});
test('authenticated guest routes replace history and do not await team enrichment',async({page})=>{
 let reads=0;
 page.on('request',request=>{if(request.url().endsWith('/me/session'))reads++;});
 await page.route('**/api/me/team',async route=>{await new Promise(resolve=>setTimeout(resolve,3000));await route.fallback();});
 for(const path of ['/login','/login/','/register','/register/']){
  await page.goto(path);await expect(page).toHaveURL(url=>url.pathname === '/');await expect(page.locator('.auth-form')).toHaveCount(0);
 }
 expect(reads).toBe(4);
});
test('password strength is readable without overflow at every requested viewport',async({page})=>{
 test.setTimeout(90000);
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.goto('/account/security');
  const input=page.getByLabel('Yeni şifrə',{exact:true});await input.fill('K8!vR2#tM9@p');
  const meter=page.getByRole('meter',{name:'Şifrə gücü'});await expect(meter).toHaveAttribute('aria-valuenow','4');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
});
test('email MFA rejects an invalid code and permits a separate recovery fallback',async({page})=>{
 await page.route('**/api/me/session',route=>route.fulfill({contentType:'application/json',body:'null'}));
 await page.route('**/api/auth/login',route=>{
  const {otp}=route.request().postDataJSON();
  return route.fulfill({status:401,json:{code:otp?'MFA_INVALID':'MFA_REQUIRED'}});
 });
 await page.goto('/login');await page.getByLabel('E-poçt',{exact:true}).fill('fixture@example.test');
 await page.getByLabel('Şifrə',{exact:true}).fill('FixturePassword42!');await page.locator('form').getByRole('button',{name:'Daxil ol',exact:true}).click();
 await expect(page.getByLabel('Authenticator kodu',{exact:true})).toBeVisible();await expect(page.getByLabel('E-poçt',{exact:true})).toHaveCount(0);
 await page.getByLabel('Authenticator kodu',{exact:true}).fill('000000');await page.getByRole('button',{name:'Girişi tamamla'}).click();
 await expect(page.getByRole('alert')).toContainText('Kod yanlışdır');
 await page.getByRole('button',{name:'Bərpa kodundan istifadə et'}).click();await expect(page.getByLabel('Bərpa kodu',{exact:true})).toBeEmpty();
});
test('unknown session has centered loading and known session navigation adds no verification request',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let reads=0;
 await page.route('**/api/me/session',async route=>{reads++;await gate;await route.fallback();});
 await page.goto('/register');const status=page.locator('.auth-session-check');await expect(status).toBeVisible();
 const box=await status.boundingBox();expect(box!.width).toBeGreaterThan(500);
 const start=Date.now();release();await expect(page).toHaveURL(url=>url.pathname==='/');
 console.log('Authoritative fixture release to homepage (ms):',Date.now()-start);
 const count=reads;
 // Real client router navigation reuses the validated in-memory identity.
 await page.evaluate(()=>{history.pushState({},'', '/login/');window.dispatchEvent(new PopStateEvent('popstate'));});
 await expect(page).toHaveURL(url=>url.pathname==='/');expect(reads).toBe(count);
});
