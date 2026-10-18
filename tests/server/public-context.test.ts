import { expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import type { DbClient } from '../../server/db';
import { PublicContextRepository } from '../../server/platform/public-context';
import { summary } from '../../server/services/data';

it('retains public identity, precise IDs and authoritative capacity without loading private/profile data', async () => {
 const id='9007199254740993';
 const sql=vi.fn(async (parts:TemplateStringsArray) => {
  const query=parts.join('?');
  if(query.includes('from public.teams t'))return [{id,team_name:'Public team',status:'approved',created_at:new Date('2026-01-01Z'),player1_ign:'A',player2_ign:'B',player3_ign:'C',player4_ign:'D',player5_ign:'E',tag:'PUB',country:'AZ',legacy_history_incomplete:false,verified:true}];
  if(query.includes('from aevic.tournaments t'))return [{id:'tournament',name:'Published tournament',status:'registration-open',context_used_slots:8,max_slots:16,days:1,rounds_per_day:4}];
  throw Error('Unexpected query');
 });
 const repo=new PublicContextRepository(undefined as unknown as DbClient,sql as unknown as Sql);
 const [teams,tournaments,again]=await Promise.all([repo.teams(),repo.tournaments(),repo.teams()]);
 expect(again).toBe(teams);
 expect(teams.map(summary)).toEqual([{id,slug:id,name:'Public team',tag:'PUB',logoUrl:undefined,country:'AZ',verificationLevel:'verified',rosterSize:5,legacyHistoryIncomplete:false,gameKey:'pubg-mobile',roster:['A','B','C','D','E'].map((ign,index)=>({id:`${id}:player${index+1}`,ign,role:index===4?'substitute':'starter'}))}]);
 expect(tournaments[0]).toMatchObject({id:'tournament',usedSlots:8,maxSlots:16});
 expect(sql).toHaveBeenCalledTimes(2);
 const queries=sql.mock.calls.map(([parts])=>parts.join('?')).join('\n');
 expect(queries).not.toMatch(/captain_contact|password_hash|pubg_id|player_details|player1_photo_url/);
 expect(queries).toContain("t.status in ('pending','approved') and d.archived_at is null");
 expect(queries).toContain("t.status<>'draft' and t.archived_at is null");
});

it('refuses private reads or use with an authenticated actor', () => {
 const sql=vi.fn();
 const repo=new PublicContextRepository(undefined as unknown as DbClient,sql as unknown as Sql);
 expect(()=>repo.teams(true)).toThrow();
 const authenticated=new PublicContextRepository(undefined as unknown as DbClient,sql as unknown as Sql,{adminId:'admin'});
 expect(()=>authenticated.teams()).toThrow();
 expect(sql).not.toHaveBeenCalled();
});

it('batches the full snapshot without changing public identity or capacity',async()=>{
 const id='9007199254740993';
 const sql=vi.fn(async()=>[{
  teams:[{id,team_name:'Precise identity',status:'approved',created_at:'2026-01-01T00:00:00Z',player1_ign:'One'}],
  tournaments:[{id:'tournament',name:'Published',status:'registration-open',context_used_slots:3,max_slots:16,days:1,rounds_per_day:1}],
  results:[],organizations:[],links:[],
 }]);
 const repo=new PublicContextRepository({} as DbClient,sql as unknown as Sql);
 const result=await repo.snapshot();
 expect(result.teams[0]).toMatchObject({id,name:'Precise identity',rosterSize:1});
 expect(result.tournaments[0]).toMatchObject({id:'tournament',usedSlots:3});
 expect(result.teamComparisonRecords[0]).toMatchObject({teamId:id,matches:0});
 expect(sql).toHaveBeenCalledTimes(1);
 expect(sql.mock.calls[0]).toBeDefined();
});

it('does not grant an invalidated response the freshness budget of a newer load',async()=>{
 const {invalidatePublicSnapshot}=await import('../../server/platform/public-context');
 const sql=vi.fn(async()=>[{tournaments:[],teams:[],results:[],organizations:[],links:[]}]) as unknown as Sql;
 const first=new PublicContextRepository({} as DbClient,sql);await first.snapshot();expect(first.freshnessSeconds()).toBeGreaterThan(0);
 invalidatePublicSnapshot(sql);const next=new PublicContextRepository({} as DbClient,sql);await next.snapshot();
 expect(first.freshnessSeconds()).toBe(0);expect(next.freshnessSeconds()).toBeGreaterThan(0);
});

it('includes ordered valid match form and podium totals in the one-query cached snapshot',async()=>{
 const results=Array.from({length:7},(_,i)=>({id:`result-${i}`,match_id:`match-${i}`,team_id:'16',tournament_id:'tournament',placement:i+1,finishes:2,placement_points:3,finish_points:2,total_points:5,published:true,match_date:`2026-10-${String(i+1).padStart(2,'0')}T12:00:00Z`,match_published_at:'2026-10-10T12:00:00Z',match_map:'Erangel',match_stage:'final'}));
 const sql=vi.fn(async()=>[{teams:[{id:'16',team_name:'Existing team',status:'approved'}],tournaments:[{id:'tournament',status:'completed'}],results:[...results,results[0],{...results[0],id:'invalid',match_id:'invalid',placement:0}],organizations:[],links:[]}]);
 const repo=new PublicContextRepository({} as DbClient,sql as unknown as Sql);
 const snapshot=await repo.snapshot();
 expect(snapshot.teams[0].form?.slice(0,5).map(row=>row.placement)).toEqual([7,6,5,4,3]);
 expect(snapshot.teamComparisonRecords[0]).toMatchObject({matches:7,podiums:3,wwcd:1});
 expect(await new PublicContextRepository({} as DbClient,sql as unknown as Sql).snapshot()).toBe(snapshot);
 expect(sql).toHaveBeenCalledTimes(1);
});
