\set ON_ERROR_STOP on
begin;
do $$ begin
 if has_function_privilege('anon','aevic.rate_limit(text,integer,integer)','EXECUTE') or has_function_privilege('authenticated','aevic.rate_limit(text,integer,integer)','EXECUTE') then raise exception 'FAIL service-only rate limit privilege';end if;
 if not has_function_privilege('service_role','aevic.rate_limit(text,integer,integer)','EXECUTE') then raise exception 'FAIL service rate limit unavailable';end if;
 if has_function_privilege('anon','aevic_private.notify_team(uuid,text,text,text)','EXECUTE') then raise exception 'FAIL public notification helper';end if;
end $$;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000001','integration-owner@example.test',now()),('00000000-0000-4000-8000-000000000002','integration-admin@example.test',now());
insert into aevic.admin_roles(user_id,role) values('00000000-0000-4000-8000-000000000002','super-admin');
insert into aevic.teams(id,name,slug,approval_status) values('20000000-0000-4000-8000-000000000001','Integration One','integration-one','approved'),('20000000-0000-4000-8000-000000000002','Integration Two','integration-two','approved');
insert into aevic.team_members(team_id,user_id,role) values('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','OWNER');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from aevic.team_contacts())<>1 then raise exception 'FAIL owner contacts';end if;
 begin perform aevic.edit_tournament('10000000-0000-4000-8000-000000000001','{}');raise exception 'FAIL owner tournament edit';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ declare oid uuid; begin
 oid=(aevic.identity_command('org.create','{"name":"Integration Organization","shortName":"ORG","country":"AZ","description":"Persisted description"}')->>'id')::uuid;
 if (select description from aevic.organizations where id=oid)<>'Persisted description' then raise exception 'FAIL organization description persistence';end if;
 begin perform aevic.identity_command('org.create','{"name":"Invalid","shortName":"ORG","country":"AZ","description":42}');raise exception 'FAIL organization description validation';exception when invalid_parameter_value then null;end;
end $$;
do $$ declare tid uuid; t aevic.tournaments; payload jsonb; m uuid;begin
 tid=(aevic.command('tournament.create',jsonb_build_object('name','Integration Cup','shortName','Cup','description','Test only','startsAt',now()+interval '3 days','endsAt',now()+interval '4 days','registrationOpensAt',now()-interval '1 day','registrationDeadline',now()+interval '1 day','checkInOpensAt',now()+interval '2 days','checkInClosesAt',now()+interval '2 days 1 hour','maxSlots',20,'rules',jsonb_build_array('Test rule'),'rounds',jsonb_build_array(jsonb_build_object('map','Erangel','startsAt',now()+interval '3 days'))))->>'id')::uuid;
 select * into t from aevic.tournaments where id=tid;
 select id into m from aevic.matches where tournament_id=tid;
 payload=jsonb_build_object('name','Edited Cup','shortName','Edited','description','Persisted','status','published','expectedUpdatedAt',t.updated_at,'startsAt',t.starts_at,'endsAt',t.ends_at,'registrationOpensAt',t.registration_opens_at,'registrationDeadline',t.registration_deadline,'checkInOpensAt',t.check_in_opens_at,'checkInClosesAt',t.check_in_closes_at,'maxSlots',20,'rules',jsonb_build_array('Edited rule'),'rounds',jsonb_build_array(jsonb_build_object('id',m,'map','Rondo','startsAt',t.starts_at)));
 perform aevic.edit_tournament(tid,payload);
 if (select name from aevic.tournaments where id=tid)<>'Edited Cup' or (select map from aevic.matches where id=m)<>'Rondo' then raise exception 'FAIL tournament edit persistence';end if;
 if not exists(select 1 from aevic.audit_events where entity_id=tid and action='tournament.update') then raise exception 'FAIL tournament audit';end if;
 begin perform aevic.edit_tournament(tid,payload||jsonb_build_object('expectedUpdatedAt',t.updated_at-interval '1 second'));raise exception 'FAIL stale edit';exception when serialization_failure then null;end;
 begin perform aevic.edit_tournament(tid,payload||'{"status":"completed"}');raise exception 'FAIL manual official completion';exception when invalid_parameter_value then null;end;
end $$;
reset role;
-- Fixture insertion is confined to this disposable transaction.
insert into aevic.tournament_registrations(tournament_id,team_id,status,roster_lock_at) select c.id,t.id,'confirmed',c.registration_deadline from aevic.tournaments c cross join aevic.teams t;
insert into aevic.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points,published)
select m.id,m.tournament_id,t.id,row_number() over(order by t.id),0,0,0,true from aevic.matches m cross join aevic.teams t;
do $$ begin
 begin update aevic.team_match_results set placement=1 where team_id='20000000-0000-4000-8000-000000000002';raise exception 'FAIL duplicate published placement';exception when unique_violation then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ declare t aevic.tournaments; m aevic.matches; payload jsonb;begin
 select * into t from aevic.tournaments limit 1;select * into m from aevic.matches limit 1;
 payload=jsonb_build_object('name',t.name,'shortName',t.short_name,'status',t.status,'expectedUpdatedAt',t.updated_at,'startsAt',t.starts_at,'endsAt',t.ends_at,'registrationOpensAt',t.registration_opens_at,'registrationDeadline',t.registration_deadline,'checkInOpensAt',t.check_in_opens_at,'checkInClosesAt',t.check_in_closes_at,'maxSlots',20,'rules','[]'::jsonb,'rounds',jsonb_build_array(jsonb_build_object('id',m.id,'map','Miramar','startsAt',m.scheduled_at)));
 begin perform aevic.edit_tournament(t.id,payload);raise exception 'FAIL editing schedule with results';exception when invalid_parameter_value then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from aevic.team_contacts();raise exception 'FAIL public contacts';exception when insufficient_privilege then null;end;
 begin perform aevic.edit_tournament('10000000-0000-4000-8000-000000000001','{}');raise exception 'FAIL public tournament edit';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: organization description persistence/validation, tournament persistence, authorization, stale versions, schedule locks, audit, contact isolation, published placement integrity' as result;
