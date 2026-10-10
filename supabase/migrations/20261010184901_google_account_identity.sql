-- Prepared for explicit rollout only. No changes to existing identities or session mode.
begin;
create table aevic_platform.google_identities (
 subject text primary key check(length(subject) between 1 and 255),
 account_id bigint not null unique references aevic_platform.accounts(id),
 created_at timestamptz not null default now()
);
create table aevic_platform.google_flows (
 token_digest text primary key check(token_digest ~ '^[a-f0-9]{64}$'),
 browser_digest text not null unique check(browser_digest ~ '^[a-f0-9]{64}$'),
 nonce text not null,
 verifier text not null,
 expires_at timestamptz not null,
 phase text not null default 'authorization' check(phase in ('authorization','continuation','consumed')),
 subject text,
 email text,
 first_name text,
 last_name text,
 check(phase='authorization' or (subject is not null and email is not null))
);
create index google_flows_expiry on aevic_platform.google_flows(expires_at);
alter table aevic_platform.google_identities enable row level security;
alter table aevic_platform.google_flows enable row level security;
revoke all on aevic_platform.google_identities,aevic_platform.google_flows from public,anon,authenticated;
-- Deliberately no browser-facing policies: access is through the existing server DB role.
do $$ declare r record; begin
 for r in select grantee from information_schema.role_table_grants
 where table_schema='aevic_platform' and table_name='sessions' and privilege_type='INSERT'
 and grantee not in ('PUBLIC','anon','authenticated') loop
 execute format('grant select,insert,update,delete on aevic_platform.google_identities,aevic_platform.google_flows to %I',r.grantee);
 end loop;
end $$;
commit;
