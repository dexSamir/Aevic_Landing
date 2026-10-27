import {test,expect} from '../helpers/api-fixture-test';
test.use({screenshot:'off',trace:'off',video:'off'});
for(const path of ['/login','/register'])for(const provider of ['supabase','direct'])test(`${path} navigates to ${provider} after server initiation`,async({page})=>{
 await page.route('**/api/me/session',route=>route.fulfill({contentType:'application/json',body:'null'}));
 const target=provider==='supabase'?'https://nmjjibifcuzjlsvfcaaz.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Faevic-esports.netlify.app%2Fapi%2Fauth%2Fgoogle%2Fcallback%3Fstate%3Dstate&code_challenge=challenge&code_challenge_method=s256':'https://accounts.google.com/o/oauth2/v2/auth?state=state&code_challenge=challenge';
 await page.route('**/api/auth/google/status',route=>route.fulfill({json:{enabled:true}}));
 await page.route('**/api/auth/google/start',route=>route.fulfill({json:{url:target},headers:{'set-cookie':'aevic-google=browser-binding; HttpOnly; SameSite=Lax; Path=/'}}));
 await page.route(provider==='supabase'?'https://nmjjibifcuzjlsvfcaaz.supabase.co/**':'https://accounts.google.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>OAuth provider fixture</h1>'}));
 await page.goto(path+'?returnTo=%2Faccount');
 const request=page.waitForRequest('**/api/auth/google/start');
 await page.getByRole('button',{name:'Google ilə davam et'}).click();
 expect((await request).postDataJSON()).toEqual({returnTo:'/account'});
 await expect(page).toHaveURL(target);
 await page.goBack();await expect(page.locator('.auth-shell')).toHaveClass(path==='/login'?/auth-shell--login/:/auth-shell--register/);await expect(page.getByRole('button',{name:'Google ilə davam et'})).toBeEnabled();
 expect((await page.context().cookies('http://127.0.0.1:4173')).find(c=>c.name==='aevic-google')).toMatchObject({value:'browser-binding',httpOnly:true,sameSite:'Lax'});
});
