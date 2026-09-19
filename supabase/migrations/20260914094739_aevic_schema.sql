-- Isolated from any legacy public.teams deployment. PostgreSQL 15+.
create schema aevic;
create schema aevic_private;
revoke all on schema aevic_private from public;
grant usage on schema aevic to anon, authenticated, service_role;
grant usage on schema aevic_private to authenticated, service_role;
alter default privileges in schema aevic revoke execute on functions from public;
alter default privileges in schema aevic_private revoke execute on functions from public;

create table aevic.profiles (
 id uuid primary key references auth.users on delete cascade,
 first_name text not null default '' check(length(first_name)<=80), last_name text not null default '' check(length(last_name)<=80),
 phone text check(length(phone)<=30), avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table aevic.admin_roles (
 user_id uuid primary key references auth.users on delete cascade,
 role text not null check(role in ('super-admin','tournament-manager','result-operator','support-moderator')),
 created_at timestamptz not null default now()
);
create table aevic.teams (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 60),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,100}$'), tag text check(length(tag)<=12),
 logo_url text, banner_url text, banner_alt text check(length(banner_alt)<=200), description text not null default '' check(length(description)<=3000),
 country text check(length(country)<=80), founded_at date, game_key text not null default 'pubg-mobile' check(game_key='pubg-mobile'),
 approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','banned')),
 rejection_reason text, verification_level text not null default 'registered' check(verification_level in ('registered','approved','verified','legacy')),
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index teams_name_unique on aevic.teams(lower(trim(name)));
create index teams_public on aevic.teams(approval_status,created_at desc) where archived_at is null;
create table aevic.team_members (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams on delete cascade,
 user_id uuid not null references auth.users on delete restrict,
 role text not null check(role in ('OWNER','CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE')),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','SUSPENDED')), created_at timestamptz not null default now(),
 unique(team_id,user_id), unique(user_id)
);
create unique index team_one_owner on aevic.team_members(team_id) where role='OWNER';
create table aevic.players (
 id uuid primary key default gen_random_uuid(), ign text not null check(length(trim(ign)) between 2 and 40),
 slug text not null unique, created_at timestamptz not null default now()
);
create table aevic.player_identities (
 player_id uuid primary key references aevic.players on delete cascade,
 pubg_id text not null unique check(pubg_id ~ '^[0-9]{5,20}$')
);
create table aevic.team_players (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams on delete cascade,
 player_id uuid not null references aevic.players on delete restrict, role text not null check(role in ('captain','starter','substitute')),
 created_at timestamptz not null default now(), unique(player_id), unique(team_id,player_id)
);
create unique index team_roster_captain on aevic.team_players(team_id) where role='captain';
create table aevic.team_social_links (
 team_id uuid not null references aevic.teams on delete cascade,
 platform text not null check(platform in ('instagram','tiktok','youtube','x','linkedin','discord','twitch','website')),
 url text not null check(url ~ '^https://[^/@[:space:]]+([/?#]|$)' and length(url)<=500), primary key(team_id,platform)
);
create table aevic.tournaments (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null check(length(name) between 2 and 120), short_name text not null,
 description text not null default '', status text not null default 'draft' check(status in ('draft','published','registration-open','ongoing','completed','cancelled')),
 starts_at timestamptz not null, ends_at timestamptz not null, registration_opens_at timestamptz not null, registration_deadline timestamptz not null,
 check_in_opens_at timestamptz not null, check_in_closes_at timestamptz not null,
 max_slots integer not null check(max_slots between 1 and 100), days integer not null default 1 check(days>0), rounds_per_day integer not null default 4 check(rounds_per_day>0),
 map_rotation text[] not null default '{Erangel,Miramar,Rondo,Erangel}' check(map_rotation <@ array['Erangel','Miramar','Rondo'] and cardinality(map_rotation)>0),
 point_formula jsonb not null default '{"placement":[{"placement":1,"points":10},{"placement":2,"points":6},{"placement":3,"points":5},{"placement":4,"points":4},{"placement":5,"points":3},{"placement":6,"points":2},{"placement":7,"points":1},{"placement":8,"points":1}],"finishPointValue":1,"wwcdBonus":0,"defaultPenalty":0,"tieBreakRules":["totalPoints","wwcd","finishes","bestFinish"]}',
 rules text[] not null default '{}', featured boolean not null default false, dispute_duration_minutes integer not null default 60 check(dispute_duration_minutes between 1 and 10080),
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at>starts_at), check(registration_deadline>registration_opens_at), check(check_in_closes_at>check_in_opens_at), check(registration_deadline<=starts_at), check(check_in_closes_at<=starts_at)
);
create index tournaments_status_start on aevic.tournaments(status,starts_at);
create table aevic.tournament_registrations (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references aevic.tournaments on delete restrict,
 team_id uuid not null references aevic.teams on delete restrict,
 status text not null default 'pending' check(status in ('pending','confirmed','waitlisted','withdrawn','rejected')),
 slot_number integer check(slot_number>0), roster_lock_at timestamptz not null, reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tournament_id,team_id), unique(tournament_id,slot_number)
);
create index registrations_team on aevic.tournament_registrations(team_id,created_at desc);
create table aevic.tournament_rosters (
 registration_id uuid not null references aevic.tournament_registrations on delete cascade,
 player_id uuid not null references aevic.players on delete restrict, ign text not null,
 role text not null check(role in ('captain','starter','substitute')), captured_at timestamptz not null default now(), primary key(registration_id,player_id)
);
create index tournament_rosters_player on aevic.tournament_rosters(player_id);
create table aevic.matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references aevic.tournaments on delete restrict,
 stage text not null default 'final' check(stage in ('qualifier','group','semifinal','final')), day integer not null default 1 check(day>0), round integer not null check(round>0),
 map text not null check(map in ('Erangel','Miramar','Rondo')), lobby text not null default 'A', scheduled_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','upcoming','live','completed')), room_release_at timestamptz not null,
 published_at timestamptz, dispute_deadline_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tournament_id,day,round,lobby), unique(id,tournament_id)
);
create index matches_tournament_schedule on aevic.matches(tournament_id,scheduled_at);
create index matches_schedule on aevic.matches(scheduled_at);
create table aevic.match_rooms (
 match_id uuid primary key references aevic.matches on delete cascade, room_id text not null check(length(room_id)<=100), password text not null check(length(password)<=200),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table aevic.check_ins (
 tournament_id uuid not null, team_id uuid not null, checked_in_by uuid not null references auth.users on delete restrict,
 checked_in_at timestamptz not null default now(), primary key(tournament_id,team_id),
 foreign key(tournament_id,team_id) references aevic.tournament_registrations(tournament_id,team_id) on delete cascade
);
create index check_ins_team on aevic.check_ins(team_id);
create table aevic.team_match_results (
 id uuid primary key default gen_random_uuid(), match_id uuid not null, tournament_id uuid not null, team_id uuid not null,
 placement integer not null check(placement between 1 and 100), finishes integer not null check(finishes between 0 and 400),
 placement_points numeric not null check(placement_points>=0), finish_points numeric not null check(finish_points>=0), penalties numeric not null default 0 check(penalties>=0),
 total_points numeric generated always as (placement_points+finish_points-penalties) stored,
 notes text, published boolean not null default false, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(match_id,team_id), unique(match_id,placement),
 foreign key(match_id,tournament_id) references aevic.matches(id,tournament_id) on delete restrict,
 foreign key(tournament_id,team_id) references aevic.tournament_registrations(tournament_id,team_id) on delete restrict
);
create index results_team on aevic.team_match_results(team_id,tournament_id);
create index results_tournament on aevic.team_match_results(tournament_id) where published;
create table aevic.result_versions (
 id uuid primary key default gen_random_uuid(), result_id uuid not null references aevic.team_match_results on delete restrict,
 version integer not null, data_snapshot jsonb not null, reason text not null, created_by uuid not null references auth.users on delete restrict,
 created_at timestamptz not null default now(), unique(result_id,version)
);
create table aevic.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users on delete cascade,
 title text not null, body text not null, severity text not null default 'info' check(severity in ('info','success','warning','critical')),
 event_type text not null default 'system', action_href text check(action_href ~ '^/[^/]' and action_href !~ '[\\[:cntrl:]]'),
 read_at timestamptz, created_at timestamptz not null default now()
);
create index notifications_inbox on aevic.notifications(recipient_id,created_at desc,id);
create index notifications_unread on aevic.notifications(recipient_id) where read_at is null;
create table aevic.notification_preferences (
 user_id uuid primary key references auth.users on delete cascade,
 channels jsonb not null default '{"in-app":true,"email":false,"push":false}', events jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table aevic.messages (
 id uuid primary key default gen_random_uuid(), team_id uuid references aevic.teams on delete cascade,
 sender_id uuid not null references auth.users on delete restrict, title text not null check(length(title) between 1 and 200), body text not null check(length(body) between 1 and 10000),
 severity text not null default 'info' check(severity in ('info','success','warning','critical')),
 created_at timestamptz not null default now()
);
create index messages_team_time on aevic.messages(team_id,created_at desc);
create table aevic.disputes (
 id uuid primary key default gen_random_uuid(), team_id uuid not null, match_id uuid not null, tournament_id uuid not null,
 issue_type text not null check(issue_type in ('placement','kills','penalty','missing-result','other')),
 description text not null check(length(description) between 20 and 6000), status text not null default 'pending' check(status in ('pending','under-review','resolved','rejected')),
 deadline_at timestamptz not null, admin_note text, resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(team_id,match_id,issue_type), foreign key(match_id,tournament_id) references aevic.matches(id,tournament_id),
 foreign key(tournament_id,team_id) references aevic.tournament_registrations(tournament_id,team_id)
);
create index disputes_team_created on aevic.disputes(team_id,created_at desc);
create index disputes_match on aevic.disputes(match_id);
create table aevic.media (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams on delete cascade,
 uploaded_by uuid not null references auth.users on delete restrict, kind text not null check(kind in ('logo','banner','evidence')),
 bucket text not null, object_path text not null unique, file_name text not null, mime_type text not null, size_bytes integer not null check(size_bytes between 1 and 6000000),
 dispute_id uuid references aevic.disputes on delete restrict, created_at timestamptz not null default now()
);
create index media_team on aevic.media(team_id,kind);
create index media_dispute on aevic.media(dispute_id) where dispute_id is not null;
create table aevic.roster_change_requests (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams on delete restrict, tournament_id uuid references aevic.tournaments,
 outgoing_player_id uuid not null references aevic.players, incoming_ign text not null, incoming_pubg_id text not null check(incoming_pubg_id ~ '^[0-9]{5,20}$'),
 incoming_role text not null check(incoming_role in ('captain','starter','substitute')), reason text not null check(length(reason) between 10 and 3000),
 status text not null default 'pending' check(status in ('pending','under-review','approved','rejected')), admin_note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index roster_requests_team on aevic.roster_change_requests(team_id,created_at desc);
create table aevic.team_invitations (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams on delete cascade,
 recipient_email text not null, role text not null check(role in ('CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE')),
 status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),
 created_by uuid not null references auth.users, expires_at timestamptz not null default now()+interval '7 days', responded_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index invitations_pending on aevic.team_invitations(team_id,lower(recipient_email)) where status='PENDING';
create index invitations_recipient on aevic.team_invitations(lower(recipient_email),created_at desc);
create table aevic.membership_history (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references aevic.teams, user_id uuid not null references auth.users,
 role text not null, joined_at timestamptz not null, left_at timestamptz not null default now()
);
create table aevic.support_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 category text not null check(category in ('account','registration','roster','tournament','results','technical','other')), subject text not null check(length(subject) between 3 and 200),
 description text not null check(length(description) between 10 and 6000), status text not null default 'open' check(status in ('open','waiting-for-user','under-review','resolved','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support_user on aevic.support_tickets(user_id,created_at desc);
create table aevic.support_replies (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references aevic.support_tickets on delete cascade,
 author_id uuid not null references auth.users, author text not null check(author in ('user','support')), body text not null check(length(body) between 1 and 6000), created_at timestamptz not null default now()
);
create index replies_ticket on aevic.support_replies(ticket_id,created_at);
create table aevic.follows (
 user_id uuid not null references auth.users on delete cascade, team_id uuid not null references aevic.teams on delete cascade, created_at timestamptz not null default now(), primary key(user_id,team_id)
);
create table aevic.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users, action text not null, entity_type text not null, entity_id uuid,
 metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_created on aevic.audit_events(created_at desc);
create table aevic_private.idempotency (
 user_id uuid not null references auth.users on delete cascade, key text not null check(length(key) between 8 and 128), action text not null, payload jsonb not null, response jsonb not null,
 created_at timestamptz not null default now(), primary key(user_id,key)
);
create table aevic_private.rate_limits (
 key text primary key, hits integer not null, window_at timestamptz not null
);

create function aevic_private.is_admin(roles text[] default array['super-admin','tournament-manager','result-operator','support-moderator']) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from aevic.admin_roles where user_id=(select auth.uid()) and role=any(roles));
$$;
create function aevic_private.member_of(tid uuid, roles text[] default array['OWNER','CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE']) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from aevic.team_members m join aevic.teams t on t.id=m.team_id where m.user_id=(select auth.uid()) and m.team_id=tid and m.status='ACTIVE' and m.role=any(roles) and t.archived_at is null and t.approval_status<>'banned');
$$;
create function aevic_private.public_team(tid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from aevic.teams where id=tid and approval_status='approved' and archived_at is null);
$$;
grant usage on schema aevic_private to anon;
grant execute on function aevic_private.public_team(uuid) to anon,authenticated;
grant execute on function aevic_private.is_admin(text[]), aevic_private.member_of(uuid,text[]) to authenticated;

-- All writes use explicitly authorized transactional operations; direct Data API writes are denied.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='aevic' loop
  execute format('alter table aevic.%I enable row level security',t);
  execute format('grant select on aevic.%I to authenticated',t);
  execute format('grant all on aevic.%I to service_role',t);
  execute format('create policy admin_read on aevic.%I for select to authenticated using ((select aevic_private.is_admin()))',t);
 end loop;
end $$;
alter table aevic_private.idempotency enable row level security;
alter table aevic_private.rate_limits enable row level security;
create policy own_profile on aevic.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_memberships on aevic.team_members for select to authenticated using(user_id=(select auth.uid()) or aevic_private.member_of(team_id));
create policy visible_teams on aevic.teams for select to anon,authenticated using(approval_status='approved' and archived_at is null);
create policy private_team on aevic.teams for select to authenticated using(aevic_private.member_of(id));
create policy visible_players on aevic.players for select to anon,authenticated using(exists(select 1 from aevic.team_players r where r.player_id=aevic.players.id));
create policy visible_roster on aevic.team_players for select to anon,authenticated using(aevic_private.public_team(team_id));
create policy private_roster on aevic.team_players for select to authenticated using(aevic_private.member_of(team_id));
create policy private_pubg on aevic.player_identities for select to authenticated using(exists(select 1 from aevic.team_players r where r.player_id=aevic.player_identities.player_id and aevic_private.member_of(r.team_id)));
create policy public_social on aevic.team_social_links for select to anon,authenticated using(aevic_private.public_team(team_id));
create policy member_social on aevic.team_social_links for select to authenticated using(aevic_private.member_of(team_id));
create policy visible_tournaments on aevic.tournaments for select to anon,authenticated using(status<>'draft');
create policy visible_registrations on aevic.tournament_registrations for select to anon,authenticated using(status='confirmed' and exists(select 1 from aevic.tournaments t where t.id=tournament_id and t.status<>'draft'));
create policy own_registrations on aevic.tournament_registrations for select to authenticated using(aevic_private.member_of(team_id));
create policy visible_snapshots on aevic.tournament_rosters for select to anon,authenticated using(exists(select 1 from aevic.tournament_registrations r where r.id=registration_id));
create policy visible_matches on aevic.matches for select to anon,authenticated using(exists(select 1 from aevic.tournaments t where t.id=tournament_id and t.status<>'draft'));
create policy own_checkins on aevic.check_ins for select to authenticated using(aevic_private.member_of(team_id));
create policy official_results on aevic.team_match_results for select to anon,authenticated using(published and exists(select 1 from aevic.matches m where m.id=match_id and m.published_at is not null));
-- Credentials have NO public or team table policy. Only the release-aware RPC can read them.
create policy own_notifications on aevic.notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy own_preferences on aevic.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy team_messages on aevic.messages for select to authenticated using(team_id is null or aevic_private.member_of(team_id));
create policy team_disputes on aevic.disputes for select to authenticated using(aevic_private.member_of(team_id));
create policy team_media on aevic.media for select to authenticated using(aevic_private.member_of(team_id));
create policy roster_requests on aevic.roster_change_requests for select to authenticated using(aevic_private.member_of(team_id));
create policy own_invitations on aevic.team_invitations for select to authenticated using(aevic_private.member_of(team_id) or lower(recipient_email)=lower((select auth.jwt()->>'email')));
create policy own_history on aevic.membership_history for select to authenticated using(user_id=(select auth.uid()) or aevic_private.member_of(team_id));
create policy own_tickets on aevic.support_tickets for select to authenticated using(user_id=(select auth.uid()));
create policy own_replies on aevic.support_replies for select to authenticated using(exists(select 1 from aevic.support_tickets t where t.id=ticket_id));
create policy own_follows on aevic.follows for select to authenticated using(user_id=(select auth.uid()));
grant select on aevic.teams,aevic.players,aevic.team_players,aevic.team_social_links,aevic.tournaments,aevic.tournament_registrations,aevic.tournament_rosters,aevic.matches,aevic.team_match_results to anon;

create function aevic_private.touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 for t in select table_name from information_schema.columns where table_schema='aevic' and column_name='updated_at' loop
 execute format('create trigger touch_updated before update on aevic.%I for each row execute function aevic_private.touch()',t);
 end loop;
end $$;
