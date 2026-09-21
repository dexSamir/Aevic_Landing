-- Operator-only local rehearsal objects. NOT an application migration.
create table aevic_private.legacy_import_environment (
 singleton boolean primary key default true check(singleton), instance_id uuid not null,
 database_name text not null, environment text not null check(environment='local'), contract_hash text not null
);
create table aevic_private.legacy_import_map (
 source_ref text not null, source_table text not null check(source_table='public.teams'), source_key text not null,
 target_id uuid not null unique references aevic.teams(id), payload_hash text not null,
 created_at timestamptz not null default now(), primary key(source_ref,source_table,source_key)
);
alter table aevic_private.legacy_import_environment enable row level security;
alter table aevic_private.legacy_import_map enable row level security;
revoke all on aevic_private.legacy_import_environment,aevic_private.legacy_import_map from public,anon,authenticated,service_role;
