import { test, expect } from '../helpers/api-fixture-test';
import '../e2e/home-mobile-composition.spec';

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:360}]) {
 test(`drawer and share editor remain usable at ${viewport.width}x${viewport.height}`, async ({page}) => {
  await page.setViewportSize(viewport);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/team');
  const trigger=page.getByRole('button',{name:'Naviqasiyanı aç'});
  await trigger.click();
  const drawer=page.getByRole('dialog',{name:'Komanda paneli'});
  await expect(drawer).toBeVisible();
  expect(await page.locator('#root').evaluate(el=>el.inert)).toBe(true);
  await drawer.focus();await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await page.clock.runFor(300);
  await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused();
  expect(await page.locator('#root').evaluate(el=>el.inert)).toBe(false);
  await trigger.click();
  await drawer.getByRole('link',{name:'Heyət',exact:true}).click();
  await expect(page).toHaveURL(/\/team\/roster$/);
  await expect(drawer).toHaveCount(0);
  await page.goto('/teams/caspian-wolves');
  await page.locator('.public-team-feature-actions button:first-child').click();
  const dialog=page.getByRole('dialog',{name:'Komanda kartını hazırla'});
  const download=dialog.getByRole('button',{name:'PNG yüklə',exact:true});
  await expect(download).toBeEnabled();
  for (const format of ['1:1 Square','4:5 Post','9:16 Story']) {
   await dialog.getByRole('radio',{name:format}).check();
   await expect(download).toBeEnabled();
   const bounds=await dialog.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,rect:el.getBoundingClientRect().toJSON()}));
   expect(bounds.overflow).toBeLessThanOrEqual(1);
   expect(bounds.rect.x).toBeGreaterThanOrEqual(0);expect(bounds.rect.right).toBeLessThanOrEqual(viewport.width);
   expect(bounds.rect.y).toBeGreaterThanOrEqual(0);expect(bounds.rect.bottom).toBeLessThanOrEqual(viewport.height);
  }
  await download.scrollIntoViewIfNeeded();await expect(download).toBeInViewport();
  await dialog.getByRole('button',{name:'Pəncərəni bağla'}).click();
  await page.clock.runFor(300);await expect(dialog).toHaveCount(0);
 });
}

test('narrow calendar supports arbitrary dates without miniature targets',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.goto('/');
 const date=page.getByLabel('Tarix seç',{exact:true});await expect(date).toBeVisible();
 await date.fill('2026-08-20');
 await expect(date).toHaveValue('2026-08-20');
 await expect(page.locator('.tournament-calendar__strip .is-selected')).toHaveText(/20/);
 for (const button of await page.locator('.tournament-calendar__strip button:visible').all()) {
  const box=await button.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 }
});

