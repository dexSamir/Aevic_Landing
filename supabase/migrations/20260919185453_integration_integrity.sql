-- Additive integration fixes. No existing records are deleted or seeded.
-- Corrections must preserve the unique placements enforced at publication.
create function aevic_private.validate_published_placement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.published then
  perform 1 from aevic.matches where id=new.match_id for update;
  if exists(select 1 from aevic.team_match_results r where r.match_id=new.match_id and r.published and r.placement=new.placement and r.id<>new.id) then
   raise sqlstate '23505' using message='DUPLICATE_PUBLISHED_PLACEMENT';
  end if;
 end if;
 return new;
end $$;
create trigger unique_published_placement before insert or update of published,placement on aevic.team_match_results
for each row execute function aevic_private.validate_published_placement();

-- Private contacts are returned only to the team itself or operational reviewers.
-- Never join auth.users into a public response or use service-role for this read.
create function aevic.team_contacts() returns table(team_id uuid,user_id uuid,first_name text,last_name text,email text,phone text)
language sql stable security definer set search_path='' as $$
 select m.team_id,m.user_id,p.first_name,p.last_name,u.email::text,p.phone
 from aevic.team_members m join aevic.profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id
 where m.role='OWNER' and m.status='ACTIVE' and auth.uid() is not null
 and (aevic_private.member_of(m.team_id) or aevic_private.is_admin(array['super-admin','tournament-manager','support-moderator']));
$$;
grant execute on function aevic.team_contacts() to authenticated;

-- Edit existing tournament identities and schedules atomically with stale-write protection.
create function aevic_private.edit_tournament(tournament_id uuid,p jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare t aevic.tournaments; m aevic.matches; item jsonb; configuration_changed boolean;
begin
 perform aevic_private.require_admin(array['tournament-manager']);
 perform 1 from aevic.matches where matches.tournament_id=edit_tournament.tournament_id order by id for update;
 select * into strict t from aevic.tournaments where id=edit_tournament.tournament_id for update;
 if t.updated_at is distinct from (p->>'expectedUpdatedAt')::timestamptz then raise sqlstate '40001' using message='TOURNAMENT_VERSION_CONFLICT';end if;
 if t.archived_at is not null or t.status='cancelled' then raise sqlstate '22023' using message='TOURNAMENT_CLOSED';end if;
 if jsonb_typeof(p->'rounds') is distinct from 'array' or jsonb_typeof(p->'rules') is distinct from 'array'
   or jsonb_array_length(p->'rounds') not between 1 and 20 or jsonb_array_length(p->'rules')>50
   or nullif(trim(p->>'name'),'') is null or nullif(trim(p->>'shortName'),'') is null
   or p->>'status' is null or p->>'status' not in ('draft','published','registration-open','ongoing','completed') then
  raise sqlstate '22023' using message='INVALID_TOURNAMENT';end if;
 if p->>'status' in ('ongoing','completed') and p->>'status'<>t.status then raise sqlstate '22023' using message='RESULT_PUBLICATION_REQUIRED';end if;
 if t.status in ('ongoing','completed') and p->>'status'<>t.status then raise sqlstate '22023' using message='INVALID_STATE';end if;
 if p->>'status'='draft' and exists(select 1 from aevic.tournament_registrations r where r.tournament_id=t.id) then raise sqlstate '22023' using message='REGISTRATIONS_EXIST';end if;
 if (p->>'maxSlots')::integer < (select count(*) from aevic.tournament_registrations r where r.tournament_id=t.id and r.status in ('pending','confirmed'))
 or (p->>'maxSlots')::integer < coalesce((select max(r.slot_number) from aevic.tournament_registrations r where r.tournament_id=t.id),0) then raise sqlstate '22023' using message='CAPACITY_CONFLICT';end if;
 if jsonb_array_length(p->'rounds')<>(select count(*) from aevic.matches where matches.tournament_id=t.id)
 or (select count(distinct value->>'id') from jsonb_array_elements(p->'rounds'))<>jsonb_array_length(p->'rounds') then raise sqlstate '22023' using message='INVALID_SCHEDULE';end if;
 configuration_changed := t.starts_at is distinct from (p->>'startsAt')::timestamptz or t.ends_at is distinct from (p->>'endsAt')::timestamptz
 or t.registration_opens_at is distinct from (p->>'registrationOpensAt')::timestamptz or t.registration_deadline is distinct from (p->>'registrationDeadline')::timestamptz
 or t.check_in_opens_at is distinct from (p->>'checkInOpensAt')::timestamptz or t.check_in_closes_at is distinct from (p->>'checkInClosesAt')::timestamptz
 or t.max_slots is distinct from (p->>'maxSlots')::integer;
 for item in select value from jsonb_array_elements(p->'rounds') loop
  select * into strict m from aevic.matches where id=(item->>'id')::uuid and matches.tournament_id=t.id for update;
  if item->>'map' is null or item->>'map' not in ('Erangel','Miramar','Rondo') or item->>'startsAt' is null
  or (item->>'startsAt')::timestamptz<(p->>'startsAt')::timestamptz or (item->>'startsAt')::timestamptz>=(p->>'endsAt')::timestamptz then raise sqlstate '22023' using message='INVALID_SCHEDULE';end if;
  configuration_changed := configuration_changed or m.map is distinct from item->>'map' or m.scheduled_at is distinct from (item->>'startsAt')::timestamptz;
 end loop;
 if configuration_changed and (now()>=t.registration_deadline or exists(select 1 from aevic.check_ins where check_ins.tournament_id=t.id) or exists(select 1 from aevic.team_match_results where team_match_results.tournament_id=t.id)) then raise sqlstate '22023' using message='SCHEDULE_LOCKED';end if;
 update aevic.tournaments set name=trim(p->>'name'),short_name=trim(p->>'shortName'),description=coalesce(p->>'description',''),status=p->>'status',
 starts_at=(p->>'startsAt')::timestamptz,ends_at=(p->>'endsAt')::timestamptz,registration_opens_at=(p->>'registrationOpensAt')::timestamptz,registration_deadline=(p->>'registrationDeadline')::timestamptz,
 check_in_opens_at=(p->>'checkInOpensAt')::timestamptz,check_in_closes_at=(p->>'checkInClosesAt')::timestamptz,max_slots=(p->>'maxSlots')::integer,
 rules=array(select jsonb_array_elements_text(p->'rules')),map_rotation=array(select value->>'map' from jsonb_array_elements(p->'rounds')) where id=t.id;
 for item in select value from jsonb_array_elements(p->'rounds') loop
  update aevic.matches set map=item->>'map',scheduled_at=(item->>'startsAt')::timestamptz,room_release_at=(item->>'startsAt')::timestamptz-interval '10 minutes' where id=(item->>'id')::uuid;
 end loop;
 update aevic.tournament_registrations set roster_lock_at=(p->>'registrationDeadline')::timestamptz where tournament_registrations.tournament_id=t.id;
 insert into aevic.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'tournament.update','tournament',t.id,jsonb_build_object('previousStatus',t.status,'status',p->>'status','scheduleChanged',configuration_changed));
