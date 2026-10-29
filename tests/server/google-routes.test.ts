import {exchangeSupabaseGoogle} from '../../server/auth/supabase-google';
vi.mock('../../server/auth/supabase-google',async original=>({...await original<typeof import('../../server/auth/supabase-google')>(),exchangeSupabaseGoogle:vi.fn().mockResolvedValue({subject:'google-sub',email:'captain@example.com',firstName:'Name',lastName:'Surname'})}));
import {beforeEach,it,expect,vi} from 'vitest';
import {createHttpApp} from '../../server/http';
import routes from '../../server/auth/google-routes';
import {tokenDigest} from '../../server/platform/context';
import {hashPassword} from '../../server/captain/crypto';
import {ServiceError} from '../../server/errors';
import {consumeFactor} from '../../server/platform/mfa';
import {exchangeGoogleCode} from '../../server/auth/google-provider';
vi.mock('../../server/platform/mfa',()=>({consumeFactor:vi.fn().mockResolvedValue(false)}));
vi.mock('../../server/auth/google-provider',async original=>({...await original<typeof import('../../server/auth/google-provider')>(),exchangeGoogleCode:vi.fn().mockResolvedValue({subject:'google-sub',email:'captain@example.com',firstName:'Name',lastName:'Surname'})}));
const config={supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture',siteUrl:'http://localhost:8888',secureCookies:false,sessionSecret:'fixture-secret-at-least-32-characters',google:{clientId:'client',clientSecret:'private-client-secret'}};
let flow:any,linked=false,existing=true,consumed=false,workspace=true,banned=false,registrationOpen=true,queries:string[],hash:string;
const sql:any=async(parts:TemplateStringsArray,...args:any[])=>{
 const q=parts.join('?');queries.push(q);
 if(q.includes('authentication_limits')&&q.includes('returning hits'))return [{hits:1}];
 if(q.includes('delete from')&&q.includes("phase='authorization'")){if(!flow||args[0]!==flow.token_digest||args[1]!==flow.browser_digest||flow.expires_at<Date.now())return [];const row=flow;flow=undefined;return [row];}
 if(q.includes('delete from')){if(q.includes('browser_digest'))flow=undefined;return [];}
 if(q.includes('insert into aevic_platform.google_flows')){flow={token_digest:args[0],browser_digest:args[1],nonce:args[2],verifier:args[3],expires_at:Date.now()+600000,phase:q.includes("'continuation'")?'continuation':'authorization',subject:args[2],email:args[3],first_name:args[4],last_name:args[5]};return [];}
 if(q.includes('select * from aevic_platform.google_flows'))return flow&&!consumed&&flow.expires_at>Date.now()&&flow.browser_digest===args[0]?[flow]:[];
 if(q.includes('from aevic_platform.google_identities'))return linked?[{account_id:'16',subject:'google-sub'}]:[];
 if(q.includes('from aevic_platform.team_authority'))return workspace?[{team_id:'16',role:'OWNER'}]:[];
 if(q.includes('select original_team_id'))return [{original_team_id:16}];
 if(q.includes('from aevic_platform.account_identity'))return existing?[{id:'16',email:'captain@example.com',password_hash:hash,status:banned?'banned':'approved'}]:[];
 if(q.includes("from aevic_platform.settings"))return [{value:{registrationEnabled:registrationOpen}}];
 if(q.includes('insert into aevic_platform.accounts(')){existing=true;hash=args[1];return [{id:'16'}];}
 if(q.includes('insert into aevic_platform.google_identities')){linked=true;return [];}
 if(q.includes("set phase='consumed'")){consumed=true;return [];}
 return [];
};
sql.begin=(work:any)=>work(sql);
sql.json=(value:any)=>value;
const app=(overrides:Partial<import('../../server/config').ServerConfig>={})=>{const a=createHttpApp({...config,...overrides});a.use('*',async(c,next)=>{c.set('platform',{sql,actor:{}} as any);await next();});a.route('/',routes);return a;};
const request=(path:string,data:any={},cookie='aevic-google=browser')=>app().request('/api'+path,{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json',cookie},body:JSON.stringify(data)});
beforeEach(async()=>{queries=[];flow=undefined;linked=false;existing=true;consumed=false;workspace=true;banned=false;registrationOpen=true;hash=await hashPassword('ValidPassword1');vi.mocked(consumeFactor).mockResolvedValue(false);vi.mocked(exchangeGoogleCode).mockClear();});
function pending(){flow={token_digest:'continuation',browser_digest:tokenDigest('browser'),phase:'continuation',subject:'google-sub',email:'captain@example.com',expires_at:Date.now()+600000};}
it('keeps disabled Google routes inert and preserves the existing logout handler',async()=>{
 const disabled=app({google:undefined,sessionMode:'legacy'});
 disabled.post('/auth/logout',c=>c.json({existingLogout:true}));
 const headers={origin:config.siteUrl,'content-type':'application/json',cookie:'aevic-google=browser; aevic-captain=existing-session'};
 expect(await (await disabled.request('/api/auth/google/status')).json()).toEqual({enabled:false});
 for(const path of ['start','complete'])expect((await disabled.request('/api/auth/google/'+path,{method:'POST',headers,body:'{}'})).status).toBe(503);
 expect((await disabled.request('/api/auth/google/continuation',{headers})).status).toBe(503);
 expect((await disabled.request('/api/auth/google/callback?state=state&code=code',{headers})).headers.get('location')).toBe('/login?google=failed');
 const logout=await disabled.request('/api/auth/logout',{method:'POST',headers,body:'{}'});
 expect(await logout.json()).toEqual({existingLogout:true});
 expect(logout.headers.get('set-cookie')).not.toContain('aevic-captain=');
 expect(queries).toEqual([]);expect(exchangeGoogleCode).not.toHaveBeenCalled();
});
it('starts PKCE with HttpOnly browser binding and no secret in URL',async()=>{const r=await request('/auth/google/start');expect(r.status).toBe(200);const {url}=await r.json();expect(url).toContain('code_challenge_method=S256');expect(new URL(url).searchParams.get('redirect_uri')).toBe(config.siteUrl+'/api/auth/google/callback');expect(new URL(url).searchParams.get('scope')).toBe('openid email profile');expect(url).not.toContain(config.google.clientSecret);expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).toContain('SameSite=Lax');});
it('rejects wrong state, expired callbacks and replay before provider exchange',async()=>{
 flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:0};
 const r=await app().request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});expect(r.headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).not.toHaveBeenCalled();
 flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};
 const wrong=await app().request('/api/auth/google/callback?state=wrong&code=code',{headers:{cookie:'aevic-google=browser'}});expect(wrong.headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).not.toHaveBeenCalled();
});
it('automatically creates a regular account without a team, consumes the flow and rejects replay',async()=>{
 existing=false;workspace=false;flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};
 const a=app(),url='/api/auth/google/callback?state=state&code=code',options={headers:{cookie:'aevic-google=browser'}};
 expect((await a.request(url,options)).headers.get('location')).toBe('/');
 expect(queries.some(q=>q.includes('insert into aevic_platform.accounts('))).toBe(true);
 expect(queries.some(q=>q.includes('insert into aevic_platform.sessions'))).toBe(true);
 expect(queries.some(q=>q.includes('insert into public.teams')||q.includes('admin_accounts')||q.includes('insert into aevic_platform.team_authority'))).toBe(false);
 expect(linked).toBe(true);expect(consumed).toBe(true);
 expect((await a.request(url,options)).headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).toHaveBeenCalledTimes(1);
});
it('requires password proof to link a verified matching email',async()=>{pending();expect((await request('/auth/google/complete',{password:'wrong'})).status).toBe(401);expect(linked).toBe(false);expect(consumed).toBe(false);const r=await request('/auth/google/complete',{password:'ValidPassword1'});expect(r.status).toBe(200);expect(linked).toBe(true);expect(consumed).toBe(true);expect(r.headers.get('set-cookie')).toContain('aevic-captain=');expect(await r.json()).toEqual({sessionMode:'legacy',redirectTo:'/'});});
it('uses stable linked subject without password and rejects continuation replay',async()=>{pending();linked=true;expect((await request('/auth/google/complete')).status).toBe(200);expect((await request('/auth/google/complete')).status).toBe(401);});
it('requires existing MFA before issuing sessions',async()=>{pending();linked=true;vi.mocked(consumeFactor).mockRejectedValueOnce(new ServiceError(401,'MFA_REQUIRED'));expect((await request('/auth/google/complete')).status).toBe(401);expect(consumed).toBe(false);expect(queries.some(q=>q.includes('insert into aevic_platform.sessions'))).toBe(false);expect((await request('/auth/google/complete',{otp:'123456'})).status).toBe(200);expect(consumeFactor).toHaveBeenLastCalledWith(sql,{teamId:'16'},config.sessionSecret,'123456');});
it('expires registration continuations and clears pending flow on logout',async()=>{pending();flow.expires_at=0;expect((await request('/auth/google/complete')).status).toBe(401);pending();await request('/auth/logout');expect(flow).toBeUndefined();});

