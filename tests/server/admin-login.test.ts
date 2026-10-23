import {beforeAll,expect,it,vi} from 'vitest';
import {createHttpApp} from '../../server/http';
import routes from '../../server/platform/routes';
import management from '../../server/platform/admin-management';
import {hashPassword} from '../../server/captain/crypto';
vi.mock('../../server/platform/mfa',()=>({consumeFactor:vi.fn().mockResolvedValue(false)}));
const config={supabaseUrl:'https://example.supabase.co',publishableKey:'fixture',siteUrl:'http://localhost:8888',secureCookies:false,sessionSecret:'fixture-secret-at-least-32-characters'};
let hash:string;beforeAll(async()=>{hash=await hashPassword('PersonalPassword1');});
function app(active=true){
 let issued=false;
 const sql:any=async(parts:TemplateStringsArray)=>{const q=parts.join('?');if(q.includes('returning hits'))return [{hits:1}];if(q.includes('from aevic_platform.admin_accounts'))return active?[{id:'00000000-0000-4000-8000-000000000001',email:'aevicesports@gmail.com',role:'super-admin',active,password_hash:hash}]:[];if(q.includes('insert into aevic_platform.sessions'))issued=true;return [];};sql.begin=(fn:any)=>fn(sql);sql.json=(v:any)=>v;
 const a=createHttpApp(config);a.use('*',async(c,next)=>{c.set('platform',{sql,actor:{}} as any);await next();});a.route('/',management);a.route('/',routes);return {a,issued:()=>issued};
}
const login=(a:ReturnType<typeof app>['a'],password:string)=>a.request('/api/auth/admin/login',{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json'},body:JSON.stringify({email:'aevicesports@gmail.com',password})});
it('valid personal credentials issue only the existing admin session',async()=>{const d=app();const r=await login(d.a,'PersonalPassword1');expect(r.status).toBe(200);expect(await r.json()).toMatchObject({role:'admin'});expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(d.issued()).toBe(true);});
it('incorrect credentials and inactive accounts never issue sessions',async()=>{for(const active of [true,false]){const d=app(active);const r=await login(d.a,active?'wrong':'PersonalPassword1');expect(r.status).toBe(401);expect(d.issued()).toBe(false);}});
it('unauthenticated requests cannot access administrator management',async()=>{const d=app();expect([401,403]).toContain((await d.a.request('/api/admin/users')).status);expect(d.issued()).toBe(false);});
