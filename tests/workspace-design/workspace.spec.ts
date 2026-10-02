import { test, expect } from '../helpers/api-fixture-test';
import { routeManifest } from '../../src/app/routeManifest';
import { fixtureServices } from '../fixtures/component-services';
import { organizations, teamAchievements } from '../fixtures/platform-data';
import { mkdir, writeFile } from 'node:fs/promises';
const output = '/tmp/aevic-workspace-design';

async function routeList() {
  const requests = await fixtureServices.rosterRequests.list();
  const disputes = await fixtureServices.disputes.list();
  const ids:Record<string,string> = { tournamentId:'daily-cup-24', requestId:requests[0].id, disputeId:disputes[0].id, organizationSlug:organizations[0].slug, badgeId:teamAchievements[0].id };
  return routeManifest.filter(r => /^\/team(?:\/|$)/.test(r.path)).map(r=>r.path.replace(/:(\w+)/g,(_,key)=>ids[key]));
}

test('review all team routes across responsive widths', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir(output,{recursive:true});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const measurements:unknown[]=[];
  for(const width of [320,390,768,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for(const path of await routeList()) {
      await page.goto(path);
      await expect(page.locator('.team-workspace-frame[aria-busy="true"]')).toHaveCount(0);
      await expect(page.locator('#main-content h1').first()).toBeVisible();
      await expect(page.locator('#main-content .loading-skeleton')).toHaveCount(0);
      await page.evaluate(()=>document.fonts.ready);
      const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,background:getComputedStyle(document.querySelector('.product-shell--team')!).backgroundColor, overflow:[...document.querySelectorAll('#main-content *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,5).map(e=>e.className)}));
      measurements.push({path,...result});
      expect.soft(result.scroll,`${path} @ ${width}; ${result.overflow}`).toBeLessThanOrEqual(width);
      expect.soft(result.background).toBe('rgb(16, 17, 20)');
      await page.screenshot({path:`${output}/${width}-${path.replaceAll('/','_')}.png`,fullPage:true,animations:'disabled'});
    }
  }
  await writeFile(`${output}/measurements.json`,JSON.stringify({measurements,errors},null,2));
  expect(errors).toEqual([]);
});

test('session and team-context loading retain the workspace geometry', async ({ page }) => {
  await mkdir(output,{recursive:true});
  for (const width of [320,390,768,1440,1920]) {
    await page.setViewportSize({width,height:900});
    let sessionReady!:()=>void, contextReady!:()=>void;
    const sessionGate=new Promise<void>(resolve=>sessionReady=resolve);
    const contextGate=new Promise<void>(resolve=>contextReady=resolve);
    await page.route('**/api/me/session',async route=>{await sessionGate;await route.fallback();});
    await page.route('**/api/me/context',async route=>{await contextGate;await route.fallback();});
    await page.goto('/team');
    await expect(page.locator('[data-loading-phase="session"]')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const geometry=async()=>({main:await page.locator('#main-content').boundingBox(),header:await page.locator('.product-topbar').boundingBox()});
    const pending=await geometry();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({path:`${output}/${width}-loading.png`,fullPage:true,animations:'disabled'});
    sessionReady();
    await expect(page.locator('[data-protected-area="team"]')).toBeAttached();
    await expect(page.locator('[data-loading-phase="context"]')).toBeVisible();
    const context=await geometry();
    expect(context.main?.x).toBe(pending.main?.x);
    expect(context.header?.height).toBe(pending.header?.height);
    contextReady();
    await expect(page.getByRole('heading',{name:'Caspian Wolves',exact:true})).toBeVisible();
    const ready=await geometry();
    expect(ready.main?.x).toBe(pending.main?.x);
    expect(ready.main?.y).toBe(pending.main?.y);
    expect(ready.main?.width).toBe(pending.main?.width);
    expect(ready.header?.height).toBe(pending.header?.height);
    await page.unroute('**/api/me/session');await page.unroute('**/api/me/context');
  }
});

test('keyboard navigation, dialogs, reduced motion and text enlargement', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/team/roster');
  const menu=page.getByRole('button',{name:'Naviqasiyanı aç'});
  await expect(menu).toBeVisible();
  await menu.focus();await page.keyboard.press('Enter');
  const drawer=page.getByRole('dialog',{name:'Komanda paneli'});
  await expect(drawer).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Tab');
  expect(await drawer.evaluate(el=>el.contains(document.activeElement))).toBeTruthy();
  await page.keyboard.press('Escape');await expect(drawer).toBeHidden();await expect(menu).toBeFocused();
  await page.getByRole('button',{name:'Dəyiş',exact:true}).first().click();
  const modal=page.getByRole('dialog',{name:'Oyunçu 1'});
  await expect(modal).toBeVisible();
  await expect(modal).toHaveCSS('opacity','1');
  await page.getByLabel('Oyunçu IGN').focus();
  expect(await page.getByLabel('Oyunçu IGN').evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.screenshot({path:`${output}/390-roster-dialog.png`,fullPage:true,animations:'disabled'});
  const media=await page.context().newCDPSession(page);
  await media.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBeTruthy();
  await expect(page.locator('.modal-backdrop')).toHaveCSS('background-color','rgb(16, 17, 20)');
  await media.send('Emulation.setEmulatedMedia',{features:[]});await media.detach();
  await page.keyboard.press('Escape');await expect(modal).toBeHidden();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/team/career');
  expect(await page.locator('.motion-page--team').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.locator('.career-nav a').first().focus();
  expect(await page.locator('.career-nav a').first().evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for(const path of ['/team/tournaments/daily-cup-24','/team/settings/managers','/team/profile','/team/sharecards','/team/badges','/team/history']) {
      await page.goto(path);await expect(page.locator('#main-content h1').first()).toBeVisible();
      await expect(page.locator('#main-content .loading-skeleton')).toHaveCount(0);
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('#main-content *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(el=>el.className)}));
      expect.soft(overflow.scroll,`${path} text 200% @ ${width}; ${overflow.offenders}`).toBeLessThanOrEqual(width);
      await page.screenshot({path:`${output}/${width}-text200-${path.replaceAll('/','_')}.png`,fullPage:true,animations:'disabled'});
    }
  }
});

test('workspace states and organization owner forms', async ({page})=>{
  await page.route('**/api/organizations/*/members',route=>route.fulfill({json:[{id:'owner',userId:'team-01',displayName:'Kapitan',role:'OWNER',status:'ACTIVE'},{id:'manager',userId:'other',displayName:'Menecer',role:'MANAGER',status:'ACTIVE'}]}));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/team/organization/caspian-vanguard');
  await expect(page.getByRole('heading',{name:'Üzv dəvət et'})).toBeVisible();
  await page.screenshot({path:`${output}/390-organization-owner.png`,fullPage:true,animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:`${output}/1440-organization-owner.png`,fullPage:true,animations:'disabled'});
  await page.route('**/api/me/context',route=>route.fulfill({status:503,json:{code:'NETWORK_ERROR',message:'Fixture outage'}}));
  await page.goto('/team');
  await expect(page.getByRole('heading',{name:'Platform məlumatı yüklənmədi'})).toBeVisible();
  await expect(page.locator('.team-workspace-frame')).toBeVisible();
  await page.screenshot({path:`${output}/1440-error.png`,fullPage:true,animations:'disabled'});
  await page.unroute('**/api/me/context');
  await page.route('**/api/me/context',async route=>{const snapshot=await fixtureServices.snapshots.team();await route.fulfill({json:{...snapshot,unavailable:{competition:true},dataSource:'public.teams'}});});
  await page.goto('/team/career');
  await expect(page.getByRole('heading',{name:'Bu bölmə hələ əlçatan deyil'})).toBeVisible();
  await expect(page.locator('.product-sidebar')).toBeVisible();
  await page.screenshot({path:`${output}/1440-unavailable.png`,fullPage:true,animations:'disabled'});
});

test('WCAG AA checks on representative workspace surfaces',async({page})=>{
  const source=process.env.AEVIC_AXE_SOURCE;
  test.skip(!source,'Set AEVIC_AXE_SOURCE to a locally installed axe.min.js for accessibility checks.');
  const results:unknown[]=[];
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for(const path of ['/team','/team/career','/team/roster','/team/history','/team/profile','/team/notifications','/team/settings','/team/badges','/team/badges/ach-champion','/team/sharecards','/team/tournaments/daily-cup-24']) {
      await page.goto(path);await expect(page.locator('#main-content h1').first()).toBeVisible();await expect(page.locator('#main-content .loading-skeleton')).toHaveCount(0);
      await page.addScriptTag({path:source!});
      const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run('.product-shell--team',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});
      results.push({path,width,violations});
      if(path.endsWith('/ach-champion')) await page.screenshot({path:`${output}/${width}-locked-badge.png`,fullPage:true,animations:'disabled'});
      expect.soft(violations,`${path} @ ${width}`).toEqual([]);
    }
  }
  await writeFile(`${output}/accessibility.json`,JSON.stringify(results,null,2));
});


test('intermediate widths and empty workspace states',async({page})=>{
  for(const width of [375,430,1024,1280]) {
    await page.setViewportSize({width,height:900});
    for(const path of ['/team','/team/career','/team/settings/managers','/team/tournaments/daily-cup-24','/team/badges']) {
      await page.goto(path);await expect(page.locator('#main-content h1').first()).toBeVisible();
      expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth),`${path} @ ${width}`).toBe(width);
    }
  }
  const base=await fixtureServices.snapshots.team();
  await page.route('**/api/me/context',route=>route.fulfill({json:{...base,currentTeam:{...base.currentTeam,approvalStatus:'pending'},matchHistory:[],notifications:[],adminMessages:[],careerSummary:{...base.careerSummary,metrics:base.careerSummary.metrics.map(metric=>({...metric,value:0}))},dataSource:'public.teams'}}));
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for(const path of ['/team/career','/team/notifications','/team/messages']) {
      await page.goto(path);await expect(page.locator('#main-content h1').first()).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({path:`${output}/${width}-empty-${path.replaceAll('/','_')}.png`,fullPage:true,animations:'disabled'});
    }
  }
});
