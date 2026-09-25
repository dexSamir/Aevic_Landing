import {captureStandings} from './standings';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Env,ApiContext} from '../types';
import {body,text,pagination} from '../validation/input';
import {platform,admin,actor} from './context';
import {audit,notify,transaction,idempotent} from './competition';
import {resultInput} from './tournaments';
import {roundResult} from '../services/data';
import {ServiceError} from '../errors';
const app=new Hono<Env>();
const uuid=(c:ApiContext)=>z.uuid().parse(c.req.param('id'));
app.post('/admin/tournaments/:id/slot-assignment',async c=>{
 admin(c,['tournament-manager']);const id=uuid(c),input=await body(c,z.object({teamId:z.string().regex(/^[1-9]\d{0,18}$/),slotNumber:z.number().int().min(1).max(100),expectedSlotNumber:z.number().int().nullable(),reason:text(10,2000)}).strict());
 await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'slot.assign',{id,...input},async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+input.teamId},0))`;
  const [t]=await tx`select *,clock_timestamp() as server_now from aevic.tournaments where id=${id} for update`;
  if(!t)throw new ServiceError(404,'NOT_FOUND');
  if(['ongoing','completed','cancelled'].includes(t.status)||t.server_now>=t.starts_at)throw new ServiceError(409,'ASSIGNMENT_CLOSED');
  if(input.slotNumber>t.max_slots)throw new ServiceError(422,'INVALID_SLOT');
  const [team]=await tx`select * from public.teams where id=${input.teamId} for share`;
  if(!team||team.status!=='approved')throw new ServiceError(422,'TEAM_NOT_APPROVED');
  const [entry]=await tx`select * from aevic_platform.tournament_registrations where tournament_id=${id} and team_id=${input.teamId} for update`;
  if((entry?.slot_number??null)!==input.expectedSlotNumber)throw new ServiceError(409,'STALE_VERSION');
  const occupied=await tx`select id from aevic_platform.tournament_registrations where tournament_id=${id} and slot_number=${input.slotNumber} and status='confirmed' and team_id<>${input.teamId}`;
  if(occupied.length)throw new ServiceError(409,'SLOT_OCCUPIED');
  const [count]=await tx`select count(*)::int as n from aevic_platform.tournament_registrations where tournament_id=${id} and status in ('pending','confirmed') and team_id<>${input.teamId}`;
  if(count.n>=t.max_slots)throw new ServiceError(409,'TOURNAMENT_FULL');
  const players=await tx`select slot,pubg_id,role from aevic_platform.player_details where team_id=${input.teamId}`;
  const roster=[1,2,3,4,5].filter(slot=>team['player'+slot+'_ign']).map(slot=>({id:input.teamId+':player'+slot,ign:team['player'+slot+'_ign'],uid:players.find(p=>p.slot===slot)?.pubg_id,role:players.find(p=>p.slot===slot)?.role??(slot===5?'substitute':'starter')}));
  if(roster.length<4)throw new ServiceError(422,'ROSTER_INCOMPLETE');
  const [saved]=await tx`insert into aevic_platform.tournament_registrations(tournament_id,team_id,status,slot_number,roster_lock_at,roster,reason) values(${id},${input.teamId},'confirmed',${input.slotNumber},${t.registration_deadline},${tx.json(roster)},${input.reason}) on conflict(tournament_id,team_id) do update set status='confirmed',slot_number=excluded.slot_number,reason=excluded.reason,roster=case when aevic_platform.tournament_registrations.status in ('pending','confirmed') then aevic_platform.tournament_registrations.roster else excluded.roster end,updated_at=now() returning id`;
  await audit(tx,actor(c),'slot.assign','registration',saved.id,{teamId:input.teamId,slotNumber:input.slotNumber,previousSlot:input.expectedSlotNumber,reason:input.reason});
  await notify(tx,input.teamId,'Turnir slotu təyin edildi',t.name+' · Slot '+input.slotNumber,'/team/tournaments/'+id);return{id:saved.id};
 });return c.body(null,204);
});
app.post('/admin/tournaments/:id/check-in-correction',async c=>{
 admin(c,['tournament-manager']);const id=uuid(c),input=await body(c,z.object({teamId:z.string().regex(/^[1-9]\d{0,18}$/),checkedIn:z.boolean(),expectedCheckedIn:z.boolean(),reason:text(10,2000)}).strict());
 await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'check-in.correct',{id,...input},async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+input.teamId},0))`;
  const [t]=await tx`select * from aevic.tournaments where id=${id} for update`;
  if(!t||['completed','cancelled'].includes(t.status))throw new ServiceError(409,'TOURNAMENT_CLOSED');
  const [entry]=await tx`select id from aevic_platform.tournament_registrations where tournament_id=${id} and team_id=${input.teamId} and status='confirmed' for update`;if(!entry)throw new ServiceError(409,'ENTRY_REQUIRED');
  const [check]=await tx`select checked_in_at from aevic_platform.check_ins where tournament_id=${id} and team_id=${input.teamId}`;
  if(Boolean(check)!==input.expectedCheckedIn)throw new ServiceError(409,'STALE_VERSION');
  if(input.checkedIn)await tx`insert into aevic_platform.check_ins(tournament_id,team_id) values(${id},${input.teamId}) on conflict do nothing`;
  else await tx`delete from aevic_platform.check_ins where tournament_id=${id} and team_id=${input.teamId}`;
  await audit(tx,actor(c),'check-in.correct','registration',entry.id,{teamId:input.teamId,checkedIn:input.checkedIn,reason:input.reason});
  await notify(tx,input.teamId,'Check-in düzəlişi',input.reason,'/team/tournaments/'+id);return{id:entry.id};
 });return c.body(null,204);
});
app.post('/admin/tournaments/:id/cancellation',async c=>{admin(c,['tournament-manager']);const id=uuid(c),input=await body(c,z.object({reason:text(10,2000)}));await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'tournament.cancel',{id,...input},async tx=>{
 const [t]=await tx`select * from aevic.tournaments where id=${id} for update`;if(!t)throw new ServiceError(404,'NOT_FOUND');if(['completed','cancelled'].includes(t.status))throw new ServiceError(409,'TOURNAMENT_CLOSED');
 await tx`update aevic.tournaments set status='cancelled',updated_at=now() where id=${id}`;
 const entries=await tx`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${id} and status in ('pending','confirmed')`;
 for(const e of entries)await notify(tx,e.team_id,'Turnir ləğv edildi',input.reason,`/team/tournaments/${id}`);
 await audit(tx,actor(c),'tournament.cancel','tournament',id,{reason:input.reason});return{id};
 });return c.json(await platform(c).tournament(id));});
