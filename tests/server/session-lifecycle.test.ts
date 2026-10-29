import {afterEach,expect,it,vi} from 'vitest';
import {createHttpApp} from '../../server/http';
import routes from '../../server/auth/token-routes';
import {issueTokens,saveTokens,authenticateAccess} from '../../server/auth/platform-tokens';
import {tokenDigest} from '../../server/platform/context';

// Stateful SQL boundary fixture, deliberately retained across app instances.
// This tests protocol/restart behavior, not PostgreSQL locking or durability.
function fixture(){
 const sessions=new Map<string,any>(),tokens=new Map<string,any>();let factor:any;
 const identity={id:'16',password_hash:'fixture-password-hash',status:'approved'};
 const sql:any=async(parts:TemplateStringsArray,...v:any[])=>{
  const q=parts.join('?');
  if(q.startsWith('insert into aevic_platform.sessions')){sessions.set(v[0],{id:v[0],token_digest:v[1],team_id:v[2],admin_id:v[3],expires_at:new Date(Date.now()+v[4]*1000),idle_expires_at:new Date(Date.now()+v[5]*1000),credential_digest:v[6],remember:v[7],mfa_verified_at:v[9]?new Date():null});return [];}
  if(q.startsWith('insert into aevic_platform.refresh_tokens')){tokens.set(v[0],{session_id:v[1],consumed_at:null});return [];}
  if(q.startsWith('select session_id'))return tokens.has(v[0])?[tokens.get(v[0])]:[];
  if(q.startsWith('select * from aevic_platform.sessions'))return sessions.has(v[0])?[sessions.get(v[0])]:[];
  if(q.includes('from aevic_platform.account_identity'))return [identity];
  if(q.includes('from aevic_platform.mfa_factors'))return factor?[factor]:[];
  if(q.startsWith('select consumed_at'))return [{...tokens.get(v[0]),server_now:new Date()}];
  if(q.startsWith('update aevic_platform.refresh_tokens')){tokens.get(v[0]).consumed_at=new Date();return [];}
  if(q.startsWith('update aevic_platform.sessions set idle_expires_at')){sessions.get(v[1]).idle_expires_at=new Date(Math.min(+sessions.get(v[1]).expires_at,Date.now()+v[0]*1000));return [];}
  if(q.startsWith('update aevic_platform.sessions set revoked_at')){const id=q.includes('where id in')?tokens.get(v[0])?.session_id:v[0];if(id)sessions.get(id).revoked_at=new Date();return [];}
  throw new Error('Unexpected fixture query');
 };
 let pending=Promise.resolve();sql.begin=(work:any)=>{const next=pending.then(()=>work(sql));pending=next.catch(()=>{});return next;};
 const config={supabaseUrl:'https://example.test',publishableKey:'fixture',siteUrl:'http://localhost:8888',secureCookies:false,sessionSecret:'stable-test-key-at-least-32-characters',sessionMode:'tokens' as const};
 function app(){const app=createHttpApp(config);app.use('*',async(c,next)=>{c.set('platform',{sql} as any);await next();});
  app.post('/test-session',async c=>{const issued=await sql.begin((tx:any)=>issueTokens(c,tx,{accountId:'16'},identity.password_hash,true,true));saveTokens(c,issued);return c.json({accessToken:issued.accessToken});});
  app.get('/verified',async c=>c.json(await authenticateAccess(c,sql,c.req.header('authorization')??'')));
  app.route('/',routes);app.post('/auth/logout',c=>c.json({ok:true}));return app;
 }
 const post=(instance:ReturnType<typeof app>,path:string,cookie='')=>instance.request('/api'+path,{method:'POST',headers:{origin:config.siteUrl,cookie}});
 return {app,post,sessions,tokens,setFactor:(value:any)=>factor=value};
}
const cookie=(r:Response)=>r.headers.getSetCookie().find(v=>v.startsWith('aevic-refresh-v2='))!.split(';')[0];
afterEach(()=>vi.useRealTimers());
it('restores a remembered MFA session in a new app instance, rotates and revokes on logout',async()=>{
 const f=fixture();const first=await f.post(f.app(),'/test-session');expect(first.status).toBe(200);
 expect(first.headers.get('set-cookie')).toContain('Max-Age=2592000');expect(first.headers.get('set-cookie')).toContain('HttpOnly');
 const restarted=f.app();const renewed=await f.post(restarted,'/auth/refresh',cookie(first));expect(renewed.status).toBe(200);expect(cookie(renewed)).not.toBe(cookie(first));
 const {accessToken}=await renewed.json();expect((await restarted.request('/api/verified',{headers:{authorization:`Bearer ${accessToken}`}})).status).toBe(200);
 expect((await f.post(restarted,'/auth/logout',cookie(renewed))).status).toBe(200);
 expect((await f.post(f.app(),'/auth/refresh',cookie(renewed))).status).toBe(401);
 expect((await restarted.request('/api/verified',{headers:{authorization:`Bearer ${accessToken}`}})).status).toBe(401);
});
it('serializes concurrent rotation, distinguishes a race from a later replay and commits revocation',async()=>{
 vi.useFakeTimers();const f=fixture(),app=f.app(),start=await f.post(app,'/test-session');
 const replies=await Promise.all([f.post(app,'/auth/refresh',cookie(start)),f.post(app,'/auth/refresh',cookie(start))]);
 expect(replies.map(r=>r.status).sort()).toEqual([200,409]);
 vi.setSystemTime(Date.now()+6000);expect((await f.post(app,'/auth/refresh',cookie(start))).status).toBe(401);
 expect([...f.sessions.values()][0].revoked_at).toBeTruthy();
 expect((await f.post(app,'/auth/refresh',cookie(replies.find(r=>r.status===200)!))).status).toBe(401);
});
it('rejects expired sessions and newly enrolled MFA without silently accepting old proof',async()=>{
 vi.useFakeTimers();const f=fixture(),app=f.app(),start=await f.post(app,'/test-session');
 f.setFactor({enabled_at:new Date(Date.now()+1000)});
 expect((await f.post(app,'/auth/refresh',cookie(start))).status).toBe(401);
 f.setFactor(undefined);vi.setSystemTime(Date.now()+31*86400000);
 expect((await f.post(app,'/auth/refresh',cookie(start))).status).toBe(401);
 expect(f.tokens.has(tokenDigest(cookie(start).split('=')[1]))).toBe(true);
});
