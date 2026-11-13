import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Sql, TransactionSql } from 'postgres';
import type { Env } from '../types';
import { body, text } from '../validation/input';
import { ServiceError } from '../errors';
import { persistentLimit } from '../auth/persistent-limit';
import { actor, admin, platform } from './context';
import { audit, idempotent, transaction } from './competition';

const app = new Hono<Env>();
const sendRoles = ['tournament-manager', 'support-moderator'];
const aliasSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._-]*$/u)
  .refine((alias) => alias.toLowerCase() !== 'aevic admin');
const sendSchema = z
  .object({
    title: text(2, 160),
    body: text(1, 4000),
    severity: z.enum(['info', 'warning', 'critical', 'success']),
    audience: z.enum(['all', 'team', 'tournament']),
    teamId: z
      .string()
      .regex(/^[1-9]\d{0,18}$/)
      .refine((id) => id.length < 19 || id <= '9223372036854775807')
      .optional(),
    tournamentId: z.uuid().optional(),
    recipientVersion: z.string().length(64).optional(),
    expectedCount: z.number().int().positive(),
    actionHref: z.enum(['/tournaments', '/regulations', '/team']).optional(),
  })
  .strict()
  .refine((input) => (input.audience === 'team') === Boolean(input.teamId))
  .refine(
    (input) =>
      (input.audience === 'tournament') === Boolean(input.tournamentId) &&
      (input.audience !== 'tournament' || Boolean(input.recipientVersion)),
  );

async function profile(sql: Sql | TransactionSql, owner: string) {
  const [row] =
    await sql`select display_alias,role from aevic_platform.admin_accounts where id=${owner} and active`;
  if (!row) throw new ServiceError(403, 'FORBIDDEN');
  return {
    alias: row.display_alias as string | null,
    displayName: String(row.display_alias ?? 'AEVIC Admin'),
    canBrand: row.role === 'super-admin',
  };
}
app.get('/admin/messages/automation',async c=>{
  admin(c,sendRoles);
  const sql=platform(c).sql;
  const rules=await sql`select kind,title,body,enabled,in_app as "inApp",email,lead_minutes as "leadMinutes",revision
    from aevic_platform.communication_rules order by kind`;
  const outcomes=await sql`select * from (
    (select event_type as kind,'in-app' as channel,'sent' as status,1 as attempts,created_at as at,id as reference,null::timestamptz as "retryAt" from aevic_platform.notifications
      where system_key is not null order by created_at desc limit 25)
    union all
    (select kind,'email',status,attempts,updated_at,id,next_attempt_at from aevic_platform.communication_email where status='pending' order by updated_at desc limit 25)
    union all
    (select e.kind,'email',a.status,a.attempt,a.recorded_at,e.id,case when a.status='retry' and e.status='retry' and a.attempt=e.attempts then e.next_attempt_at end from aevic_platform.communication_email_attempts a
      join aevic_platform.communication_email e on e.id=a.email_id order by a.recorded_at desc limit 25)
    union all
    (select metadata->>'kind','in-app',metadata->>'status',(metadata->>'attempts')::integer,created_at,id,
      (metadata->>'retryAt')::timestamptz from aevic_platform.audit_events
      where actor_id='system:communications' and action='communication.reminder.failed' order by created_at desc limit 25)
    ) recent order by at desc limit 40`;
  return c.json({rules,outcomes,canEdit:actor(c).role==='super-admin'});
});
app.put('/admin/messages/automation/:kind',async c=>{
  admin(c,['super-admin']);
  const kind=c.req.param('kind');
  const input=await body(c,z.object({revision:z.number().int().positive(),enabled:z.boolean(),inApp:z.boolean(),
    email:z.boolean(),leadMinutes:z.number().int().positive().nullable(),body:text(1,1500)}).strict());
  return transaction(platform(c).sql,async tx=>{
    const [rule]=await tx`select * from aevic_platform.communication_rules where kind=${kind} for update`;
    if(!rule)throw new ServiceError(404,'NOT_FOUND');
    if(input.revision!==rule.revision)throw new ServiceError(409,'STALE_VERSION');
    const tokens=(template:string)=>[...template.matchAll(/\{([a-zA-Z]+)\}/g)].map(match=>match[1]);
    const required=tokens(rule.body);
    if(/[{}]/.test(input.body.replace(/\{[a-zA-Z]+\}/g,''))||tokens(input.body).some(token=>!required.includes(token))||
      required.some(token=>!tokens(input.body).includes(token)))throw new ServiceError(422,'INVALID_TEMPLATE');
    if(input.email&&!['welcome','champion'].includes(kind))throw new ServiceError(422,'INVALID_CHANNEL');
    const range=kind==='welcome-back'?[1440,525600]:[5,1440];
    if((rule.lead_minutes===null)!==(input.leadMinutes===null)||input.leadMinutes!==null&&
      (input.leadMinutes<range[0]||input.leadMinutes>range[1]))throw new ServiceError(422,'INVALID_TIMING');
    await tx`update aevic_platform.communication_rules set enabled=${input.enabled},in_app=${input.inApp},email=${input.email},
      lead_minutes=${input.leadMinutes},body=${input.body},revision=revision+1 where kind=${kind}`;
    await audit(tx,actor(c),'communication.rule.update','communication',kind,{revision:input.revision+1});
    return c.body(null,204);
  });
});
app.get('/admin/profile/alias', async (c) => c.json(await profile(platform(c).sql, admin(c))));
app.put('/admin/profile/alias', async (c) => {
  const owner = admin(c),
    input = await body(c, z.object({ alias: aliasSchema.nullable() }).strict());
  try {
    return c.json(
      await transaction(platform(c).sql, async (tx) => {
        await tx`update aevic_platform.admin_accounts set display_alias=${input.alias} where id=${owner} and active`;
        await audit(tx, actor(c), 'admin.alias-update', 'admin', owner, { alias: input.alias });
        return profile(tx, owner);
      }),
    );
  } catch (error) {
    if ((error as { constraint_name?: string }).constraint_name === 'admin_active_alias')
      throw new ServiceError(409, 'ALIAS_IN_USE');
    throw error;
  }
});
function recipients(sql: Sql | TransactionSql, teamId?: string, tournamentId?: string) {
  return sql`select t.id::text, t.team_name as name, d.tag, t.logo_url as "logoUrl"
  from public.teams t left join aevic_platform.team_details d on d.team_id=t.id
  where t.status in ('approved','pending') and d.archived_at is null
  and (${teamId ?? null}::bigint is null or t.id=${teamId ?? null})
  and (${tournamentId ?? null}::uuid is null or (t.status='approved' and exists(
   select 1 from aevic_platform.tournament_registrations r where r.tournament_id=${tournamentId ?? null} and r.team_id=t.id and r.status='confirmed')))
  and exists(select 1 from aevic_platform.team_authority a where a.team_id=t.id)
  order by t.team_name,t.id`;
}
const recipientVersion = (teams: Record<string, unknown>[]) =>
  createHash('sha256')
    .update(JSON.stringify(teams.map((t) => String(t.id)).sort()))
    .digest('hex');
