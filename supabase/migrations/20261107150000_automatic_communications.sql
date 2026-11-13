-- Reviewed pending migration: bounded DDL waits; fail atomically on incompatibility.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
 if exists(select 1 from unnest(array['aevic_platform.account_onboarding','aevic_platform.notifications','aevic_platform.accounts','aevic_platform.sessions','aevic_platform.audit_events','aevic_platform.team_authority','aevic.tournaments']) as deps(name) where to_regclass(name) is null) then
  raise exception 'COMMUNICATION_PREREQUISITES_MISSING';
 end if;
 if not exists(select 1 from pg_roles where rolname='aevic_communications_backend') then
  create role aevic_communications_backend nologin nosuperuser nobypassrls;
 end if;
 if exists(select 1 from pg_roles where rolname='aevic_communications_backend' and (rolcanlogin or rolsuper or rolbypassrls)) then
  raise exception 'UNSAFE_COMMUNICATION_ROLE';
 end if;
end $$;
create table aevic_platform.communication_rollout (
 singleton boolean primary key default true check(singleton), enabled_at timestamptz
);
insert into aevic_platform.communication_rollout values(true,null);
alter table aevic_platform.communication_rollout enable row level security;
revoke all on aevic_platform.communication_rollout from public,anon,authenticated;
-- This exposes only rollout state, never recipients or queue data.
create function aevic_platform.communication_active_since() returns timestamptz
language sql stable security definer set search_path='' as $$
 select enabled_at from aevic_platform.communication_rollout where singleton
$$;
grant execute on function aevic_platform.communication_active_since() to public;
-- Earlier clients named this preference checkIn. Keep explicit choices when
-- moving the checkbox to the canonical server key.
update aevic_platform.notification_preferences set preferences=jsonb_set(preferences,'{events,check-in}',preferences->'events'->'checkIn')
 where preferences->'events' ? 'checkIn' and not (preferences->'events' ? 'check-in');
create table aevic_platform.communication_rules (
 kind text primary key, revision integer not null default 1, enabled boolean not null default true, in_app boolean not null default true,
 email boolean not null default false, title text not null, body text not null,
 lead_minutes integer check (lead_minutes between 5 and 525600)
);
insert into aevic_platform.communication_rules(kind,title,body,email,lead_minutes) values
 ('welcome','AEVIC-ə xoş gəlmisiniz','{description}',true,null),
 ('team-welcome','Komandanız yaradıldı','{teamName} üçün komanda paneli hazırdır. Heyətinizi və komanda profilinizi burada idarə edə bilərsiniz.',false,null),
 ('welcome-back','Yenidən xoş gəlmisiniz','{description}',false,43200),
 ('registration-received','Qeydiyyat göndərildi','{tournamentName} üçün müraciətiniz qəbul olundu və baxış gözləyir.',false,null),
 ('registration-approved','İştirak təsdiqləndi','{tournamentName} turnirində iştirakınız təsdiqləndi.',false,null),
 ('registration-rejected','Müraciət qəbul edilmədi','{tournamentName} üzrə qeydiyyat müraciətiniz rədd edildi. {description}',false,null),
 ('registration-withdrawn','Qeydiyyat geri götürüldü','{tournamentName} üzrə qeydiyyatınız geri götürüldü.',false,null),
 ('check-in','İştirakınızı təsdiqləyin','{tournamentName} üçün check-in açıqdır. Son vaxt: {deadline} (Bakı).',false,60),
 ('tournament-starting','Turnir tezliklə başlayır','{tournamentName} turnirinin başlama vaxtı: {startTime} (Bakı).',false,60),
 ('deadline','Qeydiyyat başa çatır','{tournamentName} üçün qeydiyyat {deadline} (Bakı) tarixində bağlanır.',false,120),
 ('map-result','Nəticələr dərc edildi','{tournamentName} · {roundName}. Rəsmi nəticələrə baxa bilərsiniz.',false,null),
 ('champion','Çempionluğunuz mübarək!','{winnerName}, {tournamentName} turnirini birinci yerdə başa vurdunuz. Təbrik edirik!',true,null);

alter table aevic_platform.notifications
 add column system_key text, add column system_team_id bigint references public.teams,
 add column system_tournament_id uuid references aevic.tournaments, add column system_tournament_name text;