it('issues the existing rotating-token envelope only when configured',async()=>{
 pending();linked=true;
 const response=await app({sessionMode:'tokens'}).request('/api/auth/google/complete',{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json',cookie:'aevic-google=browser'},body:'{}'});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({sessionMode:'tokens',accessToken:expect.stringMatching(/^v2\./)});expect(response.headers.get('set-cookie')).toContain('aevic-refresh-v2=');expect(queries.some(q=>q.includes('insert into aevic_platform.refresh_tokens'))).toBe(true);
});
it('does not contact provider on cancellation and handles provider failure',async()=>{
 const reset=()=>{flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};};
 reset();expect((await app().request('/api/auth/google/callback?state=state&error=access_denied',{headers:{cookie:'aevic-google=browser'}})).headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).not.toHaveBeenCalled();
 reset();vi.mocked(exchangeGoogleCode).mockRejectedValueOnce(new Error('provider down'));expect((await app().request('/api/auth/google/callback?state=state&code=x',{headers:{cookie:'aevic-google=browser'}})).headers.get('location')).toBe('/login?google=failed');
});

it('rejects cross-origin Google start and completion before persisting a flow',async()=>{
 for(const path of ['start','complete']){
  const response=await app().request('/api/auth/google/'+path,{method:'POST',headers:{origin:'https://untrusted.invalid','content-type':'application/json'},body:'{}'});
  expect(response.status).toBe(403);
 }
 expect(queries).toEqual([]);
 expect(exchangeGoogleCode).not.toHaveBeenCalled();
});

function callbackFlow(){flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};}
const callback=()=>app().request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});
it('automatically creates a linked account session and redirects to the homepage',async()=>{
 linked=true;callbackFlow();const response=await callback();
 expect(response.headers.get('location')).toBe('/');expect(response.headers.get('set-cookie')).toContain('aevic-captain=');expect(consumed).toBe(true);
 expect(queries.some(q=>q.includes('from aevic_platform.team_authority'))).toBe(true);
});
it('retains the MFA challenge and never creates a session before verification',async()=>{
 linked=true;callbackFlow();vi.mocked(consumeFactor).mockRejectedValueOnce(new ServiceError(401,'MFA_REQUIRED'));
 const response=await callback();expect(response.headers.get('location')).toBe('/login?google=continue&mfa=required');
 expect(response.headers.get('set-cookie')).not.toContain('aevic-captain=');expect(consumed).toBe(false);
});
it('routes linked accounts without a workspace to the homepage and rejects banned accounts',async()=>{
 linked=true;workspace=false;callbackFlow();expect((await callback()).headers.get('location')).toBe('/');
 consumed=false;banned=true;queries=[];callbackFlow();expect((await callback()).headers.get('location')).toBe('/login?google=failed');
 expect(queries.some(q=>q.includes('insert into aevic_platform.sessions'))).toBe(false);
});
it('does not silently link an email-matched identity during the callback',async()=>{
 callbackFlow();expect((await callback()).headers.get('location')).toBe('/login?google=continue');
 expect(linked).toBe(false);expect(queries.some(q=>q.includes('insert into aevic_platform.sessions'))).toBe(false);
});
it('sets the refresh cookie before redirecting in token mode, without putting tokens in URLs',async()=>{
 linked=true;callbackFlow();const response=await app({sessionMode:'tokens'}).request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});
 expect(response.headers.get('location')).toBe('/');expect(response.headers.get('set-cookie')).toContain('aevic-refresh-v2=');
});
it('finishes ordinary login at home even with signed or tampered return hints',async()=>{
 const started=await request('/auth/google/start',{returnTo:'/team/roster?tab=active'});
 const navigation=started.headers.getSetCookie().find(value=>value.startsWith('aevic-google-return=')&&!value.startsWith('aevic-google-return=;'))!.split(';')[0];
 pending();linked=true;
 const result=await request('/auth/google/complete',{},'aevic-google=browser; '+navigation);
 expect(await result.json()).toMatchObject({redirectTo:'/'});
 consumed=false;pending();
 const tampered=await request('/auth/google/complete',{},'aevic-google=browser; '+navigation+'x');
 expect(await tampered.json()).toMatchObject({redirectTo:'/'});
 consumed=false;pending();workspace=false;
 expect(await (await request('/auth/google/complete',{},'aevic-google=browser; '+navigation)).json()).toMatchObject({redirectTo:'/'});
});

