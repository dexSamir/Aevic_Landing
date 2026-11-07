alter table aevic_platform.admin_accounts add column display_alias text
 check (display_alias is null or length(display_alias) between 2 and 32);
create unique index admin_active_alias on aevic_platform.admin_accounts(lower(display_alias))
 where active and display_alias is not null;

-- NULL distinguishes historical announcements whose recipients were never recorded.
alter table aevic_platform.messages add column sender_alias text,
 add column recipient_count integer check (recipient_count > 0),
 add column delivery_count integer check (delivery_count >= 0),
 add column recipient_name text;

create table aevic_platform.message_teams (
 message_id uuid not null references aevic_platform.messages(id),
 team_id bigint not null references public.teams(id),
 primary key (message_id, team_id)
);
create index message_teams_inbox on aevic_platform.message_teams(team_id,message_id);
alter table aevic_platform.message_teams enable row level security;
revoke all on aevic_platform.message_teams from public, anon, authenticated;

alter table aevic_platform.notifications add column message_id uuid,
 add column message_team_id bigint,
 add foreign key (message_id,message_team_id) references aevic_platform.message_teams,
 add check (message_id is null or message_team_id is not null);

-- The old sender wrote both rows in one transaction. Retain personal read
-- timestamps while binding those identifiable private notifications to their team.
update aevic_platform.notifications n set message_team_id=m.team_id
 from aevic_platform.messages m
 where n.event_type='admin-message' and m.team_id is not null
 and n.created_at=m.created_at and n.title=m.title and n.body=m.body;
create unique index notification_message_account on aevic_platform.notifications(message_id,message_team_id,recipient_id)
 where message_id is not null;


-- Mirror the gateway's existing message access on the recipient ledger.
do $$ declare gateway record; begin
 for gateway in select grantee from information_schema.role_table_grants
  where table_schema='aevic_platform' and table_name='messages' and privilege_type='INSERT'
   and grantee not in ('PUBLIC','anon','authenticated')
 loop
  execute format('grant select,insert on aevic_platform.message_teams to %I',gateway.grantee);
 end loop;
end $$;