end $$;
create function aevic.edit_tournament(tournament_id uuid,payload jsonb) returns void
language sql security invoker set search_path='' as $$ select aevic_private.edit_tournament(tournament_id,payload); $$;
grant execute on function aevic.edit_tournament(uuid,jsonb),aevic_private.edit_tournament(uuid,jsonb) to authenticated;

-- Preserve organization creation descriptions; retain the existing identity operations.
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
 if jsonb_typeof(p->'name') is distinct from 'string' or length(trim(p->>'name')) not between 2 and 100
 or jsonb_typeof(p->'shortName') is distinct from 'string' or length(trim(p->>'shortName')) not between 1 and 20
 or jsonb_typeof(p->'country') is distinct from 'string' or length(trim(p->>'country'))>80
 or (p ? 'description' and (jsonb_typeof(p->'description') is distinct from 'string' or length(trim(p->>'description'))>3000)) then raise sqlstate '22023' using message='INVALID_ORGANIZATION';end if;
 entity=gen_random_uuid();insert into aevic.organizations(id,name,slug,short_name,country,description) values(entity,trim(p->>'name'),'organization-'||entity,trim(p->>'shortName'),trim(p->>'country'),trim(coalesce(p->>'description','')));insert into aevic.organization_members(organization_id,user_id,role)values(entity,uid,'OWNER');result=jsonb_build_object('id',entity);
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

-- PostgreSQL's global default PUBLIC EXECUTE is not removed by a per-schema
-- default-privilege REVOKE. Remove it explicitly, preserving the existing
-- named-role allowlist (public reads, authenticated commands, service-only limits).
revoke execute on all functions in schema aevic, aevic_private from public;
