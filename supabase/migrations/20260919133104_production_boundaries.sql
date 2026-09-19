-- Harden direct API access without changing existing competition records.
-- Private review text must not be exposed by a public row's SELECT *.
revoke select on aevic.teams, aevic.tournament_registrations from anon, authenticated;
grant select (id,name,slug,tag,logo_url,banner_url,banner_alt,description,country,founded_at,game_key,approval_status,verification_level,archived_at,created_at,updated_at) on aevic.teams to anon, authenticated;
grant select (id,tournament_id,team_id,status,slot_number,roster_lock_at,created_at,updated_at) on aevic.tournament_registrations to anon, authenticated;
-- Registration rows also carry private review text. Use notifications and
-- scoped read polling for entry changes rather than publishing those rows.
alter publication supabase_realtime drop table aevic.tournament_registrations;
create function aevic.team_review_reasons() returns table(team_id uuid,reason text)
language sql stable security definer set search_path='' as $$
 select id,rejection_reason from aevic.teams where auth.uid() is not null
 and (aevic_private.member_of(id) or aevic_private.is_admin(array['super-admin','tournament-manager']));
$$;
grant execute on function aevic.team_review_reasons() to authenticated;

-- Reading an admin's own role is required to authorize each request. Private
-- contacts, inboxes, evidence and room secrets have separate role boundaries.
create policy own_admin_role on aevic.admin_roles for select to authenticated using(user_id=(select auth.uid()));
do $$ declare entry record; begin
 for entry in select * from (values
  ('admin_roles',array['super-admin']),('profiles',array['super-admin','support-moderator']),
  ('match_rooms',array['super-admin','tournament-manager']),
  ('player_identities',array['super-admin','tournament-manager']),
  ('notifications',array['super-admin']),('notification_preferences',array['super-admin']),
  ('follows',array['super-admin']),('media',array['super-admin','result-operator','support-moderator']),
  ('disputes',array['super-admin','result-operator','support-moderator']),
  ('support_tickets',array['super-admin','support-moderator']),('support_replies',array['super-admin','support-moderator']),
  ('account_requests',array['super-admin','support-moderator']),('player_claims',array['super-admin','support-moderator'])
 ) as limits(tab,roles) loop
  execute format('drop policy admin_read on aevic.%I',entry.tab);
  execute format('create policy admin_read on aevic.%I for select to authenticated using ((select aevic_private.is_admin(%L::text[])))',entry.tab,entry.roles);
 end loop;
