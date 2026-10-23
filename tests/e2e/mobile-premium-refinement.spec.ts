import { test, expect } from '../helpers/api-fixture-test';
test.use({ screenshot:'off', trace:'off', video:'off' });

test('mobile teams and profile preserve content at every requested width', async ({page}) => {
  test.setTimeout(180000);
  for (const width of [320,360,375,390,430,768,1024,1440]) {
    await page.setViewportSize({width,height:width===320?568:844});
    await page.goto('/teams');
    const card=page.locator('.team-directory-card').first();
    await expect(card).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`directory ${width}`).toBeLessThanOrEqual(1);
    expect(await page.locator('.team-directory-card').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
    if(width<1024) expect(await page.locator('.team-directory-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
    await page.goto('/teams/caspian-wolves');
    await expect(page.locator('.public-team-detail')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`profile ${width}`).toBeLessThanOrEqual(1);
    await expect(page.locator('#form .recent-placement-details')).toHaveCount(0);
    const maps=page.locator('.map-performance-card');
    await expect(maps).toHaveCount(3);
    if(width<1024) {
      await expect(page.locator('.site-header')).toBeHidden();
      await expect(page.locator('.public-team-index')).toBeHidden();
      const boxes=await maps.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,width:r.width};}));
      expect(boxes[1].y).toBeGreaterThan(boxes[0].bottom);
      expect(boxes[1].width).toBe(boxes[0].width);
      expect(await page.locator('.public-team-roster').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
    } else {
      await expect(page.locator('.site-header')).toBeVisible();
      await expect(page.locator('.public-team-index')).toBeVisible();
    }
  }
});

test('one indicator slides both ways, follows history and respects reduced motion', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/teams/caspian-wolves');
  const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});
  const indicator=nav.locator('.mobile-nav__indicator');
  const aligned=async(index:number)=>expect.poll(async()=>{
    const a=await indicator.boundingBox(), b=await nav.locator(':scope > a, :scope > button').nth(index).boundingBox();
    return Math.abs(a!.x-b!.x)+Math.abs(a!.width-b!.width);
  }).toBeLessThan(1);
  await aligned(2);
  await expect(indicator).toHaveCSS('transition-duration','0.24s');
  await nav.getByRole('link',{name:'Ana səhifə'}).click(); await aligned(0);
  await nav.getByRole('link',{name:'Komandalar'}).click(); await aligned(2);
  await page.goBack(); await aligned(0);
  await page.goForward(); await aligned(2);
  await page.setViewportSize({width:320,height:568}); await aligned(2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(indicator).toHaveCSS('transition-duration','0s');
  const trigger=nav.getByRole('button'); await trigger.click(); await aligned(4);
  const menu=page.getByRole('navigation',{name:'Hesab əməliyyatları'});
  await expect(menu.getByRole('link')).toHaveCount(3);
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0); await expect(trigger).toBeFocused();
  await trigger.click(); await page.locator('h1').click(); await expect(menu).toHaveCount(0);
});

test('official card keeps export dimensions, QR controls and focus restoration',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.goto('/teams/caspian-wolves');
  const trigger=page.getByRole('button',{name:'PNG-ni yüklə',exact:true});
  await trigger.click();
  const modal=page.getByRole('dialog',{name:'Komanda kartını hazırla'});
  const download=modal.getByRole('button',{name:'PNG yüklə',exact:true});
  const canvas=modal.locator('canvas[hidden]');
  for(const [label,w,h] of [['Square',1080,1080],['Story',1080,1920],['Post',1080,1350]] as const){
    await modal.getByRole('radio',{name:new RegExp(label)}).check();
    await expect(download).toBeEnabled();
    await expect.poll(()=>canvas.evaluate((e:HTMLCanvasElement)=>[e.width,e.height])).toEqual([w,h]);
  }
  await modal.getByRole('radio',{name:'Geniş',exact:true}).check();
  await modal.getByRole('switch',{name:'QR kodu və profil linki'}).uncheck();
  await expect(download).toBeEnabled();
  expect(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await page.evaluate(()=>{
    const create=URL.createObjectURL;
    URL.createObjectURL=blob=>{(window as unknown as {exportBlob:Blob}).exportBlob=blob as Blob;return create(blob);};
    HTMLAnchorElement.prototype.click=function(){};
  });
  await download.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {exportBlob?:Blob}).exportBlob?.type)).toBe('image/png');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