create unique index notification_system_event on aevic_platform.notifications(event_type,system_key,recipient_id) where system_key is not null;
create table aevic_platform.communication_email (
 created_at timestamptz not null default clock_timestamp(),
 id uuid primary key default gen_random_uuid(), kind text not null references aevic_platform.communication_rules,
 event_key text not null, account_id bigint not null references aevic_platform.accounts,
 team_id bigint references public.teams, tournament_id uuid references aevic.tournaments,
 title text not null, body text not null, href text not null, status text not null default 'pending',
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(kind,event_key,account_id)
);
create index communication_email_due on aevic_platform.communication_email(status,next_attempt_at);
create table aevic_platform.communication_email_attempts (
 email_id uuid not null references aevic_platform.communication_email, attempt integer not null,
 status text not null, recorded_at timestamptz not null default clock_timestamp(),
 primary key(email_id,attempt,status)
);
create index communication_attempt_time on aevic_platform.communication_email_attempts(recorded_at desc);
create function aevic_platform.record_email_attempt() returns trigger language plpgsql as $$
begin
 insert into aevic_platform.communication_email_attempts(email_id,attempt,status)
 values(new.id,new.attempts,new.status) on conflict do nothing;
 return null;
end $$;
create trigger communication_email_outcome after update of status on aevic_platform.communication_email
 for each row when (old.status is distinct from new.status) execute function aevic_platform.record_email_attempt();
-- Each tournament has at most one outstanding timer for each action. Deadlines
-- are copied only for indexing; eligibility is rechecked under the tournament lock.
create table aevic_platform.communication_timers (
 tournament_id uuid not null references aevic.tournaments on delete cascade,
 kind text not null references aevic_platform.communication_rules, deadline timestamptz not null,
 next_scan_at timestamptz not null default now(),
 primary key(tournament_id,kind)
);
create index communication_timer_deadline on aevic_platform.communication_timers(kind,deadline);
create function aevic_platform.refresh_communication_timers() returns trigger language plpgsql as $$
begin
 if aevic_platform.communication_active_since() is null then return new; end if;
 delete from aevic_platform.communication_timers where tournament_id=new.id;
 if new.archived_at is null and new.status in ('published','registration-open','ongoing') then
  insert into aevic_platform.communication_timers(tournament_id,kind,deadline)
  select new.id,k,d from (values ('deadline',new.registration_deadline),('check-in',new.check_in_closes_at),('tournament-starting',new.starts_at)) x(k,d)
  where d>now() and (k<>'deadline' or new.status='registration-open');
 end if;
 return new;
exception when query_canceled then
 raise warning 'AEVIC_AUTOMATION_TIMER_TIMEOUT';
 return new;
when others then
 raise warning 'AEVIC_AUTOMATION_TIMER_FAILED [%]', SQLSTATE;
 return new;
end $$;
create trigger tournament_communication_timers after insert or update of starts_at,registration_deadline,check_in_closes_at,check_in_opens_at,status,archived_at on aevic.tournaments
 for each row execute function aevic_platform.refresh_communication_timers();
insert into aevic_platform.communication_timers(tournament_id,kind,deadline)
select t.id,k,d from aevic.tournaments t cross join lateral
 (values ('deadline',t.registration_deadline),('check-in',t.check_in_closes_at),('tournament-starting',t.starts_at)) x(k,d)
where aevic_platform.communication_active_since() is not null and t.archived_at is null and t.status in ('published','registration-open','ongoing') and d>now() and (k<>'deadline' or t.status='registration-open');

-- Render tokens in one pass so team names containing braces remain plain text.
create function aevic_platform.communication_text(template text, ctx jsonb) returns text
language sql immutable as $$
 select coalesce(string_agg(case when token[2] is null then token[1] else coalesce(ctx->>token[2],'') end,'' order by position),'')
 from regexp_matches(template,'(\{([a-zA-Z]+)\}|[^{]+|\{)','g') with ordinality as tokens(token,position)
