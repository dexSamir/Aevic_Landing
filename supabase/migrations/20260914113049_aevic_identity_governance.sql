create table aevic.organizations (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),slug text not null unique,short_name text not null check(length(short_name)<=20),description text not null default '',country text not null default '',founded_at date not null default current_date,
 social_links jsonb not null default '{}',verification_level text not null default 'registered' check(verification_level in ('registered','approved','verified','legacy')),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index organization_name on aevic.organizations(lower(name));
create table aevic.organization_members (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references aevic.organizations on delete cascade,user_id uuid not null references auth.users on delete restrict,role text not null check(role in ('OWNER','MANAGER','MEMBER')),status text not null default 'ACTIVE' check(status in ('ACTIVE','SUSPENDED')),created_at timestamptz not null default now(),unique(organization_id,user_id)
);
create unique index organization_owner on aevic.organization_members(organization_id) where role='OWNER';
create index organization_member_user on aevic.organization_members(user_id);
create table aevic.organization_teams (
 organization_id uuid not null references aevic.organizations on delete cascade,team_id uuid not null references aevic.teams on delete restrict,created_at timestamptz not null default now(),primary key(organization_id,team_id),unique(team_id)
);
create table aevic.organization_invitations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references aevic.organizations on delete cascade,recipient_email text,team_id uuid references aevic.teams on delete cascade,role text check(role in ('MANAGER','MEMBER')),status text not null default 'PENDING' check(status in ('PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',responded_at timestamptz,
 check((recipient_email is null)<>(team_id is null))
);
create index org_invites_recipient on aevic.organization_invitations(lower(recipient_email));
create index org_invites_team on aevic.organization_invitations(team_id);
create table aevic.verification_requests (
 id uuid primary key default gen_random_uuid(),team_id uuid references aevic.teams on delete restrict,organization_id uuid references aevic.organizations on delete restrict,
 representative_name text not null check(length(representative_name) between 2 and 100),official_socials jsonb not null,notes text check(length(notes)<=4000),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','REVOKED')),safe_reason text,reviewed_by uuid references auth.users,reviewed_at timestamptz,created_at timestamptz not null default now(),check((team_id is null)<>(organization_id is null))
);
create unique index verification_team_open on aevic.verification_requests(team_id) where status in ('PENDING','APPROVED');
create unique index verification_org_open on aevic.verification_requests(organization_id) where status in ('PENDING','APPROVED');
create table aevic.featured_achievements (
 team_id uuid not null references aevic.teams on delete cascade,achievement_id text not null,position integer not null check(position between 1 and 3),primary key(team_id,achievement_id),unique(team_id,position)
);
create table aevic.player_claims (
 id uuid primary key default gen_random_uuid(),player_id uuid not null references aevic.players on delete restrict,user_id uuid not null references auth.users on delete restrict,method text not null check(method in ('ACCOUNT_MATCH','PUBG_IDENTITY','ADMIN_REVIEW')),status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),created_at timestamptz not null default now(),unique(player_id,user_id)
);
create table aevic.account_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('deletion')),status text not null default 'PENDING',created_at timestamptz not null default now(),unique(user_id,kind)
);
create function aevic_private.org_member(oid uuid, roles text[] default array['OWNER','MANAGER','MEMBER']) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from aevic.organization_members where organization_id=oid and user_id=auth.uid() and status='ACTIVE' and role=any(roles));
$$;
grant execute on function aevic_private.org_member(uuid,text[]) to authenticated;
do $$ declare t text; begin
 foreach t in array array['organizations','organization_members','organization_teams','organization_invitations','verification_requests','featured_achievements','player_claims','account_requests'] loop
 execute format('alter table aevic.%I enable row level security',t);
 execute format('grant select on aevic.%I to authenticated',t);
 execute format('grant all on aevic.%I to service_role',t);
 execute format('create policy admin_read on aevic.%I for select to authenticated using ((select aevic_private.is_admin()))',t);
 end loop;
end $$;
grant select on aevic.organizations,aevic.organization_teams,aevic.featured_achievements to anon;
create policy public_org on aevic.organizations for select to anon,authenticated using(true);
create policy public_org_teams on aevic.organization_teams for select to anon,authenticated using(aevic_private.public_team(team_id));
create policy own_org_members on aevic.organization_members for select to authenticated using(aevic_private.org_member(organization_id));
create policy own_org_invites on aevic.organization_invitations for select to authenticated using(aevic_private.org_member(organization_id) or aevic_private.member_of(team_id,array['OWNER']) or lower(recipient_email)=lower(auth.jwt()->>'email'));
create policy own_verifications on aevic.verification_requests for select to authenticated using(aevic_private.member_of(team_id) or aevic_private.org_member(organization_id));
create policy public_featured on aevic.featured_achievements for select to anon,authenticated using(aevic_private.public_team(team_id));
create policy own_featured on aevic.featured_achievements for select to authenticated using(aevic_private.member_of(team_id));
create policy own_claim on aevic.player_claims for select to authenticated using(user_id=auth.uid());
create policy own_account_requests on aevic.account_requests for select to authenticated using(user_id=auth.uid());

create function aevic.achievement_progress(team uuid) returns table(id text,current_value bigint,target bigint,unlocked_at timestamptz) language sql stable security invoker set search_path='' as $$
 with official as(select r.*,m.published_at from aevic.team_match_results r join aevic.matches m on m.id=r.match_id where r.team_id=team and r.published and m.published_at is not null),
 numbered as(select *,row_number() over(order by published_at,id) match_number,sum(finishes) over(order by published_at,id) kill_total,sum(case when placement=1 then 1 else 0 end) over(order by published_at,id) wins from official)
 select 'first-wwcd',count(*) filter(where placement=1),1::bigint,min(published_at) filter(where placement=1) from numbered
 union all select 'hundred-kills',coalesce(sum(finishes),0)::bigint,100::bigint,min(published_at) filter(where kill_total>=100) from numbered
 union all select 'ten-matches',count(*),10::bigint,min(published_at) filter(where match_number>=10) from numbered;
$$;
grant execute on function aevic.achievement_progress(uuid) to anon,authenticated;

create function aevic_private.identity_command(action text,p jsonb,idem text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 elsif p->>'response'<>'REJECTED' then raise sqlstate '22023' using message='INVALID_STATUS';end if;
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
 if v.status<>p->>'expectedStatus' or length(trim(p->>'reason'))<10 then raise unique_violation;end if;
 if not ((v.status='PENDING' and p->>'status' in ('APPROVED','REJECTED')) or (v.status='APPROVED' and p->>'status'='REVOKED')) then raise sqlstate '22023' using message='INVALID_STATE';end if;
 update aevic.verification_requests set status=p->>'status',safe_reason=p->>'reason',reviewed_by=uid,reviewed_at=now() where id=entity;
 if v.team_id is not null then update aevic.teams set verification_level=case when p->>'status'='APPROVED' then 'verified' else 'registered' end where id=v.team_id;
 else update aevic.organizations set verification_level=case when p->>'status'='APPROVED' then 'verified' else 'registered' end where id=v.organization_id;end if;
 when 'badges.featured' then
 perform aevic_private.require_member(tid);
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
create function aevic.identity_command(action text,payload jsonb,idempotency_key text default null)returns jsonb language sql security invoker set search_path='' as $$select aevic_private.identity_command(action,payload,idempotency_key)$$;
grant execute on function aevic.identity_command(text,jsonb,text),aevic_private.identity_command(text,jsonb,text) to authenticated;
