import {describe,it,expect} from 'vitest';
// The CLI uses native ESM so operators do not need a TypeScript runner.
// @ts-expect-error JavaScript operational script has no declaration file.
import {buildDemo,TEAM_IDS,ORIGINALS,TARGET,signature,targetColumns,updateTarget,run} from '../../scripts/demo-seed.mjs';
import {rankResults,roundResult,Repository} from '../../server/services/data';
import {PlatformRepository} from '../../server/platform/repository';
import {officialRecords} from '../../server/services/records';
import {achievements} from '../../server/services/identity';
import {deriveWrappedSummary,yearPeriod} from '../../src/utils/wrapped';
import {teamAnalytics} from '../../src/utils/teamAnalytics';
import {mapProductionTeam} from '../../server/services/productionTeams';
import postgres from 'postgres';
import {databaseCa} from '../../server/captain/database-ca';

const plan=buildDemo('2026-10-06');
const rows=(table:string):any[]=>plan.batches.find((b:any)=>b.table===table)?.rows??[];
const results=rows('aevic_platform.team_match_results').map(r=>roundResult({...r,total_points:r.placement_points+r.finish_points-r.penalties}));
class DemoRepository extends Repository {
 constructor(){super(null as never);}
 protected async tournamentCapacity(){return rows('aevic.tournaments').map(t=>({tournament_id:t.id,used_slots:12}));}
 async rows(table:string):Promise<any[]>{
  if(table==='tournament_rosters')return rows('aevic_platform.tournament_registrations').flatMap(r=>r.roster.map((p:any)=>({registration_id:r.id,player_id:p.id,ign:p.ign,role:p.role})));
  return rows(['matches','tournaments','organizations'].includes(table)?`aevic.${table}`:`aevic_platform.${table}`);
 }
 async teams(){return [{id:TARGET,...plan.targetPatch['public.teams'],created_at:'2026-06-24T10:18:51.965Z'},...rows('public.teams')].map(mapProductionTeam);}
 async results(){return results;}
 async achievementProgress(id:string){return PlatformRepository.prototype.achievementProgress.call(this as never,id);}
}
describe('isolated demo fixture uses production projections',()=>{
 it('compares composite ownership keys independently of PostgreSQL jsonb key order',()=>{
  expect(signature({team_id:TEAM_IDS[0],slot:'1'})).toBe(signature({slot:'1',team_id:TEAM_IDS[0]}));
  expect(signature({team_id:TEAM_IDS[0],slot:'1'})).not.toBe(signature({slot:'2',team_id:TEAM_IDS[0]}));
 });
 it('is deterministic, isolated and complete',()=>{
  expect(buildDemo('2026-10-06')).toEqual(plan);
  expect(TEAM_IDS.some((id:string)=>ORIGINALS.includes(id))).toBe(false);
  expect(results).toHaveLength(744);expect(rows('aevic.matches')).toHaveLength(68);
  expect(rows('aevic_platform.player_details')).toHaveLength(60);
  expect(rows('aevic_platform.admin_accounts')[0].active).toBe(false);
  expect(TARGET).toBe('16');expect(TEAM_IDS[0]).toBe('16');
  expect(rows('public.teams')).toHaveLength(11);
  for(const table of ['public.teams','aevic_platform.accounts'])expect(rows(table).some(r=>r.id===TARGET)).toBe(false);
  expect(rows('aevic_platform.team_authority').some(r=>r.team_id===TARGET||r.account_id===TARGET)).toBe(false);
  expect(rows('aevic_platform.team_details').some(r=>r.team_id===TARGET)).toBe(false);
  expect(plan.targetPatch['public.teams'].team_name).toBe('TEST HESABI');
 });
 it('uses real ranking rules and chronological snapshots',()=>{
  const official=rankResults(results);
  expect(rows('aevic.tournaments').slice(0,7).map(t=>official.find(r=>r.tournamentId===t.id&&r.teamId===TEAM_IDS[0])!.placement)).toEqual([12,10,7,5,3,2,1]);
  for(const snapshot of rows('aevic_platform.leaderboard_snapshots')){
   const ids=rows('aevic.matches').filter(m=>m.tournament_id===snapshot.tournament_id&&m.published_at&&m.published_at<=snapshot.published_at).map(m=>m.id);
   expect(snapshot.standings).toEqual(rankResults(results.filter(r=>ids.includes(r.roundId))).map(r=>({teamId:r.teamId,rank:r.placement,totalPoints:r.totalPoints})));
  }
 });
 it('fills Wrapped, all badges, record snapshots, and monthly/map charts',async()=>{
  const repo=new DemoRepository(),team=await repo.team(TEAM_IDS[0]);
  const history=await repo.history(team.id),badges=await achievements(repo,team.id),records=await officialRecords(repo);
  const wrapped=deriveWrappedSummary({team,period:yearPeriod(2026),matches:history,achievements:badges,records:records.current.filter(r=>r.teamId===team.id),championships:1});
  expect(wrapped.available).toBe(true);expect(wrapped.matches).toBe(62);expect(wrapped.kills).toBeGreaterThan(100);
  expect(wrapped.wwcd).toBeGreaterThan(0);expect(wrapped.podiums).toBeGreaterThan(wrapped.wwcd);
  expect(wrapped.bestMap).toBeDefined();expect(wrapped.biggestKillGame?.kills).toBe(14);
  expect(wrapped.records.length).toBeGreaterThan(0);expect(wrapped.records[0].rosterSnapshot).toHaveLength(5);
  expect(wrapped.achievements).toHaveLength(3);
  const analytics=teamAnalytics(history,new Date('2026-10-06T12:00:00+04:00'));
  expect(analytics.omitted).toBe(0);expect(analytics.monthly).toHaveLength(6);expect(analytics.previous).toHaveLength(8);
  expect(analytics.maps).toHaveLength(3);expect(analytics.maps.every(m=>m.matches>=3)).toBe(true);
  expect(new Set(analytics.daily.map(d=>d.kills)).size).toBeGreaterThan(2);
 });
 it('keeps competition timelines, results and roster snapshots valid',()=>{
  for(const t of rows('aevic.tournaments')){
   expect(Date.parse(t.registration_opens_at)).toBeLessThan(Date.parse(t.registration_deadline));
   expect(Date.parse(t.registration_deadline)).toBeLessThanOrEqual(Date.parse(t.check_in_opens_at));
   expect(Date.parse(t.check_in_closes_at)).toBeLessThan(Date.parse(t.starts_at));
   const matches=rows('aevic.matches').filter(m=>m.tournament_id===t.id);
   for(const m of matches){
    expect(Date.parse(m.scheduled_at)).toBeGreaterThanOrEqual(Date.parse(t.starts_at));expect(Date.parse(m.scheduled_at)).toBeLessThan(Date.parse(t.ends_at));
    const rr=results.filter(r=>r.roundId===m.id);expect(rr.length).toBe(m.published_at?12:0);
    expect(new Set(rr.map(r=>r.placement)).size).toBe(rr.length);expect(rr.reduce((n,r)=>n+r.finishes,0)).toBeLessThanOrEqual(44);
   }
  }
  for(const r of rows('aevic_platform.tournament_registrations'))expect(r.roster.map((p:any)=>p.role)).toEqual(['captain','starter','starter','starter','substitute']);
 });
 it('preserves the target login/identity by refusing auth fields before any SQL',async()=>{
  let statements=0;const tx=()=>{statements++;throw new Error('SQL must not run');};
  for(const field of ['id','email','password_hash','reset_token','captain_name']){
   await expect(updateTarget(tx,{...plan.targetPatch,'public.teams':{...plan.targetPatch['public.teams'],[field]:'forbidden'}})).rejects.toThrow('Target patch exceeds permitted fields');
  }
  expect(statements).toBe(0);
  expect(targetColumns['public.teams']).toEqual(['team_name','status','player1_ign','player2_ign','player3_ign','player4_ign','player5_ign']);
  expect(rows('public.teams').every(r=>r.password_hash==='!demo-login-disabled')).toBe(true);
 });
 it.runIf(process.env.AEVIC_DEMO_VERIFY_DB==='1')('reads installed demo through the real platform repository (READ ONLY)',async()=>{
  const url=process.env.AEVIC_DATABASE_URL!;
  const sql=postgres(url,{max:1,prepare:false,ssl:['localhost','127.0.0.1'].includes(new URL(url).hostname)?false:{rejectUnauthorized:true,ca:databaseCa},connect_timeout:15,onnotice:()=>{}});
  try{await sql.begin('isolation level repeatable read read only',async tx=>{
   const repo=new PlatformRepository(null as never,tx as unknown as postgres.Sql,{teamId:TEAM_IDS[0],accountId:TEAM_IDS[0],teamRole:'OWNER'});
   const snapshot=await repo.teamSnapshot(TEAM_IDS[0],TEAM_IDS[0]);
   expect(snapshot.currentTeam.name).toBe('TEST HESABI');expect(snapshot.currentTeam.roster).toHaveLength(5);
   expect(snapshot.matchHistory).toHaveLength(62);expect(snapshot.participations).toHaveLength(9);
   expect(snapshot.teamAchievements.every(a=>a.state==='unlocked')).toBe(true);
   expect(snapshot.checkIn?.status).toBe('checked-in');expect(snapshot.notifications).toHaveLength(8);expect(snapshot.adminMessages.length).toBeGreaterThan(0);
   const records=await officialRecords(repo),history=snapshot.matchHistory;
   const wrapped=deriveWrappedSummary({team:snapshot.currentTeam,period:yearPeriod(new Date(history[0].playedAt).getFullYear()),matches:history,achievements:snapshot.teamAchievements,records:records.current.filter(r=>r.teamId===TEAM_IDS[0])});
   expect(wrapped.available).toBe(true);expect(wrapped.bestMap).toBeDefined();expect(wrapped.biggestKillGame?.kills).toBe(14);
   const accounts=await tx`select id::text,original_team_id::text from aevic_platform.accounts where id=${TARGET}`;
   expect(accounts[0]).toMatchObject({id:'16',original_team_id:'16'});
   const primary=await tx`select id::text from public.teams where team_name='TEST HESABI'`;
   expect(primary.map(r=>r.id)).toEqual(['16']);
   const [legacy]=await tx`select count(*)::int as n from aevic_platform.account_identity where email='aevic-demo-v1@example.invalid' or id=870000000001`;
   expect(legacy.n).toBe(0);
  });}finally{await sql.end();}
 },120000);
 it.runIf(process.env.AEVIC_DEMO_LIFECYCLE_DB==='1')('replays idempotently and restores salam/auth on removal, then rolls back',async()=>{
  const url=process.env.AEVIC_DATABASE_URL!;
  const sql=postgres(url,{max:1,prepare:false,ssl:['localhost','127.0.0.1'].includes(new URL(url).hostname)?false:{rejectUnauthorized:true,ca:databaseCa},connect_timeout:15,onnotice:()=>{}});
  try{
   const state=async()=>JSON.stringify(await sql`select id::text,md5(to_jsonb(t)::text) as fingerprint from public.teams t where id=any(${[...ORIGINALS,TARGET]}::bigint[]) order by id`);
   const before=await state();
   const replay=await run(sql,'apply','2026-10-06');expect(replay).toMatchObject({teamId:'16',status:'already-present',mutation:false});
   const removal=await run(sql,'rehearse-remove','2026-10-06');
   expect(removal).toMatchObject({status:'rehearsed-and-rolled-back',targetPreserved:true,existingLoginPreserved:true,originalTeamsUnchanged:true,mutation:false});
   expect(await state()).toBe(before);
   expect(await run(sql,'verify','2026-10-06')).toMatchObject({teamId:'16',integrity:'verified',mutation:false});
  }finally{await sql.end();}
 },180000);
});
