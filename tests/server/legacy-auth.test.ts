import {afterEach,expect,it,vi} from 'vitest';
import {createApp} from '../../server/app';
const userId='00000000-0000-4000-8000-000000000001',teamId='20000000-0000-4000-8000-000000000001';
afterEach(()=>vi.unstubAllGlobals());
it('existing-user login resolves migrated membership without signup or metadata role grants (Auth transport fixture)',async()=>{
 const user={id:userId,email:'legacy@example.test',aud:'authenticated',email_confirmed_at:'2020-01-01',user_metadata:{role:'super-admin'},app_metadata:{}};
 const paths:string[]=[];vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
  const path=new URL(String(input)).pathname;paths.push(path);let data:unknown=null;
  if(path.endsWith('/rate_limit'))data=true;
  else if(path==='/auth/v1/token')data={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/profiles'))data={id:userId,first_name:'',last_name:''};
  else if(path.endsWith('/team_members'))data={team_id:teamId,role:'OWNER'};
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 }));
 const app=createApp({supabaseUrl:'http://127.0.0.1:54321',publishableKey:'fixture',serviceKey:'fixture',siteUrl:'http://localhost:8888',secureCookies:false});
 const response=await app.request('/api/auth/login',{method:'POST',headers:{origin:'http://localhost:8888','content-type':'application/json'},body:JSON.stringify({email:user.email,password:'fixture-only'})});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({user:{id:userId,teamId,role:'captain'},role:'captain'});expect(response.headers.get('set-cookie')).toContain('HttpOnly');expect(paths.some(p=>p.includes('/signup')||p.includes('/admin/users'))).toBe(false);
});
