import { test, expect } from '../helpers/api-fixture-test';
import sharp from 'sharp';
import {currentTeam,leaderboard} from '../fixtures/platform-data';
test.use({ screenshot:'off', trace:'off', video:'off' });

test('calendar keeps its composition and square states at every target width',async({page})=>{
 await page.goto('/');
 const grid=page.locator('.home-competition-program');
 await expect(grid.locator('.tournament-calendar__days')).toBeVisible();
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  const layout=await grid.evaluate(node=>{
   const feature=node.querySelector('.home-tournament-visual')!.getBoundingClientRect();
   const calendar=node.querySelector('.home-competition-program__calendar')!.getBoundingClientRect();
   const date=node.querySelector('.is-selected[data-calendar-date]')!.getBoundingClientRect();
   return {side:calendar.left>=feature.right,overflow:document.documentElement.scrollWidth>innerWidth,date:[date.width,date.height]};
  });
  expect(layout,`width ${width}`).toMatchObject({side:true,overflow:false});
  expect(Math.abs(layout.date[0]-layout.date[1])).toBeLessThan(1);
 }
 const selected=grid.locator('.tournament-calendar__days .is-selected');
 const appearance=await selected.evaluate(n=>{const s=getComputedStyle(n);return {weight:s.fontWeight,radius:s.borderRadius,width:s.width,height:s.height,background:s.backgroundColor};});
 const other=grid.locator('.tournament-calendar__days button:not(.is-selected):not(.is-outside)').first();
 if(await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches)){
  await other.hover();
  await expect(other).toHaveCSS('background-color',appearance.background);
  await expect(other).toHaveCSS('font-weight',appearance.weight);
 }
 await selected.focus();await page.keyboard.press('ArrowRight');
 await expect(grid.locator('.tournament-calendar__days .is-selected')).toBeFocused();
 await page.goto('/tournaments');
 const calendar=page.locator('.tournament-calendar__days .is-selected');
 await expect(calendar).toBeVisible();
 for(const [property,value] of Object.entries({width:appearance.width,height:appearance.height,'border-radius':appearance.radius,'font-weight':appearance.weight}))await expect(calendar).toHaveCSS(property,value);
});

async function pngDownload(page:import('@playwright/test').Page, button:import('@playwright/test').Locator){
 const pending=page.waitForEvent('download'); await button.click(); const download=await pending;
 const stream=await download.createReadStream(); const chunks:Buffer[]=[];
 for await(const chunk of stream!)chunks.push(Buffer.from(chunk));
 const bytes=Buffer.concat(chunks); await download.delete();
 expect(bytes.subarray(1,4).toString()).toBe('PNG');
 return sharp(bytes).raw().toBuffer({resolveWithObject:true});
}

test('public team modal keeps three interactive thumbnails and exports all dimensions',async({page})=>{
 await page.route('**/api/me/session',r=>r.fulfill({status:401,json:{code:'UNAUTHORIZED'}}));
 await page.goto(`/teams/${currentTeam.slug}`);
 await page.getByRole('button',{name:'PNG-ni yüklə',exact:true}).click();
 const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
 await expect(dialog.locator('.team-export-formats--visual label')).toHaveCount(3);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  const tops=await dialog.locator('.team-export-formats--visual label').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  const bounds=await dialog.evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,offenders:Array.from(n.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>n.getBoundingClientRect().right).map(e=>({class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))}));
  expect(bounds.scroll,JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.width);
 }
 await expect(dialog.locator('.team-export-indicator')).toHaveCSS('transition-duration','0.42s');
 await dialog.getByRole('radio',{name:/Square/}).focus();
 await page.keyboard.press('ArrowRight');await expect(dialog.getByRole('radio',{name:/Story/})).toBeChecked();
 await page.keyboard.press('ArrowLeft');await expect(dialog.getByRole('radio',{name:/Square/})).toBeChecked();
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [name,height] of [['Square',1080],['Story',1920],['Post',1350]] as const){
  await dialog.getByRole('radio',{name:new RegExp(name)}).check();
  const output=await pngDownload(page,dialog.getByRole('button',{name:'PNG yüklə',exact:true}));
  expect(output.info).toMatchObject({width:1080,height});
  expect(output.data.length).toBeGreaterThan(10000);
 }
 await dialog.getByRole('radio',{name:'Geniş',exact:true}).check();
 await expect(dialog.locator('.skeleton-extended')).toHaveCount(3);
 await dialog.getByRole('checkbox',{name:'QR kodu göstər'}).uncheck();
 await expect(dialog.locator('.skeleton-qr')).toHaveCount(0);
 const maps=dialog.getByRole('checkbox',{name:'Xəritə statistikasını daxil et'});
 if(await maps.isEnabled()){await maps.check();await expect(dialog.locator('.skeleton-maps')).toHaveCount(3);}
 await dialog.getByRole('radio',{name:/Square/}).check();
 await expect(dialog.locator('.team-export-indicator')).toHaveCSS('transform','none');
 await pngDownload(page,dialog.getByRole('button',{name:'PNG yüklə',exact:true}));
 await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});

test('poster download survives unavailable optional artwork and preserves output',async({page})=>{
 await page.route('**/api/team/tournaments/summer-final-25/result-export',route=>route.fulfill({json:{teamId:currentTeam.id,result:leaderboard.find(row=>row.teamId===currentTeam.id&&row.tournamentId==='summer-final-25')}}));
 await page.goto('/tournaments/summer-final-25');
 await page.getByRole('button',{name:'Nəticələri yüklə'}).click();
 const dialog=page.getByRole('dialog');
 for(const option of ['Turnir cədvəli','Komanda nəticəsi']){
  await dialog.getByRole('radio',{name:option,exact:true}).click();
  await expect(page.locator('.generated-poster')).toBeAttached();
  await page.evaluate(()=>{
   const image=document.createElement('img');image.src='data:image/png;base64,broken';image.alt='AEVIC';
   document.querySelector('.generated-poster')!.append(image);
  });
  const output=await pngDownload(page,dialog.getByRole('button',{name:'Yüklə',exact:true}));
  expect(output.info.width).toBe(2400);
  expect(await page.locator('.generated-poster').count()).toBe(1);
 }
});

test('hero uses shared confirmed guest state, including transient session failures',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.hero-actions')).toBeVisible();
 await expect(page.locator('.hero-actions').getByRole('link',{name:'Komanda yarat'})).toHaveCount(0);
 await expect(page.locator('.hero-actions').getByRole('link',{name:'Turnirləri kəşf et'})).toBeVisible();
 await page.route('**/api/me/session',route=>route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}}));
 await page.evaluate(()=>window.dispatchEvent(new Event('aevic:session-change')));
 await expect(page.locator('.hero-actions').getByRole('link',{name:'Komanda yarat'})).toHaveCount(0);
 await page.route('**/api/me/session',route=>route.fulfill({status:401,json:{code:'UNAUTHORIZED'}}));
 await page.reload();
 await expect(page.locator('.hero-actions').getByRole('link',{name:'Komanda yarat'})).toBeVisible();
});