it('starts Supabase PKCE only on opt-in and keeps the browser/state binding',async()=>{
 const r=await app({google:{provider:'supabase'}}).request('/api/auth/google/start',{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json'},body:'{}'});
 expect(r.status).toBe(200);const url=new URL((await r.json()).url);expect(url.origin).toBe(config.supabaseUrl);expect(url.pathname).toBe('/auth/v1/authorize');expect(url.searchParams.get('provider')).toBe('google');expect(new URL(url.searchParams.get('redirect_to')!).pathname).toBe('/api/auth/google/callback');expect(flow.nonce).toMatch(/^supabase:/);
});
it('bridges Supabase Google identity into the same linked AEVIC account and session',async()=>{
 linked=true;callbackFlow();flow.nonce='supabase:nonce';
 const r=await app({google:{provider:'supabase'}}).request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});
 expect(r.headers.get('location')).toBe('/');expect(r.headers.get('set-cookie')).toContain('aevic-captain=');expect(exchangeSupabaseGoogle).toHaveBeenCalled();expect(exchangeGoogleCode).not.toHaveBeenCalled();expect(queries.some(q=>q.includes('admin_accounts'))).toBe(false);
});
it('fails closed if provider selection changes during authorization',async()=>{
 callbackFlow();const r=await app({google:{provider:'supabase'}}).request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});expect(r.headers.get('location')).toBe('/login?google=failed');
});

