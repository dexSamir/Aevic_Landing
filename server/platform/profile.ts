import {Hono} from 'hono';
import {z} from 'zod';
import type {Env} from '../types';
import {body,text,socialLinks} from '../validation/input';
import {platform,captain,ownTeam,actor} from './context';
import {audit,transaction} from './competition';
import {ServiceError} from '../errors';
const app=new Hono<Env>();
app.get('/me/team',async c=>c.json(await platform(c).team(captain(c),true)));
app.patch('/teams/:id',async c=>{
 const id=ownTeam(c,c.req.param('id')),input=await body(c,z.object({name:text(2,60),tag:text(0,12).optional(),description:text(0,3000).optional(),country:text(0,80).optional(),foundedAt:z.iso.date().optional(),bannerAlt:text(0,200).optional()}).strict());
 await transaction(platform(c).sql,async tx=>{await tx`select pg_advisory_xact_lock(184621,1)`;const duplicate=await tx`select id from public.teams where lower(btrim(team_name))=lower(${input.name}) and id<>${id}`;if(duplicate.length)throw new ServiceError(409,'TEAM_NAME_TAKEN');
  await tx`update public.teams set team_name=${input.name} where id=${id}`;
  await tx`insert into aevic_platform.team_details(team_id) values(${id}) on conflict do nothing`;
  const patch={...(input.tag!==undefined?{tag:input.tag}:{}),...(input.description!==undefined?{description:input.description}:{}),...(input.country!==undefined?{country:input.country}:{}),...(input.foundedAt!==undefined?{founded_at:input.foundedAt}:{}),...(input.bannerAlt!==undefined?{banner_alt:input.bannerAlt}:{})};
  if(Object.keys(patch).length)await tx`update aevic_platform.team_details set ${tx(patch)},updated_at=now() where team_id=${id}`;
  await audit(tx,actor(c),'team.profile','team',id);
 });return c.json(await platform(c).team(id,true));
});
app.put('/teams/:id/social-links',async c=>{const id=ownTeam(c,c.req.param('id')),input=await body(c,socialLinks),sql=platform(c).sql;await sql`insert into aevic_platform.team_details(team_id,social_links) values(${id},${sql.json(input)}) on conflict(team_id) do update set social_links=excluded.social_links,updated_at=now()`;return c.json(await platform(c).team(id,true));});
app.put('/teams/:id/roster/:slot',async(c,next)=>{
 const id=ownTeam(c,c.req.param('id'));const active=await platform(c).sql`select e.id from aevic_platform.tournament_registrations e join aevic.tournaments t on t.id=e.tournament_id where e.team_id=${id} and e.status='confirmed' and t.status not in ('completed','cancelled') and clock_timestamp()>=e.roster_lock_at limit 1`;
 if(active.length)throw new ServiceError(409,'ROSTER_LOCKED');return next();
});
app.get('/registrations/team-name',async c=>{const name=text(2,60).parse(c.req.query('name'));const rows=await platform(c).sql`select id from public.teams where lower(btrim(team_name))=lower(${name}) limit 1`;return c.json({available:rows.length===0,normalizedName:name,scope:'platform',source:'backend'});});
app.get('/registrations/player-eligibility',async c=>{const pubgId=z.string().regex(/^\d{5,20}$/).parse(c.req.query('pubgId'));const rows=await platform(c).sql`select team_id from aevic_platform.player_details where pubg_id=${pubgId}`;return c.json({eligible:!rows.length,pubgId,source:'backend',reason:rows.length?'registered-to-another-team':undefined});});
app.post('/registrations',async(c,next)=>{const [setting]=await platform(c).sql`select value from aevic_platform.settings where key='platform'`;if(setting?.value.registrationEnabled===false)throw new ServiceError(409,'REGISTRATION_CLOSED');return next();});
export default app;
