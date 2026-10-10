import {test,expect} from '../helpers/api-fixture-test';
test('team statistics remain readable across viewport sizes',async({page})=>{
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:950});await page.goto('/teams/caspian-wolves');
  await expect(page.locator('#performance h2')).toHaveText('Xəritə statistikası');
  await expect(page.locator('#performance meter')).toHaveCount(0);
  await expect(page.locator('.public-map-metrics')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const career=await page.locator('#overview').boundingBox(),form=await page.locator('#form').boundingBox();
  if(width===1440){expect(Math.abs(career!.y-form!.y)).toBeLessThan(2);expect(form!.x).toBeGreaterThan(career!.x);}
  if(width===390)expect(form!.y).toBeGreaterThan(career!.y);
 }
});
test('copy confirms actual clipboard completion and account menu supports keyboard',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
 await page.goto('/teams/caspian-wolves');
 await page.getByRole('button',{name:/linki kopyala/}).click();await expect(page.getByText('Link kopyalandı',{exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:950});
 await page.getByRole('button',{name:/hesab menyusu/}).click();
 const menu=page.getByRole('menu',{name:'Hesab əməliyyatları'});await expect(menu).toBeVisible();await expect(menu.getByRole('menuitem').first()).toBeFocused();
 await page.keyboard.press('End');await expect(menu.getByRole('menuitem',{name:'Çıxış'})).toBeFocused();
 await page.keyboard.press('Home');await expect(menu.getByRole('menuitem',{name:/Komanda paneli/})).toBeFocused();
 await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);
});
test('workspace sidebar removes only its startup brand and keeps charts responsive',async({page})=>{
 await page.setViewportSize({width:1440,height:950});await page.goto('/team');
 await expect(page.getByRole('heading',{name:'Caspian Wolves',exact:true})).toBeVisible();
 await expect(page.locator('.product-sidebar .workspace-brand')).toHaveCount(0);
 await expect(page.locator('.product-sidebar')).toContainText('Caspian Wolves');
 for(const width of [1440,768,390]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('banner editor preserves output size, keyboard controls and focus',async({page})=>{
 await page.setViewportSize({width:1440,height:950});await page.goto('/team/profile');
 await page.getByRole('button',{name:'Loqo və banneri idarə et'}).click();
 const upload=page.getByLabel('Komanda banneri',{exact:true});
 await upload.setInputFiles('src/assets/official/auth-aevic-arena-480.webp');
 const dialog=page.getByRole('dialog',{name:'Komanda bannerini düzəlt'});await expect(dialog).toBeVisible();
 const canvas=dialog.locator('canvas');await expect(canvas).toHaveAttribute('width','1600');await expect(canvas).toHaveAttribute('height','500');
 expect((await canvas.boundingBox())!.width).toBeGreaterThan(500);
 await expect(dialog.getByRole('button',{name:'Tətbiq et'})).toBeEnabled();
 await dialog.getByRole('button',{name:'Böyüt',exact:true}).click();await expect(dialog.locator('output')).toHaveText('110%');
 await canvas.focus();await page.keyboard.press('ArrowRight');
 await dialog.getByRole('button',{name:'Sıfırla'}).click();await expect(dialog.locator('output')).toHaveText('100%');
 await page.setViewportSize({width:390,height:844});expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});
