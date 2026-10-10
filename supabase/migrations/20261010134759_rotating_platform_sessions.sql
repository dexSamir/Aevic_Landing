-- Additive, feature-flagged session v2. Apply before enabling AEVIC_SESSION_MODE.
alter table aevic_platform.sessions
 add column protocol smallint not null default 1 check(protocol in (1,2)),
 add column credential_digest text,
 add column idle_expires_at timestamptz,
 add column remember boolean not null default false,
 add constraint token_session_complete check(protocol=1 or (credential_digest is not null and idle_expires_at is not null));
create table aevic_platform.refresh_tokens (
 token_digest text primary key check(token_digest ~ '^[a-f0-9]{64}$'),
 session_id uuid not null references aevic_platform.sessions(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 consumed_at timestamptz
);
create index refresh_tokens_family on aevic_platform.refresh_tokens(session_id);
alter table aevic_platform.refresh_tokens enable row level security;
revoke all on aevic_platform.refresh_tokens from public,anon,authenticated;
-- Match existing server roles only, without widening anonymous/Data API access.
do $$ declare r record; begin
 for r in select grantee from information_schema.role_table_grants where table_schema='aevic_platform' and table_name='sessions' and privilege_type='INSERT' and grantee not in ('PUBLIC','anon','authenticated') loop
 execute format('grant select,insert,update,delete on aevic_platform.refresh_tokens to %I',r.grantee);
 end loop;
end $$;
-- Shared across warm functions and deploys; opaque keys contain no email/IP.
create table aevic_platform.authentication_limits (
 key text primary key,
 hits integer not null,
 window_at timestamptz not null default clock_timestamp()
);
create index authentication_limits_expiry on aevic_platform.authentication_limits(window_at);
alter table aevic_platform.authentication_limits enable row level security;
revoke all on aevic_platform.authentication_limits from public,anon,authenticated;
do $$ declare r record; begin
 for r in select grantee from information_schema.role_table_grants where table_schema='aevic_platform' and table_name='sessions' and privilege_type='INSERT' and grantee not in ('PUBLIC','anon','authenticated') loop
 execute format('grant select,insert,update,delete on aevic_platform.authentication_limits to %I',r.grantee);
 end loop;
end $$;
