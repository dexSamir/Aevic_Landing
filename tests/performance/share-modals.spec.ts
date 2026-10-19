import { test, expect } from '../helpers/api-fixture-test';
import type { Page } from '@playwright/test';
import sharp from 'sharp';
import { fixtureServices } from '../fixtures/component-services';

async function checkPosition(page: Page, triggerSelector: string, fraction: number) {
  const originalY = await page.evaluate(({ selector, fraction }) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * fraction);
    const trigger = document.querySelector<HTMLButtonElement>(selector)!;
    const originalY = scrollY; trigger.focus({ preventScroll: true }); trigger.click(); return originalY;
  }, { selector: triggerSelector, fraction });
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await page.clock.runFor(350);
  await expect(dialog).toHaveCSS('transform', 'none');
  const geometry = await dialog.evaluate(el => {
    const box = el.getBoundingClientRect(), overlay = el.parentElement!;
    return { x: box.x, y: box.y, width: box.width, height: box.height, vw: innerWidth, vh: innerHeight,
      portal: overlay.parentElement === document.body, locked: document.body.style.position === 'fixed',
      rootInert: document.getElementById('root')!.inert, overflow: el.scrollWidth > el.clientWidth + 1,
      top: document.elementFromPoint(box.x + box.width / 2, box.y + 20)?.closest('[role="dialog"]') === el };
  });
  expect(geometry.portal && geometry.locked && geometry.rootInert && geometry.top).toBe(true);
  expect(Math.abs(geometry.x + geometry.width / 2 - geometry.vw / 2)).toBeLessThan(2);
  expect(Math.abs(geometry.y + geometry.height / 2 - geometry.vh / 2)).toBeLessThan(2);
  expect(geometry.y).toBeGreaterThanOrEqual(0);expect(geometry.height).toBeLessThanOrEqual(geometry.vh);
  expect(geometry.overflow).toBe(false);
  await dialog.focus();await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await page.clock.runFor(300);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');
  expect(await page.evaluate(selector => document.activeElement === document.querySelector(selector), triggerSelector)).toBe(true);
  const difference = await page.evaluate(y => Math.abs(scrollY - y), originalY);
  expect(difference).toBeLessThan(2);
}

test('both dialogs center in the viewport and restore scrolling across routes and positions', async ({ page }) => {
  await page.goto('/teams/caspian-wolves');
  const trigger = '.public-team-feature-actions button:first-child';
  await expect(page.locator(trigger)).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  for (const fraction of [0, .5, 1]) await checkPosition(page, trigger, fraction);
  await page.route('**/api/team/tournaments/summer-final-25/result-export', route => route.fulfill({json:{teamId:'team-01',reason:'no-result'}}));
  await page.goto('/tournaments/summer-final-25');
  const results = page.getByRole('button', { name: 'Nəticələri yüklə', exact: true });
  await expect(results).toBeAttached();await results.evaluate(el => el.setAttribute('data-results-trigger', ''));
  for (const fraction of [0, .5, 1]) await checkPosition(page, '[data-results-trigger]', fraction);
  await page.goto('/teams/caspian-wolves');await expect(page.locator(trigger)).toBeAttached();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await checkPosition(page, trigger, .5);
});

