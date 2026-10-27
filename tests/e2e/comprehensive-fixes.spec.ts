import { test, expect } from '../helpers/api-fixture-test';
const sizes=[[320,568],[360,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]];
test.use({screenshot:'off',trace:'off',video:'off'});
test('login keeps gold layout for slash/query/error/history and all requested widths',async({page})=>{
 await page.route('**/api/me/session',r=>r.fulfill({contentType:'application/json',body:'null'}));
 for(const path of ['/login','/login/?returnTo=%2Ftournaments%2Fexample','/login?google=failed','/login/?returnTo=%2Faccount%2Fsecurity']){
  await page.goto(path);await expect(page.locator('.auth-shell')).toHaveClass(/auth-shell--login/);await expect(page.getByLabel('E-poçt',{exact:true})).toBeVisible();
 }
 await page.goBack();await page.goForward();await page.reload();await expect(page.locator('.auth-shell')).toHaveClass(/auth-shell--login/);
 for(const [width,height] of sizes){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('results header and download cards fit all viewports and retain modal focus',async({page})=>{
 await page.route('**/api/me/session',r=>r.fulfill({contentType:'application/json',body:'null'}));
 await page.goto('/tournaments/summer-final-25');
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  const trigger=page.getByRole('button',{name:'Nəticələri yüklə',exact:true});
  const heading=await page.locator('.tournament-results > .section-heading > div').boundingBox();const action=await trigger.boundingBox();
  if(width>=360)expect(action!.x).toBeGreaterThanOrEqual(heading!.x+heading!.width);
  await trigger.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const cards=dialog.locator('.results-download-options > button');const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();
  expect(a&&b).toBeTruthy();expect(Math.abs(a!.y-b!.y)).toBeLessThan(1);expect(a!.height).toBe(b!.height);expect(a!.x+a!.width).toBeLessThan(b!.x);
  if(width<=800)expect(a!.height).toBeGreaterThanOrEqual(124);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 }
});
test('ShareCards real optional data, invisible native switches, preview and all PNG formats',async({page})=>{
 await page.goto('/team/sharecards');
 const maps=page.getByRole('switch',{name:'Xəritə statistikası',exact:true}),recent=page.getByRole('switch',{name:'Son 5 matç',exact:true});
 await expect(maps).toBeDisabled();await expect(maps).toHaveCSS('opacity','0');
 await page.getByRole('radio',{name:'Geniş',exact:true}).check();await expect(maps).toBeEnabled();await expect(recent).toBeEnabled();
 for(const [width,height] of sizes){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:1440,height:900});
 const canvas=page.locator('.team-share-preview canvas');const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await maps.uncheck();await recent.uncheck();expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
 await maps.check();await recent.check();
 for(const mode of ['Standart','Geniş'])for(const [format,w,h] of [['1:1',1080,1080],['4:5',1080,1350],['9:16',1080,1920]] as const){
  await page.getByRole('radio',{name:mode,exact:true}).check();await page.getByRole('radio',{name:new RegExp(format)}).check();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'PNG yüklə',exact:true}).click();
  const stream=await(await download).createReadStream();const chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);const png=Buffer.concat(chunks);
  expect(png.subarray(1,4).toString()).toBe('PNG');expect(png.readUInt32BE(16)).toBe(w);expect(png.readUInt32BE(20)).toBe(h);
 }
});
test('static directory stays warm over focus and back navigation while long-idle data refreshes',async({page})=>{
 let reads=0;page.on('request',r=>{if(r.url().endsWith('/api/public/context'))reads++;});
 await page.goto('/teams');await expect(page.locator('h1')).toBeVisible();await page.waitForLoadState('networkidle');expect(reads).toBe(1);
 await page.clock.fastForward(10_000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);expect(reads).toBe(1);
 await page.clock.fastForward(120_000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);expect(reads).toBe(1);
 await page.getByRole('link',{name:'Ana səhifə',exact:true}).first().click();await page.goBack();await expect(page).toHaveURL(/\/teams$/);await page.waitForLoadState('networkidle');
 // Homepage legitimately refreshes the shared live competition snapshot after one minute.
 const warm=reads;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);expect(reads).toBe(warm);
 await page.clock.fastForward(6*60_000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>reads).toBeGreaterThan(warm);
 console.log(JSON.stringify({directoryInitial:1,focus10Seconds:0,focus130Seconds:0,afterNavigation:warm,longIdle:reads}));
});
for(const baseline of [true,false])test(`measured ${baseline?'previous':'updated'} static cache policy after two minutes`,async({page})=>{
 // Replay the previous 60s policy in the same browser/application/HTTP fixture.
 // No production endpoints are mocked into the measurements or mutated.
 if(baseline)await page.route('**/src/services/queryCache.ts',async route=>{
  const response=await route.fetch();const source=await response.text();
  expect(source).toContain('publicDirectory: 5 * 6e4');
  await route.fulfill({response,body:source.replace('publicDirectory: 5 * 6e4','publicDirectory: 6e4').replace('historical: 10 * 6e4','historical: 6e4')});
 });
 let publicReads=0,sessionReads=0;page.on('request',r=>{if(r.url().endsWith('/api/public/context'))publicReads++;if(r.url().endsWith('/api/me/session'))sessionReads++;});
 await page.goto('/teams');await page.waitForLoadState('networkidle');expect(publicReads).toBe(1);
 const initialSessionReads=sessionReads;
 await page.clock.fastForward(10_000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);expect(publicReads).toBe(1);
 await page.clock.fastForward(120_000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(200);
 expect(publicReads).toBe(baseline?2:1);expect(sessionReads).toBeGreaterThan(initialSessionReads);
 console.log(JSON.stringify({policy:baseline?'previous 60s':'updated 5min',coldPublicReads:1,focus10s:0,focus130s:publicReads-1,sessionRevalidation:sessionReads-initialSessionReads}));
});
