begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table aevic_platform.notifications
  add column important boolean not null default false;

commit;
