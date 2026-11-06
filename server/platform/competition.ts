import type {Sql,TransactionSql} from 'postgres';
import {createHash} from 'node:crypto';
import {ServiceError} from '../errors';
import type {Actor} from './repository';

type Tx=TransactionSql;
export const actorKey=(actor:Actor)=>actor.adminId?`admin:${actor.adminId}`:`team:${actor.accountId??actor.teamId}`;
export async function audit(sql:Tx,actor:Actor,action:string,entityType:string,entityId:string,metadata:Record<string,unknown>={}) {
 await sql`insert into aevic_platform.audit_events(actor_id,action,entity_type,entity_id,metadata) values(${actorKey(actor)},${action},${entityType},${entityId},${sql.json(JSON.parse(JSON.stringify({...metadata,actorRole:actor.adminId?actor.role??'unknown':actor.teamId?'team':'account'})))})`;
}
/** Explicit account notification; team broadcasts resolve real authority separately. */
export async function notify(sql:Tx,accountId:string,title:string,body:string,actionHref:string,eventType='tournament'){
 return deliverNotifications(sql,[accountId],false,title,body,actionHref,eventType);
}
export async function notifyTeams(sql:Tx,teamIds:string[],title:string,body:string,actionHref:string,eventType='tournament'){
 return deliverNotifications(sql,teamIds,true,title,body,actionHref,eventType);
}
async function deliverNotifications(sql:Tx,ids:string[],teams:boolean,title:string,body:string,actionHref:string,eventType:string){
 if(!ids.length)return;
 const eventKey=({'map-result':'results','tournament-result':'results','admin-message':'adminMessages',tournament:'announcements'} as Record<string,string>)[eventType]??eventType;
 // One statement resolves account recipients and applies their own preferences.
 await sql`insert into aevic_platform.notifications(recipient_id,title,body,action_href,event_type)
 select recipient.id,${title},${body},${actionHref},${eventType}
 from aevic_platform.accounts recipient
 left join aevic_platform.notification_preferences p on p.user_id=recipient.id
 where ((${teams} and exists(select 1 from aevic_platform.team_authority a where a.account_id=recipient.id and a.team_id::text=any(${sql.array(ids)}::text[])))
 or (not ${teams} and recipient.id::text=any(${sql.array(ids)}::text[])))
 and (p.preferences->'channels'->'in-app') is distinct from 'false'::jsonb
 and (p.preferences->'events'->${eventKey}) is distinct from 'false'::jsonb`;
}
export async function transaction<T>(sql:Sql,work:(tx:Tx)=>Promise<T>):Promise<T>{return await sql.begin(work) as T;}
export async function idempotent<T extends Record<string,unknown>>(sql:Sql,actor:Actor,key:string|undefined,action:string,payload:unknown,work:(tx:Tx)=>Promise<T>):Promise<T>{
 if(!key||key.length<8||key.length>128)throw new ServiceError(422,'IDEMPOTENCY_KEY_REQUIRED');
 const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex'),who=actorKey(actor);
 return transaction(sql,async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${who+':'+key},0))`;
  const previous=await tx`select * from aevic_platform.idempotency where actor_id=${who} and key=${key}`;
  if(previous[0]){if(previous[0].action!==action||previous[0].payload_digest!==digest)throw new ServiceError(409,'IDEMPOTENCY_CONFLICT');return previous[0].result as T;}
  const result=await work(tx);await tx`insert into aevic_platform.idempotency(actor_id,key,action,payload_digest,result) values(${who},${key},${action},${digest},${tx.json(JSON.parse(JSON.stringify(result)))})`;return result;
 });
}
export async function joinTournament(sql:Sql,teamId:string,tournamentId:string,by:Actor={teamId}){return transaction(sql,async tx=>{
 await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+teamId},0))`;
 const [t]=await tx`select *,clock_timestamp() as server_now from aevic.tournaments where id=${tournamentId} for update`;
 if(!t)throw new ServiceError(404,'TOURNAMENT_NOT_FOUND');
 const [team]=await tx`select id::text,status,player1_ign,player2_ign,player3_ign,player4_ign,player5_ign from public.teams where id=${teamId} for share`;
 if(!team||team.status!=='approved')throw new ServiceError(403,'TEAM_NOT_APPROVED');
 if(t.status!=='registration-open'||t.server_now<t.registration_opens_at||t.server_now>=t.registration_deadline)throw new ServiceError(409,'REGISTRATION_CLOSED');
 const [previous]=await tx`select * from aevic_platform.tournament_registrations where tournament_id=${tournamentId} and team_id=${teamId}`;
 if(previous&&['pending','confirmed'].includes(previous.status))return{ok:true,registrationId:previous.id,tournamentId,teamId,status:previous.status,source:'backend',duplicate:true};
 const [count]=await tx`select count(*)::int as n from aevic_platform.tournament_registrations where tournament_id=${tournamentId} and status in ('pending','confirmed')`;
 if(count.n>=t.max_slots)throw new ServiceError(409,'TOURNAMENT_FULL');
 const players=await tx`select slot,pubg_id,role from aevic_platform.player_details where team_id=${teamId}`;
 const roster=[1,2,3,4,5].filter(slot=>team[`player${slot}_ign`]).map(slot=>({id:`${teamId}:player${slot}`,ign:team[`player${slot}_ign`],uid:players.find(p=>p.slot===slot)?.pubg_id??undefined,role:players.find(p=>p.slot===slot)?.role??(slot===5?'substitute':'starter')}));
 if(roster.length<4)throw new ServiceError(422,'ROSTER_INCOMPLETE');
 const [entry]=await tx`insert into aevic_platform.tournament_registrations(tournament_id,team_id,roster_lock_at,roster) values(${tournamentId},${teamId},${t.registration_deadline},${tx.json(roster)}) on conflict(tournament_id,team_id) do update set status='pending',slot_number=null,roster=excluded.roster,roster_lock_at=excluded.roster_lock_at,reason=null,updated_at=now() returning id`;
 await audit(tx,by,'registration.create','tournament',tournamentId);await notifyTeams(tx,[teamId],'Qeydiyyat göndərildi','Komandanızın turnir müraciəti yoxlanılır.',`/team/tournaments/${tournamentId}`);
 return{ok:true,registrationId:entry.id,tournamentId,teamId,status:'pending',source:'backend',duplicate:false};
});}
export async function reviewEntry(sql:Sql,actor:Actor,tournamentId:string,teamId:string,status:'confirmed'|'rejected',reason?:string){return transaction(sql,async tx=>{
 await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+teamId},0))`;
 const [t]=await tx`select * from aevic.tournaments where id=${tournamentId} for update`;if(!t)throw new ServiceError(404,'TOURNAMENT_NOT_FOUND');
 if(['completed','cancelled'].includes(t.status))throw new ServiceError(409,'TOURNAMENT_CLOSED');
 const [entry]=await tx`select * from aevic_platform.tournament_registrations where tournament_id=${tournamentId} and team_id=${teamId} for update`;
 if(!entry)throw new ServiceError(404,'ENTRY_NOT_FOUND');if(!['pending','waitlisted','confirmed'].includes(entry.status))throw new ServiceError(409,'ENTRY_CLOSED');
 let slot:number|null=null;
 if(status==='confirmed'){
  const occupied=await tx`select slot_number from aevic_platform.tournament_registrations where tournament_id=${tournamentId} and status='confirmed' and team_id<>${teamId}`;
  slot=Array.from({length:t.max_slots},(_,i)=>i+1).find(i=>!occupied.some(r=>r.slot_number===i))??null;if(!slot)throw new ServiceError(409,'TOURNAMENT_FULL');
 }
 await tx`update aevic_platform.tournament_registrations set status=${status},slot_number=${slot},reason=${reason??null},updated_at=now() where id=${entry.id}`;
 await audit(tx,actor,'registration.review','registration',entry.id,{status});await notifyTeams(tx,[teamId],status==='confirmed'?'İştirak təsdiqləndi':'Müraciət qəbul edilmədi',reason??t.name,`/team/tournaments/${tournamentId}`);
});}
export async function checkIn(sql:Sql,teamId:string,tournamentId:string,by:Actor={teamId}){return transaction(sql,async tx=>{
 await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+teamId},0))`;
 const [t]=await tx`select *,clock_timestamp() as server_now from aevic.tournaments where id=${tournamentId} for share`;
 const [entry]=await tx`select * from aevic_platform.tournament_registrations where tournament_id=${tournamentId} and team_id=${teamId} for update`;
 if(!t||!entry||entry.status!=='confirmed')throw new ServiceError(403,'ENTRY_REQUIRED');
 if(t.status==='cancelled'||t.status==='completed'||t.server_now<t.check_in_opens_at||t.server_now>=t.check_in_closes_at)throw new ServiceError(409,'CHECK_IN_CLOSED');
 const [check]=await tx`insert into aevic_platform.check_ins(tournament_id,team_id) values(${tournamentId},${teamId}) on conflict(tournament_id,team_id) do update set checked_in_at=aevic_platform.check_ins.checked_in_at returning checked_in_at`;
 await audit(tx,by,'check-in','tournament',tournamentId);
 return{teamId,tournamentId,status:'checked-in',opensAt:t.check_in_opens_at,closesAt:t.check_in_closes_at,checkedInAt:check.checked_in_at};
});}
export async function withdraw(sql:Sql,teamId:string,tournamentId:string,reason:string,by:Actor={teamId}){return transaction(sql,async tx=>{
 await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+teamId},0))`;
 const [t]=await tx`select *,clock_timestamp() as server_now from aevic.tournaments where id=${tournamentId} for update`;
 if(!t||['ongoing','completed','cancelled'].includes(t.status)||t.server_now>=t.starts_at)throw new ServiceError(409,'WITHDRAWAL_CLOSED');
 const rows=await tx`update aevic_platform.tournament_registrations set status='withdrawn',slot_number=null,reason=${reason},updated_at=now() where tournament_id=${tournamentId} and team_id=${teamId} and status in ('pending','confirmed','waitlisted') returning id`;
 if(!rows.length)throw new ServiceError(409,'ENTRY_CLOSED');await audit(tx,by,'registration.withdraw','tournament',tournamentId);
});}
export async function room(sql:Sql,teamId:string,tournamentId:string,matchId:string){
 const [r]=await sql`select m.id,m.room_release_at,m.scheduled_at,m.status,clock_timestamp() as server_now,t.status as tournament_status,r.room_id,r.password from aevic.matches m join aevic.tournaments t on t.id=m.tournament_id join aevic_platform.tournament_registrations e on e.tournament_id=t.id and e.team_id=${teamId} and e.status='confirmed' join public.teams team on team.id=e.team_id and team.status='approved' join aevic_platform.check_ins c on c.tournament_id=t.id and c.team_id=e.team_id left join aevic.match_rooms r on r.match_id=m.id where m.id=${matchId} and t.id=${tournamentId}`;
 if(!r||['cancelled','completed'].includes(r.tournament_status))throw new ServiceError(403,'ROOM_NOT_ELIGIBLE');
 if(r.status==='completed')return{roundId:matchId,releaseAt:r.room_release_at,status:'expired'};
 if(!r.room_release_at)return{roundId:matchId,releaseAt:'',status:'locked',reason:'not-scheduled'};
 if(r.server_now<r.room_release_at)return{roundId:matchId,releaseAt:r.room_release_at,status:'locked',reason:'waiting-release'};
 if(!r.room_id||!r.password)return{roundId:matchId,releaseAt:r.room_release_at,status:'locked',reason:'not-configured'};
 return{roundId:matchId,releaseAt:r.room_release_at,status:'released',roomId:r.room_id,password:r.password};
}