app.get('/admin/messages/recipients', async (c) => {
  admin(c, sendRoles);
  const id = c.req.query('tournamentId');
  if (!id) return c.json(await recipients(platform(c).sql));
  z.uuid().parse(id);
  const [tournament] = await platform(c)
    .sql`select id,name from aevic.tournaments where id=${id} and archived_at is null`;
  if (!tournament) throw new ServiceError(404, 'TOURNAMENT_NOT_FOUND');
  const teams = await recipients(platform(c).sql, undefined, id);
  return c.json({ teams, recipientVersion: recipientVersion(teams), tournamentName: tournament.name });
});
app.get('/admin/messages/tournaments', async (c) => {
  admin(c, sendRoles);
  const rows = await platform(c).sql`select t.id,count(distinct team.id)::int as count from aevic.tournaments t
 left join aevic_platform.tournament_registrations r on r.tournament_id=t.id and r.status='confirmed'
 left join public.teams team on team.id=r.team_id and team.status='approved'
 and not exists(select 1 from aevic_platform.team_details d where d.team_id=team.id and d.archived_at is not null)
 and exists(select 1 from aevic_platform.team_authority a where a.team_id=team.id)
 where t.archived_at is null group by t.id`;
  return c.json(Object.fromEntries(rows.map((row) => [row.id, row.count])));
});
app.post('/admin/messages', async (c) => {
  const owner = admin(c, sendRoles),
    sql = platform(c).sql,
    input = await body(c, sendSchema);
  await persistentLimit(c, sql, 'message-send', owner, 12, true);
  const result = await idempotent(
    sql,
    actor(c),
    c.req.header('idempotency-key'),
    'message.send',
    input,
    async (tx) => {
      const [tournament] = input.tournamentId
        ? await tx`select id,name from aevic.tournaments where id=${input.tournamentId} and archived_at is null for share`
        : [];
      if (input.tournamentId && !tournament) throw new ServiceError(409, 'RECIPIENTS_CHANGED');
      const teams = await recipients(tx, input.teamId, input.tournamentId);
      if (
        !teams.length ||
        teams.length !== input.expectedCount ||
        (input.tournamentId && input.recipientVersion !== recipientVersion(teams))
      )
        throw new ServiceError(409, 'RECIPIENTS_CHANGED');
      const { displayName } = await profile(tx, owner);
      const actionHref = input.actionHref ?? (tournament ? '/tournaments/' + tournament.id : null);
      const [message] =
        await tx`insert into aevic_platform.messages(team_id,author_id,sender_alias,title,body,severity,action_href,recipient_count,recipient_name,tournament_id,tournament_name)
   values(${input.teamId ?? null},${owner},${displayName},${input.title},${input.body},${input.severity},${actionHref},${teams.length},${input.teamId ? teams[0].name : null},${input.tournamentId ?? null},${tournament?.name ?? null}) returning id`;
      await tx`insert into aevic_platform.message_teams select ${message.id},unnest(${tx.array(teams.map((t) => t.id))}::bigint[])`;
      const [delivery] = await tx`with delivered as (
   insert into aevic_platform.notifications(recipient_id,message_team_id,message_id,title,body,severity,action_href,event_type)
   select a.account_id,a.team_id,r.message_id,${input.title},${input.body},${input.severity},${actionHref ?? '/team/messages'},'admin-message'
   from aevic_platform.message_teams r join aevic_platform.team_authority a on a.team_id=r.team_id
   left join aevic_platform.notification_preferences p on p.user_id=a.account_id
   where r.message_id=${message.id} and (p.preferences->'channels'->'in-app') is distinct from 'false'::jsonb
   and (p.preferences->'events'->'adminMessages') is distinct from 'false'::jsonb returning 1)
   update aevic_platform.messages set delivery_count=(select count(*) from delivered) where id=${message.id} returning delivery_count`;
      await audit(tx, actor(c), 'message.send', 'message', message.id, {
        recipientCount: teams.length,
        deliveryCount: delivery.delivery_count,
        scope: input.audience,
        tournamentId: input.tournamentId ?? null,
      });
      return { id: String(message.id), recipientCount: teams.length };
    },
  );
  return c.json(result);
});
export default app;
