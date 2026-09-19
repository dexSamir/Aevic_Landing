\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','owner@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','outsider@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','admin@example.test',now()),
 ('00000000-0000-4000-8000-000000000004','player@example.test',now());
insert into aevic.admin_roles(user_id,role) values('00000000-0000-4000-8000-000000000003','super-admin');
insert into aevic.teams(id,name,slug,approval_status) values('20000000-0000-4000-8000-000000000001','Test Team','test-team','approved'),('20000000-0000-4000-8000-000000000002','Hidden Team','hidden-team','pending');
insert into aevic.team_members(team_id,user_id,role) values('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','OWNER'),('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','PLAYER');
insert into aevic.players(id,ign,slug) select ('30000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'Player '||i,'player-'||i from generate_series(1,5) i;
insert into aevic.player_identities(player_id,pubg_id) select id,'10000'||right(slug,1) from aevic.players;
insert into aevic.team_players(team_id,player_id,role) select '20000000-0000-4000-8000-000000000001',id,case when right(slug,1)='1' then 'captain' when right(slug,1)='5' then 'substitute' else 'starter' end from aevic.players;
insert into aevic.tournaments(id,slug,name,short_name,status,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots) values('10000000-0000-4000-8000-000000000001','test','Test','Test','registration-open',now()+interval '1 day',now()+interval '2 days',now()-interval '1 day',now()+interval '1 hour',now()+interval '2 hours',now()+interval '3 hours',20);
insert into aevic.matches(id,tournament_id,round,map,scheduled_at,room_release_at) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'Erangel',now()+interval '1 day',now()+interval '10 minutes');
insert into aevic.match_rooms(match_id,room_id,password) values('40000000-0000-4000-8000-000000000001','fixture-room','fixture-password');
insert into aevic.notifications(recipient_id,title,body) values('00000000-0000-4000-8000-000000000001','Private','Private notification');

set local role anon;
do $$ begin
 if (select count(*) from aevic.teams)<>1 then raise exception 'FAIL anonymous team visibility';end if;
 if (select count(*) from aevic.players)<>5 then raise exception 'FAIL public player names';end if;
 if (select count(*) from aevic.team_players)<>5 then raise exception 'FAIL public roster';end if;
 begin perform * from aevic.profiles;raise exception 'FAIL anonymous profile';exception when insufficient_privilege then null;end;
 begin perform * from aevic.match_rooms;raise exception 'FAIL anonymous room';exception when insufficient_privilege then null;end;
 begin perform aevic.command('team.update','{}');raise exception 'FAIL anonymous mutation';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from aevic.match_rooms) then raise exception 'FAIL unrelated room';end if;
 if exists(select 1 from aevic.notifications) then raise exception 'FAIL unrelated inbox';end if;
 if exists(select 1 from aevic.player_identities) then raise exception 'FAIL unrelated PUBG IDs';end if;
 if (select count(*) from aevic.profiles)<>1 then raise exception 'FAIL profile isolation';end if;
 begin perform aevic.command('team.update','{"teamId":"20000000-0000-4000-8000-000000000001","name":"Stolen"}');raise exception 'FAIL IDOR edit';exception when insufficient_privilege then null;end;
 begin perform aevic.command('checkin','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001"}');raise exception 'FAIL IDOR checkin';exception when insufficient_privilege then null;end;
 begin perform aevic.command('room','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001","id":"40000000-0000-4000-8000-000000000001"}');raise exception 'FAIL IDOR room';exception when insufficient_privilege then null;end;
 begin perform aevic.command('dispute.submit','{"teamId":"20000000-0000-4000-8000-000000000001"}');raise exception 'FAIL IDOR dispute';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select aevic.command('team.update','{"teamId":"20000000-0000-4000-8000-000000000001","name":"Updated Team","description":"Real persistence","tag":"TEST","country":"AZ"}');