app.post('/admin/tournaments/:id/archive',async c=>{admin(c,['tournament-manager']);const id=uuid(c);await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'tournament.archive',{id},async tx=>{const rows=await tx`update aevic.tournaments set archived_at=now(),updated_at=now() where id=${id} and status in ('completed','cancelled') returning id`;if(!rows.length)throw new ServiceError(409,'TOURNAMENT_NOT_COMPLETE');await audit(tx,actor(c),'tournament.archive','tournament',id);return{id};});return c.json(await platform(c).tournament(id));});
app.get('/admin/results/:id/versions',async c=>{admin(c,['result-operator']);const rows=await platform(c).sql`select * from aevic_platform.result_versions where result_id=${uuid(c)} order by version desc`;return c.json(rows.map(r=>({id:r.id,resultId:r.result_id,version:r.version,createdAt:r.created_at,createdBy:r.actor_id,reason:r.reason,dataSnapshot:r.result})));});
app.post('/admin/results/:id/corrections',async c=>{
 admin(c,['result-operator']);const id=uuid(c),input=await body(c,z.object({result:resultInput,reason:text(10,2000),expectedVersion:z.number().int().min(1)}).strict());
 const result=await idempotent(platform(c).sql,actor(c),c.req.header('idempotency-key'),'result.correct',{id,...input},async tx=>{
  const [identity]=await tx`select tournament_id,match_id from aevic_platform.team_match_results where id=${id}`;if(!identity)throw new ServiceError(404,'RESULT_NOT_FOUND');
  const [t]=await tx`select * from aevic.tournaments where id=${identity.tournament_id} for update`;
  const [m]=await tx`select * from aevic.matches where id=${identity.match_id} for update`;
  const [r]=await tx`select *,team_id::text from aevic_platform.team_match_results where id=${id} for update`;
  if(!r.published||r.version!==input.expectedVersion)throw new ServiceError(409,'STALE_VERSION');
  const next=input.result;if(next.teamId!==r.team_id||next.roundId!==r.match_id||next.tournamentId!==r.tournament_id)throw new ServiceError(422,'RESULT_IDENTITY_IMMUTABLE');
  const duplicate=await tx`select id from aevic_platform.team_match_results where match_id=${m.id} and placement=${next.placement} and id<>${id}`;if(duplicate.length)throw new ServiceError(409,'DUPLICATE_PLACEMENT');
  const old=roundResult(r);await tx`insert into aevic_platform.result_versions(result_id,version,result,reason,actor_id) values(${id},${r.version},${tx.json(JSON.parse(JSON.stringify(old)))},${input.reason},${actor(c).adminId!})`;
  const formula=t.point_formula,placement=Number(formula.placement.find((p:{placement:number})=>p.placement===next.placement)?.points??0)+(next.placement===1?Number(formula.wwcdBonus??0):0),finishes=next.finishes*Number(formula.finishPointValue);
  const [updated]=await tx`update aevic_platform.team_match_results set placement=${next.placement},finishes=${next.finishes},placement_points=${placement},finish_points=${finishes},penalties=${next.penalties},notes=${next.notes??null},version=version+1,updated_at=now() where id=${id} returning *,team_id::text`;
  await tx`update aevic.matches set dispute_deadline_at=now()+${t.dispute_duration_minutes}*interval '1 minute',updated_at=now() where id=${m.id}`;
  const entries=await tx`select team_id::text from aevic_platform.tournament_registrations where tournament_id=${t.id} and status='confirmed'`;
  for(const e of entries)await notify(tx,e.team_id,'Nəticə düzəldildi',input.reason,`/team/tournaments/${t.id}`,'map-result');
  await captureStandings(tx,t.id,m.id,'correction');
  await audit(tx,actor(c),'result.correct','result',id,{reason:input.reason,version:r.version+1});return {...roundResult(updated),version:r.version+1};
 });return c.json(result);
});
app.get('/admin/check-ins/missed',async c=>{
 admin(c,['tournament-manager']);const r=platform(c),[entries,checks,tournaments,teams]=await Promise.all([r.rows('tournament_registrations'),r.rows('check_ins'),r.tournaments(),r.teams()]);
 const items=entries.flatMap(e=>{const t=tournaments.find(t=>t.id===e.tournament_id);if(!t||c.req.query('tournamentId')&&c.req.query('tournamentId')!==t.id||Date.parse(t.checkInClosesAt)>Date.now()||e.status!=='confirmed'||checks.some(k=>k.team_id===e.team_id&&k.tournament_id===e.tournament_id))return[];return[{id:e.id,tournamentId:t.id,tournamentName:t.name,teamId:e.team_id,teamName:teams.find(t=>t.id===e.team_id)?.name??'',missedAt:t.checkInClosesAt,consequence:'Check-in tamamlanmayıb',appealAllowed:false}];});
 const {offset,limit}=pagination(c);return c.json({items:items.slice(offset,offset+limit),hasMore:offset+limit<items.length,nextCursor:offset+limit<items.length?String(offset+limit):undefined,total:items.length});
});
app.post('/admin/messages',async c=>{admin(c,['tournament-manager','support-moderator']);const input=await body(c,z.object({title:text(2,200),body:text(1,6000),severity:z.enum(['info','success','warning','critical']),audience:z.enum(['all','team']),teamId:z.string().regex(/^[1-9]\d{0,18}$/).optional()}));if(input.audience==='team'&&!input.teamId)throw new ServiceError(422,'TEAM_REQUIRED');await transaction(platform(c).sql,async tx=>{
 const [m]=await tx`insert into aevic_platform.messages(team_id,author_id,title,body,severity) values(${input.audience==='team'?input.teamId!:null},${actor(c).adminId!},${input.title},${input.body},${input.severity}) returning id`;
 const recipients=await tx`select id::text from public.teams where (${input.audience==='all'} or id=${input.teamId??null}) and status<>'banned'`;
 for(const r of recipients)await notify(tx,r.id,input.title,input.body,'/team/messages','admin-message');await audit(tx,actor(c),'message.send','message',m.id);
 });return c.body(null,204);});
