import type {Sql} from 'postgres';
import type {DbClient} from '../db';
import {Repository} from '../services/data';
import {mapProductionTeam} from '../services/productionTeams';
import {privateTeam} from '../captain/service';
import type {CaptainRow} from '../captain/store';
import {ServiceError} from '../errors';
import type {Team} from '../../src/types/domain';

export type Actor={accountId?:string;teamRole?:string;teamId?:string;adminId?:string;role?:string};
type Row=Record<string,unknown>;
export const normalize=(rows:Row[]):Row[]=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Date?v.toISOString():typeof v==='bigint'?String(v):v])));
const publicColumns='id::text,team_name,logo_url,tier,status,created_at,player1_ign,player2_ign,player3_ign,player4_ign,player5_ign,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url,match_results';
const shared=new Set(['tournaments','matches','organizations']);
const readable=new Set(['tournament_registrations','check_ins','team_match_results','notifications','messages','disputes','roster_change_requests','featured_achievements','organization_teams','support_tickets','support_replies','verification_requests','audit_events','notification_preferences','follows','player_details','team_details']);
const privateTables:Record<string,string>={check_ins:'team_id',notifications:'recipient_id',disputes:'team_id',roster_change_requests:'team_id',support_tickets:'user_id',verification_requests:'team_id',notification_preferences:'user_id',follows:'user_id',player_details:'team_id'};
/** Request-scoped SQL repository; every read is explicitly scoped before aggregation. */
export class PlatformRepository extends Repository {
 private cache=new Map<string,Promise<Row[]>>();
 constructor(db:DbClient,readonly sql:Sql,readonly actor:Actor={}){super(db);}
 protected async tournamentCapacity(){return normalize(await this.sql`select tournament_id::text,count(*)::int as used_slots from aevic_platform.tournament_registrations where status in ('pending','confirmed') group by tournament_id`) as Array<{tournament_id:string;used_slots:number}>;}
 async rows(table:string):Promise<Row[]> {
  if(!this.cache.has(table))this.cache.set(table,this.read(table));
  return this.cache.get(table)!;
 }
 private async read(table:string):Promise<Row[]> {
  if(table==='players')return(await this.teams()).flatMap(t=>t.roster.map(p=>({id:p.id,ign:p.ign,slug:p.id,created_at:p.joinedAt})));
  if(table==='tournament_rosters')return(await this.rows('tournament_registrations')).flatMap(r=>(r.roster as Array<Row>??[]).map(p=>({registration_id:r.id,player_id:p.id,ign:p.ign,role:p.role})));
  if(table==='media')return normalize(await this.sql`select id,dispute_id,file_name from aevic_platform.media where ${Boolean(this.actor.adminId)} or team_id=${this.actor.teamId??null}`);
  if(!shared.has(table)&&!readable.has(table))throw new ServiceError(500,'UNSUPPORTED_READ');
  if(table==='tournaments')return normalize(await this.sql`select * from aevic.tournaments where ${Boolean(this.actor.adminId)} or (status<>'draft' and archived_at is null) order by starts_at,id limit 10000`);
  if(table==='matches')return normalize(await this.sql`select m.* from aevic.matches m join aevic.tournaments t on t.id=m.tournament_id where ${Boolean(this.actor.adminId)} or (t.status<>'draft' and t.archived_at is null) order by m.scheduled_at,m.id limit 10000`);
  if(table==='tournament_registrations')return normalize(await this.sql`select id,tournament_id,team_id::text,status,slot_number,roster_lock_at,roster,created_at,updated_at from aevic_platform.tournament_registrations where ${Boolean(this.actor.adminId)} or team_id=${this.actor.teamId??null} or status='confirmed' order by created_at,id limit 10000`);
  if(table==='team_match_results')return normalize(await this.sql`select r.*,r.team_id::text from aevic_platform.team_match_results r join aevic.matches m on m.id=r.match_id join aevic.tournaments t on t.id=r.tournament_id where ${Boolean(this.actor.adminId)} or (r.published and m.published_at is not null and t.status<>'draft') order by r.created_at,r.id limit 10000`);
  if(table==='messages')return normalize(await this.sql`select m.*,m.team_id::text,mr.read_at from aevic_platform.messages m left join aevic_platform.message_reads mr on mr.message_id=m.id and mr.account_id=${this.actor.accountId??this.actor.teamId??null} where ${Boolean(this.actor.adminId)} or team_id=${this.actor.teamId??null} or (team_id is null and ${Boolean(this.actor.teamId)}) order by m.created_at desc,m.id limit 1000`);
  if(table==='support_replies')return normalize(await this.sql`select r.* from aevic_platform.support_replies r join aevic_platform.support_tickets t on t.id=r.ticket_id where ${Boolean(this.actor.adminId)} or t.user_id=${this.actor.teamId??null} order by r.created_at,r.id limit 10000`);
  if(table==='audit_events'){if(!this.actor.adminId)throw new ServiceError(403,'FORBIDDEN');return normalize(await this.sql`select * from aevic_platform.audit_events order by created_at desc,id desc limit 10000`);}
  const column=privateTables[table],schema=shared.has(table)?'aevic':'aevic_platform';
  if(column){return normalize(await this.sql`select *,${this.sql(column)}::text from ${this.sql(schema+'.'+table)} where ${Boolean(this.actor.adminId)} or ${this.sql(column)}=${this.actor.teamId??null} limit 10000`);}
  // Explicitly exclude contact/verification/private metadata from public team details.
  if(table==='team_details')return normalize(await this.sql`select team_id::text,description,tag,banner_url,banner_alt,country,founded_at,social_links,archived_at,legacy_history_incomplete from aevic_platform.team_details`);
  if(table==='organization_teams'||table==='featured_achievements')return normalize(await this.sql`select *,team_id::text from ${this.sql(schema+'.'+table)} limit 10000`);
  return normalize(await this.sql`select * from ${this.sql(schema+'.'+table)} limit 10000`);
 }
 async teams(privateData=false):Promise<Team[]> {
  if(privateData&&!this.actor.teamId&&!this.actor.adminId)throw new ServiceError(401,'UNAUTHORIZED');
  const projection=publicColumns+(privateData?',captain_name,captain_contact,email,rejection_reason':'');
  const rows=normalize(await this.sql.unsafe(`select ${projection} from public.teams where ($1::boolean or status='approved' or id=$2::bigint) order by id`,[Boolean(this.actor.adminId),this.actor.teamId??null]));
  const [details,links,players,verified]=await Promise.all([this.rows('team_details'),this.rows('organization_teams'),this.sql`select team_id::text,slot,pubg_id,role from aevic_platform.player_details`,this.sql`select team_id::text from aevic_platform.verification_requests where status='APPROVED'`]);
  return rows.map((r):Team=>{const team=privateData&&(this.actor.adminId||r.id===(this.actor.accountId??this.actor.teamId))?privateTeam(r as CaptainRow):mapProductionTeam(r);const d=details.find(x=>x.team_id===r.id)??{};
   return {...team,legacyHistoryIncomplete:Boolean(d.legacy_history_incomplete??true),verificationLevel:verified.some(v=>v.team_id===r.id)?'verified':team.verificationLevel,roster:team.roster.map(p=>{const meta=players.find(d=>`${d.team_id}:player${d.slot}`===p.id);return {...p,uid:meta?.pubg_id??undefined,role:meta?.role??p.role};}),description:String(d.description??''),tag:d.tag?String(d.tag):undefined,bannerUrl:d.banner_url?String(d.banner_url):undefined,bannerAlt:d.banner_alt?String(d.banner_alt):undefined,country:d.country?String(d.country):undefined,foundedAt:d.founded_at?String(d.founded_at).slice(0,10):undefined,socialLinks:d.social_links as Team['socialLinks']??{},archivedAt:d.archived_at?String(d.archived_at):undefined,gameKey:'pubg-mobile',organizationId:links.find(l=>l.team_id===r.id)?.organization_id as string|undefined,organizationRelationship:links.some(l=>l.team_id===r.id)?'owned':'independent'};
  }).filter(t=>!t.archivedAt||this.actor.adminId||t.id===this.actor.teamId);
 }
 async standingSnapshots(tournamentId:string):Promise<import('../../src/types/domain').LeaderboardSnapshot[]>{
  await this.tournament(tournamentId);
  const rows=await this.sql`select id,tournament_id,published_at,standings from aevic_platform.leaderboard_snapshots where tournament_id=${tournamentId} order by published_at,id`;
  return rows.map(r=>({id:r.id,tournamentId:r.tournament_id,publishedAt:r.published_at.toISOString(),standings:r.standings}));
 }
 async achievementProgress(teamId:string){
  const history=(await this.history(teamId)).sort((a,b)=>a.playedAt.localeCompare(b.playedAt));
  const definitions=[{id:'first-wwcd',target:1,value:(m:typeof history[number])=>Number(m.wwcd)},{id:'hundred-kills',target:100,value:(m:typeof history[number])=>m.finishes},{id:'ten-matches',target:10,value:()=>1}];
  return definitions.map(d=>{let current_value=0,unlocked_at:string|undefined;for(const m of history){current_value+=d.value(m);if(current_value>=d.target&&!unlocked_at)unlocked_at=m.publishedAt??m.playedAt;}return{id:d.id,target:d.target,current_value,unlocked_at};});
 }
}
