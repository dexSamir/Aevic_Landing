import { test, expect } from '../helpers/api-fixture-test';

test('public studio preserves preview pixels, responsive layout and keyboard focus without option requests', async ({ page }) => {
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
    expect(await modal.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual([width, height]);
  }
  await modal.getByRole('radio', {name:'Geniş', exact:true}).check();
  await modal.getByRole('checkbox', {name:'QR kodu göstər'}).uncheck();
  const mapToggle = modal.getByRole('checkbox', {name:'Xəritə statistikasını daxil et'});
  if (await mapToggle.isEnabled()) await mapToggle.check();
  await expect(download).toBeEnabled();
  expect(requests.length).toBe(before);
  // Capture generated Blob in memory; don't save a PNG or screenshot artifact.
  await page.evaluate(() => {
    const original=URL.createObjectURL;
    URL.createObjectURL = blob => { (window as unknown as {exportBlob:Blob}).exportBlob=blob as Blob; return original(blob); };
    HTMLAnchorElement.prototype.click=function(){};
  });
  const preview=await modal.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL('image/png'));
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

test('footer has a shared light plane and carousel scrollbars are scoped and hidden',async({page})=>{
 await page.goto('/');
 const rail=page.locator('.home-other-tournaments__rail');await expect(rail).toBeVisible();
 for(const width of [320,375,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(await rail.evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');
 }
 await page.setViewportSize({width:390,height:1000});
 await rail.focus();await page.keyboard.press('ArrowRight');
 await expect.poll(()=>rail.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
 const footer=page.locator('.cinematic-footer__wordmark');
 await expect(footer.locator('clipPath text')).toHaveCount(5);
 await expect(footer.locator('.cinematic-footer__reflection')).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await footer.locator('.cinematic-footer__reflection').evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
});
