begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Google creates a verified standalone account before it offers purpose selection.
-- Email registration already has the account's chosen purpose at verification time.
create function aevic_platform.welcome_verified_account() returns trigger
language plpgsql set search_path = '' as $$
declare
  purpose text;
  description text;
  destination text;
begin
  if aevic_platform.communication_active_since() is null then return null; end if;
  select o.purpose into purpose from aevic_platform.account_onboarding o where o.account_id = new.id;
  if new.original_team_id is not null then
    description := 'Komanda hesabınız hazırdır. Komanda panelindən müraciətinizin vəziyyətini izləyə bilərsiniz.';
    destination := '/team';
  elsif purpose = 'team' then
    description := 'Hesabınız hazırdır. Komandanızı yaratmaq üçün adını və əsas heyətini əlavə edin.';
    destination := '/team/setup';
  elsif tg_op = 'INSERT' and purpose is null then
    description := 'Hesabınız hazırdır. Turnirləri izləmək və ya komanda yaratmaq üçün hesab məqsədinizi seçin.';
    destination := '/account/onboarding';
  else
    description := 'İzləyici hesabınız hazırdır. Turnir təqvimini və komandaların rəsmi nəticələrini izləyə bilərsiniz.';
    destination := '/tournaments';
  end if;
  perform aevic_platform.emit_communication('welcome', 'account:' || new.id, new.id, null, null,
    jsonb_build_object('description', description, 'contextUrl', destination));
  return null;
exception when query_canceled then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_TIMEOUT';
  return null;
when others then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_FAILED [%]', SQLSTATE;
  return null;
end $$;
create trigger verified_account_created after insert on aevic_platform.accounts
  for each row when (new.email_verified_at is not null) execute function aevic_platform.welcome_verified_account();
create trigger account_becomes_verified after update of email_verified_at on aevic_platform.accounts
  for each row when (old.email_verified_at is null and new.email_verified_at is not null)
  execute function aevic_platform.welcome_verified_account();

-- Both supported registration transactions append one team creation audit record
-- after persisting the team and its initial ownership. Transfers and claims do not.
create function aevic_platform.welcome_created_team() returns trigger
language plpgsql set search_path = '' as $$
declare
  team_id_value bigint := new.entity_id::bigint;
  owner_id bigint;
  team_name_value text;
begin
  if aevic_platform.communication_active_since() is null then return null; end if;
  select auth.account_id, t.team_name into strict owner_id, team_name_value
    from aevic_platform.team_authority auth join public.teams t on t.id = auth.team_id
    where auth.team_id = team_id_value and auth.role = 'OWNER';
  perform aevic_platform.emit_communication('team-welcome', 'team:' || team_id_value, owner_id, team_id_value, null,
    jsonb_build_object('teamName', team_name_value, 'contextUrl', '/team/profile'));
  return null;
exception when query_canceled then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_TIMEOUT';
  return null;
when others then
  raise warning 'AEVIC_AUTOMATION_TRIGGER_FAILED [%]', SQLSTATE;
  return null;
end $$;
create trigger welcome_created_team after insert on aevic_platform.audit_events
  for each row when (new.entity_type = 'team' and new.action in ('account.team-setup','registration.create'))
  execute function aevic_platform.welcome_created_team();

create index session_prior_activity on aevic_platform.sessions(team_id, last_active_at desc)
  where team_id is not null;

create function aevic_platform.welcome_returning_account() returns trigger
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
create trigger welcome_returning_account after insert on aevic_platform.sessions
  for each row when (new.team_id is not null) execute function aevic_platform.welcome_returning_account();

commit;
