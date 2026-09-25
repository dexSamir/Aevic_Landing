\set ON_ERROR_STOP on
begin;
insert into public.teams(team_name,captain_name,captain_contact,email,password_hash,player1_ign,player2_ign,player3_ign,player4_ign)
values('Isolated One','Test','000000','one@example.invalid','isolated-hash','One','Two','Three','Four');
insert into aevic_platform.team_details(team_id,description) select id,'isolated details' from public.teams;
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='aevic_platform' loop
  if has_table_privilege('anon','aevic_platform.'||quote_ident(t.tablename),'select') or has_table_privilege('authenticated','aevic_platform.'||quote_ident(t.tablename),'select') then raise exception 'Private table grants leaked: %',t.tablename;end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='aevic_platform' and c.relname=t.tablename and c.relrowsecurity) then raise exception 'RLS missing: %',t.tablename;end if;
 end loop;
 if has_table_privilege('anon','aevic_platform.account_identity','select') or has_table_privilege('authenticated','aevic_platform.account_identity','select') then raise exception 'Credential view exposed';end if;
 if has_schema_privilege('anon','aevic_platform','usage') or has_schema_privilege('authenticated','aevic_platform','usage') then raise exception 'Private schema exposed';end if;
 if(select count(*) from public.teams)<>1 then raise exception 'Original team changed';end if;
end $$;
rollback;
