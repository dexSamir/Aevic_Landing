import {Hono} from 'hono';
import {z} from 'zod';
import type {Env} from '../types';
import {platform,captain,ownTeam,actor} from './context';
import {body,text} from '../validation/input';
import {transaction,audit} from './competition';
import {ServiceError} from '../errors';
import type {TransactionSql} from 'postgres';
export async function lockRoster(tx:TransactionSql,id:string){
 await tx`select pg_advisory_xact_lock(hashtextextended(${'roster:'+id},0))`;
 const active=await tx`select e.id from aevic_platform.tournament_registrations e join aevic.tournaments t on t.id=e.tournament_id where e.team_id=${id} and e.status='confirmed' and t.status not in ('completed','cancelled') and clock_timestamp()>=e.roster_lock_at limit 1`;
 if(active.length)throw new ServiceError(409,'ROSTER_LOCKED');
}
const app=new Hono<Env>();
app.put('/teams/:id/roster/:slot',async c=>{
 const id=ownTeam(c,c.req.param('id')),slot=z.coerce.number().int().min(1).max(5).parse(c.req.param('slot')),input=await body(c,z.object({ign:text(slot===5?0:2,40)}).strict());
 await transaction(platform(c).sql,async tx=>{await lockRoster(tx,id);await tx`select id from public.teams where id=${id} for update`;await tx`update public.teams set ${tx(`player${slot}_ign`)}=${input.ign||null} where id=${id}`;await audit(tx,actor(c),'roster.name','team',id,{slot});});
 return c.json(await platform(c).team(id,true));
});
app.get('/me/legacy-roster',async c=>{
 if(!actor(c).teamId)return c.json(null);
 const id=captain(c),r=platform(c),team=await r.team(id,true),details=await r.rows('player_details');
 return c.json({teamId:id,rosterNames:team.roster.map(p=>p.ign),completed:team.roster.every(p=>details.some(d=>`${id}:player${d.slot}`===p.id&&d.pubg_id&&d.role)),historyIncomplete:true});
});
app.put('/me/legacy-roster',async c=>{
 const id=captain(c),input=await body(c,z.object({players:z.array(z.object({ign:text(2,40),uid:z.string().regex(/^\d{5,20}$/),role:z.enum(['captain','starter','substitute'])}).strict()).min(4).max(5)}).strict());
 const players=input.players;if(new Set(players.map(p=>p.uid)).size!==players.length||players.filter(p=>p.role==='captain').length!==1||players.filter(p=>p.role==='starter').length!==3||players.filter(p=>p.role==='substitute').length!==players.length-4)throw new ServiceError(422,'INVALID_ROSTER');
 await transaction(platform(c).sql,async tx=>{
  await lockRoster(tx,id);await tx`select pg_advisory_xact_lock(184621,2)`;
  const [team]=await tx`select * from public.teams where id=${id} for update`;
  const slots=[1,2,3,4,5].filter(slot=>team[`player${slot}_ign`]);
  if(slots.length!==players.length||slots.some((slot,i)=>team[`player${slot}_ign`]!==players[i].ign))throw new ServiceError(409,'ROSTER_CHANGED');
  const conflict=await tx`select team_id from aevic_platform.player_details where pubg_id=any(${players.map(p=>p.uid)}) and team_id<>${id}`;
  if(conflict.length)throw new ServiceError(409,'PLAYER_ALREADY_REGISTERED');
  // Clear only this team's metadata inside the transaction so ID swaps remain atomic.
  const previous=await tx`select slot,pubg_id,verified_at from aevic_platform.player_details where team_id=${id}`;
  await tx`delete from aevic_platform.player_details where team_id=${id}`;
  for(const [i,p]of players.entries())await tx`insert into aevic_platform.player_details(team_id,slot,pubg_id,role,verified_at) values(${id},${slots[i]},${p.uid},${p.role},${previous.find(d=>d.slot===slots[i]&&d.pubg_id===p.uid)?.verified_at??null})`;
  await audit(tx,actor(c),'roster.identities','team',id);
 });return c.body(null,204);
});
export default app;