app.get('/admin/blacklist',async c=>{admin(c,['tournament-manager']);return c.json((await platform(c).teams(true)).filter(t=>t.approvalStatus==='banned').map(t=>({id:t.id,teamId:t.id,teamName:t.name,reason:t.rejectionReason??'',active:true,permanent:true})));});
app.post('/admin/blacklist',async c=>{admin(c,['tournament-manager']);const input=await body(c,z.object({teamId:z.string().regex(/^[1-9]\d{0,18}$/),reason:text(10,1000),expiresAt:z.iso.datetime({offset:true}).optional()}));if(input.expiresAt&&Date.parse(input.expiresAt)<=Date.now())throw new ServiceError(422,'INVALID_EXPIRY');await transaction(platform(c).sql,async tx=>{const [team]=await tx`select status from public.teams where id=${input.teamId} for update`;if(!team)throw new ServiceError(404,'TEAM_NOT_FOUND');const [prior]=await tx`select previous_status from aevic_platform.sanctions where team_id=${input.teamId} and revoked_at is null order by created_at desc limit 1`;await tx`update aevic_platform.sanctions set revoked_at=now() where team_id=${input.teamId} and revoked_at is null`;await tx`update public.teams set status='banned',rejection_reason=${input.reason} where id=${input.teamId}`;await tx`insert into aevic_platform.sanctions(team_id,reason,expires_at,actor_id,previous_status) values(${input.teamId},${input.reason},${input.expiresAt??null},${actor(c).adminId!},${prior?.previous_status??team.status})`;await audit(tx,actor(c),'team.ban','team',input.teamId,{reason:input.reason});});return c.body(null,204);});
const settingsInput=z.object({supportEmail:z.email(),registrationEnabled:z.boolean(),maintenanceMessage:text(0,500)}).strict();
app.get('/public/settings',async c=>{const [r]=await platform(c).sql`select value from aevic_platform.settings where key='platform'`;return c.json(settingsInput.parse(r?.value??{supportEmail:'aevicesports@gmail.com',registrationEnabled:true,maintenanceMessage:''}));});
app.get('/admin/settings',async c=>{admin(c,['super-admin']);const [r]=await platform(c).sql`select value from aevic_platform.settings where key='platform'`;return c.json(r?.value??{supportEmail:'aevicesports@gmail.com',registrationEnabled:true,maintenanceMessage:''});});
app.put('/admin/settings',async c=>{admin(c,['super-admin']);const input=await body(c,settingsInput);await transaction(platform(c).sql,async tx=>{await tx`insert into aevic_platform.settings(key,value) values('platform',${tx.json(input)}) on conflict(key) do update set value=excluded.value,updated_at=now()`;await audit(tx,actor(c),'settings.update','platform','platform');});return c.json(input);});
export default app;