select aevic.command('tournament.join','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001"}');
do $$ begin
 if not exists(select 1 from aevic.teams where name='Updated Team') then raise exception 'FAIL owner persistence';end if;
 begin perform aevic.command('tournament.join','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001"}');raise exception 'FAIL duplicate registration';exception when unique_violation then null;end;
 begin update aevic.teams set approval_status='approved';raise exception 'FAIL direct mutation';exception when insufficient_privilege then null;end;
 begin perform aevic.command('result.save','{}');raise exception 'FAIL team official results';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select aevic.command('registration.review','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001","status":"confirmed"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform aevic.command('checkin','{"tournamentId":"10000000-0000-4000-8000-000000000001"}');raise exception 'FAIL early checkin';exception when invalid_parameter_value then null;end;
end $$;
reset role;
update aevic.tournaments set check_in_opens_at=now()-interval '1 hour',check_in_closes_at=now()+interval '1 hour';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select aevic.command('checkin','{"tournamentId":"10000000-0000-4000-8000-000000000001"}');
select aevic.command('checkin','{"tournamentId":"10000000-0000-4000-8000-000000000001"}');
do $$ declare room jsonb; begin
 if (select count(*) from aevic.check_ins)<>1 then raise exception 'FAIL duplicate checkin';end if;
 if exists(select 1 from aevic.match_rooms) then raise exception 'FAIL direct team room table';end if;
 room=aevic.command('room','{"tournamentId":"10000000-0000-4000-8000-000000000001","id":"40000000-0000-4000-8000-000000000001"}');
 if room ? 'password' or room->>'status'<>'locked' then raise exception 'FAIL premature credential release';end if;
end $$;
reset role;
update aevic.matches set room_release_at=now()-interval '1 minute';
update aevic.tournaments set check_in_opens_at=now()-interval '2 hours',check_in_closes_at=now()-interval '1 hour';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ declare room jsonb; begin
 begin perform aevic.command('checkin','{"tournamentId":"10000000-0000-4000-8000-000000000001"}');raise exception 'FAIL late checkin';exception when invalid_parameter_value then null;end;
 room=aevic.command('room','{"tournamentId":"10000000-0000-4000-8000-000000000001","id":"40000000-0000-4000-8000-000000000001"}');
 if room->>'status'<>'released' or not(room ? 'password') then raise exception 'FAIL eligible release';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select aevic.command('result.save','{"tournamentId":"10000000-0000-4000-8000-000000000001","teamId":"20000000-0000-4000-8000-000000000001","roundId":"40000000-0000-4000-8000-000000000001","placement":1,"finishes":8,"penalties":0,"placementPoints":999,"finishPoints":999,"totalPoints":999,"published":false}');
select aevic.command('match.publish','{"id":"40000000-0000-4000-8000-000000000001"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select total_points from aevic.team_match_results limit 1)<>18 then raise exception 'FAIL server authoritative scoring';end if;
end $$;
select aevic.command('dispute.submit','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001","matchId":"40000000-0000-4000-8000-000000000001","issueType":"kills","description":"Please check the official kills for this match.","deadlineAt":"2099-01-01"}');
reset role;
update aevic.matches set dispute_deadline_at=now()-interval '1 minute';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform aevic.command('dispute.submit','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000001","matchId":"40000000-0000-4000-8000-000000000001","issueType":"placement","description":"Please check the official placement for this match.","deadlineAt":"2099-01-01"}');raise exception 'FAIL client forged deadline';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin perform aevic.command('team.transfer','{"teamId":"20000000-0000-4000-8000-000000000001"}');raise exception 'FAIL player ownership transfer';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- A valid roster cannot join after registration closes.
insert into aevic.tournaments(id,slug,name,short_name,status,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots) values('10000000-0000-4000-8000-000000000002','closed','Closed','Closed','registration-open',now()+interval '1 day',now()+interval '2 days',now()-interval '2 days',now()-interval '1 day',now()+interval '2 hours',now()+interval '3 hours',20);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform aevic.command('tournament.join','{"teamId":"20000000-0000-4000-8000-000000000001","tournamentId":"10000000-0000-4000-8000-000000000002"}');raise exception 'FAIL closed registration';exception when invalid_parameter_value then null;end;
end $$;
reset role;
-- Regressions for direct PostgREST calls that bypass Hono validation.
set local role anon;
do $$ begin
 begin perform rejection_reason from aevic.teams;raise exception 'FAIL public team review text';exception when insufficient_privilege then null;end;
 begin perform reason from aevic.tournament_registrations;raise exception 'FAIL public registration review text';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ declare mid uuid; begin
 select id into mid from aevic.team_members where user_id='00000000-0000-4000-8000-000000000004';
 begin perform aevic.command('team.transfer',jsonb_build_object('teamId','20000000-0000-4000-8000-000000000001','memberId',mid));raise exception 'FAIL missing ownership confirmation';exception when invalid_parameter_value then null;end;
 begin perform aevic.command('roster.submit','{"teamId":"20000000-0000-4000-8000-000000000001","outgoing":{"id":"30000000-0000-4000-8000-000000000001"},"incoming":{"ign":"New starter","uid":"99887766","role":"starter"},"reason":"Cannot remove the only captain"}');raise exception 'FAIL roster captain removal';exception when insufficient_privilege then null;end;
 begin perform aevic.identity_command('badges.featured','{"teamId":"20000000-0000-4000-8000-000000000001"}');raise exception 'FAIL missing badge selection';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ declare rid uuid;begin
 select id into rid from aevic.team_match_results limit 1;
 begin perform aevic.command('result.correct',jsonb_build_object('id',rid,'tournamentId','10000000-0000-4000-8000-000000000001','teamId','20000000-0000-4000-8000-000000000001','roundId','40000000-0000-4000-8000-000000000001','placement',1,'finishes',9,'penalties',0,'reason','Missing expected version'));raise exception 'FAIL missing correction version';exception when unique_violation then null;end;
end $$;
reset role;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000005','results@example.test',now());
insert into aevic.admin_roles values('00000000-0000-4000-8000-000000000005','result-operator',now());
update aevic.teams set rejection_reason='Private review note';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin
 if (select count(*) from aevic.admin_roles)<>1 then raise exception 'FAIL admin directory role isolation';end if;
 if exists(select 1 from aevic.match_rooms) then raise exception 'FAIL result operator room secret access';end if;
 if exists(select 1 from aevic.notifications) then raise exception 'FAIL result operator private inbox';end if;
 if exists(select 1 from aevic.team_review_reasons()) then raise exception 'FAIL result operator review notes';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from aevic.team_review_reasons())<>1 then raise exception 'FAIL owner review note isolation';end if;
end $$;
reset role;

-- Every product table must have RLS; unprivileged roles have no direct mutation grants.
do $$ begin
 if exists(select 1 from pg_tables where schemaname='aevic' and not rowsecurity) then raise exception 'FAIL RLS coverage';end if;
 if exists(select 1 from information_schema.role_table_grants where table_schema='aevic' and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE')) then raise exception 'FAIL direct write grant';end if;
end $$;
rollback;
select 'PASS: public visibility, private identity, role isolation, owner edit, registration, check-in windows, room release, official scoring, disputes, RLS coverage' as result;