test('all formats export real data as valid PNGs, while local options never refetch', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as any).__cardText = [];
    CanvasRenderingContext2D.prototype.fillText = function(...args: Parameters<typeof original>) { (window as any).__cardText.push(args[0]); return original.apply(this, args); };
  });
  await page.goto('/teams/caspian-wolves');
  await page.locator('.public-team-feature-actions button:first-child').click();
  const dialog=page.getByRole('dialog'),download=dialog.getByRole('button',{name:'PNG yüklə'});
  await expect(download).toBeEnabled();
  let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests++;});
  for(const [name,height] of [['1:1 Square',1080],['4:5 Post',1350],['9:16 Story',1920]] as const){
    await dialog.getByRole('radio',{name}).check();await expect(download).toBeEnabled();
    const canvas=dialog.locator('canvas');await expect(canvas).toHaveAttribute('height',String(height));
    const encoded=await canvas.evaluate((el:HTMLCanvasElement)=>el.toDataURL('image/png'));
    const decoded=await sharp(Buffer.from(encoded.split(',')[1],'base64')).metadata();
    expect(decoded).toMatchObject({format:'png',width:1080,height});
    const preview=dialog.locator('.identity-skeleton');
    const ratio=await preview.evaluate(el=>el.getBoundingClientRect().width/el.getBoundingClientRect().height);
    expect(Math.abs(ratio-1080/height)).toBeLessThan(.02);
  }
  await dialog.getByRole('radio',{name:'Geniş',exact:true}).check();
  for (const name of ['1:1 Square','4:5 Post','9:16 Story']) {
    await dialog.getByRole('radio',{name}).check();await expect(download).toBeEnabled();
    const overflow=await dialog.locator('.identity-skeleton').evaluate(el=>Math.max(...Array.from(el.children).filter(child=>!child.classList.contains('identity-skeleton__watermark')).map(child=>child.getBoundingClientRect().bottom))-el.getBoundingClientRect().bottom);
    expect(overflow).toBeLessThanOrEqual(0);
  }
  for(const name of ['QR kodu və profil linki','Xəritə statistikası','Son 5 matç']){
    const control=dialog.getByRole('switch',{name,exact:true});
    if(await control.isEnabled()){await control.uncheck();await expect(control).not.toBeChecked();await control.check();}
  }
  await expect(download).toBeEnabled();expect(requests).toBe(0);
  const words=await page.evaluate(()=>(window as any).__cardText as string[]);
  expect(words.some(word=>word.toUpperCase().includes('CASPIAN'))).toBe(true);
  expect(words).toContain('PUBLIC ROSTER');expect(words).toContain('SCAN // PUBLIC PROFILE');
  const downloaded=page.waitForEvent('download');await download.click();const file=await downloaded;
  expect(file.suggestedFilename()).toContain('story-extended.png');
  const stream=await file.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));
  expect(await sharp(Buffer.concat(chunks)).metadata()).toMatchObject({format:'png',width:1080,height:1920});
  await file.delete();
  await dialog.getByRole('button',{name:'Pəncərəni bağla'}).click();
  await page.clock.runFor(300);await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('missing assets fall back safely and unavailable statistics cannot be enabled', async ({ page }) => {
  const data = await fixtureServices.profiles.teamBySlug('caspian-wolves');
  await page.route('**/api/public/teams/caspian-wolves', route => route.fulfill({json:{...data, team:{...data!.team,logoUrl:'/missing-card-logo.png',roster:[]},career:undefined,mapSpecialization:{...data!.mapSpecialization,metrics:[]},recentMatches:[]}}));
  await page.goto('/teams/caspian-wolves');await page.locator('.public-team-feature-actions button:first-child').click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('switch',{name:'Xəritə statistikası',exact:true})).toBeDisabled();
  await expect(dialog.getByRole('switch',{name:'Son 5 matç',exact:true})).toBeDisabled();
  await expect(dialog.getByText('Loqo yüklənmədi.',{exact:false})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'PNG yüklə'})).toBeEnabled();
  const png=await dialog.locator('canvas').evaluate((el:HTMLCanvasElement)=>el.toDataURL('image/png'));
  expect(await sharp(Buffer.from(png.split(',')[1],'base64')).metadata()).toMatchObject({width:1080,height:1080,format:'png'});
  await page.setViewportSize({width:375,height:480});
  await expect.poll(async()=>{const box=await dialog.boundingBox();return box!.y+box!.height;}).toBeLessThanOrEqual(480);
  expect((await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
test('repeated client-side navigation reuses warm public context and team profiles',async({page})=>{
 const reads=new Map<string,number>();
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/'))reads.set(path,(reads.get(path)??0)+1);});
 await page.goto('/teams/caspian-wolves');await expect(page.locator('.public-team-feature-actions')).toBeAttached();
 for(let i=0;i<2;i++){
  await page.locator('.site-header a[href="/teams"]').first().evaluate((el:HTMLAnchorElement)=>el.click());
  await page.waitForURL('**/teams');
  const profile=page.locator('main a[href="/teams/caspian-wolves"]').first();await expect(profile).toBeAttached();
  await profile.evaluate((el:HTMLAnchorElement)=>el.click());await page.waitForURL('**/teams/caspian-wolves');
  await expect(page.locator('.public-team-feature-actions')).toBeAttached();
 }
 expect(reads.get('/api/public/context')).toBe(1);
 expect(reads.get('/api/public/teams/caspian-wolves')).toBe(1);
});
