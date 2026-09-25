import { describe,it,expect,vi,afterEach } from 'vitest';
import { createNormalizedModuleApp as createApp } from '../fixtures/normalized-app';
import { processImage } from '../../server/routes/media';
import sharp from 'sharp';
const config={supabaseUrl:'http://127.0.0.1:54321',publishableKey:'local-test-publishable',serviceKey:'local-test-service',siteUrl:'http://localhost:8888',secureCookies:false};
const app=createApp(config);
const user={id:'00000000-0000-4000-8000-000000000001',email:'owner@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{},aud:'authenticated',created_at:'2026-01-01T00:00:00Z'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const request=(path:string,body:unknown,extra:Record<string,string>={})=>app.request(`/api${path}`,{method:'POST',headers:{origin:config.siteUrl,'content-type':'application/json',...extra},body:JSON.stringify(body)});
afterEach(()=>vi.unstubAllGlobals());
describe('Retained normalized modules with production HTTP boundary',()=>{
 it('rejects cross-site writes before touching Supabase',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const r=await request('/auth/login',{email:'a@example.test',password:'secret'},{origin:'https://attacker.example'});expect(r.status).toBe(403);expect(fetch).not.toHaveBeenCalled();});
 it('validates JSON and returns structured, sanitized errors',async()=>{const r=await request('/auth/login',{email:'bad'});expect(r.status).toBe(422);expect(await r.json()).toMatchObject({code:'VALIDATION_ERROR',requestId:expect.any(String),fieldErrors:expect.any(Object)});expect(r.headers.get('cache-control')).toContain('no-store');});
 it('fails closed without server configuration',async()=>{const r=await createApp().request('/api/public/context');expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('stack');});
 it('protects team, room and dispute routes from anonymous reads',async()=>{for(const path of ['/me/context','/disputes','/team/tournaments/10000000-0000-4000-8000-000000000001/rounds/40000000-0000-4000-8000-000000000001/room'])expect((await app.request(`/api${path}`)).status).toBe(401);});
 it('issues HttpOnly cookies on real Auth login and exposes no tokens in JSON',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{const url=String(input);if(url.includes('/rpc/rate_limit'))return response(true);if(url.includes('/auth/v1/token'))return response({access_token:'access-fixture',refresh_token:'refresh-fixture',expires_in:3600,token_type:'bearer',user});if(url.includes('/auth/v1/user'))return response(user);if(url.includes('/profiles'))return response({id:user.id,first_name:'Owner',last_name:'Test'});if(url.includes('/team_members'))return response({team_id:'20000000-0000-4000-8000-000000000001',role:'OWNER'});if(url.includes('/admin_roles'))return response(null);return response(null);}));
  const r=await request('/auth/login',{email:user.email,password:'TestPass123',remember:true});expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).toContain('SameSite=Lax');const body=await r.json();expect(body.role).toBe('captain');expect(JSON.stringify(body)).not.toContain('fixture');
 });
 it('clears cookies on logout with no active session',async()=>{const r=await request('/auth/logout',{});expect(r.status).toBe(204);expect(r.headers.get('set-cookie')).toContain('Max-Age=0');});
 it('refreshes a session through server-managed cookies',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{const url=String(input);if(url.includes('/auth/v1/token'))return response({access_token:'new-access',refresh_token:'new-refresh',expires_in:3600,token_type:'bearer',user});if(url.includes('/auth/v1/user'))return response(user);if(url.includes('/profiles'))return response({id:user.id});return response(null);}));
  const r=await app.request('/api/me/session',{headers:{cookie:'aevic-refresh=refresh-fixture'}});expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('new-access');
 });
 it('uses Auth recovery and rejects invalid reset tokens',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{const url=String(input);if(url.includes('rate_limit'))return response(true);if(url.includes('/recover'))return response({});return response({msg:'Token expired',code:'otp_expired'},403);}));
  expect((await request('/auth/password-reset',{email:user.email})).status).toBe(204);
  expect((await request('/auth/password-reset/confirm',{token:'a'.repeat(64),password:'TestPassword123'})).status).toBe(422);
 });
 it('does not permit team users to publish results',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/v1/user')?response(user):response({code:'42501',message:'FORBIDDEN'},403)));
  const r=await request('/admin/results',{tournamentId:'10000000-0000-4000-8000-000000000001',roundId:'40000000-0000-4000-8000-000000000001',teamId:'20000000-0000-4000-8000-000000000001',placement:1,finishes:8,placementPoints:10,finishPoints:8,penalties:0,totalPoints:18,published:true},{cookie:'aevic-access=access-fixture'});expect(r.status).toBe(403);
 });
 it('rejects unauthenticated upload metadata',async()=>{const r=await request('/media/validate',{ownerType:'team',ownerId:'20000000-0000-4000-8000-000000000001',assetType:'logo',fileName:'logo.png',mimeType:'image/png',sizeBytes:20,width:512,height:512});expect(r.status).toBe(401);});
 it('rejects bodies above the supported binary transport budget',async()=>{const r=await app.request('/api/media/uploads',{method:'POST',headers:{origin:config.siteUrl,'content-type':'multipart/form-data; boundary=x','content-length':'4200000'},body:'x'});expect(r.status).toBe(413);});
});
describe('binary validation',()=>{
 it('rejects renamed non-images and active SVG',async()=>{await expect(processImage(Buffer.from('<svg/>'),'logo','image/png')).rejects.toMatchObject({code:'INVALID_IMAGE'});await expect(processImage(Buffer.from('<svg/>'),'logo','image/svg+xml')).rejects.toMatchObject({code:'INVALID_FILE_TYPE'});});
 it('verifies MIME against decoded bytes and minimum dimensions',async()=>{const image=await sharp({create:{width:100,height:100,channels:4,background:'#fff'}}).png().toBuffer();await expect(processImage(image,'logo','image/jpeg')).rejects.toMatchObject({code:'MIME_MISMATCH'});await expect(processImage(image,'logo','image/png')).rejects.toMatchObject({code:'IMAGE_TOO_SMALL'});});
 it('re-encodes accepted images with bounded dimensions',async()=>{const source=await sharp({create:{width:1200,height:1200,channels:4,background:'#fff'}}).png().toBuffer();const output=await processImage(source,'logo','image/png');const metadata=await sharp(output).metadata();expect(metadata.format).toBe('webp');expect(metadata.width).toBe(1024);expect(metadata.exif).toBeUndefined();});
});

