import {test,expect} from '@playwright/test';
const credentials={email:'captain101@example.invalid',password:'IsolatedBrowser42'};
async function login(page:any){await page.goto('/login');await page.getByLabel('E-poçt',{exact:true}).fill(credentials.email);await page.getByLabel('Şifrə',{exact:true}).fill(credentials.password);await page.getByRole('button',{name:'Daxil ol',exact:true}).click();await expect(page).toHaveURL(/\/team$/);}
test('real account profile persists across refresh and rejects guest/admin access',async({page,request})=>{
 expect((await request.get('/api/me/account')).status()).toBe(401);
 await login(page);await page.reload();await expect(page.locator('h1')).toBeVisible();
 await page.goto('/account/profile');await page.getByLabel('Ad',{exact:true}).fill('Persisted');await page.getByLabel('Soyad',{exact:true}).fill('Captain');
 const saved=page.waitForResponse(r=>r.url().endsWith('/api/me/account')&&r.request().method()==='PATCH');
 await page.getByRole('button',{name:'Dəyişiklikləri saxla',exact:true}).click();expect((await saved).ok()).toBe(true);
 await page.reload();await expect(page.getByLabel('Ad',{exact:true})).toHaveValue('Persisted');
 expect((await page.request.get('/api/admin/context')).status()).toBe(403);
 const logout=await page.request.post('/api/auth/logout',{headers:{origin:'http://127.0.0.1:4194'}});expect(logout.ok()).toBe(true);
 await page.goto('/account/profile');await expect(page).toHaveURL(/\/login$/);
});
test('real public discovery excludes private captain fields and missing teams',async({request,page})=>{
 const response=await request.get('/api/public/teams');expect(response.ok()).toBe(true);const teams=await response.json();expect(teams.map((t:any)=>t.id)).toEqual(['101','102']);expect(JSON.stringify(teams)).not.toContain('captain101@example.invalid');
 await page.goto('/teams');await expect(page.getByText('Isolated Team 101',{exact:true}).first()).toBeVisible();
 expect((await request.get('/api/public/teams/999999')).status()).toBe(404);
 await page.goto('/teams/999999');await expect(page.locator('h1')).toBeVisible();await expect(page.getByRole('link',{name:'Komanda kataloqu'})).toBeVisible();
});
test('notification preferences persist and foreign account cannot read support tickets',async({page,browser})=>{
 await login(page);await page.goto('/account/notifications');const setting=page.getByLabel('Tətbiqdaxili bildirişlər',{exact:true});await expect(setting).toBeVisible();const next=!(await setting.isChecked());await setting.focus();await setting.press('Space');
 const saving=page.waitForResponse(r=>r.url().endsWith('/api/me/notification-preferences')&&r.request().method()==='PUT');await page.getByRole('button',{name:/saxla/i}).click();expect((await saving).ok()).toBe(true);await page.reload();await expect(setting).toBeChecked({checked:next});
 await page.goto('/account/support/tickets/new');await page.getByLabel('Mövzu',{exact:true}).fill('Isolated persisted support');await page.getByLabel('Təsvir',{exact:true}).fill('This synthetic issue verifies persisted support without private production data.');await page.getByRole('button',{name:'Ticket yarat',exact:true}).click();await expect(page).toHaveURL(/\/account\/support\/tickets\/[0-9a-f-]+$/);
 const id=page.url().split('/').at(-1)!;await page.reload();await expect(page.getByRole('heading',{name:'Isolated persisted support',exact:true})).toBeVisible();
 await page.getByLabel('Cavabınız').fill('A persisted follow-up from the synthetic account.');await page.getByRole('button',{name:'Cavab göndər'}).click();await expect(page.getByRole('status')).toContainText('Cavab saxlanıldı');await page.reload();await expect(page.getByText('A persisted follow-up from the synthetic account.',{exact:true})).toBeVisible();
 const foreign=await browser.newContext({baseURL:'http://127.0.0.1:4194'});const auth=await foreign.request.post('/api/auth/login',{headers:{origin:'http://127.0.0.1:4194'},data:{email:'captain102@example.invalid',password:credentials.password}});expect(auth.ok()).toBe(true);
 expect((await foreign.request.get('/api/me/support/tickets/'+id)).status()).toBe(404);expect((await foreign.request.post('/api/me/support/tickets/'+id+'/messages',{headers:{origin:'http://127.0.0.1:4194'},data:{body:'Unauthorized attempt'}})).status()).toBe(404);await foreign.close();
 await page.goto('/account/support/tickets');await expect(page.getByText('Isolated persisted support',{exact:true})).toBeVisible();
});
test('sessions revoke another real cookie and retain current login',async({page,browser})=>{
 await login(page);const other=await browser.newContext({baseURL:'http://127.0.0.1:4194'});expect((await other.request.post('/api/auth/login',{headers:{origin:'http://127.0.0.1:4194'},data:credentials})).ok()).toBe(true);expect((await other.request.get('/api/me/session')).ok()).toBe(true);
 await page.goto('/account/sessions');await page.getByRole('button',{name:'Digər hamısından çıx'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await page.getByRole('button',{name:'Digər hamısından çıx'}).click();await dialog.getByRole('button',{name:/çıx|təsdiq/i}).last().click();await expect(dialog).toBeHidden();
 expect(await (await other.request.get('/api/me/session')).json()).toBeNull();await page.reload();await expect(page.getByText('Cari sessiya',{exact:true})).toBeVisible();await other.close();
});
test('wrong credentials stay on login and do not establish a session',async({page})=>{
 await page.goto('/login');await page.getByLabel('E-poçt',{exact:true}).fill(credentials.email);await page.getByLabel('Şifrə',{exact:true}).fill('WrongPassword42');const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));await page.getByRole('button',{name:'Daxil ol',exact:true}).click();expect((await response).status()).toBe(401);await expect(page).toHaveURL(/\/login$/);expect(await (await page.request.get('/api/me/session')).json()).toBeNull();
});
test('MFA enrollment, recovery and disable use real persisted factors',async({page,browser})=>{
 const {fromBase32,totp}=await import('../../server/platform/totp');
 await login(page);await page.goto('/account/security');await page.getByLabel('2FA əməliyyatı üçün cari şifrə').fill(credentials.password);
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/me/2fa/setup')&&r.request().method()==='POST');await page.getByRole('button',{name:'2FA-nı aktiv et',exact:true}).click();const setup=await(await pending).json();
 const code=totp(fromBase32(new URL(setup.otpauthUri).searchParams.get('secret')!),Math.floor(Date.now()/30000));await page.getByLabel('6 rəqəmli OTP').fill(code);
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/me/2fa/setup/verification'));await page.getByRole('button',{name:'Kodu təsdiqlə'}).click();const recovery=await(await verified).json();expect(recovery.codes).toHaveLength(10);
 await page.reload();await expect(page.getByRole('button',{name:'2FA aktivdir',exact:true})).toBeVisible();
 const other=await browser.newContext({baseURL:'http://127.0.0.1:4194'});const headers={origin:'http://127.0.0.1:4194'};
 const denied=await other.request.post('/api/auth/login',{headers,data:credentials});expect(denied.status()).toBe(401);expect((await denied.json()).code).toBe('MFA_REQUIRED');
 expect((await other.request.post('/api/auth/login',{headers,data:{...credentials,otp:recovery.codes[0]}})).ok()).toBe(true);
 expect((await other.request.post('/api/auth/login',{headers,data:{...credentials,otp:recovery.codes[0]}})).status()).toBe(401);
 await page.getByLabel('2FA əməliyyatı üçün cari şifrə').fill(credentials.password);await page.getByLabel('Doğrulama və ya bərpa kodu').fill(recovery.codes[1]);await page.getByRole('button',{name:'2FA-nı deaktiv et'}).click();await expect(page.getByRole('button',{name:'2FA-nı aktiv et',exact:true})).toBeVisible();await page.reload();expect((await(await page.request.get('/api/me/2fa')).json()).enabled).toBe(false);await other.close();
});
test('password recovery consumes the delivered token and rejects reuse',async({page,request})=>{
 await page.goto('/forgot-password');await page.getByLabel('E-poçt',{exact:true}).fill('captain102@example.invalid');await page.getByRole('button',{name:'Bərpa linkini göndər'}).click();await expect(page.getByRole('status')).toContainText('Şifrə bərpa linki göndərildi');
 const mail=await(await request.get('/__test/mail')).json();const message=mail.findLast((m:any)=>m.to.includes('captain102@example.invalid'));expect(message).toBeTruthy();const link=message.text.match(/http:\/\/[^\s]+/)![0];
 await page.goto(link);await page.getByLabel('Yeni şifrə',{exact:true}).fill('ChangedIsolated42');await page.getByLabel('Şifrəni təsdiqlə',{exact:true}).fill('ChangedIsolated42');await page.getByRole('button',{name:'Şifrəni yenilə',exact:true}).click();await expect(page.getByRole('status')).toContainText('Yeni şifrəniz hazırdır');
 const headers={origin:'http://127.0.0.1:4194','x-nf-client-connection-ip':'198.51.100.52'};expect((await request.post('/api/auth/login',{headers,data:{email:'captain102@example.invalid',password:credentials.password}})).status()).toBe(401);expect((await request.post('/api/auth/login',{headers,data:{email:'captain102@example.invalid',password:'ChangedIsolated42'}})).ok()).toBe(true);
 await page.goto(link);await expect(page.getByLabel('Yeni şifrə',{exact:true})).toHaveCount(0);await expect(page.locator('h1')).toBeVisible();
});
