import type { Sql, TransactionSql } from 'postgres';

type TournamentEvent =
  | 'registration-received'
  | 'registration-approved'
  | 'registration-rejected'
  | 'registration-withdrawn'
  | 'map-result'
  | 'champion'
  | 'check-in'
  | 'deadline'
  | 'tournament-starting';
interface TournamentContext {
  id: string;
  name: string;
}
export async function emitTeamEvent(
  tx: TransactionSql,
  kind: TournamentEvent,
  key: string,
  teams: string[],
  tournament: TournamentContext,
  details: {
    description?: string;
    roundName?: string;
    winnerName?: string;
    startTime?: string;
    deadline?: string;
    strict?: boolean;
  } = {},
) {
  if (!teams.length) return;
  const results = kind === 'champion' || kind === 'map-result';
  const context = {
    ...details,
    tournamentName: tournament.name,
    contextUrl: results
      ? '/tournaments/' + tournament.id + '#results'
      : '/team/tournaments/' + tournament.id,
  };
  try { await tx.savepoint(async delivery => { await delivery`select aevic_platform.emit_communication(${kind},${key}||':'||team_id::text,null,team_id,${tournament.id},${tx.json(context)})
  from unnest(${tx.array(teams)}::bigint[]) as eligible(team_id)`; }); } catch {
    if (details.strict) throw new Error('AUTOMATIC_EVENT_FAILED');
    console.warn('AEVIC_AUTOMATIC_EVENT_FAILED');
  }
}

export async function congratulateWinner(tx: TransactionSql, tournament: TournamentContext) {
  const [winner] = await tx`select team.id::text,team.team_name from (
  select standings from aevic_platform.leaderboard_snapshots where tournament_id=${tournament.id}
  order by published_at desc,id desc limit 1) final
  join public.teams team on team.id=(final.standings->0->>'teamId')::bigint
  where final.standings->0->>'rank'='1' and not exists (
   select 1 from aevic.matches where tournament_id=${tournament.id} and published_at is null)`;
  if (winner)
    await emitTeamEvent(tx, 'champion', tournament.id, [winner.id], tournament, {
      winnerName: winner.team_name,
    });
}

const bakuTime = new Intl.DateTimeFormat('az-AZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Baku',
});
export async function processTournamentTimers(sql: Sql, enabled = false) {
  if (!enabled) return 0;
  const [gate] = await sql`select aevic_platform.communication_active_since() as since`;
  if (!gate?.since) return 0;
  // Lock tournaments before their timers, in the same order as schedule edits,
  // registrations and check-ins. A retry sees the latest committed eligibility.
  return sql.begin(async (tx) => {
    const due =
      await tx`select t.id,t.name,t.starts_at,t.check_in_opens_at,t.registration_opens_at,t.max_slots,
    job.kind,job.deadline,job.deadline::text as deadline_identity,job.failure_attempts,rule.enabled from aevic_platform.communication_timers job
   join aevic.tournaments t on t.id=job.tournament_id
   join aevic_platform.communication_rules rule on rule.kind=job.kind
   where greatest(job.deadline-make_interval(mins=>rule.lead_minutes),
     case job.kind when 'check-in' then t.check_in_opens_at when 'deadline' then t.registration_opens_at else job.deadline-make_interval(mins=>rule.lead_minutes) end)
     >= greatest(aevic_platform.communication_active_since(),now()-interval '10 minutes')
   and job.failure_attempts<4 and job.next_scan_at<=now() and job.deadline<=now()+make_interval(mins=>rule.lead_minutes)
   and (job.deadline<=now() or case job.kind when 'check-in' then t.check_in_opens_at<=now()
     when 'deadline' then t.registration_opens_at<=now() else true end)
   order by job.next_scan_at,job.deadline,t.id,job.kind limit 12 for update of t skip locked`;
    for (const job of due) {
      const [timer] =
        await tx`update aevic_platform.communication_timers set next_scan_at=now()+interval '5 minutes'
    where tournament_id=${job.id} and kind=${job.kind} and deadline::text=${job.deadline_identity}
    returning deadline>clock_timestamp() as actionable`;
      if (!timer) continue;
      if (!timer.actionable) {
        await tx`delete from aevic_platform.communication_timers where tournament_id=${job.id} and kind=${job.kind}`;
        continue;
      }
      if (!job.enabled) continue;
      try {
        // A failed event must not abort other tournaments or lose retry state.
        await tx.savepoint(async (delivery) => {
          const teams =
            job.kind === 'deadline'
              ? await delivery`select team.id::text from public.teams team
        left join aevic_platform.team_details d on d.team_id=team.id
        where team.status='approved' and d.archived_at is null
        and num_nonnulls(nullif(team.player1_ign,''),nullif(team.player2_ign,''),nullif(team.player3_ign,''),nullif(team.player4_ign,''),nullif(team.player5_ign,''))>=4
        and not exists(select 1 from aevic_platform.tournament_registrations r where r.tournament_id=${job.id} and r.team_id=team.id)
        and (select count(*) from aevic_platform.tournament_registrations where tournament_id=${job.id} and status in ('confirmed','pending'))<${job.max_slots}`
              : await delivery`select team.id::text from aevic_platform.tournament_registrations r join public.teams team on team.id=r.team_id
        left join aevic_platform.team_details d on d.team_id=team.id
        where r.tournament_id=${job.id} and r.status='confirmed' and team.status='approved' and d.archived_at is null
        and (${job.kind}<>'check-in' or not exists(select 1 from aevic_platform.check_ins c where c.team_id=team.id and c.tournament_id=r.tournament_id))`;
          await emitTeamEvent(
            delivery,
            job.kind,
            job.id + ':' + new Date(job.deadline).toISOString(),
            teams.map((t) => t.id),
            { id: job.id, name: job.name },
            { strict: true, deadline: bakuTime.format(job.deadline), startTime: bakuTime.format(job.starts_at) },
          );
        });
        await tx`update aevic_platform.communication_timers set failure_attempts=0 where tournament_id=${job.id} and kind=${job.kind}`;
      } catch {
        const attempts = job.failure_attempts + 1;
        const status = attempts >= 4 ? 'failed' : 'retry';
        const delay = [5, 30, 120, 120][attempts - 1];
        const [retry] = await tx`update aevic_platform.communication_timers
          set failure_attempts=${attempts},next_scan_at=now()+${delay}*interval '1 minute'
          where tournament_id=${job.id} and kind=${job.kind} returning next_scan_at`;
        // Record only a safe outcome; SQL errors may contain recipient data.
        await tx`insert into aevic_platform.audit_events(actor_id,action,entity_type,entity_id,metadata)
          values('system:communications','communication.reminder.failed','tournament',${job.id},
            ${tx.json({kind:job.kind,attempts,status,retryAt:status==='retry'?retry.next_scan_at.toISOString():null})})`;
      }
    }
    return due.length;
  });
}