for (const viewport of [{width:320,height:568},{width:360,height:740},{width:375,height:667},{width:390,height:844},{width:414,height:896},{width:430,height:932},{width:480,height:740},{width:768,height:360}]) {
 test(`public bottom navigation touch and footer journey ${viewport.width}`, async ({browser,baseURL}) => {
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  const {installApiFixtures}=await import('../helpers/api-fixture-test');
  await installApiFixtures(page);
  await page.goto(`${baseURL}/`);
  const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});
  const trigger=nav.getByRole('button');
  await expect(trigger).toContainText('Komandam');
  await trigger.click();
  const menu=page.getByRole('navigation',{name:'Hesab əməliyyatları'});
  await expect(menu.getByRole('link',{name:'Komanda paneli',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(trigger).toBeFocused();
  await nav.getByRole('link',{name:'Turnirlər',exact:true}).click();
  await expect(page).toHaveURL(/\/tournaments$/);
  await trigger.click();await menu.getByRole('link',{name:'Hesabım',exact:true}).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await page.goto(`${baseURL}/`);
  await trigger.click();await expect(menu).toBeVisible();
  await page.locator('.site-header .brand-mark').click();await expect(menu).toHaveCount(0);
  const footer=page.locator('.cinematic-footer');await footer.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const wordmark=footer.locator('.cinematic-footer__wordmark');
  await expect(wordmark).toHaveAttribute('aria-hidden','true');await expect(wordmark).toHaveCSS('pointer-events','none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  if(viewport.width<=600) await expect(footer.locator('.cinematic-footer__reflection')).toHaveCSS('animation-name','none');
  await page.emulateMedia({reducedMotion:'reduce'});
  await footer.getByRole('link',{name:'Komandalar',exact:true}).click();await expect(page).toHaveURL(/\/teams$/);
  await context.close();
 });
}

// Existing functional regressions use isolated HTTP fixtures and export only in memory.
import '../e2e/critical-flows.spec';

test('public studio exports prepared pixels and preserves layout and focus without option requests', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/teams/caspian-wolves');
  await page.getByRole('button', { name: 'PNG-ni yüklə', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Komanda kartını hazırla' });
  await expect(modal).toBeVisible();
  const download = modal.getByRole('button', { name: 'PNG yüklə', exact: true });
  await expect(download).toBeEnabled();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const bounds = await modal.boundingBox(); expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(await modal.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy();
  }
  // Wait for all initial reads before counting changes in local export controls.
  await page.waitForLoadState('networkidle');
  const before = requests.length;
  for (const [label, width, height] of [['Square', 1080, 1080], ['Story', 1080, 1920], ['Post', 1080, 1350]] as const) {
    await modal.getByRole('radio', { name: new RegExp(label) }).check();
    await expect(download).toBeEnabled();
    expect(await modal.locator('canvas[hidden]').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([width, height]);
  }
  await modal.getByRole('radio', {name:'Geniş', exact:true}).check();
  await modal.getByRole('switch', {name:/QR kodu və profil linki/}).uncheck();
  const mapToggle = modal.getByRole('switch', {name:/Xəritə statistikası/});
  if (await mapToggle.isEnabled()) await mapToggle.check();
  await expect(download).toBeEnabled();
  expect(requests.length).toBe(before);
  // Capture generated Blob in memory; don't save a PNG or screenshot artifact.
  await page.evaluate(() => {
    const original=URL.createObjectURL;
    URL.createObjectURL = blob => { (window as unknown as {exportBlob:Blob}).exportBlob=blob as Blob; return original(blob); };
    HTMLAnchorElement.prototype.click=function(){};
  });
  const preview=await modal.locator('canvas[hidden]').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL('image/png'));
  await download.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {exportBlob?:Blob}).exportBlob instanceof Blob)).toBe(true);
  const exported=await page.evaluate(async()=>{
    const blob=(window as unknown as {exportBlob:Blob}).exportBlob;
    return await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);});
  });
  expect(exported).toBe(preview);
  await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button',{name:'PNG-ni yüklə',exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});


test('mobile owner signs in and manages roster, participation and preferences', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/login');
 await page.getByLabel('E-poçt',{exact:true}).fill('team@example.test');
 await page.getByLabel('Şifrə',{exact:true}).fill('test-fixture');
 await page.getByRole('button',{name:'Daxil ol',exact:true}).click();
 await expect(page).toHaveURL(/\/team$/);
 await page.goto('/');await page.getByRole('navigation',{name:'Mobil əsas naviqasiya'}).getByRole('button').click();
 await page.getByRole('navigation',{name:'Hesab əməliyyatları'}).getByRole('link',{name:'Komanda paneli',exact:true}).click();
 await page.getByRole('button',{name:'Naviqasiyanı aç'}).click();
 await page.getByRole('dialog').getByRole('link',{name:'Heyət',exact:true}).click();
 await page.getByRole('button',{name:'Dəyiş',exact:true}).first().click();
 await page.getByLabel('Oyunçu IGN').fill('RESERVE');
 await page.getByRole('button',{name:'Saxla',exact:true}).click();
 await expect(page.getByText('Oyunçu adı saxlanıldı.')).toBeVisible();
 await page.goto('/team/tournaments/daily-cup-24');
 await expect(page.locator('h1')).toBeVisible();
 await page.goto('/team/settings');
 await page.getByRole('switch').first().click();
 await page.getByRole('button',{name:'Seçimləri saxla'}).click();
 await expect(page.getByText('Bildiriş seçimləri saxlanıldı.')).toBeVisible();
});
