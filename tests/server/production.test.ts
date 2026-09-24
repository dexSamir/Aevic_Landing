import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server/app';
import { readConfig } from '../../server/config';
import { client } from '../../server/db';
import { mapProductionTeam, originalTeamId, PUBLIC_TEAM_COLUMNS } from '../../server/services/productionTeams';
import { validatePublicSnapshot } from '../../src/services/snapshotValidation';

// Isolated transport fixtures only. These tests never contact or mutate production.
const config = {supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture-public-key',serviceKey:'',siteUrl:'http://localhost:8888',secureCookies:false};
const app = createApp(config);
const row = {id:'9223372036854775807',team_name:'Contract fixture',tier:'entry',status:'approved',created_at:'2020-01-01T00:00:00Z',player1_ign:'One',player2_ign:'Two',player3_ign:'Three',player4_ign:'Four',player5_ign:'Reserve',player1_photo_url:'https://nmjjibifcuzjlsvfcaaz.supabase.co/storage/v1/object/public/photos/one.png',logo_url:'https://nmjjibifcuzjlsvfcaaz.supabase.co/storage/v1/object/public/logos/team.png',match_results:[]};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function transport(rows: unknown[] = [row]) {
 const fetch = vi.fn(async () => json(rows)); vi.stubGlobal('fetch',fetch); return fetch;
}
afterEach(() => vi.unstubAllGlobals());
describe('original production contract', () => {
 it('loads without a service-role key and rejects a different project', () => {
  const env={SUPABASE_URL:config.supabaseUrl,SUPABASE_PUBLISHABLE_KEY:config.publishableKey,PUBLIC_SITE_URL:config.siteUrl};
  expect(readConfig(env)).not.toHaveProperty('serviceKey');
  expect(() => readConfig({...env,SUPABASE_URL:'https://different.supabase.co'})).toThrow();
  expect(() => client(config,undefined,true)).toThrow('ORIGINAL_AUTH_CONTRACT_UNAVAILABLE');
 });
 it('preserves bigint identity and slot/photo associations without inventing ownership', () => {
  const team=mapProductionTeam(row);expect(team.id).toBe(row.id);expect(team.slug).toBe(row.id);
  expect(team.roster[0]).toMatchObject({id:`${row.id}:player1`,ign:'One',photoUrl:row.player1_photo_url,role:'starter'});
  expect(mapProductionTeam({...row,logo_url:'/api/media/f7b98b59-32ca-4577-a3e5-84f7185b3e22'}).logoUrl).toBe('/api/media/f7b98b59-32ca-4577-a3e5-84f7185b3e22');
  expect(team.roster[4].role).toBe('substitute');expect(team.roster.some(p=>p.role==='captain')).toBe(false);
  expect(team).toMatchObject({tier:'entry',sourceStatus:'approved',approvalStatus:'approved',logoUrl:row.logo_url});
  for(const id of [1,9007199254740992,'9223372036854775808','01','-1','1e3','a-uuid'])expect(()=>originalTeamId(id)).toThrow();
 });
 it('queries only public.teams with a lossless explicit projection, never service credentials', async () => {
  const fetch=transport(); const response=await app.request('/api/public/context');expect(response.status).toBe(200);
  const data=validatePublicSnapshot(await response.json());expect(data.teams[0]).toMatchObject({id:row.id,slug:row.id,rosterSize:5});expect(data.dataSource).toBe('public.teams');
  expect(fetch).toHaveBeenCalledTimes(1);
  const [input,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
  const url=new URL(input);expect(url.pathname).toBe('/rest/v1/teams');expect(url.searchParams.get('select')).toBe(PUBLIC_TEAM_COLUMNS);
  expect(new Headers(init.headers).get('accept-profile')).toBe('public');expect(new Headers(init.headers).get('apikey')).toBe(config.publishableKey);
  expect(PUBLIC_TEAM_COLUMNS).not.toMatch(/\*|password|email|captain|reset_token|room|rejection_reason/);
 });
 it('whitelists response fields even if transport returns private columns',async()=>{
  transport([{...row,password_hash:'private-hash',reset_token:'private-reset',room_password:'private-room',email:'private-email',captain_contact:'private-contact'}]);
  for(const path of ['/public/context',`/public/teams/${row.id}`,'/search?q=Contract']) {
   const response=await app.request(`/api${path}`);expect(response.status).toBe(200);expect(await response.text()).not.toContain('private-');
  }
 });
 it('uses the same original identity in search, detail and history',async()=>{
  transport();const search=await(await app.request('/api/search?q=contract')).json();expect(search.groups.team[0].href).toBe(`/teams/${row.id}`);
  const detail=await(await app.request(`/api/public/teams/${row.id}`)).json();expect(detail.team.id).toBe(row.id);expect(detail.historyAvailable).toBe(true);
  const history=await app.request(`/api/public/teams/${row.id}/matches`);expect(await history.json()).toEqual([]);expect(history.headers.get('x-history-scope')).toBe('public.teams.match_results');
 });
 it.each([null,{},[{kills:10}], '[]'])('does not silently flatten an unknown match_results format: %j',async results=>{
  transport([{...row,match_results:results}]);
  expect((await app.request(`/api/public/teams/${row.id}/matches`)).status).toBe(501);
  expect((await app.request(`/api/public/teams/${row.id}/form`)).status).toBe(501);
  const profile=await(await app.request(`/api/public/teams/${row.id}`)).json();expect(profile.historyAvailable).toBe(false);expect(profile.team.id).toBe(row.id);
 });
 it('returns 404 for a missing original ID and 422 for UUID aliases',async()=>{
  transport();expect((await app.request('/api/public/teams/123')).status).toBe(404);expect((await app.request('/api/public/teams/00000000-0000-4000-8000-000000000001')).status).toBe(422);
 });
 it('preserves empty slots and rejects executable image URLs',()=>{
  const team=mapProductionTeam({...row,player2_ign:null,player1_photo_url:'javascript:alert(1)',logo_url:'data:text/html,hello'});
  expect(team.roster.map(p=>p.id)).toEqual([1,3,4,5].map(i=>`${row.id}:player${i}`));expect(team.logoUrl).toBeUndefined();expect(team.roster[0].photoUrl).toBeUndefined();
 });
 it('never converts database failures into empty successful reads',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>json({message:'Invalid API key'},401)));
  expect((await app.request('/api/public/context')).status).toBe(503);
 });
 it('pages public teams in stable ID order',async()=>{
  const first=Array.from({length:1000},(_,i)=>({...row,id:String(i+1)}));
  const fetch=vi.fn().mockResolvedValueOnce(json(first)).mockResolvedValueOnce(json([{...row,id:'1001'}]));vi.stubGlobal('fetch',fetch);
  const data=await(await app.request('/api/public/teams')).json();expect(data).toHaveLength(1001);expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('blocks every unsupported read/write without contacting replacement tables or auth',async()=>{
  const fetch=transport();
  for(const [method,path] of [['GET','/tournaments'],['GET','/matches'],['GET','/leaderboards/1'],['GET','/admin/context'],['POST','/auth/legacy-activation'],['POST','/tournaments/1/entries'],['POST','/admin/tournaments'],['PUT','/admin/matches/1/results'],['POST','/media']]) {
   const result=await app.request(`/api${path}`,{method,headers:{origin:config.siteUrl,'content-type':'application/json',cookie:'aevic-access=old-session'},...(method!=='GET'?{body:'{}'}:{})});expect(result.status,`${method} ${path}`).toBe(501);
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(await(await app.request('/api/me/session')).json()).toBeNull();
 });
 it('keeps same-origin protections and clears old cookies on logout',async()=>{
  const fetch=transport();expect((await app.request('/api/auth/login',{method:'POST',headers:{origin:'https://other.test'}})).status).toBe(403);
  const result=await app.request('/api/auth/logout',{method:'POST',headers:{origin:config.siteUrl}});expect(result.status).toBe(204);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(fetch).not.toHaveBeenCalled();
 });
});
