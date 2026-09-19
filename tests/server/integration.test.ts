import {afterEach,describe,expect,it,vi} from 'vitest';
import {createApp} from '../../server/app';
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const team='20000000-0000-4000-8000-000000000001', cup='10000000-0000-4000-8000-000000000001';
const config={supabaseUrl:'http://127.0.0.1:54321',publishableKey:'test-key',serviceKey:'test-service',siteUrl:'http://localhost:8888',secureCookies:false};
const app=createApp(config);
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
function database(rows:Record<string,unknown>={},role='super-admin'){
 const fetch=vi.fn(async(input:RequestInfo|URL,_init?:RequestInit)=>{
  const url=new URL(String(input)),table=url.pathname.split('/').pop()!;
  if(url.pathname==='/auth/v1/user')return json({id:owner,email:'owner@example.test',email_confirmed_at:'2026-01-01',aud:'authenticated',app_metadata:{},user_metadata:{}});
  if(table==='admin_roles')return json({role});
  return json(rows[table]??[]);
 });vi.stubGlobal('fetch',fetch);return fetch;
}
const signed=(path:string)=>app.request(`/api${path}`,{headers:{cookie:'aevic-access=test-session'}});
afterEach(()=>vi.unstubAllGlobals());
describe('real Hono route integration with isolated Supabase response fixtures',()=>{
 it('returns truthful empty public data',async()=>{database();const r=await app.request('/api/public/context');expect(r.status).toBe(200);expect(await r.json()).toMatchObject({teams:[],tournaments:[],leaderboard:[],teamComparisonRecords:[]});});
 it('never includes another account inbox, follows or tickets in a super-admin personal view',async()=>{
  database({notifications:[{id:'own',recipient_id:owner},{id:'other',recipient_id:other}],follows:[{user_id:owner,team_id:team},{user_id:other,team_id:'20000000-0000-4000-8000-000000000002'}],support_tickets:[{id:'own-ticket',user_id:owner},{id:'other-ticket',user_id:other}]});
  expect((await(await signed('/me/notifications')).json()).map((r:{id:string})=>r.id)).toEqual(['own']);
  expect((await(await signed('/me/follows')).json()).map((r:{entityId:string})=>r.entityId)).toEqual([team]);
  expect(await(await signed('/me/follows/status?entityId=20000000-0000-4000-8000-000000000002')).json()).toMatchObject({following:false});
  expect((await(await signed('/me/support/tickets')).json()).map((r:{id:string})=>r.id)).toEqual(['own-ticket']);
 });
 it('derives empty slots, missed check-ins, organizations and publication progress from database rows',async()=>{
  database({tournaments:[{id:cup,max_slots:3,check_in_opens_at:'2020-01-01',check_in_closes_at:'2020-01-02'}],teams:[{id:team,name:'Registered',approval_status:'approved'}],tournament_registrations:[{id:'entry',tournament_id:cup,team_id:team,slot_number:2,status:'confirmed'}],matches:[{id:'round',tournament_id:cup,published_at:'2020-01-03'}],organizations:[{id:'org',name:'Registered organization',social_links:{}}]});
  const r=await signed('/admin/context');expect(r.status).toBe(200);const data=await r.json();
  expect(data.currentTeam).toBeNull();expect(data.slots.map((s:{state:string})=>s.state)).toEqual(['available','occupied','available']);expect(data.checkIns[0].status).toBe('missed');expect(data.publishedRoundIds[cup]).toEqual(['round']);expect(data.organizations[0].name).toBe('Registered organization');expect(data.organizations[0]).not.toHaveProperty('foundedAt');
 });
 it('uses published official results for comparisons and aligns leaderboard identity',async()=>{
  database({teams:[{id:team,name:'Official A',slug:'official-a',approval_status:'approved'},{id:'second',name:'Official B',slug:'official-b',approval_status:'approved'}],tournaments:[{id:cup,status:'completed'}],team_match_results:[{id:'r',team_id:'second',tournament_id:cup,match_id:'match',placement:1,finishes:4,total_points:14,published:true},{id:'draft',team_id:team,tournament_id:cup,placement:1,finishes:999,total_points:999,published:false}],matches:[{id:'match',tournament_id:cup,published_at:'2026-01-01'}]});
  const r=await app.request('/api/public/context');const data=await r.json();expect(data.leaderboardTeams).toEqual(['Official B']);expect(data.teamComparisonRecords.find((r:{teamId:string})=>r.teamId===team)).toMatchObject({matches:0,finishes:0});expect(data.teamComparisonRecords.find((r:{teamId:string})=>r.teamId==='second')).toMatchObject({matches:1,finishes:4,championships:1});
 });
 it('denies tournament edits to result operators before invoking an RPC',async()=>{
  const fetch=database({},'result-operator');const r=await app.request(`/api/admin/tournaments/${cup}`,{method:'PATCH',headers:{origin:config.siteUrl,cookie:'aevic-access=test-session','content-type':'application/json'},body:'{}'});expect(r.status).toBe(403);expect(fetch.mock.calls.some(([url])=>String(url).includes('edit_tournament'))).toBe(false);
 });
});
describe('public tournament contract isolation',()=>{
 it('filters standings by tournament and excludes draft results',async()=>{
  database({tournaments:[{id:cup},{id:'10000000-0000-4000-8000-000000000002'}],team_match_results:[{id:'r',team_id:team,tournament_id:cup,placement:1,published:true},{id:'draft',team_id:team,tournament_id:cup,placement:1,published:false}]});
  expect(await(await app.request('/api/leaderboards/10000000-0000-4000-8000-000000000002')).json()).toEqual([]);
  expect(await(await app.request(`/api/leaderboards/${cup}`)).json()).toMatchObject([{teamId:team,matches:1,tournamentId:cup}]);
 });
 it('only includes confirmed participants and their historical public roster fields',async()=>{
  database({tournaments:[{id:cup}],teams:[{id:team,name:'Official',slug:'official',approval_status:'approved'}],tournament_registrations:[{id:'entry',tournament_id:cup,team_id:team,status:'confirmed'},{id:'pending',tournament_id:cup,team_id:'private',status:'pending'}],tournament_rosters:[{registration_id:'entry',player_id:'player',ign:'Historical',role:'captain',pubg_id:'private'}]});
  const rows=await(await app.request(`/api/tournaments/${cup}/participants`)).json();expect(rows).toHaveLength(1);expect(rows[0].roster).toEqual([{id:'player',ign:'Historical',role:'captain'}]);expect(JSON.stringify(rows)).not.toContain('private');
 });
 it('separates an admin support ticket from the personal ticket endpoint',async()=>{
  const id='60000000-0000-4000-8000-000000000001';database({support_tickets:[{id,user_id:other,subject:'Private request'}]});
  expect((await signed(`/me/support/tickets/${id}`)).status).toBe(404);expect((await signed(`/admin/support/tickets/${id}`)).status).toBe(200);
 });
});

it('preserves organization descriptions through the Hono contract',async()=>{
 const org='30000000-0000-4000-8000-000000000001';
 const fetch=database({identity_command:{id:org},organizations:[{id:org,name:'Organization',description:'Persisted description',social_links:{},founded_at:null}]});
 const response=await app.request('/api/organizations',{method:'POST',headers:{origin:config.siteUrl,cookie:'aevic-access=test-session','content-type':'application/json'},body:JSON.stringify({name:'Organization',shortName:'ORG',country:'AZ',description:'Persisted description'})});
 expect(response.status).toBe(201);expect(await response.json()).toMatchObject({description:'Persisted description'});
 const call=fetch.mock.calls.find(([url])=>String(url).includes('/rpc/identity_command'));
 expect(call).toBeDefined();expect(JSON.parse(String(call![1]?.body)).payload.description).toBe('Persisted description');
});
