import {captureStandings} from './standings';
import {z} from 'zod';
import type {Sql} from 'postgres';
import type {Actor} from './repository';
import {ServiceError} from '../errors';
import {text} from '../validation/input';
import {audit,idempotent,notify,transaction} from './competition';
export const tournamentInput=z.object({name:text(2,120),shortName:text(2,50),description:text(0,3000),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),registrationOpensAt:z.iso.datetime({offset:true}),registrationDeadline:z.iso.datetime({offset:true}),checkInOpensAt:z.iso.datetime({offset:true}),checkInClosesAt:z.iso.datetime({offset:true}),maxSlots:z.number().int().min(1).max(100),rules:z.array(text(1,500)).max(50),rounds:z.array(z.object({id:z.uuid().optional(),map:z.enum(['Erangel','Miramar','Rondo']),startsAt:z.iso.datetime({offset:true})})).min(1).max(20)}).strict();
export const editTournamentInput=tournamentInput.extend({expectedUpdatedAt:z.iso.datetime({offset:true}),status:z.enum(['draft','published','registration-open','ongoing','completed'])});
type Input=z.infer<typeof tournamentInput>;
function validate(input:Input){
 const start=Date.parse(input.startsAt),end=Date.parse(input.endsAt),open=Date.parse(input.registrationOpensAt),close=Date.parse(input.registrationDeadline),checkOpen=Date.parse(input.checkInOpensAt),checkClose=Date.parse(input.checkInClosesAt);
 if(!(end>start&&close>open&&close<=checkOpen&&checkClose>checkOpen&&checkClose<=start))throw new ServiceError(422,'INVALID_TIMELINE');
 if(input.rounds.some(r=>Date.parse(r.startsAt)<start||Date.parse(r.startsAt)>=end)||new Set(input.rounds.map(r=>r.startsAt)).size!==input.rounds.length)throw new ServiceError(422,'INVALID_ROUND_SCHEDULE');
}
export async function createTournament(sql:Sql,actor:Actor,input:Input,key?:string){validate(input);return idempotent(sql,actor,key,'tournament.create',input,async tx=>{
 const id=crypto.randomUUID(),slug=`tournament-${id}`;
 await tx`insert into aevic.tournaments(id,slug,name,short_name,description,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots,rules,map_rotation,rounds_per_day) values(${id},${slug},${input.name},${input.shortName},${input.description},${input.startsAt},${input.endsAt},${input.registrationOpensAt},${input.registrationDeadline},${input.checkInOpensAt},${input.checkInClosesAt},${input.maxSlots},${input.rules},${input.rounds.map(r=>r.map)},${input.rounds.length})`;
 for(const [index,r] of input.rounds.entries())await tx`insert into aevic.matches(tournament_id,round,map,scheduled_at,room_release_at) values(${id},${index+1},${r.map},${r.startsAt},${r.startsAt}::timestamptz-interval '10 minutes')`;
 await audit(tx,actor,'tournament.create','tournament',id);return{id};
});}
export async function editTournament(sql:Sql,actor:Actor,id:string,input:z.infer<typeof editTournamentInput>){validate(input);return transaction(sql,async tx=>{
 const [t]=await tx`select * from aevic.tournaments where id=${id} for update`;if(!t)throw new ServiceError(404,'TOURNAMENT_NOT_FOUND');
 if(new Date(t.updated_at).getTime()!==Date.parse(input.expectedUpdatedAt))throw new ServiceError(409,'STALE_VERSION');
 const transitions:Record<string,string[]>={draft:['draft','published'],published:['published','registration-open'], 'registration-open':['registration-open','ongoing'],ongoing:['ongoing','completed'],completed:[],cancelled:[]};
 if(!transitions[t.status]?.includes(input.status))throw new ServiceError(409,'INVALID_LIFECYCLE_TRANSITION');
 const rounds=await tx`select * from aevic.matches where tournament_id=${id} order by round for update`;
 if(rounds.length!==input.rounds.length||input.rounds.some(r=>!rounds.some(m=>m.id===r.id)))throw new ServiceError(422,'ROUND_ID_MISMATCH');
 const [count]=await tx`select count(*)::int as n,coalesce(max(slot_number),0)::int as max_slot from aevic_platform.tournament_registrations where tournament_id=${id} and status in ('pending','confirmed')`;
 if(input.maxSlots<Math.max(count.n,count.max_slot))throw new ServiceError(409,'CAPACITY_BELOW_REGISTRATIONS');
 if(rounds.some(m=>m.published_at&&input.rounds.some(r=>r.id===m.id&&(r.map!==m.map||Date.parse(r.startsAt)!==new Date(m.scheduled_at).getTime()))))throw new ServiceError(409,'PUBLISHED_ROUND_IMMUTABLE');
 if(input.status==='completed'&&rounds.some(m=>!m.published_at))throw new ServiceError(409,'UNPUBLISHED_ROUNDS');
 await tx`update aevic.tournaments set name=${input.name},short_name=${input.shortName},description=${input.description},status=${input.status},starts_at=${input.startsAt},ends_at=${input.endsAt},registration_opens_at=${input.registrationOpensAt},registration_deadline=${input.registrationDeadline},check_in_opens_at=${input.checkInOpensAt},check_in_closes_at=${input.checkInClosesAt},max_slots=${input.maxSlots},rules=${input.rules},map_rotation=${input.rounds.map(r=>r.map)},updated_at=clock_timestamp() where id=${id}`;
 for(const r of input.rounds)await tx`update aevic.matches set map=${r.map},scheduled_at=${r.startsAt},room_release_at=${r.startsAt}::timestamptz-interval '10 minutes',updated_at=now() where id=${r.id!} and published_at is null`;
 await audit(tx,actor,'tournament.update','tournament',id,{status:input.status});
 const entries=await tx`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${id} and status in ('pending','confirmed')`;
 for(const e of entries)await notify(tx,e.team_id,'Turnir yeniləndi',input.name,`/team/tournaments/${id}`);
});}
export const resultInput=z.object({id:z.string().optional(),tournamentId:z.uuid(),roundId:z.uuid(),teamId:z.string().regex(/^[1-9]\d{0,18}$/),placement:z.number().int().min(1).max(100),finishes:z.number().int().min(0).max(400),placementPoints:z.number().nonnegative(),finishPoints:z.number().nonnegative(),penalties:z.number().nonnegative().max(1000),totalPoints:z.number(),notes:text(0,3000).optional(),published:z.boolean()}).strict();
type Result=z.infer<typeof resultInput>;
export async function saveResults(sql:Sql,actor:Actor,roundId:string,entries:Result[]){return transaction(sql,async tx=>{
 const [identity]=await tx`select tournament_id from aevic.matches where id=${roundId}`;if(!identity)throw new ServiceError(404,'MATCH_NOT_FOUND');
 const [t]=await tx`select * from aevic.tournaments where id=${identity.tournament_id} for share`;
 const [m]=await tx`select * from aevic.matches where id=${roundId} for update`;
 if(m.published_at)throw new ServiceError(409,'USE_RESULT_CORRECTION');
 if(['cancelled','completed'].includes(t.status))throw new ServiceError(409,'TOURNAMENT_CLOSED');
 if(new Set(entries.map(e=>e.teamId)).size!==entries.length||new Set(entries.map(e=>e.placement)).size!==entries.length)throw new ServiceError(422,'DUPLICATE_RESULT');
 for(const entry of entries){
  if(entry.roundId!==roundId||entry.tournamentId!==m.tournament_id)throw new ServiceError(422,'RESULT_MATCH_MISMATCH');
  const [eligible]=await tx`select id from aevic_platform.tournament_registrations where tournament_id=${m.tournament_id} and team_id=${entry.teamId} and status='confirmed' for share`;if(!eligible)throw new ServiceError(422,'TEAM_NOT_REGISTERED');
  const formula=t.point_formula,placement=Number(formula.placement.find((p:{placement:number})=>p.placement===entry.placement)?.points??0)+(entry.placement===1?Number(formula.wwcdBonus??0):0),finish=entry.finishes*Number(formula.finishPointValue);
  await tx`insert into aevic_platform.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points,penalties,notes) values(${roundId},${m.tournament_id},${entry.teamId},${entry.placement},${entry.finishes},${placement},${finish},${entry.penalties},${entry.notes??null}) on conflict(match_id,team_id) do update set placement=excluded.placement,finishes=excluded.finishes,placement_points=excluded.placement_points,finish_points=excluded.finish_points,penalties=excluded.penalties,notes=excluded.notes,updated_at=now()`;
 }
 await audit(tx,actor,'results.save','match',roundId);
});}
export async function publishMatch(sql:Sql,actor:Actor,matchId:string){return transaction(sql,async tx=>{
 const [identity]=await tx`select tournament_id from aevic.matches where id=${matchId}`;if(!identity)throw new ServiceError(404,'MATCH_NOT_FOUND');
 const [t]=await tx`select * from aevic.tournaments where id=${identity.tournament_id} for update`;
 const [m]=await tx`select * from aevic.matches where id=${matchId} for update`;if(m.published_at)return;
 if(t.status!=='ongoing')throw new ServiceError(409,'TOURNAMENT_NOT_ONGOING');
 const entries=await tx`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${m.tournament_id} and status='confirmed' for share`;
 const results=await tx`select * from aevic_platform.team_match_results where match_id=${matchId} for update`;
 if(!entries.length||results.length!==entries.length||entries.some(e=>!results.some(r=>String(r.team_id)===e.team_id))||new Set(results.map(r=>r.placement)).size!==results.length)throw new ServiceError(409,'INCOMPLETE_RESULTS');
 await tx`update aevic_platform.team_match_results set published=true,updated_at=now() where match_id=${matchId}`;
 await tx`update aevic.matches set published_at=now(),status='completed',dispute_deadline_at=now()+${t.dispute_duration_minutes}*interval '1 minute',updated_at=now() where id=${matchId}`;
 for(const e of entries)await notify(tx,e.team_id,'Nəticələr dərc edildi',`${t.name} · ${m.round}. raund`,`/team/tournaments/${m.tournament_id}`,'map-result');
 await captureStandings(tx,m.tournament_id,matchId,'publication');
 await audit(tx,actor,'results.publish','match',matchId);
});}
