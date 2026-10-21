import { test, expect } from '../helpers/api-fixture-test';
import sharp from 'sharp';
import { currentTeam } from '../fixtures/platform-data';
import { routeManifest } from '../../src/app/routeManifest';

test.use({ screenshot: 'off', trace: 'off', video: 'off' });
const widths = [320, 360, 375, 390, 414, 430, 480, 768, 1024, 1440];
const params: Record<string,string> = { tournamentId: 'daily-cup-24', teamSlug: 'caspian-wolves', teamId: 'team-01', organizationSlug: 'caspian-vanguard', matchId: 'summer-final-r4', recordId: 'most_kills_one_match-summer-final-r2', year: '2026', requestId: 'RC-0021', disputeId: 'DSP-0007', badgeId: 'ach-top-four', resultId: 'result-1', playerId: 'player-1', verificationId: 'verification-1', ticketId: 'SUP-1042' };
for (const family of ['PUBLIC', 'AUTH', 'ACCOUNT', 'TEAM', 'ADMIN', 'SYSTEM']) {
  test(`${family} route matrix fits available width`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop-chrome');
    test.setTimeout(240_000);
    const failures: string[] = [];
    for (const route of routeManifest.filter(r => r.family === family)) {
      const path = route.path.replace(/:([a-zA-Z]+)/g, (_, key:string) => params[key] ?? 'test').replace('*', '/not-found');
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible();
      await expect(page.locator('.hydrate-fallback')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      for (const width of widths) {
        await page.setViewportSize({width, height: width === 320 ? 568 : 900});
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const result = await page.evaluate(() => {
          const main = document.querySelector('main')!;
          const overflow = document.documentElement.scrollWidth - innerWidth;
          const controls = [...main.querySelectorAll<HTMLElement>('button,input,select,textarea')].filter(e => {
            const b=e.getBoundingClientRect();
            return b.width>0 && b.height>0 && !e.closest('[hidden],[inert]') && (b.left < -1 || b.right > innerWidth+1);
          }).map(e => e.className).slice(0,3);
          return {overflow,controls};
        });
        if(result.overflow>1 || result.controls.length) failures.push(`${path}@${width}: ${JSON.stringify(result)}`);
      }
    }
    expect(failures).toEqual([]);
  });
}

test('share configuration keeps modal, canvas, focus and loaded assets stable', async ({page}) => {
  await page.goto('/teams/caspian-wolves');
  await page.getByRole('button',{name:'PNG-ni yüklə', exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Komanda kartını hazırla'});
  const download=modal.getByRole('button',{name:'PNG yüklə',exact:true});
  await expect(download).toBeEnabled();
  await page.waitForLoadState('networkidle');
  await modal.evaluate(node => { (window as any).__studio = {node,canvas:node.querySelector('.identity-skeleton'), backdrop:node.parentElement}; });
  const requests:string[]=[];
  page.on('request',r=>{ if(r.url().includes('/api/')) requests.push(r.url()); });
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:700});
    await page.waitForLoadState('networkidle');
    requests.length=0;
    const before=await modal.boundingBox();
    const scroll=await modal.evaluate(node=>node.scrollTop);
    for(const name of ['Story','Post','Square','Geniş','Standart']) {
      const radio=modal.getByRole('radio',{name:new RegExp(name)});
      await radio.check();
      await expect(download).toBeEnabled();
      await expect(radio).toBeFocused();
      expect(await modal.evaluate(node => { const old=(window as any).__studio;return node===old.node && node.parentElement===old.backdrop && node.querySelector('.identity-skeleton')===old.canvas; })).toBe(true);
      await expect(modal.getByText('Kart hazırlanır…')).toHaveCount(0);
      const after=await modal.boundingBox();
      expect(Math.abs(after!.height-before!.height)).toBeLessThanOrEqual(1);
      expect(await modal.evaluate(node=>node.scrollTop)).toBe(scroll);
    }
    expect(requests).toEqual([]);
  }
});


test('tournament discovery and account identity retain their interactions', async ({page}) => {
  await page.goto('/tournaments');
  const rows=page.locator('.planning-events .tournament-row');
  await expect(rows.first()).toBeVisible();
  const count=await rows.count();
  await page.getByRole('searchbox',{name:'Turnir axtar'}).fill('no-such-tournament');
  await expect(rows).toHaveCount(0);
  await page.getByRole('searchbox',{name:'Turnir axtar'}).fill('');
  await expect(rows).toHaveCount(count);
  await page.getByLabel('Turnirləri sırala').selectOption('oldest');
  await rows.first().locator('.tournament-row__date').click();
  await expect(page.locator('.tournament-day-list .tournament-row').first()).toBeVisible();
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:700});
    await expect(page.locator('.tournament-calendar__month')).toBeVisible();
    expect(await rows.first().evaluate(e=>getComputedStyle(e).borderTopWidth)).toBe('0px');
    const collisions = await page.locator('.tournament-row').evaluateAll(rows => rows.flatMap(row => {
      const facts = [...row.querySelectorAll('.tournament-row__fact')].map(e => e.getBoundingClientRect());
      const [a,b]=facts;
      return a && b && Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1 ? [row.textContent] : [];
    }));
    expect(collisions).toEqual([]);
    if(width < 1024) await page.getByRole('button',{name:'Menyunu aç',exact:true}).click();
    await page.locator(width < 1024 ? '.drawer .public-identity-trigger' : '.site-header .public-identity-trigger').click();
    const menu=page.getByRole('menu',{name:'Hesab əməliyyatları'});
    await expect(menu.locator('header')).toContainText(currentTeam.name);
    const bounds=await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);
    await expect(menu.locator('.public-identity-menu__logo .team-logo')).toBeVisible();
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem',{name:'Çıxış'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    if(width < 1024) await expect(page.locator('.drawer')).not.toBeVisible();
  }
});

test('every share format exports valid PNG bytes without writing an artifact', async ({page}) => {
  await page.goto('/teams/caspian-wolves');
  await page.getByRole('button',{name:'PNG-ni yüklə',exact:true}).click();
  const modal=page.getByRole('dialog');
  await page.evaluate(()=>{
    URL.createObjectURL = blob => { (window as any).__exportBlob=blob; return 'blob:test'; };
    HTMLAnchorElement.prototype.click=function(){};
  });
  for(const mode of ['Standart','Geniş']) {
    await modal.getByRole('radio',{name:mode,exact:true}).check();
    for(const [name,height] of [['Square',1080],['Post',1350],['Story',1920]] as const) {
      await modal.getByRole('radio',{name:new RegExp(name)}).check();
      const button=modal.getByRole('button',{name:'PNG yüklə',exact:true});
      await expect(button).toBeEnabled();
      await page.evaluate(()=>{(window as any).__exportBlob=undefined;});
      await button.click();
      await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__exportBlob))).toBe(true);
      const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await (window as any).__exportBlob.arrayBuffer())));
      expect(await sharp(Buffer.from(bytes)).metadata()).toMatchObject({format:'png',width:1080,height});
    }
  }
});
