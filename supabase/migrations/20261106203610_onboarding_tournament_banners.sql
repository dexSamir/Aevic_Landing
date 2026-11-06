-- Private gateway-owned state. No existing account is enrolled automatically.
create table aevic_platform.account_onboarding (
 account_id bigint primary key references aevic_platform.accounts(id) on delete restrict,
 purpose text check(purpose in ('spectator','team')),
 draft jsonb not null default '{}' check(jsonb_typeof(draft)='object' and octet_length(draft::text)<=20000),
 team_id bigint references public.teams(id) on delete restrict,
 completed_at timestamptz, revision integer not null default 0 check(revision>=0),
 updated_at timestamptz not null default now(),
 check(team_id is null or (purpose='team' and completed_at is not null))
);
alter table aevic_platform.account_onboarding enable row level security;
revoke all on aevic_platform.account_onboarding from public,anon,authenticated;
create index account_onboarding_team on aevic_platform.account_onboarding(team_id) where team_id is not null;

-- Immutable optimized image bytes use the existing authorized BFF media approach.
-- Staged banners are private until attached to a public tournament.
create table aevic_platform.tournament_banners (
 id uuid primary key default gen_random_uuid(),
 uploaded_by uuid not null references aevic_platform.admin_accounts(id) on delete restrict,
 file_name text not null check(length(file_name)<=200),
 bytes bytea not null check(octet_length(bytes)>0 and octet_length(bytes)<=4000000),
 created_at timestamptz not null default now()
);
alter table aevic_platform.tournament_banners enable row level security;
revoke all on aevic_platform.tournament_banners from public,anon,authenticated;
create index tournament_banners_uploader on aevic_platform.tournament_banners(uploaded_by);
alter table aevic.tournaments add column banner_media_id uuid references aevic_platform.tournament_banners(id) on delete restrict;
create index tournaments_banner_media on aevic.tournaments(banner_media_id) where banner_media_id is not null;
