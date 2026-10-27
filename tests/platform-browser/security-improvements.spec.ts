import { test, expect } from '@playwright/test';
import { fromBase32, totp } from '../../server/platform/totp';
const origin='http://127.0.0.1:4194';
const credentials={email:'captain101@example.invalid',password:'IsolatedBrowser42'};
async function login(page:any){
 await page.goto('/login/?returnTo=%2Fteam');
 await page.getByLabel('E-poçt',{exact:true}).fill(credentials.email);
 await page.getByLabel('Şifrə',{exact:true}).fill(credentials.password);
 await page.getByRole('button',{name:'Daxil ol',exact:true}).click();
 await expect(page).toHaveURL(origin+'/');
}
test('real login, guest routes and authenticated password rotation preserve the current identity',async({page,browser})=>{
 await login(page);
 for(const route of ['/login','/login/','/register','/register/']){await page.goto(route);await expect(page).toHaveURL(origin+'/');}
 const other=await browser.newContext({baseURL:origin});
 await other.request.post('/api/auth/login',{headers:{origin},data:credentials});
 await page.goto('/account/security/');
 for(const [width,height] of [[320,568],[360,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]]){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:1440,height:900});
 const newPassword='DistinctMountain86';
 await page.getByLabel('Cari şifrə',{exact:true}).fill(credentials.password);
 await page.getByLabel('Yeni şifrə',{exact:true}).fill(newPassword);
 await page.getByLabel('Yeni şifrəni təsdiqlə',{exact:true}).fill(newPassword);
 const toggles=page.getByRole('button',{name:'Şifrəni göstər',exact:true});
 await toggles.first().click();await expect(page.getByLabel('Cari şifrə',{exact:true})).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'Şifrəni gizlət'}).click();
 await page.getByRole('button',{name:'Şifrəni yenilə',exact:true}).click();
 await expect(page.getByText('Şifrə yeniləndi.',{exact:true})).toBeVisible();
 await expect(page).toHaveURL(/\/account\/security\/$/);
 expect((await(await page.request.get('/api/me/session')).json()).user.email).toBe(credentials.email);
 expect(await(await other.request.get('/api/me/session')).json()).toBeNull();
 await page.reload();await expect(page.getByLabel('Cari şifrə',{exact:true})).toBeVisible();
 // Restore this disposable fixture for the following MFA scenario.
 expect((await page.request.put('/api/me/account/password',{headers:{origin},data:{currentPassword:newPassword,newPassword:credentials.password}})).status()).toBe(204);
 await other.close();
});
test('real MFA rejects wrong password/code, enrolls, enforces login and consumes recovery once',async({page,browser})=>{
 await login(page);await page.goto('/account/security');
 await page.getByRole('button',{name:'2FA-nı aktiv et',exact:true}).click();
 await expect(page.getByText('2FA qurmaq üçün cari hesab şifrənizi daxil edin.',{exact:true})).toBeVisible();
 await page.getByLabel('2FA əməliyyatı üçün cari şifrə').fill('WrongPassword42');
 await page.getByRole('button',{name:'2FA-nı aktiv et',exact:true}).click();
 await expect(page.getByText('Cari şifrə yanlışdır. Yenidən daxil edin.',{exact:true})).toBeVisible();
 await page.getByLabel('2FA əməliyyatı üçün cari şifrə').fill(credentials.password);
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/me/2fa/setup')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'2FA-nı aktiv et',exact:true}).click();const setup=await(await pending).json();
 expect(setup.setupId).toBeTruthy();
 const secret=fromBase32(new URL(setup.otpauthUri).searchParams.get('secret')!);
 const code=totp(secret,Math.floor(Date.now()/30000));
 const wrong=String((Number(code)+500000)%1000000).padStart(6,'0');
 await page.getByLabel('6 rəqəmli OTP').fill(wrong);await page.getByRole('button',{name:'Kodu təsdiqlə'}).click();
 await expect(page.getByText('Birdəfəlik kod təsdiqlənmədi və ya aktivləşdirmə müddəti bitib.',{exact:true})).toBeVisible();
 await page.getByLabel('6 rəqəmli OTP').fill(code);
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/me/2fa/setup/verification'));
 await page.getByRole('button',{name:'Kodu təsdiqlə'}).click();const recovery=await(await verified).json();expect(recovery.codes).toHaveLength(10);
 await page.reload();await expect(page.getByRole('button',{name:'2FA aktivdir',exact:true})).toBeVisible();
 const other=await browser.newContext({baseURL:origin});
 expect((await other.request.post('/api/auth/login',{headers:{origin},data:credentials})).status()).toBe(401);
 expect((await other.request.post('/api/auth/login',{headers:{origin},data:{...credentials,otp:recovery.codes[0]}})).status()).toBe(200);
 expect((await other.request.post('/api/auth/login',{headers:{origin},data:{...credentials,otp:recovery.codes[0]}})).status()).toBe(401);
 expect((await page.request.delete('/api/me/2fa',{headers:{origin},data:{password:credentials.password,code:recovery.codes[1]}})).status()).toBe(204);
 await other.close();
});
