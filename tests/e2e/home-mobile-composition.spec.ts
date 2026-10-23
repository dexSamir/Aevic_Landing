import { test, expect } from '../helpers/api-fixture-test';

test.use({ screenshot: 'off', trace: 'off', video: 'off', reducedMotion: 'reduce' });
const widths = [320, 360, 375, 390, 414, 430, 480, 600, 695, 768, 1024, 1440];

test('homepage stacks mobile discovery and retains readable controls across viewports', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('.home-other-tournament').first()).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ['.home-competition-program', '.home-rotation', '.home-teams-section', '.cinematic-footer']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${selector}@${width}`).toBeLessThanOrEqual(1);
    }
    const boxes = await page.locator('.home-tournament-visual, .home-competition-program__calendar').evaluateAll(nodes => nodes.map(n => { const b=n.getBoundingClientRect(); return { x:b.x, y:b.y, right:b.right, bottom:b.bottom }; }));
    if (width >= 1024) {
      expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
      expect(boxes[1].x-boxes[0].right).toBeGreaterThanOrEqual(10);
    }
    if (width <= 800) expect(boxes[1].y - boxes[0].bottom).toBeGreaterThanOrEqual(20);
    const pickerWidth = await page.locator('.tournament-calendar__picker').evaluate(el => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
    await expect(page.locator(pickerWidth < 308 ? '.tournament-calendar__date-input' : '.tournament-calendar__month')).toBeVisible();
    await expect(page.locator('.map-program li')).toHaveCount(4);
    const collisions = await page.locator('.tournament-calendar__days').evaluate(el => {
      const boxes=[...el.querySelectorAll('button')].map(n=>n.getBoundingClientRect());
      return boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
    });
    expect(collisions, `calendar collisions @${width}`).toBe(false);
  }
});

test('mobile homepage navigation and calendar selection remain connected', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.getByRole('link',{name:'Axtar',exact:true})).toHaveAttribute('href','/search');
  await expect(page.getByRole('link',{name:'Bildirişlər',exact:true})).toHaveAttribute('href','/team/notifications');
  await page.getByRole('button',{name:'Menyunu aç'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.hero-actions a').first()).toHaveAttribute('href','/tournaments');
  const other=page.locator('.home-other-tournament').nth(1);
  const name=await other.locator('strong').textContent();
  await other.click();
  await expect(page.locator('.competition-feature h2')).toHaveText(name!);
  await expect(page.locator('.calendar-event-inspector h3')).toHaveText(name!);
  await page.getByRole('button',{name:'Növbəti ay',exact:true}).click();
  await expect(page.locator('.tournament-calendar__empty')).toBeVisible();
  await page.getByRole('button',{name:'Əvvəlki ay',exact:true}).click();
  await expect(page.locator('.calendar-event-inspector')).toBeVisible();
  await expect(page.locator('.home-ranked-team').first()).toHaveAttribute('href',/^\/teams\//);
  await expect(page.locator('.cinematic-footer__statement a')).toHaveAttribute('href','mailto:aevicesports@gmail.com');
});

test('planning calendar and agenda have independent borderless surfaces', async ({page}) => {
  await page.goto('/tournaments');
  await expect(page.locator('.tournament-day-list .tournament-row').first()).toBeVisible();
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    const surfaces=await page.locator('.tournament-program__index .tournament-calendar__picker, .tournament-day-list').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n),b=n.getBoundingClientRect();return {background:s.backgroundColor,border:s.borderLeftWidth,x:b.x,y:b.y,right:b.right,bottom:b.bottom};}));
    expect(surfaces[0].background).toBe('rgb(21, 23, 28)');
    expect(surfaces[1].background).toBe('rgb(23, 25, 31)');
    expect(surfaces[1].border).toBe('0px');
    expect(width>700?surfaces[1].x-surfaces[0].right:surfaces[1].y-surfaces[0].bottom).toBeGreaterThanOrEqual(15);
  }
});
