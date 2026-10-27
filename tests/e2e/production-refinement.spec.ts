import { test, expect } from '../helpers/api-fixture-test';
import { currentTeam, leaderboard } from '../fixtures/platform-data';
const sizes = [[320,568],[360,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]];
test.use({ screenshot:'off', trace:'off', video:'off' });

test('rulebook content and navigation at all required viewports', async ({page}) => {
 test.setTimeout(120000);
 for (const [width,height] of sizes) {
  await page.setViewportSize({width,height}); await page.goto('/regulations');
  await expect(page.locator('.regulations-clause').first()).toBeVisible();
  expect(await page.locator('.regulations-layout article > section').count()).toBe(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  if(width<=900) await page.getByLabel('Bölməyə keç').selectOption('rule-9');
  else await page.locator('nav[aria-label="Reqlament bölmələri"] a[href$="#rule-9"]').click();
  await expect(page).toHaveURL(/#rule-9$/);
  await expect.poll(()=>page.locator('#rule-9').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeGreaterThan(60);
  await expect.poll(()=>page.locator('#rule-9').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeLessThan(240);
  await page.evaluate(()=>{const e=document.getElementById('rule-12')!;window.scrollTo(0,e.offsetTop+100);});
  if(width<=900) await expect(page.getByLabel('Bölməyə keç')).toHaveValue('rule-12');
  else await expect(page.locator('nav[aria-label="Reqlament bölmələri"] a[href$="#rule-12"]')).toHaveAttribute('aria-current','location');
 }
 await page.goto('/regulations#rule-7'); await expect(page.locator('#rule-7')).toBeVisible();
 await page.locator('nav[aria-label="Reqlament bölmələri"] a[href$="#rule-10"]').click();
 await page.goBack(); await expect(page).toHaveURL(/#rule-7$/);
 await expect(page.locator('a[href$="#rule-7"]')).toHaveAttribute('aria-current','location');
});

test('password toggles stay inside each account field', async ({page}) => {
 for (const [width,height] of sizes.slice(0,7)) {
  await page.setViewportSize({width,height}); await page.goto('/account/security');
  await expect(page.getByLabel('Cari şifrə',{exact:true})).toBeVisible();
  expect(await page.locator('.password-field__control').evaluateAll(nodes=>nodes.every(node=>{const input=node.querySelector('input')!.getBoundingClientRect(),button=node.querySelector('button')!.getBoundingClientRect();return button.x>=input.x&&button.right<=input.right+1&&button.y>=input.y&&button.bottom<=input.bottom+1;}))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
 await page.locator('.password-field__toggle').first().click();
 await expect(page.getByLabel('Cari şifrə',{exact:true})).toHaveAttribute('type','text');
 await expect(page.getByLabel('Yeni şifrə',{exact:true})).toHaveAttribute('type','password');
});

test('Google MFA has six slots, recovery switching and compact mobile layout', async ({page}) => {
 await page.route('**/api/me/session',r=>r.fulfill({contentType:'application/json',body:'null'}));
 await page.route('**/api/auth/google/status',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/google/continuation',r=>r.fulfill({json:{mode:'login',email:'test@example.test'}}));
 for (const [width,height] of sizes.slice(0,5)) {
  await page.setViewportSize({width,height}); await page.goto('/login/?google=continue&mfa=required');
  const input=page.getByRole('textbox',{name:'Authenticator kodu'}); await expect(input).toBeVisible();
  await expect(page.locator('.otp-slots > span')).toHaveCount(6);
  await expect(page.getByLabel('Şifrə',{exact:true})).toBeHidden();
  await input.fill('123456'); await expect(input).toHaveValue('123456');
  await page.getByRole('button',{name:'Bərpa kodundan istifadə et'}).click();
  await expect(page.getByRole('textbox',{name:'Bərpa kodu'})).toHaveValue('');
  await page.getByRole('button',{name:'Authenticator koduna qayıt'}).click(); await expect(input).toHaveValue('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
});

test('loaded maps retain the skeleton composition and sharing offers real destinations', async ({page}) => {
 await page.setViewportSize({width:390,height:844}); await page.goto(`/teams/${currentTeam.slug}`);
 const grid=page.locator('.map-performance'); await expect(grid).toBeVisible();
 if(process.env.AEVIC_REVIEW_SCREENSHOTS){await grid.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/aevic-refined-maps.png'});}
 const boxes=await grid.locator('article').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height,width:r.width};}));
 expect(boxes.length).toBeGreaterThanOrEqual(3); expect(boxes[0].x).toBeLessThan(boxes[1].x); expect(boxes[1].x).toBe(boxes[2].x); expect(boxes[0].height).toBeGreaterThan(boxes[1].height*1.8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.locator('.public-team-social').getByRole('button',{name:'Paylaş'}).click();
 await expect(page.getByRole('dialog',{name:'Paylaş'})).toBeVisible();
 await expect(page.getByRole('link',{name:'WhatsApp'})).toHaveAttribute('href',/^https:\/\/wa.me\//);
 await expect(page.getByRole('link',{name:'Telegram'})).toHaveAttribute('href',/^https:\/\/t.me\/share\/url/);
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('verified identity survives internal auth route variants without redundant reads', async ({page}) => {
 let reads=0;page.on('request',r=>{if(r.url().endsWith('/me/session'))reads++;});
 await page.goto('/teams');await expect(page.locator('.team-directory-card').first()).toBeVisible();
 const initial=reads; expect(initial).toBe(1);
 for(const path of ['/login','/login/','/register','/register/']) {
  await page.evaluate(path=>{history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));},path);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.login-card')).toHaveCount(0);
 }
 expect(reads).toBe(initial);
});

test('mobile standings remain compact and inner previews are taller', async ({page}) => {
 await page.route('**/api/team/tournaments/summer-final-25/result-export',r=>r.fulfill({json:{teamId:currentTeam.id,result:leaderboard.find(row=>row.teamId===currentTeam.id&&row.tournamentId==='summer-final-25')}}));
 for(const width of [320,390,430,768,1440]) {
  await page.setViewportSize({width,height:900}); await page.goto('/tournaments/summer-final-25');
  const table=page.locator('#results table'); await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  if(width<=430) expect((await table.locator('tbody tr').first().boundingBox())!.height).toBeLessThanOrEqual(64);
  if(process.env.AEVIC_REVIEW_SCREENSHOTS&&width===390){await table.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/aevic-refined-standings.png'});}
  await page.getByRole('button',{name:'Nəticələri yüklə',exact:true}).click();
  const previews=page.locator('.results-download-preview'); await expect(previews).toHaveCount(2);
  if(width<=768) {
   const dimensions=await previews.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height};}));
   expect(dimensions.every(r=>r.height>=75 && r.height>=r.width/1.56)).toBe(true);
  }
  await page.keyboard.press('Escape');
 }
});

test('ShareCard produces a downloadable PNG and returns focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(`/teams/${currentTeam.slug}`);
 const feature=page.locator('.public-team-official');await feature.scrollIntoViewIfNeeded();
 await feature.getByRole('button',{name:'Paylaş',exact:true}).click();
 const prepare=page.getByRole('button',{name:'Paylaşım şəklini hazırla'});await expect(prepare).toBeVisible();await prepare.click();
 const downloading=page.waitForEvent('download');await page.getByRole('dialog',{name:'Paylaş'}).getByRole('button',{name:'PNG-ni yüklə',exact:true}).click();
 const download=await downloading;expect(download.suggestedFilename()).toMatch(/\.png$/);
 const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);const png=Buffer.concat(chunks);expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 await page.keyboard.press('Escape');await expect(feature.getByRole('button',{name:'Paylaş',exact:true})).toBeFocused();
});
