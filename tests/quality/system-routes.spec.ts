import {test,expect} from '../helpers/api-fixture-test';
const states=[
 ['/403','Bu səhifə üçün icazəniz yoxdur','Ana səhifə','/'],
 ['/500','Platforma sorğunu tamamlaya bilmədi','Ana səhifə','/'],
 ['/maintenance','Planlı texniki xidmət gedir','Ana səhifə','/'],
 ['/offline','Şəbəkə bağlantısı yoxdur','Ana səhifə','/'],
 ['/not-a-real-route','Bu səhifə yarış cədvəlində yoxdur','Ana səhifə','/'],
 ['/unauthorized','Giriş tələb olunur','Girişə keç','/login'],
 ['/session-expired','Sessiyanın vaxtı bitib','Girişə keç','/login'],
 ['/account-locked','Hesab müvəqqəti kilidlənib','Girişə keç','/login'],
 ['/too-many-attempts','Çox sayda cəhd edildi','Girişə keç','/login'],
 ['/forbidden','Bu əməliyyat üçün icazəniz yoxdur','Girişə keç','/login'],
];
for(const [path,heading,action,target]of states)test(`system route acceptance ${path}`,async({page})=>{
 await page.goto(path);await expect(page.getByRole('heading',{level:1,name:heading})).toBeVisible();
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
 for(const width of [320,375,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
 await page.reload();await expect(page.getByRole('heading',{level:1,name:heading})).toBeVisible();
 const retry=page.getByRole('button',{name:'Yenidən cəhd et',exact:true});
 if(await retry.count()){await retry.click();await expect(page.getByRole('heading',{level:1,name:heading})).toBeVisible();}
 const link=page.getByRole('link',{name:action,exact:true}).last();
 await expect(link).toHaveAttribute('href',target);await link.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(new RegExp(target==='/'?'/$':'/login$'));
 await page.goBack();await expect(page.getByRole('heading',{level:1,name:heading})).toBeVisible();
});
