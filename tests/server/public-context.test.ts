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