$$;
create function aevic_platform.emit_communication(p_kind text,p_key text,p_account bigint,p_team bigint,p_tournament uuid,ctx jsonb)
returns void language plpgsql as $$
declare rule aevic_platform.communication_rules; rendered text; preference text;
begin
 if aevic_platform.communication_active_since() is null then return; end if;
 select * into strict rule from aevic_platform.communication_rules where kind=p_kind;
 if not rule.enabled then return; end if;
 rendered := aevic_platform.communication_text(rule.body,ctx);
 preference := case when p_kind in ('map-result','champion') then 'results' when p_kind like 'registration-%' or p_kind='deadline' then 'registration' when p_kind='check-in' then 'check-in' else 'announcements' end;
 if rule.in_app then
  insert into aevic_platform.notifications(recipient_id,event_type,system_key,system_team_id,system_tournament_id,system_tournament_name,title,body,action_href,severity)
  select a.id,p_kind,p_key,p_team,p_tournament,ctx->>'tournamentName',rule.title,rendered,ctx->>'contextUrl',
   case when p_kind in ('champion','registration-approved') then 'success' when p_kind in ('deadline','check-in') then 'warning' else 'info' end
  from aevic_platform.accounts a left join aevic_platform.notification_preferences pref on pref.user_id=a.id
  where (p_account is null or a.id=p_account)
   and (p_team is null or exists(select 1 from aevic_platform.team_authority auth where auth.account_id=a.id and auth.team_id=p_team
    and (p_kind not in ('check-in','deadline') or auth.role in ('OWNER','CAPTAIN','MANAGER','CO_CAPTAIN'))))
   and (p_account is not null or p_team is not null)
   and pref.preferences->'channels'->'in-app' is distinct from 'false'::jsonb
   and pref.preferences->'events'->preference is distinct from 'false'::jsonb
  on conflict do nothing;
 end if;
 if rule.email and p_kind in ('welcome','champion') then
  insert into aevic_platform.communication_email(kind,event_key,account_id,team_id,tournament_id,title,body,href)
  select p_kind,p_key,a.id,p_team,p_tournament,rule.title,rendered,ctx->>'contextUrl'
  from aevic_platform.accounts a left join aevic_platform.team_details d on d.team_id=a.original_team_id
  left join aevic_platform.notification_preferences pref on pref.user_id=a.id
  where coalesce(a.email_verified_at,d.email_verified_at) is not null and
   ((p_kind='welcome' and a.id=p_account) or (p_kind='champion' and exists(
    select 1 from aevic_platform.team_authority auth where auth.account_id=a.id and auth.team_id=p_team and auth.role in ('OWNER','CAPTAIN'))
    and pref.preferences->'channels'->'email' is distinct from 'false'::jsonb and pref.preferences->'events'->'results' is distinct from 'false'::jsonb))
  on conflict(kind,event_key,account_id) do update set status='pending',next_attempt_at=now(),updated_at=now()
   where excluded.kind='champion' and aevic_platform.communication_email.status='skipped';
 end if;
end $$;
alter table aevic_platform.communication_rules enable row level security;
alter table aevic_platform.communication_email enable row level security;
alter table aevic_platform.communication_email_attempts enable row level security;
alter table aevic_platform.communication_timers enable row level security;
revoke all on aevic_platform.communication_rules,aevic_platform.communication_email,aevic_platform.communication_timers,aevic_platform.communication_email_attempts from public, anon, authenticated;
-- Explicit capability role only. Grant membership to the reviewed gateway login separately.
grant usage on schema aevic_platform to aevic_communications_backend;
grant select,update on aevic_platform.communication_rules to aevic_communications_backend;
grant select,insert,update on aevic_platform.communication_email to aevic_communications_backend;
grant select,insert on aevic_platform.communication_email_attempts to aevic_communications_backend;
grant select,insert,update,delete on aevic_platform.communication_timers to aevic_communications_backend;
revoke execute on function aevic_platform.emit_communication(text,text,bigint,bigint,uuid,jsonb),
 aevic_platform.communication_text(text,jsonb) from public,anon,authenticated;
grant execute on function aevic_platform.emit_communication(text,text,bigint,bigint,uuid,jsonb),
 aevic_platform.communication_text(text,jsonb) to aevic_communications_backend;
create policy trusted_communications on aevic_platform.communication_rules to aevic_communications_backend using(true) with check(true);
create policy trusted_communications on aevic_platform.communication_email to aevic_communications_backend using(true) with check(true);
create policy trusted_communications on aevic_platform.communication_email_attempts to aevic_communications_backend using(true) with check(true);
create policy trusted_communications on aevic_platform.communication_timers to aevic_communications_backend using(true) with check(true);
commit;
