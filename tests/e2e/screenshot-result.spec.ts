import { expect, test } from '../helpers/api-fixture-test';

test('reads a team screenshot locally, saves an edited draft and publishes only after confirmation', async ({ page }) => {
  const writes: string[] = [];
  const external: string[] = [];
  page.context().on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/admin/') && request.method() !== 'GET') writes.push(url.pathname);
    if (/^https?:$/.test(url.protocol) && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') external.push(url.origin);
  });
  await page.route('**/api/public/site-content', route => route.fulfill({ json: {} }));
  await page.route('**/api/admin/tournaments/daily-cup-24/entries', route => route.fulfill({
    json: [{ teamId: 'team-01', status: 'confirmed' }],
  }));
  let saved: Record<string, unknown> | undefined;
  await page.route('**/api/admin/results?*', route => route.fulfill({ json: saved ? [saved] : [] }));
  await page.route('**/api/admin/results', route => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: saved });
  });
  await page.route('**/api/admin/matches/*/publication', route => route.fulfill({ status: 204 }));
  await page.goto('/admin/results?tournament=daily-cup-24&round=dc24-r1');
  await page.getByRole('combobox', { name: 'Komanda', exact: true }).selectOption('team-01');
  // Generate the OCR input in memory so the test exercises the real worker and model.
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 650; canvas.height = 200;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff'; context.fillRect(0, 0, 650, 200);
    context.fillStyle = '#000'; context.font = '36px Arial';
    context.fillText('Team Rank: 3', 30, 70);
    context.fillText('Total Eliminations: 12', 30, 140);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel(/Nəticə şəkli/).setInputFiles({ name: 'team.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(page.getByLabel('Qaralama yerləşməsi')).toHaveValue('3', { timeout: 20000 });
  await expect(page.getByLabel('Qaralama komanda kill sayı')).toHaveValue('12');
  await expect(page.getByLabel('Kill sayı', { exact: true })).toHaveValue('0');
  await page.getByLabel('Qaralama komanda kill sayı').fill('11');
  await page.getByRole('button', { name: /Şəkillə yoxladım/ }).click();
  await expect(page.getByLabel('Kill sayı', { exact: true })).toHaveValue('11');
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Komanda nəticəsini saxla' }).click();
  await expect.poll(() => saved).toMatchObject({ teamId: 'team-01', placement: 3, finishes: 11, published: false });
  await expect(page.getByText('Qaralama', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bütün raund nəticələrini dərc et' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(writes).toEqual(['/api/admin/results']);
  await page.getByRole('button', { name: 'Nəticələri dərc et', exact: true }).click();
  await expect.poll(() => writes).toEqual(['/api/admin/results', '/api/admin/matches/dc24-r1/publication']);
  expect(external).toEqual([]);
});

test('combines overlapping round screenshots, verifies the editable table, and saves one unpublished batch', async ({ page }) => {
  const teams = ['Caspian Wolves', 'North Flame', 'Baku Sentinels'];
  const ids = ['team-01','team-02','team-03'];
  await page.route('**/api/public/site-content', route => route.fulfill({ json: {} }));
  await page.route('**/api/admin/tournaments/daily-cup-24/entries', route => route.fulfill({ json: ids.map(teamId => ({ teamId, status:'confirmed' })) }));
  await page.route('**/api/admin/results?*', route => route.fulfill({ json: [] }));
  const writes: string[] = [];
  let payload;
  page.on('request', r => { if (/\/api\/admin\//.test(r.url()) && r.method() !== 'GET') writes.push(r.method() + ' ' + new URL(r.url()).pathname); });
  await page.route('**/api/admin/matches/dc24-r1/result-drafts', route => { payload = route.request().postDataJSON(); return route.fulfill({ status:204 }); });
  await page.goto('/admin/results?tournament=daily-cup-24&round=dc24-r1');
  await page.getByRole('button', { name:'Raund cədvəlini şəkillərdən hazırla' }).click();
  const image = async (indices: number[]) => Buffer.from(await page.evaluate(({ teams, indices }) => {
    const canvas = document.createElement('canvas'); canvas.width=920; canvas.height=230;
    const c=canvas.getContext('2d')!; c.fillStyle='white'; c.fillRect(0,0,920,230); c.fillStyle='black'; c.font='28px Arial';
    for (const [x,label] of [[30,'Placement'],[285,'Team'],[700,'Eliminations']] as const) c.fillText(label,x,55);
    indices.forEach((i,r) => {const y=110+r*50; c.fillText(String(i+1),30,y); c.fillText(teams[i],285,y); c.fillText(String(2-i),700,y);});
    return canvas.toDataURL().split(',')[1];
  }, { teams, indices }), 'base64');
  const first = {name:'top.png',mimeType:'image/png',buffer:await image([0,1])};
  const next = {name:'next.png',mimeType:'image/png',buffer:await image([1,2])};
  const files=page.getByLabel(/Raund şəkilləri/);
  await files.setInputFiles(first);
  await expect(page.getByText(/Çatışmayan komandalar \(1\).*Baku Sentinels/)).toBeVisible();
  await files.setInputFiles([next,{...first,name:'copy.png'}]);
  await expect(page.getByText(/copy.png.*artıq əlavə edilib/)).toBeVisible();
  const review=page.getByRole('table',{name:'Yoxlanılacaq komanda nəticələri'});
  await expect(review.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByLabel('Kill, sətir 3',{exact:true})).toHaveValue('0');
  const check=page.getByRole('checkbox',{name:/Komandaları, yerləşmələri/});
  await check.check();
  await page.getByLabel('Yerləşmə, sətir 2',{exact:true}).fill('1');
  await expect(check).not.toBeChecked(); await expect(check).toBeDisabled();
  await expect(review.getByText('Yerləşmə təkrarlanır').first()).toBeVisible();
  await page.getByLabel('Yerləşmə, sətir 2',{exact:true}).fill('2');
  await page.getByLabel('Kill, sətir 1',{exact:true}).fill('5');
  await check.check();
  expect(writes).toEqual([]);
  await page.getByRole('button',{name:'Raund qaralamasını saxla'}).click();
  await expect.poll(()=>payload).toEqual({tournamentId:'daily-cup-24',expected:[],rows:ids.map((teamId,i)=>({teamId,placement:i+1,finishes:[5,1,0][i]}))});
  expect(writes).toEqual(['PUT /api/admin/matches/dc24-r1/result-drafts']);
});

// Optional original broadcast PNGs from https://community.iqoo.com/in/thread/125544,
// Match Ranking figures 4 and 5. Keep source images outside the repository.
test('reviews both original PMGC Group Red M7 broadcast pages against their visible cells', async ({ page }) => {
  const first=process.env.AEVIC_PMGC_M7_PAGE_1, second=process.env.AEVIC_PMGC_M7_PAGE_2;
  test.skip(!first || !second, 'Supply both original broadcast pages for the local OCR check.');
  test.setTimeout(90000);
  const {fixtureServices}=await import('../fixtures/component-services');
  const snapshot=await fixtureServices.snapshots.admin();
  const tags=['BG','VP','EA','FL','INF','ETSH','WBG','GEEK','NRZ','ARC','REG','BOAR','TWIS','TRx','ALL','DRX'];
  const kills=['10','7','8','10','4','7','4','6','2','4','3','3','1','1','0','0'];
  const teams=tags.map((tag,i)=>({...snapshot.teams[0],id:String(i+1),name:'Participant '+(i+1),tag}));
  await page.route('**/api/public/site-content', r=>r.fulfill({json:{}}));
  await page.route('**/api/admin/context', r=>r.fulfill({json:{...snapshot,teams}}));
  await page.route('**/api/admin/results?*', r=>r.fulfill({json:[]}));
  await page.route('**/api/admin/tournaments/daily-cup-24/entries', r=>r.fulfill({json:teams.map(t=>({teamId:t.id,status:'confirmed'}))}));
  await page.goto('/admin/results?tournament=daily-cup-24&round=dc24-r1');
  await page.getByRole('button',{name:'Raund cədvəlini şəkillərdən hazırla'}).click();
  await page.getByLabel(/Raund şəkilləri/).setInputFiles([first!,second!]);
  const table=page.getByRole('table',{name:'Yoxlanılacaq komanda nəticələri'});
  await expect(table.locator('tbody tr')).toHaveCount(16,{timeout:60000});
  let correct=0;
  for(const [i,row] of (await table.locator('tbody tr').all()).entries()){
    await expect(row.getByRole('combobox')).toHaveValue(String(i+1));
    await expect(row.getByRole('spinbutton').first()).toHaveValue('');
    const value=await row.getByRole('spinbutton').last().inputValue();
    if(value){expect(value).toBe(kills[i]); correct++;}
  }
  expect(correct).toBeGreaterThanOrEqual(13);
  await expect(page.getByRole('button',{name:'Raund qaralamasını saxla'})).toBeDisabled();
});
