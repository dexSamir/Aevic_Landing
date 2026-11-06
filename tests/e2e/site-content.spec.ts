import {test,expect} from '../helpers/api-fixture-test';
import {sitePages,emptyDocument,type SiteRecord} from '../../src/content/siteManagement';

test.beforeEach(async({page})=>{
 await page.route('**/api/admin/site-content-media',route=>route.fulfill({json:[]}));
 const records:Record<string,SiteRecord>=Object.fromEntries(sitePages.map(p=>[p.id,{revision:0,draft:emptyDocument(),published:null,publishedAt:null,history:[]}]));
 await page.route('**/api/public/site-content',route=>route.fulfill({json:Object.fromEntries(Object.entries(records).filter(([,r])=>r.published).map(([id,r])=>[id,r.published]))}));
 await page.route('**/api/admin/site-content',route=>route.fulfill({json:records}));
 await page.route('**/api/admin/site-content/*',async route=>{
  const id=new URL(route.request().url()).pathname.split('/').pop()!,input=route.request().postDataJSON(),old=records[id];
  if(input.revision!==old.revision){await route.fulfill({status:409,json:{code:'STALE_VERSION',message:'Köhnə versiya'}});return;}
  const revision=old.revision+1,at=new Date().toISOString();records[id]={revision,draft:input.document,published:input.action==='publish'?input.document:input.action==='unpublish'?null:old.published,publishedAt:input.action==='publish'?at:input.action==='unpublish'?null:old.publishedAt,history:[{revision,action:input.action,at,by:'admin',document:input.document},...old.history].slice(0,20)};
  await route.fulfill({json:records[id]});
 });
});
async function publish(page:import('@playwright/test').Page){await page.getByRole('button',{name:'Dərc et',exact:true}).click();await page.getByRole('button',{name:'Təsdiq et',exact:true}).click();await expect(page.getByText('Dərc edildi. Saytda yenilənib.',{exact:true})).toBeVisible();}

test('home drafts remain private, preview renders, publication and refresh use real sections',async({page})=>{
 await page.goto('/admin/site?page=home');await page.getByLabel('Başlıq',{exact:true}).fill('Yeni CMS səhnəsi');await page.getByRole('button',{name:'Qaralamanı saxla',exact:true}).click();await expect(page.getByText('Qaralama saxlanıldı. Sayt dəyişməyib.')).toBeVisible();
 await page.goto('/');await expect(page.getByRole('heading',{name:/Yeni CMS/})).toHaveCount(0);
 await page.goto('/?sitePreview=home');await expect(page.getByRole('heading',{name:/Yeni CMS səhnəsi/})).toBeVisible();await expect(page.getByText('Qaralama önbaxışı · dərc edilməyib')).toBeVisible();
 await page.goto('/admin/site?page=home');await publish(page);await page.goto('/');await expect(page.getByRole('heading',{name:/Yeni CMS səhnəsi/})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:/Yeni CMS səhnəsi/})).toBeVisible();
});

test('informational content escapes markup, supports visibility, restoration and mobile editing',async({page})=>{
 await page.goto('/admin/site?page=terms');await page.getByRole('button',{name:'Hazırkı əhatə',exact:true}).click();await page.getByRole('textbox',{name:'Mətn',exact:true}).fill('Yeni şərtlər <script>window.cmsInjected=true</script>');
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[375,812],[812,375]]){await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Dərc et',exact:true})).toBeEnabled();}
 await page.setViewportSize({width:390,height:844});await expect(page.getByLabel('Redaktə edilən səhifə')).toHaveValue('terms');await page.screenshot({path:'/tmp/aevic-cms-editor-mobile.png',fullPage:true});await publish(page);
 await page.goto('/terms');await expect(page.getByText('Yeni şərtlər <script>window.cmsInjected=true</script>',{exact:true})).toBeVisible();expect(await page.evaluate(()=>('cmsInjected' in window))).toBe(false);
 await page.goto('/admin/site?page=terms');await page.getByRole('button',{name:'Hazırkı əhatə',exact:true}).click();await page.getByLabel('Göstər',{exact:true}).click();await publish(page);await page.goto('/terms');await expect(page.getByRole('heading',{name:'Hazırkı əhatə',exact:true})).toHaveCount(0);
 await page.goto('/admin/site?page=terms');await page.getByText('Son 20 dəyişiklik',{exact:true}).click();await page.getByRole('button',{name:'Qaralamaya köçür',exact:true}).last().click();await publish(page);await page.goto('/terms');await expect(page.getByRole('heading',{name:'Hazırkı əhatə',exact:true})).toBeVisible();
});

test('global labels and team guidance publish without changing private team data',async({page})=>{
 await page.goto('/admin/site');await page.getByLabel('Ana səhifə · ad',{exact:true}).fill('AEVIC ana səhifə');await publish(page);await page.goto('/');await expect(page.getByRole('navigation',{name:'Əsas naviqasiya',exact:true}).getByRole('link',{name:'AEVIC ana səhifə',exact:true})).toBeVisible();
 await page.goto('/admin/site?page=team-guide');await page.getByLabel('Bələdçini göstər',{exact:true}).click();await page.getByRole('textbox',{name:'Təlimat',exact:true}).fill('Yeni komanda bələdçisi');await publish(page);await page.goto('/team');await expect(page.locator('.site-guidance').getByText('Yeni komanda bələdçisi',{exact:true})).toBeVisible();
});

test('homepage visibility and ordering preserve real tournament data',async({page})=>{
 await page.goto('/admin/site?page=home');await page.getByRole('button',{name:'Xəritələr',exact:true}).click();await page.getByLabel('Göstər',{exact:true}).click();await page.getByText('Bölmələrin sırası',{exact:true}).click();await page.getByRole('button',{name:'teams yuxarı',exact:true}).click();await page.getByRole('button',{name:'teams yuxarı',exact:true}).click();await publish(page);
 await page.goto('/');await expect(page.locator('.home-rotation')).toHaveCount(0);await expect(page.locator('.home-competition-rail h2')).toBeVisible();expect(await page.locator('.home-teams-section').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.home-calendar-section')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});