end $$;
-- Validation of direct Data API writes is mandatory even when Hono also validates.
alter table aevic.team_match_results add constraint result_bounds check(penalties<=1000 and version>0);
alter table aevic.team_invitations add constraint invitation_recipient_shape check(length(recipient_email) between 3 and 254 and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$');
alter table aevic.organization_invitations add constraint org_invitation_recipient_shape check(recipient_email is null or (length(recipient_email) between 3 and 254 and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'));
alter table aevic.organizations add constraint organization_country_size check(length(country)<=80);
alter table aevic.roster_change_requests add constraint incoming_ign_size check(length(trim(incoming_ign)) between 2 and 40);
-- Storage accepts only the re-encoded format produced by the API.
update storage.buckets set allowed_mime_types=array['image/webp'],file_size_limit=4000000 where id in ('team-logos','team-banners','dispute-evidence');

create or replace function aevic_private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=new.raw_user_meta_data->'teamDraft'; tid uuid; pid uuid; p jsonb; n integer;
begin
 insert into aevic.profiles(id,first_name,last_name,phone) values(new.id,coalesce(d->>'firstName',''),coalesce(d->>'lastName',''),d->>'phone');
 if d is null then return new; end if;
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'players') is distinct from 'array'
   or nullif(trim(d->>'teamName'),'') is null or nullif(trim(d->>'firstName'),'') is null
   or nullif(trim(d->>'lastName'),'') is null or length(coalesce(d->>'tag','')) not between 2 and 12 then
  raise sqlstate '22023' using message='INVALID_REGISTRATION';
 end if;
 if jsonb_array_length(d->'players')<>5 or (select count(*) from jsonb_array_elements(d->'players') p where p->>'role'='substitute')<>1 or (select count(*) from jsonb_array_elements(d->'players') p where p->>'role'='captain')<>1 or (select count(*) from jsonb_array_elements(d->'players') p where p->>'role'='starter')<>3 then raise exception 'ROSTER_INCOMPLETE'; end if;
 tid=gen_random_uuid();
 insert into aevic.teams(id,name,slug,tag) values(tid,trim(d->>'teamName'),'team-'||tid,d->>'tag');
 insert into aevic.team_members(team_id,user_id,role) values(tid,new.id,'OWNER');
 for p in select value from jsonb_array_elements(d->'players') loop
  pid=gen_random_uuid();
  insert into aevic.players(id,ign,slug) values(pid,trim(p->>'ign'),'player-'||pid);
  insert into aevic.player_identities(player_id,pubg_id) values(pid,p->>'uid');
  insert into aevic.team_players(team_id,player_id,role) values(tid,pid,p->>'role');
 end loop;
 insert into aevic.notifications(recipient_id,title,body,action_href) values(new.id,'Komanda qeydiyyatı alındı','Emailinizi təsdiqləyin. Komanda təsdiqi gözlənilir.','/team');
 return new;
end $$;

create or replace function aevic_private.command(action text, p jsonb, idem text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); tid uuid; tour uuid; entity uuid; other uuid; t aevic.tournaments; tm aevic.teams; m aevic.matches;
 reg aevic.tournament_registrations; inv aevic.team_invitations; mem aevic.team_members; req aevic.roster_change_requests;
 res aevic.team_match_results; dp aevic.disputes; ticket aevic.support_tickets;
 result jsonb:='{}'; previous aevic_private.idempotency; pair record; slots integer; pt numeric; ft numeric; v integer; player uuid;
begin
 if uid is null then raise sqlstate '42501' using message='UNAUTHORIZED'; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise sqlstate '42501' using message='EMAIL_NOT_VERIFIED'; end if;
 if idem is not null then
  if length(idem) not between 8 and 128 then raise sqlstate '22023' using message='INVALID_IDEMPOTENCY_KEY'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||idem,0));
  select * into previous from aevic_private.idempotency where user_id=uid and key=idem;
  if found then
   if previous.action<>action or previous.payload<>p then raise sqlstate '23505' using message='IDEMPOTENCY_CONFLICT'; end if;
   return previous.response;
  end if;
 end if;
 tid=nullif(p->>'teamId','')::uuid; tour=nullif(p->>'tournamentId','')::uuid; entity=nullif(p->>'id','')::uuid;
 case action
 when 'profile.update' then
  update aevic.profiles set first_name=p->>'firstName',last_name=p->>'lastName',phone=p->>'phone' where id=uid;
 when 'team.update' then
  perform aevic_private.require_member(tid);
  update aevic.teams set name=trim(p->>'name'),tag=p->>'tag',description=p->>'description',country=p->>'country',founded_at=nullif(p->>'foundedAt','')::date,banner_alt=p->>'bannerAlt' where id=tid;
 when 'team.social' then
  perform aevic_private.require_member(tid);
  delete from aevic.team_social_links where team_id=tid;
  insert into aevic.team_social_links select tid,key,value from jsonb_each_text(p->'links') where value<>'';
 when 'tournament.join' then
  perform aevic_private.require_member(tid);
  select * into strict t from aevic.tournaments where id=tour for update;
  if exists(select 1 from aevic.tournament_registrations where tournament_id=tour and team_id=tid and status<>'withdrawn') then raise sqlstate '23505' using message='ALREADY_REGISTERED'; end if;
  if t.status<>'registration-open' or now()<t.registration_opens_at or now()>=t.registration_deadline then raise sqlstate '22023' using message='REGISTRATION_CLOSED'; end if;
  select * into strict tm from aevic.teams where id=tid for update;
  if tm.approval_status<>'approved' or tm.archived_at is not null then raise sqlstate '42501' using message='INELIGIBLE'; end if;
  if (select count(*) from aevic.team_players where team_id=tid and role='starter')<>3 or (select count(*) from aevic.team_players where team_id=tid and role='substitute')<>1 or (select count(*) from aevic.team_players where team_id=tid)<>5 or (select count(*) from aevic.team_players where team_id=tid and role='captain')<>1 then raise sqlstate '22023' using message='ROSTER_INCOMPLETE'; end if;
  select count(*) into slots from aevic.tournament_registrations where tournament_id=tour and status in ('pending','confirmed');
  if slots>=t.max_slots then raise sqlstate '23505' using message='FULL'; end if;
  insert into aevic.tournament_registrations(tournament_id,team_id,roster_lock_at) values(tour,tid,t.registration_deadline)
   on conflict(tournament_id,team_id) do update set status='pending',slot_number=null,roster_lock_at=excluded.roster_lock_at returning * into reg;
  delete from aevic.tournament_rosters where registration_id=reg.id;
  insert into aevic.tournament_rosters(registration_id,player_id,ign,role) select reg.id,r.player_id,pl.ign,r.role from aevic.team_players r join aevic.players pl on pl.id=r.player_id where r.team_id=tid;
  perform aevic_private.notify_team(tid,'Turnir qeydiyyatı alındı',t.name,'/team/tournaments/'||tour);
  result=jsonb_build_object('ok',true,'status','pending');
 when 'registration.review' then
  perform aevic_private.require_admin(array['tournament-manager']);
  select * into strict t from aevic.tournaments where id=tour for update;
  select * into strict reg from aevic.tournament_registrations where team_id=tid and tournament_id=tour for update;
  if now()>=t.starts_at or reg.status not in ('pending','waitlisted') or t.status not in ('registration-open','published') then raise sqlstate '22023' using message='INVALID_STATE'; end if;
  if p->>'status'='confirmed' then
   if not aevic_private.public_team(tid) then raise sqlstate '22023' using message='INELIGIBLE'; end if;
   select s into slots from generate_series(1,t.max_slots) s where not exists(select 1 from aevic.tournament_registrations r where r.tournament_id=tour and r.slot_number=s) order by s limit 1;
   if slots is null then raise sqlstate '23505' using message='FULL'; end if;
  elsif p->>'status' is distinct from 'rejected' then raise sqlstate '22023' using message='INVALID_STATUS'; end if;
  update aevic.tournament_registrations set status=p->>'status',slot_number=slots,reason=p->>'reason' where id=reg.id;
  perform aevic_private.notify_team(tid,'Turnir qeydiyyatı yeniləndi',t.name,'/team/tournaments/'||tour);
 when 'checkin' then
  if tid is null then select team_id into tid from aevic.team_members where user_id=uid and status='ACTIVE'; end if;
  perform aevic_private.require_member(tid);
  select * into strict t from aevic.tournaments where id=tour for update;
  select * into strict reg from aevic.tournament_registrations where tournament_id=tour and team_id=tid for update;
  if reg.status<>'confirmed' or t.status not in ('registration-open','published','ongoing') then raise sqlstate '42501' using message='INELIGIBLE'; end if;
  if now()<t.check_in_opens_at then raise sqlstate '22023' using message='CHECK_IN_NOT_OPEN'; end if;
  if now()>=t.check_in_closes_at then raise sqlstate '22023' using message='CHECK_IN_CLOSED'; end if;
  insert into aevic.check_ins(tournament_id,team_id,checked_in_by) values(tour,tid,uid) on conflict do nothing;
  select jsonb_build_object('tournamentId',tour,'teamId',tid,'status','checked-in','opensAt',t.check_in_opens_at,'closesAt',t.check_in_closes_at,'checkedInAt',checked_in_at) into result from aevic.check_ins where team_id=tid and tournament_id=tour;
 when 'withdraw' then
  if tid is null then select team_id into tid from aevic.team_members where user_id=uid and status='ACTIVE'; end if;
  perform aevic_private.require_member(tid);
  select * into strict t from aevic.tournaments where id=tour for update;
  if t.status in ('ongoing','completed','cancelled') or now()>=t.starts_at then raise sqlstate '22023' using message='WITHDRAWAL_CLOSED'; end if;
  update aevic.tournament_registrations set status='withdrawn',slot_number=null,reason=p->>'reason' where team_id=tid and tournament_id=tour;
  if not found then raise no_data_found; end if;
  delete from aevic.check_ins where team_id=tid and tournament_id=tour;
 when 'room' then
  if tid is null then select team_id into tid from aevic.team_members where user_id=uid and status='ACTIVE'; end if;
  perform aevic_private.require_member(tid,array['OWNER','CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE']);
  select * into strict m from aevic.matches where id=entity and tournament_id=tour;
  select * into strict t from aevic.tournaments where id=tour;
  if not exists(select 1 from aevic.tournament_registrations where team_id=tid and tournament_id=tour and status='confirmed') or not exists(select 1 from aevic.check_ins where team_id=tid and tournament_id=tour) then raise sqlstate '42501' using message='INELIGIBLE'; end if;
  result=jsonb_build_object('roundId',entity,'releaseAt',m.room_release_at,'status','locked');
  if t.status in ('completed','cancelled') or m.status='completed' then result=result||'{"status":"expired"}';
  elsif now()>=m.room_release_at then
   select result||jsonb_build_object('status','released','roomId',room_id,'password',password) into result from aevic.match_rooms where match_id=entity;
   if result is null then raise no_data_found; end if;
  end if;
 when 'dispute.submit' then
  perform aevic_private.require_member(tid);
  if jsonb_typeof(coalesce(p->'evidenceIds','[]')) is distinct from 'array' or jsonb_array_length(coalesce(p->'evidenceIds','[]'))>5 then raise sqlstate '22023' using message='INVALID_EVIDENCE'; end if;
  select * into strict m from aevic.matches where id=(p->>'matchId')::uuid and tournament_id=tour for update;
  if m.published_at is null or m.dispute_deadline_at is null or now()>m.dispute_deadline_at then raise sqlstate '22023' using message='DISPUTE_CLOSED'; end if;
  if not exists(select 1 from aevic.tournament_registrations where team_id=tid and tournament_id=tour and status='confirmed') then raise sqlstate '42501' using message='INELIGIBLE'; end if;
  insert into aevic.disputes(team_id,tournament_id,match_id,issue_type,description,deadline_at) values(tid,tour,m.id,p->>'issueType',p->>'description',m.dispute_deadline_at) returning id into entity;
  for pair in select value from jsonb_array_elements_text(coalesce(p->'evidenceIds','[]')) loop
   update aevic.media set dispute_id=entity where id=pair.value::uuid and team_id=tid and kind='evidence' and dispute_id is null;
   if not found then raise sqlstate '42501' using message='INVALID_EVIDENCE'; end if;
  end loop;
  result=jsonb_build_object('id',entity);
 when 'dispute.review' then
  perform aevic_private.require_admin(array['result-operator','support-moderator']);
  if p->>'status' is null or p->>'status' not in ('resolved','rejected') then raise sqlstate '22023' using message='INVALID_STATUS'; end if;
  update aevic.disputes set status=p->>'status',admin_note=p->>'note',resolved_at=now() where id=entity and status in ('pending','under-review') returning team_id into tid;
  if not found then raise sqlstate '22023' using message='INVALID_STATE'; end if;
  perform aevic_private.notify_team(tid,'Etiraza cavab verildi',coalesce(p->>'note','Etiraz statusu yeniləndi.'),'/team/disputes/'||entity);
 when 'team.approval' then
  perform aevic_private.require_admin(array['tournament-manager']);
  if p->>'status' is null or p->>'status' not in ('pending','approved','rejected','banned') then raise sqlstate '22023' using message='INVALID_STATUS'; end if;
  update aevic.teams set approval_status=p->>'status',rejection_reason=p->>'reason' where id=tid;
  if not found then raise no_data_found; end if;
  perform aevic_private.notify_team(tid,'Komanda statusu yeniləndi',coalesce(p->>'reason',p->>'status'),'/team');
 when 'result.save','result.correct' then
  perform aevic_private.require_admin(array['result-operator']);
  select * into strict m from aevic.matches where id=(p->>'roundId')::uuid and tournament_id=tour for update;
  select * into strict t from aevic.tournaments where id=tour;
  if not exists(select 1 from aevic.tournament_registrations where tournament_id=tour and team_id=tid and status='confirmed') then raise sqlstate '22023' using message='INELIGIBLE'; end if;
  if t.status in ('draft','cancelled') or t.archived_at is not null then raise sqlstate '22023' using message='TOURNAMENT_CLOSED';end if;
  if (p->>'placement')::integer>t.max_slots then raise sqlstate '22023' using message='INVALID_PLACEMENT'; end if;
  select coalesce((x->>'points')::numeric,0) into pt from jsonb_array_elements(t.point_formula->'placement') x where (x->>'placement')::int=(p->>'placement')::int;
  pt=coalesce(pt,0)+case when (p->>'placement')::int=1 then coalesce((t.point_formula->>'wwcdBonus')::numeric,0) else 0 end;
  ft=(p->>'finishes')::integer*(t.point_formula->>'finishPointValue')::numeric;
  if action='result.correct' then
   select * into strict res from aevic.team_match_results where id=entity for update;
   if res.version is distinct from (p->>'expectedVersion')::int or res.match_id<>m.id or res.team_id<>tid or length(trim(coalesce(p->>'reason','')))<10 then raise sqlstate '23505' using message='RESULT_VERSION_CONFLICT'; end if;
   update aevic.team_match_results set placement=(p->>'placement')::int,finishes=(p->>'finishes')::int,placement_points=pt,finish_points=ft,penalties=(p->>'penalties')::numeric,notes=p->>'notes',version=version+1 where id=entity returning * into res;
  else
   if coalesce((p->>'published')::boolean,false) or m.published_at is not null then raise sqlstate '22023' using message='USE_MATCH_PUBLICATION_OR_CORRECTION';end if;
   insert into aevic.team_match_results(match_id,tournament_id,team_id,placement,finishes,placement_points,finish_points,penalties,notes,published)
   values(m.id,tour,tid,(p->>'placement')::int,(p->>'finishes')::int,pt,ft,(p->>'penalties')::numeric,p->>'notes',false) on conflict(match_id,team_id) do update set placement=excluded.placement,finishes=excluded.finishes,placement_points=excluded.placement_points,finish_points=excluded.finish_points,penalties=excluded.penalties,notes=excluded.notes,version=aevic.team_match_results.version+1 returning * into res;
  end if;
  insert into aevic.result_versions(result_id,version,data_snapshot,reason,created_by) values(res.id,res.version,to_jsonb(res),coalesce(p->>'reason','Initial official result'),uid);
  if res.published then
   update aevic.matches set status='completed',published_at=coalesce(published_at,now()),dispute_deadline_at=now()+make_interval(mins=>t.dispute_duration_minutes) where id=m.id;
   perform aevic_private.notify_team(tid,'Rəsmi nəticə dərc edildi',t.name,'/team/tournaments/'||tour||'?tab=results');
  end if;
  result=to_jsonb(res);
 when 'tournament.create' then
  perform aevic_private.require_admin(array['tournament-manager']);
  entity=gen_random_uuid();
  insert into aevic.tournaments(id,slug,name,short_name,description,status,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots,days,rounds_per_day,map_rotation,rules)
  values(entity,'tournament-'||entity,p->>'name',p->>'shortName',coalesce(p->>'description',''),'registration-open',(p->>'startsAt')::timestamptz,(p->>'endsAt')::timestamptz,(p->>'registrationOpensAt')::timestamptz,(p->>'registrationDeadline')::timestamptz,(p->>'checkInOpensAt')::timestamptz,(p->>'checkInClosesAt')::timestamptz,(p->>'maxSlots')::int,1,jsonb_array_length(p->'rounds'),array(select value->>'map' from jsonb_array_elements(p->'rounds')),array(select jsonb_array_elements_text(p->'rules')));
  for pair in select value,ordinality from jsonb_array_elements(p->'rounds') with ordinality loop
   if (pair.value->>'startsAt')::timestamptz<(p->>'startsAt')::timestamptz or (pair.value->>'startsAt')::timestamptz>=(p->>'endsAt')::timestamptz then raise sqlstate '22023' using message='INVALID_MATCH_TIME'; end if;
   insert into aevic.matches(tournament_id,round,map,scheduled_at,room_release_at) values(entity,pair.ordinality,pair.value->>'map',(pair.value->>'startsAt')::timestamptz,(pair.value->>'startsAt')::timestamptz-interval '10 minutes');
  end loop;
  result=jsonb_build_object('id',entity);
 when 'match.publish' then
  perform aevic_private.require_admin(array['result-operator']);
  select * into strict m from aevic.matches where id=entity for update;
  select * into strict t from aevic.tournaments where id=m.tournament_id for update;
  if m.published_at is not null then return jsonb_build_object('published',true);end if;
  if t.status in ('draft','cancelled') or t.archived_at is not null then raise sqlstate '22023' using message='TOURNAMENT_CLOSED';end if;
  select count(*) into slots from aevic.tournament_registrations where tournament_id=t.id and status='confirmed';
  if slots=0 or (select count(*) from aevic.team_match_results where match_id=entity)<>slots then raise sqlstate '22023' using message='RESULTS_INCOMPLETE'; end if;
  if (select count(distinct placement) from aevic.team_match_results where match_id=entity)<>slots then raise sqlstate '22023' using message='DUPLICATE_PLACEMENT';end if;
  update aevic.team_match_results set published=true,version=version+1 where match_id=entity;
  insert into aevic.result_versions(result_id,version,data_snapshot,reason,created_by)select id,version,to_jsonb(r),'Match publication',uid from aevic.team_match_results r where match_id=entity;
  update aevic.matches set status='completed',published_at=coalesce(published_at,now()),dispute_deadline_at=now()+make_interval(mins=>t.dispute_duration_minutes) where id=entity;
  if not exists(select 1 from aevic.matches where tournament_id=t.id and status<>'completed') then update aevic.tournaments set status='completed' where id=t.id;else update aevic.tournaments set status='ongoing' where id=t.id;end if;
  for tid in select team_id from aevic.tournament_registrations where tournament_id=t.id and status='confirmed' loop perform aevic_private.notify_team(tid,'Rəsmi nəticələr dərc edildi',t.name,'/team/tournaments/'||t.id||'?tab=results'); end loop;
 when 'room.save' then
  perform aevic_private.require_admin(array['tournament-manager']);
  if nullif(trim(p->>'roomId'),'') is null or nullif(trim(p->>'password'),'') is null then raise sqlstate '22023' using message='INVALID_ROOM';end if;
  insert into aevic.match_rooms(match_id,room_id,password) values(entity,p->>'roomId',p->>'password') on conflict(match_id) do update set room_id=excluded.room_id,password=excluded.password;
 when 'notification.read' then update aevic.notifications set read_at=coalesce(read_at,now()) where id=entity and recipient_id=uid;
 when 'notification.read-all' then update aevic.notifications set read_at=now() where recipient_id=uid and read_at is null;
 when 'notification.preferences' then
  if coalesce((p->'channels'->>'email')::boolean,false) or coalesce((p->'channels'->>'push')::boolean,false) then raise sqlstate '22023' using message='DELIVERY_NOT_CONFIGURED'; end if;
  insert into aevic.notification_preferences(user_id,channels,events) values(uid,p->'channels',p->'events') on conflict(user_id) do update set channels=excluded.channels,events=excluded.events;
 when 'message.send' then
  perform aevic_private.require_admin(array['tournament-manager','support-moderator']);
  insert into aevic.messages(team_id,sender_id,title,body,severity) values(tid,uid,p->>'title',p->>'body',p->>'severity');
  insert into aevic.notifications(recipient_id,title,body,severity,event_type,action_href)
  select distinct user_id,p->>'title',p->>'body',p->>'severity','admin-message','/team/messages'
  from aevic.team_members where status='ACTIVE' and (tid is null or team_id=tid);
 when 'roster.submit' then
  perform aevic_private.require_member(tid);
  select * into strict tm from aevic.teams where id=tid for update;
  if not exists(select 1 from aevic.team_players where team_id=tid and player_id=(p->'outgoing'->>'id')::uuid and role=p->'incoming'->>'role') then raise sqlstate '42501' using message='INVALID_PLAYER'; end if;
  insert into aevic.roster_change_requests(team_id,tournament_id,outgoing_player_id,incoming_ign,incoming_pubg_id,incoming_role,reason)
   values(tid,tour,(p->'outgoing'->>'id')::uuid,p->'incoming'->>'ign',p->'incoming'->>'uid',p->'incoming'->>'role',p->>'reason') returning id into entity;
  result=jsonb_build_object('id',entity);
 when 'roster.review' then
  perform aevic_private.require_admin(array['tournament-manager']);
  select * into strict req from aevic.roster_change_requests where id=entity for update;
  if req.status not in ('pending','under-review') then raise sqlstate '22023' using message='INVALID_STATE'; end if;
  if p->>'status'='approved' then
   -- Historical tournament snapshots never change. Active locked rosters need competition-specific review.
   perform 1 from aevic.teams where id=req.team_id for update;
   if exists(select 1 from aevic.tournament_registrations r join aevic.tournaments t on t.id=r.tournament_id where r.team_id=req.team_id and r.status in ('pending','confirmed') and r.roster_lock_at<=now() and t.status not in ('completed','cancelled')) then raise sqlstate '22023' using message='ROSTER_LOCKED'; end if;
   if not exists(select 1 from aevic.team_players where team_id=req.team_id and player_id=req.outgoing_player_id and role=req.incoming_role) then raise sqlstate '22023' using message='INVALID_ROSTER_ROLE'; end if;
   select player_id into player from aevic.player_identities where pubg_id=req.incoming_pubg_id;
   if player is null then
    player=gen_random_uuid(); insert into aevic.players(id,ign,slug) values(player,req.incoming_ign,'player-'||player);
    insert into aevic.player_identities(player_id,pubg_id) values(player,req.incoming_pubg_id);
   end if;
   update aevic.team_players set player_id=player,role=req.incoming_role,created_at=now() where team_id=req.team_id and player_id=req.outgoing_player_id;
   if not found then raise sqlstate '22023' using message='INVALID_PLAYER'; end if;
  elsif p->>'status' is distinct from 'rejected' then raise sqlstate '22023' using message='INVALID_STATUS'; end if;
  update aevic.roster_change_requests set status=p->>'status',admin_note=p->>'note' where id=entity;
  perform aevic_private.notify_team(req.team_id,'Heyət sorğusu yeniləndi',coalesce(p->>'note',p->>'status'),'/team/roster-requests/'||entity);
 when 'invitation.create' then
  perform aevic_private.require_member(tid,array['OWNER','CAPTAIN']);
  if p->>'role'='OWNER' then raise sqlstate '42501' using message='FORBIDDEN'; end if;
  update aevic.team_invitations set status='EXPIRED' where team_id=tid and expires_at<=now() and status='PENDING';
  insert into aevic.team_invitations(team_id,recipient_email,role,created_by) values(tid,lower(p->>'recipient'),p->>'role',uid) returning id into entity;
  result=jsonb_build_object('id',entity);
 when 'invitation.cancel' then
  perform aevic_private.require_member(tid,array['OWNER','CAPTAIN']);
  update aevic.team_invitations set status='CANCELLED',responded_at=now() where id=entity and team_id=tid and status='PENDING';
  if not found then raise sqlstate '22023' using message='INVALID_STATE'; end if;
 when 'invitation.respond' then
  select * into strict inv from aevic.team_invitations where id=entity for update;
  if lower(inv.recipient_email)<>lower((select email from auth.users where id=uid)) then raise sqlstate '42501' using message='FORBIDDEN'; end if;
  if inv.status<>'PENDING' or inv.expires_at<=now() then raise sqlstate '22023' using message='INVITATION_EXPIRED'; end if;
  if p->>'response'='ACCEPTED' then insert into aevic.team_members(team_id,user_id,role) values(inv.team_id,uid,inv.role);
  elsif p->>'response' is distinct from 'REJECTED' then raise sqlstate '22023' using message='INVALID_STATUS'; end if;
  update aevic.team_invitations set status=p->>'response',responded_at=now() where id=entity;
 when 'team.transfer' then
  perform aevic_private.require_member(tid,array['OWNER']);
  select * into strict tm from aevic.teams where id=tid for update;
  if p->>'confirmation' is distinct from tm.name then raise sqlstate '22023' using message='CONFIRMATION_REQUIRED'; end if;
  select * into strict mem from aevic.team_members where id=(p->>'memberId')::uuid and team_id=tid and status='ACTIVE' for update;
  if mem.user_id=uid then raise sqlstate '22023' using message='INVALID_MEMBER'; end if;
  update aevic.team_members set role='CAPTAIN' where team_id=tid and role='OWNER';
  update aevic.team_members set role='OWNER' where id=mem.id;
 when 'team.member-remove','team.leave' then
  select * into strict tm from aevic.teams where id=tid for update;
  if action='team.leave' then select * into strict mem from aevic.team_members where team_id=tid and user_id=uid for update;
  else perform aevic_private.require_member(tid,array['OWNER']); select * into strict mem from aevic.team_members where team_id=tid and id=entity for update; end if;
  if mem.role='OWNER' then raise sqlstate '22023' using message='TRANSFER_OWNERSHIP_FIRST'; end if;
  insert into aevic.membership_history(team_id,user_id,role,joined_at) values(tid,mem.user_id,mem.role,mem.created_at);
  delete from aevic.team_members where id=mem.id;
 when 'team.archive' then
  perform aevic_private.require_member(tid,array['OWNER']);
  select * into strict tm from aevic.teams where id=tid for update;
  if p->>'confirmation' is distinct from tm.name then raise sqlstate '22023' using message='CONFIRMATION_REQUIRED'; end if;
  if exists(select 1 from aevic.tournament_registrations r join aevic.tournaments t on t.id=r.tournament_id where r.team_id=tid and r.status in ('pending','confirmed') and t.status not in ('completed','cancelled')) then raise sqlstate '22023' using message='ACTIVE_COMPETITION'; end if;
  update aevic.teams set archived_at=now() where id=tid;
  result=to_jsonb(tm);
 when 'tournament.cancel','tournament.archive' then
  perform aevic_private.require_admin(array['tournament-manager']);
  select * into strict t from aevic.tournaments where id=tour for update;
  if action='tournament.archive' then
   if t.status not in ('completed','cancelled') then raise sqlstate '22023' using message='INVALID_STATE'; end if;
   update aevic.tournaments set archived_at=now() where id=tour;
  else
   if t.status in ('completed','cancelled') or length(trim(coalesce(p->>'reason','')))<10 then raise sqlstate '22023' using message='INVALID_STATE'; end if;
   update aevic.tournaments set status='cancelled' where id=tour;
   for tid in select team_id from aevic.tournament_registrations where tournament_id=tour loop perform aevic_private.notify_team(tid,'Turnir ləğv edildi',p->>'reason','/team/tournaments/'||tour); end loop;
  end if;
 when 'support.create' then
  insert into aevic.support_tickets(user_id,category,subject,description) values(uid,p->>'category',p->>'subject',p->>'description') returning id into entity;
  result=jsonb_build_object('id',entity);
 when 'support.reply','support.status' then
  select * into strict ticket from aevic.support_tickets where id=entity for update;
  if ticket.user_id<>uid then perform aevic_private.require_admin(array['support-moderator']); end if;
  if action='support.status' then perform aevic_private.require_admin(array['support-moderator']);
  else insert into aevic.support_replies(ticket_id,author_id,author,body) values(entity,uid,case when ticket.user_id=uid then 'user' else 'support' end,p->>'body'); end if;
  if ticket.user_id=uid and p->>'status' is not null then raise sqlstate '42501' using message='FORBIDDEN'; end if;
  update aevic.support_tickets set status=coalesce(p->>'status',case when ticket.user_id=uid then 'open' else 'waiting-for-user' end),updated_at=now() where id=entity;
 when 'follow' then
  if p->>'entityType'<>'TEAM' or not aevic_private.public_team(entity) then raise sqlstate '22023' using message='INVALID_ENTITY'; end if;
  if (p->>'following')::boolean then insert into aevic.follows(user_id,team_id) values(uid,entity) on conflict do nothing;
  else delete from aevic.follows where user_id=uid and team_id=entity; end if;
 else raise sqlstate '22023' using message='UNKNOWN_OPERATION';
 end case;
 -- Do not log room credentials, auth tokens, attachments, or arbitrary request bodies.
 if action not in ('room','notification.read','notification.read-all') then
  insert into aevic.audit_events(actor_id,action,entity_type,entity_id,metadata) values(uid,action,split_part(action,'.',1),coalesce(entity,tid,tour),jsonb_build_object('actorRole',coalesce((select role from aevic.admin_roles where user_id=uid),'team')));
 end if;
 if idem is not null and action<>'room' then insert into aevic_private.idempotency(user_id,key,action,payload,response) values(uid,idem,action,p,result); end if;
 return result;