it('honors closed registration without creating an account or session',async()=>{
 existing=false;workspace=false;registrationOpen=false;callbackFlow();
 expect((await callback()).headers.get('location')).toBe('/login?google=failed');
 expect(queries.some(q=>q.includes('insert into aevic_platform.accounts(')||q.includes('insert into aevic_platform.sessions'))).toBe(false);
});
it('automatically registers a verified Supabase user with the existing token session protocol',async()=>{
 existing=false;workspace=false;callbackFlow();flow.nonce='supabase:nonce';
 const response=await app({google:{provider:'supabase'},sessionMode:'tokens'}).request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});
 expect(response.headers.get('location')).toBe('/');expect(response.headers.get('set-cookie')).toContain('aevic-refresh-v2=');
 expect(queries.filter(q=>q.includes('insert into aevic_platform.accounts('))).toHaveLength(1);
 expect(queries.some(q=>q.includes('email_verified_at'))).toBe(true);
 expect(queries.some(q=>q.includes('insert into aevic_platform.refresh_tokens'))).toBe(true);
 // A later login recognizes the subject and does not duplicate the account.
 consumed=false;callbackFlow();flow.nonce='supabase:nonce';
 await app({google:{provider:'supabase'}}).request('/api/auth/google/callback?state=state&code=another',{headers:{cookie:'aevic-google=browser'}});
 expect(queries.filter(q=>q.includes('insert into aevic_platform.accounts('))).toHaveLength(1);
});

it.each([true,false])('preserves the signed remember preference through OAuth callback (%s)',async remember=>{
 const started=await request('/auth/google/start',{remember});
 const cookies=started.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const state=new URL((await started.json()).url).searchParams.get('state');
 linked=true;
 const response=await app().request(`/api/auth/google/callback?state=${state}&code=code`,{headers:{cookie:cookies}});
 expect(response.headers.get('location')).toBe('/');
 const session=response.headers.getSetCookie().find(value=>value.startsWith('aevic-captain='));
 expect(session).toBeDefined();
 if(remember)expect(session).toContain('Max-Age=2592000');else expect(session).not.toContain('Max-Age');
});
it('preserves remembered login when Google requires MFA continuation',async()=>{
 const started=await request('/auth/google/start',{remember:true});
 const cookies=started.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const state=new URL((await started.json()).url).searchParams.get('state');
 linked=true;vi.mocked(consumeFactor).mockRejectedValueOnce(new ServiceError(401,'MFA_REQUIRED'));
 const response=await app().request(`/api/auth/google/callback?state=${state}&code=code`,{headers:{cookie:cookies}});
 expect(response.headers.get('location')).toBe('/login?google=continue&mfa=required');
 const browser=response.headers.getSetCookie().find(value=>value.startsWith('aevic-google='))!.split(';')[0];
 const preference=cookies.split('; ').find(value=>value.startsWith('aevic-google-return='));
 const status=await app().request('/api/auth/google/continuation',{headers:{cookie:`${browser}; ${preference}`}});
 expect(await status.json()).toMatchObject({remember:true,mode:'login'});
});
