import { Hono } from 'hono';
import { z } from 'zod';
import type { Sql } from 'postgres';
import type { Env } from '../types';
import type { AdminAnalytics, AnalyticsRange } from '../../src/types/adminAnalytics';
import { admin, platform } from './context';

/** One statement, one consistent snapshot. Only aggregates and bounded operational projections leave SQL. */
export async function readAdminAnalytics(sql: Sql, range: AnalyticsRange): Promise<AdminAnalytics> {
  const days = range === 'all' ? null : Number(range);
  const granularity = range === 'all' ? 'month' : range === '90' ? 'week' : 'day';
  const [row] = await sql`
    with config as (
      select statement_timestamp() as finish, ${granularity}::text as grain,
        case when ${days}::int is null then least(
          coalesce((select min(created_at) from aevic.tournaments), statement_timestamp()),
          coalesce((select min(created_at) from public.teams), statement_timestamp()),
          coalesce((select min(created_at) from aevic_platform.tournament_registrations), statement_timestamp())
        ) else (date_trunc('day', statement_timestamp() at time zone 'Asia/Baku') - (${days}::int-1)*interval '1 day') at time zone 'Asia/Baku' end as start
    ), completions as (
      select entity_id, min(created_at) as completed_at from aevic_platform.audit_events
      where action='tournament.update' and entity_type='tournament' and metadata->>'status'='completed' group by entity_id
    ), totals as (
      select
        (select count(*)::int from aevic.tournaments) as tournaments,
        (select count(*)::int from aevic.tournaments where status='completed') as completed,
        (select count(*)::int from aevic.tournaments where status in ('published','registration-open','ongoing') and archived_at is null) as active,
        (select count(*)::int from public.teams) as teams,
        (select count(*)::int from aevic_platform.tournament_registrations) as registrations,
        (select count(*)::int from aevic.matches where status='completed') as "playedRounds",
        (select count(*)::int from aevic_platform.team_match_results r join aevic.matches m on m.id=r.match_id where r.published and m.published_at is not null) as "publishedResults",
        (select count(*)::int from public.teams where status='pending') as "pendingTeams",
        (select count(*)::int from aevic_platform.tournament_registrations where status='pending') as "pendingRegistrations",
        (select count(*)::int from aevic_platform.verification_requests where status='PENDING') as "pendingVerifications",
        (select count(*)::int from aevic_platform.roster_change_requests where status in ('pending','under-review')) as "pendingRosters"
    ), activity_points as (
      select created_at as at, 'tournaments' as metric, 1 as amount from aevic.tournaments
      union all select completed_at, 'completions', 1 from completions
      union all select created_at, 'teams', 1 from public.teams
      union all select created_at, 'registrations', 1 from aevic_platform.tournament_registrations
      union all select published_at, 'publishedRounds', 1 from aevic.matches where published_at is not null
      union all select m.published_at, 'publishedResults', count(*)::int from aevic.matches m join aevic_platform.team_match_results r on r.match_id=m.id and r.published where m.published_at is not null group by m.id,m.published_at
    ), grouped as (
      select date_trunc(c.grain, a.at at time zone 'Asia/Baku') as bucket, a.metric, sum(a.amount)::int as value
      from activity_points a cross join config c where a.at>=c.start and a.at<=c.finish group by bucket,a.metric
    ), series as (
      select b.bucket as date,
        coalesce(sum(g.value) filter(where g.metric='tournaments'),0)::int as tournaments,
        coalesce(sum(g.value) filter(where g.metric='completions'),0)::int as completions,
        coalesce(sum(g.value) filter(where g.metric='teams'),0)::int as teams,
        coalesce(sum(g.value) filter(where g.metric='registrations'),0)::int as registrations,
        coalesce(sum(g.value) filter(where g.metric='publishedRounds'),0)::int as "publishedRounds",
        coalesce(sum(g.value) filter(where g.metric='publishedResults'),0)::int as "publishedResults"
      from config c cross join lateral generate_series(date_trunc(c.grain,c.start at time zone 'Asia/Baku'),date_trunc(c.grain,c.finish at time zone 'Asia/Baku'),('1 '||c.grain)::interval) b(bucket)
      left join grouped g on g.bucket=b.bucket group by b.bucket order by b.bucket
    ), tournament_ops as (
      select t.id,t.name,t.status,t.starts_at as "startsAt", t.updated_at,t.max_slots as capacity,
        coalesce(r.occupied,0)::int as occupied,coalesce(m.rounds,0)::int as rounds,coalesce(m.published,0)::int as published
      from aevic.tournaments t
      left join (select tournament_id,count(*) filter(where status='confirmed')::int as occupied from aevic_platform.tournament_registrations group by tournament_id) r on r.tournament_id=t.id
      left join (select tournament_id,count(*)::int as rounds,count(*) filter(where published_at is not null)::int as published from aevic.matches group by tournament_id) m on m.tournament_id=t.id
      where t.archived_at is null
    ), approval_ops as (
      select id::text,id::text as sort_id,team_name as name,'team' as kind,created_at as "createdAt",'/admin/teams/'||id::text as href from public.teams where status='pending'
      union all select r.id::text,r.id::text,t.team_name,'registration',r.created_at,'/admin/tournaments/'||r.tournament_id::text from aevic_platform.tournament_registrations r join public.teams t on t.id=r.team_id where r.status='pending'
    )
    select jsonb_build_object(
      'generatedAt',c.finish,'timezone','Asia/Baku','range',${range}::text,'granularity',c.grain,'start',c.start,
      'totals',to_jsonb(t)||jsonb_build_object('pendingApprovals',t."pendingTeams"+t."pendingRegistrations"+t."pendingVerifications"+t."pendingRosters"),
      'period',jsonb_build_object(
        'tournaments',(select coalesce(sum(tournaments),0) from series),'completions',(select coalesce(sum(completions),0) from series),
        'teams',(select coalesce(sum(teams),0) from series),'registrations',(select coalesce(sum(registrations),0) from series),
        'publishedRounds',(select coalesce(sum("publishedRounds"),0) from series),'publishedResults',(select coalesce(sum("publishedResults"),0) from series),
        'uniqueTeams',(select count(distinct team_id)::int from aevic_platform.tournament_registrations where created_at>=c.start and created_at<=c.finish)),
      'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.date) from series s),'[]'::jsonb),
      'lifecycle',coalesce((select jsonb_agg(s) from (select status,count(*)::int as count from aevic.tournaments group by status order by status) s),'[]'::jsonb),
      'upcoming',coalesce((select jsonb_agg(to_jsonb(s)-'updated_at') from (select * from tournament_ops where status in ('published','registration-open','ongoing') and "startsAt">=c.finish order by "startsAt",id limit 4) s),'[]'::jsonb),
      'completed',coalesce((select jsonb_agg(to_jsonb(s)-'updated_at') from (select * from tournament_ops where status='completed' order by updated_at desc,id limit 4) s),'[]'::jsonb),
      'attention',coalesce((select jsonb_agg(to_jsonb(s)-'updated_at') from (select * from tournament_ops where status in ('published','registration-open','ongoing') and "startsAt"<c.finish and published<rounds order by "startsAt",id limit 4) s),'[]'::jsonb),
      'approvals',coalesce((select jsonb_agg(to_jsonb(s)-'sort_id') from (select * from approval_ops order by "createdAt",sort_id limit 5) s),'[]'::jsonb),
      'activity',coalesce((select jsonb_agg(s) from (select e.id,e.action,e.created_at as "createdAt",
        case when e.entity_type='tournament' and exists(select 1 from aevic.tournaments where id::text=e.entity_id) then '/admin/tournaments/'||e.entity_id
          when e.entity_type='team' and exists(select 1 from public.teams where id::text=e.entity_id) then '/admin/teams/'||e.entity_id
          when e.entity_type='result' and exists(select 1 from aevic_platform.team_match_results where id::text=e.entity_id) then '/admin/results/'||e.entity_id||'/correct'
          when e.entity_type='match' then coalesce((select '/admin/results?tournament='||m.tournament_id::text||'&round='||m.id::text from aevic.matches m where m.id::text=e.entity_id),'/admin/audit')
          else '/admin/audit' end as href
        from aevic_platform.audit_events e where e.actor_id like 'admin:%' order by e.created_at desc,e.id desc limit 5) s),'[]'::jsonb)
    ) as analytics from config c cross join totals t`;
  return row.analytics as AdminAnalytics;
}

const app = new Hono<Env>();
app.get('/admin/analytics', async c => {
  admin(c);
  const range = z.enum(['7','30','90','all']).parse(c.req.query('range') ?? '30');
  c.header('Cache-Control','private, no-store');
  return c.json(await readAdminAnalytics(platform(c).sql, range));
});
export default app;
