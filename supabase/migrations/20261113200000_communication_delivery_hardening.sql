begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Keep failures local to a reminder and stop after four consecutive attempts.
-- Rescheduling replaces the timer, allowing the new deadline its own retry cycle.
alter table aevic_platform.communication_timers
  add column failure_attempts integer not null default 0 check (failure_attempts between 0 and 4);

-- A remembered session can return without a new login/session insert. Use OLD
-- before the heartbeat overwrites it, plus activity on the account's other devices.
create or replace function aevic_platform.welcome_returning_account() returns trigger
language plpgsql set search_path = '' as $$
declare
  previous_activity timestamptz;
  inactivity_minutes integer;
  account_name text;
  has_team boolean;
begin
  if aevic_platform.communication_active_since() is null then return null; end if;
  select lead_minutes into inactivity_minutes from aevic_platform.communication_rules
    where kind = 'welcome-back' and enabled;
  if inactivity_minutes is null then return null; end if;
  select max(s.last_active_at) into previous_activity from aevic_platform.sessions s
    where s.team_id = new.team_id and s.id <> new.id;
  if tg_op = 'UPDATE' then
    previous_activity := greatest(previous_activity, old.last_active_at);
  end if;
  if previous_activity is null or new.last_active_at < previous_activity + make_interval(mins => inactivity_minutes)
    then return null; end if;
  select split_part(btrim(a.captain_name), ' ', 1), exists (
    select 1 from aevic_platform.team_authority ta left join aevic_platform.team_details d on d.team_id = ta.team_id
    where ta.account_id = a.id and d.archived_at is null
  ) into account_name, has_team from aevic_platform.account_identity a where a.id = new.team_id;
  perform aevic_platform.emit_communication('welcome-back', 'activity:' || new.team_id || ':' || extract(epoch from previous_activity),
    new.team_id, null, null, jsonb_build_object(
      'description', coalesce(nullif(account_name, '') || ', ', '') ||
        case when has_team then 'komanda panelinizdə son yeniliklərə baxa bilərsiniz.'
        else 'son turnirlərə və rəsmi nəticələrə nəzər salın.' end,
      'contextUrl', case when has_team then '/team' else '/tournaments' end));
  return null;
exception when query_canceled then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_TIMEOUT';
  return null;
when others then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_FAILED [%]', SQLSTATE;
  return null;
end $$;
create trigger welcome_returning_session after update of last_active_at on aevic_platform.sessions
  for each row when (new.team_id is not null and new.last_active_at > old.last_active_at)
  execute function aevic_platform.welcome_returning_account();

-- Owner-only activation: no backlog replay, even after disabling and re-enabling.
create function aevic_platform.set_communications_enabled(enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from aevic_platform.communication_rollout where singleton for update;
 if enabled and aevic_platform.communication_active_since() is not null then return; end if;
 update aevic_platform.communication_rollout set enabled_at=case when enabled then clock_timestamp() else null end where singleton;
 if enabled then
  update aevic_platform.communication_email set status='skipped',updated_at=clock_timestamp()
   where status in ('pending','retry');
  delete from aevic_platform.communication_timers;
  insert into aevic_platform.communication_timers(tournament_id,kind,deadline)
   select t.id,k,d from aevic.tournaments t cross join lateral
    (values ('deadline',t.registration_deadline),('check-in',t.check_in_closes_at),('tournament-starting',t.starts_at)) x(k,d)
   where t.archived_at is null and t.status in ('published','registration-open','ongoing') and d>clock_timestamp()
    and (k<>'deadline' or t.status='registration-open');
 end if;
end $$;
revoke all on function aevic_platform.set_communications_enabled(boolean) from public,anon,authenticated,aevic_communications_backend;
commit;
