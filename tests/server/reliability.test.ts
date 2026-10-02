import { describe, expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import { createHttpApp } from '../../server/http';
import { platformMiddleware } from '../../server/platform/middleware';
import { captain } from '../../server/platform/context';
import { Repository } from '../../server/services/data';
import { mapProductionTeam } from '../../server/services/productionTeams';
import type { DbClient } from '../../server/db';
const config={supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture-key',siteUrl:'https://fixture.test',secureCookies:true};
// Isolated transport fixtures: no database or production calls.
function fixture(){
 const sql=Object.assign(vi.fn(async()=>{throw new Error('private-session-secret');}),{begin:vi.fn(async()=>{throw new Error('optional-maintenance-secret');})});
 const app=createHttpApp(config,{});app.route('/',platformMiddleware(sql as unknown as Sql));
 app.get('/public/context',c=>c.json({actor:c.get('platform')!.actor}));
 app.get('/matches',c=>c.json([]));
 app.post('/auth/login',c=>c.json({reached:true}));
 app.get('/me/private',c=>c.json({id:captain(c)}));
 return {sql,app};
}
describe('shared request dependency isolation',()=>{
 it('logs safe runtime diagnostics without leaking exception messages or database credentials',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{
   const app=createHttpApp({...config,databaseUrl:'postgres://private-user:private-password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'},{AWS_LAMBDA_FUNCTION_NAME:'api'});
   app.get('/public/teams',()=>{throw Object.assign(new Error('private-session-token'),{code:'CONNECT_TIMEOUT'});});
   const response=await app.request('/api/public/teams');
   expect(response.status).toBe(503);
   const body=await response.json();
   expect(body.code).toBe('SERVICE_UNAVAILABLE');
   const event=JSON.parse(log.mock.calls[0][0]);
   expect(event).toMatchObject({event:'api_failure',requestId:body.requestId,route:'/api/public/teams',errorType:'Error',errorCode:'CONNECT_TIMEOUT',database:{endpoint:'supavisor',port:'5432'},runtime:'lambda'});
   expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
   expect(JSON.stringify(body)).not.toContain('CONNECT_TIMEOUT');
  }finally{log.mockRestore();}
 });
 it('does not run maintenance or validate unrelated cookies for public reads',async()=>{
  const {app,sql}=fixture();
  for(const path of ['/api/public/context','/api/matches']){
   const response=await app.request(path,{headers:{cookie:'__Host-aevic-admin=broken; __Host-aevic-captain=broken'}});
   expect(response.status).toBe(200);
  }
  expect(sql).not.toHaveBeenCalled();expect(sql.begin).not.toHaveBeenCalled();
 });
 it('allows login handler through failed optional maintenance without processing old admin cookies',async()=>{
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
  try{const {app,sql}=fixture();
   const response=await app.request('/api/auth/login',{method:'POST',headers:{origin:config.siteUrl,cookie:'__Host-aevic-admin=broken'}});
   expect(response.status).toBe(200);expect(sql).not.toHaveBeenCalled();expect(sql.begin).toHaveBeenCalledTimes(1);
   const again=await app.request('/api/auth/login',{method:'POST',headers:{origin:config.siteUrl}});
   expect(again.status).toBe(200);expect(sql.begin).toHaveBeenCalledTimes(1);
   expect(JSON.stringify(warning.mock.calls)).not.toContain('secret');
  }finally{warning.mockRestore();}
 });
 it('does not turn an unauthenticated private request into an authorized one',async()=>{
  const {app}=fixture();const response=await app.request('/api/me/private');expect(response.status).toBe(401);
 });
});
describe('real profile visibility contract',()=>{
 const row={id:'16',team_name:'Existing identity',status:'pending',created_at:'2020-01-01T00:00:00Z'};
 class FixtureRepository extends Repository {
  constructor(readonly status='pending'){super({} as DbClient);}
  async teams(){return [mapProductionTeam({...row,status:this.status})];}
  async rows(){return [];}
  async achievementProgress(){return [];}
  protected async tournamentCapacity(){return [];}
 }
 it('renders an existing pending public identity and preserves actual missing 404s',async()=>{
  const repo=new FixtureRepository();expect((await repo.profile('16')).team.id).toBe('16');
  await expect(repo.profile('2')).rejects.toMatchObject({status:404});
 });
 it('continues hiding moderated identities',async()=>{await expect(new FixtureRepository('banned').profile('16')).rejects.toMatchObject({status:404});});
 it('propagates a failed read instead of returning missing or empty data',async()=>{
  const repo=new FixtureRepository();repo.teams=async()=>{throw new Error('unavailable');};await expect(repo.profile('16')).rejects.toThrow('unavailable');
 });
});
