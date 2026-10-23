import { test, expect } from '../helpers/api-fixture-test';
import { routeManifest } from '../../src/app/routeManifest';

const parameters: Record<string, string> = { teamSlug: 'caspian-wolves', tournamentId: 'daily-cup-24', matchId: 'dc24-r1', organizationSlug: 'caspian-vanguard', requestId: 'RC-0021', disputeId: 'DSP-0007', badgeId: 'ach-top-four', ticketId: 'SUP-1042', year: '2026', teamId: 'team-01', resultId: 'result-1', playerId: 'p1', recordId: 'record-1', verificationId: 'verification-1' };
const widths = [320, 360, 375, 390, 414, 430, 480, 600, 768, 1024, 1440];
for (const route of routeManifest) test(`mobile route ${route.path}`, async ({ page }) => {
  const path = route.path === '*' ? '/not-a-route' : route.path.replace(/:([A-Za-z]+)/g, (_, key) => parameters[key] || 'unknown');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('h1,h2').first()).toBeVisible();
  await expect(page.locator('.route-data-loading')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 375 ? 480 : 900 });
    // Let responsive styles and font metrics settle before measuring the new viewport.
    await page.clock.runFor(32);
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.evaluate(() => {
      const visible = (el: Element) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
      const locallyScrolled = (el: Element) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) return true;
        }
        return false;
      };
      const escaped = [...document.querySelectorAll('main *')].filter(el => visible(el) && !locallyScrolled(el) && (el.getBoundingClientRect().right > innerWidth + 2 || el.getBoundingClientRect().left < -2));
      const controls = [...document.querySelectorAll('main button, main input, main select, main textarea')].map(el => el instanceof HTMLInputElement && ['checkbox','radio','file'].includes(el.type) ? el.labels?.[0] ?? el : el).filter(el => visible(el) && !locallyScrolled(el) && el.getBoundingClientRect().width < 28);
      const clipped = [...document.querySelectorAll<HTMLElement>('main h1,main h2,main h3,main p,main button,main label,main dt,main dd')].filter(el => visible(el) && !locallyScrolled(el) && getComputedStyle(el).textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2);
      return { clipped: clipped.slice(0, 8).map(el => `${el.tagName}.${el.className} (${el.clientWidth}/${el.scrollWidth}; ${getComputedStyle(el).display}): ${el.textContent?.slice(0,40)}`), overflow: document.documentElement.scrollWidth - innerWidth,
        escaped: escaped.slice(0, 8).map(el => `${el.tagName}.${el.className}`),
        tiny: controls.slice(0, 8).map(el => `${el.tagName}.${el.className}`) };
    });
    expect.soft(problems.overflow, `${path} ${width} document overflow`).toBeLessThanOrEqual(1);
    expect.soft(problems.escaped, `${path} ${width} escaped elements`).toEqual([]);
    expect.soft(problems.clipped, `${path} ${width} clipped text`).toEqual([]);
    expect.soft(problems.tiny, `${path} ${width} compressed controls`).toEqual([]);
  }
});

test('home calendar and share controls keep legible mobile touch targets', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-competition-program')).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({width, height: 740});
    const buttons = page.locator('.home-competition-program__calendar .tournament-calendar__picker button:visible');
    for (const button of await buttons.all()) {
      const box = await button.boundingBox();
      expect(box!.width, `calendar target at ${width}`).toBeGreaterThanOrEqual(43);
      expect(box!.height).toBeGreaterThanOrEqual(43);
    }
  }
});

test('wordmark raster is bisected by the card edge for all compositions and roster lengths', async ({page}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/utils/teamIdentityCard.ts';
    const {drawTeamIdentityCard, teamCardWordmark, teamIdentityCardSizes} = await import(/* @vite-ignore */ path);
    await Promise.all([document.fonts.load('900 200px Raleway'),document.fonts.load('700 30px Orbitron')]);
    await document.fonts.ready;
    const results = [];
    for (const format of ['square','portrait','story']) {
      const {width,height} = teamIdentityCardSizes[format];
      const ink = document.createElement('canvas'); ink.width=width; ink.height=height+400;
      const ctx=ink.getContext('2d')!;
      const wordmark=teamCardWordmark(ctx,width,height); ctx.fillStyle='#fff'; ctx.fillText('AEVIC',wordmark.x,wordmark.baseline);
      const pixels=ctx.getImageData(0,0,width,ink.height).data;
      let first=-1,last=-1;
      for(let y=0;y<ink.height;y++) for(let x=0;x<width;x++) if(pixels[(y*width+x)*4+3]>127){if(first<0)first=y;last=y;break;}
      for(const length of [0,1,5,8]) for(const extended of [false,true]) {
        const canvas=document.createElement('canvas');
        const drawing=canvas.getContext('2d')!;
        const original=drawing.fillText.bind(drawing);
        const boxes:Array<{value:string;top:number;bottom:number;left:number;right:number}>=[];
        drawing.fillText=(value,x,y)=>{const m=drawing.measureText(value),t=drawing.getTransform();boxes.push({value,top:t.f+(y-m.actualBoundingBoxAscent)*t.d,bottom:t.f+(y+m.actualBoundingBoxDescent)*t.d,left:t.e+(x-m.actualBoundingBoxLeft)*t.a,right:t.e+(x+m.actualBoundingBoxRight)*t.a});original(value,x,y);};
        drawTeamIdentityCard(canvas,{teamName:'Azərbaycan International Competitive Championship Team',teamTag:'LONG TAG',country:'Azərbaycan',roster:Array.from({length},(_,i)=>({ign:`LongPlayerName${i}`.repeat(3),role:'starter'})),wwcd:10,championships:2,podiums:15,matches:200,profileUrl:'https://aevic-esports.netlify.app/teams/long-name',mapStats:[],recentMatches:[]},format,{}, {template:'career',showStats:true,showRoster:true,extended,showQr:false,showMaps:true,showRecent:true});
        results.push({outside:boxes.slice(0,-1).filter(box=>box.bottom>=boxes.at(-1)!.top||box.left<0||box.right>width),format,length,extended,midpoint:(first+last+1)/2,height,visible:height-first,hidden:last+1-height,png:canvas.toDataURL().startsWith('data:image/png;')});
      }
    }
    return results;
  });
  for(const card of result){expect(Math.abs(card.midpoint-card.height),JSON.stringify(card)).toBeLessThanOrEqual(1);expect(Math.abs(card.visible-card.hidden)).toBeLessThanOrEqual(2);expect(card.png).toBe(true);expect(card.outside,JSON.stringify(card)).toEqual([]);}
});

test('short viewports keep navigation and form focus reachable', async ({page}) => {
  await page.setViewportSize({width:320,height:360});
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Mobil əsas naviqasiya'});
  await nav.getByRole('button').click();
  const menu=page.getByRole('navigation',{name:'Hesab əməliyyatları'});
  await expect(menu).toBeVisible();
  const bounds=await menu.boundingBox();expect(bounds!.y).toBeGreaterThanOrEqual(0);
  await nav.getByRole('link',{name:'Komandalar',exact:true}).click();
  await expect(page).toHaveURL(/\/teams$/);
  await expect(menu).toHaveCount(0);
  for(const path of ['/login','/register','/team/profile']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const field=page.locator('main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file])').first();
    await expect(field).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.clock.runFor(500);
    await field.focus();
    await field.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await expect(field).toBeFocused();
    const box=await field.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(321);
    expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(361);
  }
});
