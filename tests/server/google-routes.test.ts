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
let flow:any,linked=false,existing=true,consumed=false,queries:string[],hash:string;
const sql:any=async(parts:TemplateStringsArray,...args:any[])=>{
 const q=parts.join('?');queries.push(q);
 if(q.includes('authentication_limits')&&q.includes('returning hits'))return [{hits:1}];
 if(q.includes('delete from')&&q.includes("phase='authorization'")){if(!flow||args[0]!==flow.token_digest||args[1]!==flow.browser_digest||flow.expires_at<Date.now())return [];const row=flow;flow=undefined;return [row];}
 if(q.includes('delete from')){if(q.includes('browser_digest'))flow=undefined;return [];}
 if(q.includes('insert into aevic_platform.google_flows')){flow={token_digest:args[0],browser_digest:args[1],nonce:args[2],verifier:args[3],expires_at:Date.now()+600000,phase:q.includes("'continuation'")?'continuation':'authorization',subject:args[2],email:args[3],first_name:args[4],last_name:args[5]};return [];}
 if(q.includes('select * from aevic_platform.google_flows'))return flow&&!consumed&&flow.expires_at>Date.now()&&flow.browser_digest===args[0]?[flow]:[];
 if(q.includes('from aevic_platform.google_identities'))return linked?[{account_id:'16',subject:'google-sub'}]:[];
 if(q.includes('select original_team_id'))return [{original_team_id:16}];
 if(q.includes('from aevic_platform.account_identity'))return existing?[{id:'16',email:'captain@example.com',password_hash:hash,status:'approved'}]:[];
 if(q.includes('insert into aevic_platform.google_identities')){linked=true;return [];}
 if(q.includes("set phase='consumed'")){consumed=true;return [];}
 return [];
};
sql.begin=(work:any)=>work(sql);
sql.json=(value:any)=>value;
const app=(overrides:Partial<import('../../server/config').ServerConfig>={})=>{const a=createHttpApp({...config,...overrides});a.use('*',async(c,next)=>{c.set('platform',{sql,actor:{}} as any);await next();});a.route('/',routes);return a;};
const request=(path:string,data:any={},cookie='aevic-google=browser')=>app().request('/api'+path,{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json',cookie},body:JSON.stringify(data)});
beforeEach(async()=>{queries=[];flow=undefined;linked=false;existing=true;consumed=false;hash=await hashPassword('ValidPassword1');vi.mocked(consumeFactor).mockResolvedValue(false);vi.mocked(exchangeGoogleCode).mockClear();});
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
it('starts PKCE with HttpOnly browser binding and no secret in URL',async()=>{const r=await request('/auth/google/start');expect(r.status).toBe(200);const {url}=await r.json();expect(url).toContain('code_challenge_method=S256');expect(url).not.toContain(config.google.clientSecret);expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).toContain('SameSite=Lax');});
it('rejects wrong state, expired callbacks and replay before provider exchange',async()=>{
 flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:0};
 const r=await app().request('/api/auth/google/callback?state=state&code=code',{headers:{cookie:'aevic-google=browser'}});expect(r.headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).not.toHaveBeenCalled();
 flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};
 const wrong=await app().request('/api/auth/google/callback?state=wrong&code=code',{headers:{cookie:'aevic-google=browser'}});expect(wrong.headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).not.toHaveBeenCalled();
});
it('sends new users to registration without inserting any account or session',async()=>{
 existing=false;flow={token_digest:tokenDigest('state'),browser_digest:tokenDigest('browser'),expires_at:Date.now()+10000,nonce:'nonce',verifier:'verifier'};
 const a=app(),url='/api/auth/google/callback?state=state&code=code',options={headers:{cookie:'aevic-google=browser'}};
 expect((await a.request(url,options)).headers.get('location')).toBe('/register?google=continue');
 expect(queries.some(q=>q.includes('insert into public.teams')||q.includes('insert into aevic_platform.sessions'))).toBe(false);
 expect((await a.request(url,options)).headers.get('location')).toBe('/login?google=failed');expect(exchangeGoogleCode).toHaveBeenCalledTimes(1);
});
it('requires password proof to link a verified matching email',async()=>{pending();expect((await request('/auth/google/complete',{password:'wrong'})).status).toBe(401);expect(linked).toBe(false);expect(consumed).toBe(false);const r=await request('/auth/google/complete',{password:'ValidPassword1'});expect(r.status).toBe(200);expect(linked).toBe(true);expect(consumed).toBe(true);expect(r.headers.get('set-cookie')).toContain('aevic-captain=');expect(await r.json()).toEqual({sessionMode:'legacy'});});
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