end $$;

create or replace function aevic_private.identity_command(action text,p jsonb,idem text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();oid uuid:=nullif(p->>'organizationId','')::uuid;tid uuid:=nullif(p->>'teamId','')::uuid;entity uuid:=nullif(p->>'id','')::uuid;result jsonb:='{}';inv aevic.organization_invitations;v aevic.verification_requests;prior aevic_private.idempotency;target_user uuid;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise sqlstate '42501' using message='UNAUTHORIZED';end if;
 if idem is not null then
 perform pg_advisory_xact_lock(hashtextextended(uid::text||idem,0));select * into prior from aevic_private.idempotency where user_id=uid and key=idem;
 if found then if prior.action<>action or prior.payload<>p then raise unique_violation;end if;return prior.response;end if;
 end if;
 if action in ('org.social','org.invite-member','org.invite-team','org.remove-team') and not aevic_private.org_member(oid,array['OWNER','MANAGER']) then raise sqlstate '42501' using message='FORBIDDEN';end if;
 case action
 when 'org.create' then
 entity=gen_random_uuid();insert into aevic.organizations(id,name,slug,short_name,country) values(entity,p->>'name','organization-'||entity,p->>'shortName',p->>'country');insert into aevic.organization_members(organization_id,user_id,role)values(entity,uid,'OWNER');result=jsonb_build_object('id',entity);
 when 'org.social' then
 if jsonb_typeof(p->'socialLinks')<>'object' or exists(select 1 from jsonb_each_text(p->'socialLinks') where key not in ('instagram','tiktok','youtube','x','linkedin','discord','twitch','website') or (value<>'' and (value !~ '^https://[^/@[:space:]]+([/?#]|$)' or length(value)>500))) then raise sqlstate '22023' using message='INVALID_SOCIAL_LINK';end if;
 update aevic.organizations set social_links=p->'socialLinks',updated_at=now() where id=oid;
 when 'org.invite-member','org.invite-team' then
 insert into aevic.organization_invitations(organization_id,recipient_email,team_id,role)values(oid,lower(p->>'recipient'),tid,coalesce(p->>'role','MEMBER'))returning id into entity;result=jsonb_build_object('id',entity);
 when 'org.respond' then
 select * into strict inv from aevic.organization_invitations where id=entity for update;
 if inv.status<>'PENDING' or inv.expires_at<=now() then raise sqlstate '22023' using message='INVITATION_EXPIRED';end if;
 if inv.team_id is not null then perform aevic_private.require_member(inv.team_id,array['OWNER']);
 elsif lower(inv.recipient_email)<>lower((select email from auth.users where id=uid)) then raise sqlstate '42501' using message='FORBIDDEN';end if;
 if p->>'response'='ACCEPTED' then
 if inv.team_id is not null then insert into aevic.organization_teams(organization_id,team_id)values(inv.organization_id,inv.team_id);
 else insert into aevic.organization_members(organization_id,user_id,role)values(inv.organization_id,uid,inv.role);end if;
 elsif p->>'response' is distinct from 'REJECTED' then raise sqlstate '22023' using message='INVALID_STATUS';end if;
 update aevic.organization_invitations set status=p->>'response',responded_at=now() where id=entity;
 when 'org.link' then
 if not aevic_private.org_member(oid,array['OWNER']) then raise sqlstate '42501' using message='FORBIDDEN';end if;
 perform aevic_private.require_member(tid,array['OWNER']);insert into aevic.organization_teams(organization_id,team_id)values(oid,tid);
 when 'org.remove-team','org.unlink' then
 if action='org.unlink' then perform aevic_private.require_member(tid,array['OWNER']);end if;
 delete from aevic.organization_teams where organization_id=oid and team_id=tid;
 when 'org.transfer' then
 if not aevic_private.org_member(oid,array['OWNER']) then raise sqlstate '42501' using message='FORBIDDEN';end if;
 perform 1 from aevic.organizations where id=oid for update;
 if not exists(select 1 from aevic.organizations where id=oid and name=p->>'confirmation')then raise sqlstate '22023' using message='CONFIRMATION_REQUIRED';end if;
 select user_id into strict target_user from aevic.organization_members where id=(p->>'memberId')::uuid and organization_id=oid and status='ACTIVE' and user_id<>uid;
 update aevic.organization_members set role='MANAGER' where organization_id=oid and role='OWNER';update aevic.organization_members set role='OWNER' where organization_id=oid and user_id=target_user;
 when 'verification.apply' then
 if tid is not null then perform aevic_private.require_member(tid);elsif not aevic_private.org_member(oid,array['OWNER','MANAGER'])then raise sqlstate '42501' using message='FORBIDDEN';end if;
 insert into aevic.verification_requests(team_id,organization_id,representative_name,official_socials,notes)values(tid,oid,p->>'representativeName',p->'officialSocials',p->>'notes')returning id into entity;result=jsonb_build_object('id',entity);
 when 'verification.review' then
 perform aevic_private.require_admin(array['support-moderator']);select * into strict v from aevic.verification_requests where id=entity for update;
 if v.status is distinct from p->>'expectedStatus' or length(trim(coalesce(p->>'reason','')))<10 then raise unique_violation;end if;
 if not ((v.status='PENDING' and p->>'status' in ('APPROVED','REJECTED')) or (v.status='APPROVED' and p->>'status'='REVOKED')) then raise sqlstate '22023' using message='INVALID_STATE';end if;
 update aevic.verification_requests set status=p->>'status',safe_reason=p->>'reason',reviewed_by=uid,reviewed_at=now() where id=entity;
 if v.team_id is not null then update aevic.teams set verification_level=case when p->>'status'='APPROVED' then 'verified' else 'registered' end where id=v.team_id;
 else update aevic.organizations set verification_level=case when p->>'status'='APPROVED' then 'verified' else 'registered' end where id=v.organization_id;end if;
 when 'badges.featured' then
 perform aevic_private.require_member(tid);
 if jsonb_typeof(p->'ids') is distinct from 'array' then raise sqlstate '22023' using message='INVALID_BADGES';end if;
 if jsonb_array_length(p->'ids')>3 or (select count(distinct value) from jsonb_array_elements_text(p->'ids'))<>jsonb_array_length(p->'ids')then raise sqlstate '22023' using message='INVALID_BADGES';end if;
 if exists(select 1 from jsonb_array_elements_text(p->'ids') i where not exists(select 1 from aevic.achievement_progress(tid) a where a.id=i.value and a.current_value>=a.target))then raise sqlstate '42501' using message='LOCKED_BADGE';end if;
 delete from aevic.featured_achievements where team_id=tid;insert into aevic.featured_achievements(team_id,achievement_id,position)select tid,value,ordinality from jsonb_array_elements_text(p->'ids') with ordinality;
 when 'player.claim' then
 insert into aevic.player_claims(player_id,user_id,method)values((p->>'playerId')::uuid,uid,p->>'method')returning id into entity;result=jsonb_build_object('id',entity);
 when 'account.deletion' then
 if exists(select 1 from aevic.team_members where user_id=uid and role='OWNER')or exists(select 1 from aevic.organization_members where user_id=uid and role='OWNER')then return jsonb_build_object('blocked',true,'reason','Əvvəlcə komanda və təşkilat sahibliyini ötürün.');end if;
 insert into aevic.account_requests(user_id,kind)values(uid,'deletion')on conflict do nothing;result=jsonb_build_object('blocked',false);
 else raise sqlstate '22023' using message='UNKNOWN_OPERATION';
 end case;
 insert into aevic.audit_events(actor_id,action,entity_type,entity_id)values(uid,action,split_part(action,'.',1),coalesce(entity,oid,tid));
 if idem is not null then insert into aevic_private.idempotency(user_id,key,action,payload,response)values(uid,idem,action,p,result);end if;
 return result;
end $$;