describe('hardening regressions',()=>{
 it('reports an Auth outage as unavailable without deleting a potentially valid session',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>String(input).includes('rate_limit')?response(true):response({message:'Unavailable'},503)));
  const session=await app.request('/api/me/session',{headers:{cookie:'aevic-access=existing-access; aevic-refresh=existing-refresh'}});
  expect(session.status).toBe(503);expect(session.headers.get('set-cookie')).toBeNull();
  expect((await request('/auth/login',{email:user.email,password:'TestPass123'})).status).toBe(503);
 });
 it('allows result operators to read the participant roster needed for scoring',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);if(url.includes('/auth/v1/user'))return response(user);
   if(url.includes('/admin_roles'))return response({role:'result-operator'});
   if(url.includes('/tournament_registrations'))return response([]);return response(null);
  }));
  expect((await app.request('/api/admin/tournaments/10000000-0000-4000-8000-000000000001/entries',{headers:{cookie:'aevic-access=fixture'}})).status).toBe(200);
  expect((await app.request('/api/admin/users',{headers:{cookie:'aevic-access=fixture'}})).status).toBe(403);
 });
 it('uses public column projections and connects actual organization membership',async()=>{
  const calls:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=new URL(String(input));calls.push(url.toString());const table=url.pathname.split('/').pop();
   if(table==='teams')return response([{id:'20000000-0000-4000-8000-000000000001',name:'Real team',slug:'real-team',approval_status:'approved'}]);
   if(table==='organization_teams')return response([{organization_id:'organization-1',team_id:'20000000-0000-4000-8000-000000000001'}]);
   if(table==='organizations')return response([{id:'organization-1',name:'Real organization'}]);
   return response([]);
  }));
  const r=await app.request('/api/public/context');expect(r.status).toBe(200);
  const result=await r.json();expect(result.teams).toHaveLength(1);expect(result.teams[0].name).toBe('Real team');
  const columns=new URL(calls.find(url=>new URL(url).pathname.endsWith('/teams'))!).searchParams.get('select');
  expect(columns).not.toContain('*');expect(columns).not.toContain('rejection_reason');
  expect(JSON.stringify(result)).not.toMatch(/pubg_id|password|rejection_reason/);
 });
});

describe('official record provenance',()=>{
 it('derives records and progression only from published scores and captured rosters',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const table=new URL(String(input)).pathname.split('/').pop();
   const common={team_id:'team-one',tournament_id:'cup',placement:1,placement_points:10,finish_points:5,penalties:0,version:1};
   if(table==='team_match_results')return response([
    {...common,id:'result-one',match_id:'match-one',finishes:5,total_points:15,published:true},
    {...common,id:'result-two',match_id:'match-two',finishes:8,total_points:18,published:true},
    {...common,id:'draft',match_id:'match-three',finishes:100,total_points:110,published:false},
   ]);
   if(table==='matches')return response([1,2,3].map((v,i)=>({id:['match-one','match-two','match-three'][i],tournament_id:'cup',day:1,round:v,map:'Erangel',scheduled_at:`2026-08-0${v}T12:00:00Z`,published_at:v<3?`2026-08-0${v}T13:00:00Z`:null})));
   if(table==='teams')return response([{id:'team-one',name:'Official team',slug:'official-team',approval_status:'approved'}]);
   if(table==='tournaments')return response([{id:'cup',name:'Official cup'}]);
   if(table==='tournament_registrations')return response([{id:'entry',team_id:'team-one',tournament_id:'cup',status:'confirmed'}]);
   if(table==='tournament_rosters')return response([{registration_id:'entry',player_id:'captured-player',ign:'Original captain',role:'captain'}]);
   if(table==='players')return response([{id:'new-player',ign:'Current captain'}]);
   return response([]);
  }));
  const list=await app.request('/api/records');expect(list.status).toBe(200);const records=await list.json();
  expect(records).toHaveLength(2);expect(records[0]).toMatchObject({value:8,source:'backend',rosterSnapshotStatus:'available',rosterSnapshot:[{ign:'Original captain'}]});
  expect(JSON.stringify(records)).not.toContain('Current captain');expect(JSON.stringify(records)).not.toContain('draft');
  const history=await (await app.request(`/api/records/${records[0].id}/history`)).json();expect(history.map((r:{value:number})=>r.value)).toEqual([8,5]);
  expect((await app.request(`/api/records/${history[1].id}`)).status).toBe(200);
 });
});
