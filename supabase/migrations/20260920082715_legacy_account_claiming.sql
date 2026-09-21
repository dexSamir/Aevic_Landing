-- Additive, operator-imported holding data. Never expose legacy passwords, room
-- secrets, reset tokens or session tables; none have a destination here.
alter table aevic.teams add column legacy_history_incomplete boolean not null default false;
grant select (legacy_history_incomplete) on aevic.teams to anon,authenticated;
create table aevic_private.legacy_team_holdings (
 team_id uuid primary key, source_ref text not null, source_key text not null check(source_key ~ '^[0-9]{1,19}$'),
 name text not null check(length(trim(name)) between 2 and 60),
 approval_status text not null check(approval_status in ('pending','approved','rejected','banned')),
 legacy_status text not null, tier text, rejection_reason text, original_created_at timestamptz not null,
 roster_names jsonb not null check(jsonb_typeof(roster_names)='array' and jsonb_array_length(roster_names)=5),
 media_references jsonb not null default '[]' check(jsonb_typeof(media_references)='array'),
 captain_contact jsonb not null default '{}' check(jsonb_typeof(captain_contact)='object' and captain_contact-array['name','email','contact']='{}'::jsonb),
 history_scope text not null check(history_scope='legacy_match_results_empty_other_sources_unverified'),
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 claimed_by uuid references auth.users on delete restrict, claimed_at timestamptz, roster_completed_at timestamptz,
 unique(source_ref,source_key), unique(claimed_by),
 check((claimed_by is null)=(claimed_at is null))
);
create unique index legacy_holding_name on aevic_private.legacy_team_holdings(lower(trim(name)));
create table aevic_private.legacy_claim_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete restrict,
 source_key text not null check(source_key ~ '^[0-9]{1,19}$'),
 status text not null default 'pending' check(status in ('pending','approved','rejected','consumed')),
 evidence_ref uuid, reviewed_by uuid references auth.users, reviewed_at timestamptz,
 token_hash text check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz, consumed_at timestamptz,
 version integer not null default 1, created_at timestamptz not null default now(), unique(user_id,source_key)
);
create index legacy_claim_queue on aevic_private.legacy_claim_requests(status,created_at);
alter table aevic_private.legacy_team_holdings enable row level security;
alter table aevic_private.legacy_claim_requests enable row level security;
revoke all on aevic_private.legacy_team_holdings,aevic_private.legacy_claim_requests from public,anon,authenticated,service_role;

-- Caller JWT identity, independent administrator review and a bound one-use
-- challenge are all required. Invalid attempts RETURN an error so audit/rate-limit
-- writes commit; raising after those writes would roll them back.
create function aevic_private.legacy_claim(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); r aevic_private.legacy_claim_requests; h aevic_private.legacy_team_holdings;
 k text; item jsonb; pid uuid; pos integer:=0; output jsonb; claimed uuid;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise sqlstate '42501' using message='EMAIL_NOT_VERIFIED';end if;
 if action in ('queue','review','holdings') then perform aevic_private.require_admin(array['support-moderator']);end if;
 if action in ('request','consume','review','roster') then
  if not aevic.rate_limit('legacy-claim:'||action||':'||uid,case when action='request' then 5 else 10 end,3600) then
   insert into aevic.audit_events(actor_id,action,entity_type) values(uid,'legacy.claim.rate-limited','legacy-claim');
   return jsonb_build_object('ok',false,'code','RATE_LIMITED');
  end if;
 end if;
 if action='request' then
  k=p->>'sourceKey';if k is null or k !~ '^[0-9]{1,19}$' then raise sqlstate '22023' using message='INVALID_REQUEST';end if;
  -- Always insert a neutral receipt: do not disclose whether the legacy team exists.
  insert into aevic_private.legacy_claim_requests(user_id,source_key) values(uid,k) on conflict(user_id,source_key) do nothing;
  insert into aevic.audit_events(actor_id,action,entity_type) values(uid,'legacy.claim.request','legacy-claim');
  return jsonb_build_object('ok',true);
 elsif action='mine' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'sourceKey',source_key,'status',case when status='approved' and expires_at<=now() then 'expired' else status end,'createdAt',created_at) order by created_at desc),'[]') into output from aevic_private.legacy_claim_requests where user_id=uid;
  return output;
 elsif action='holdings' then
  select coalesce(jsonb_agg(jsonb_build_object('teamId',team_id,'sourceKey',source_key,'name',name,'status',case when claimed_at is null then 'unclaimed' else 'claimed' end,'rosterNames',roster_names,'mediaReferences',media_references,'legacyStatus',legacy_status,'tier',tier,'createdAt',original_created_at,'historyScope',history_scope) order by original_created_at),'[]') into output from aevic_private.legacy_team_holdings;
  return output;
 elsif action='queue' then
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'userId',q.user_id,'sourceKey',q.source_key,'status',q.status,'version',q.version,'createdAt',q.created_at,'expiresAt',q.expires_at,'teamName',l.name,'claimed',l.claimed_at is not null,'legacyContact',l.captain_contact,'applicantEmail',u.email) order by q.created_at desc),'[]') into output
  from aevic_private.legacy_claim_requests q join auth.users u on u.id=q.user_id left join aevic_private.legacy_team_holdings l on l.source_key=q.source_key and l.source_ref='nmjjibifcuzjlsvfcaaz';
  return output;
 elsif action in ('review','consume') then
  select * into r from aevic_private.legacy_claim_requests where id=(p->>'id')::uuid;
  if not found or (action='consume' and r.user_id<>uid) then
   insert into aevic.audit_events(actor_id,action,entity_type) values(uid,'legacy.claim.invalid','legacy-claim');return jsonb_build_object('ok',false,'code','CLAIM_INVALID');
  end if;
  -- All competing requests lock the same holding FIRST, then their request.
  select * into h from aevic_private.legacy_team_holdings where source_ref='nmjjibifcuzjlsvfcaaz' and source_key=r.source_key for update;
  select * into r from aevic_private.legacy_claim_requests where id=r.id for update;
  if action='review' then
   if r.user_id=uid or r.status='consumed' or r.version is distinct from (p->>'expectedVersion')::integer or (p->>'decision') not in ('approve','reject') or p->>'decision' is null or p->>'evidenceRef' is null then raise sqlstate '22023' using message='INVALID_STATE';end if;
   if p->>'decision'='approve' and (h.team_id is null or h.claimed_at is not null or (coalesce(h.captain_contact->>'email','')='' and coalesce(h.captain_contact->>'contact','')='') or coalesce(p->>'tokenHash','') !~ '^[a-f0-9]{64}$') then raise sqlstate '22023' using message='INVALID_STATE';end if;
   update aevic_private.legacy_claim_requests set status=case when p->>'decision'='approve' then 'approved' else 'rejected' end,evidence_ref=(p->>'evidenceRef')::uuid,reviewed_by=uid,reviewed_at=now(),token_hash=case when p->>'decision'='approve' then p->>'tokenHash' end,expires_at=case when p->>'decision'='approve' then now()+interval '30 minutes' end,version=version+1 where id=r.id;
   insert into aevic.audit_events(actor_id,action,entity_type,entity_id,metadata) values(uid,'legacy.claim.'||(p->>'decision'),'legacy-claim',r.id,jsonb_build_object('evidenceRef',p->>'evidenceRef'));
   return jsonb_build_object('ok',true,'expiresAt',case when p->>'decision'='approve' then now()+interval '30 minutes' end);
  end if;
  if h.team_id is null or h.claimed_at is not null or r.status<>'approved' or r.expires_at<=now() or r.token_hash is distinct from p->>'tokenHash' then
   insert into aevic.audit_events(actor_id,action,entity_type,entity_id) values(uid,'legacy.claim.invalid','legacy-claim',r.id);return jsonb_build_object('ok',false,'code','CLAIM_INVALID');
  end if;
  -- Serialize claims to different teams by the same account as well.
  perform 1 from auth.users where id=uid for update;
  if exists(select 1 from aevic.team_members where user_id=uid) or exists(select 1 from aevic.teams where id=h.team_id or lower(trim(name))=lower(trim(h.name))) then return jsonb_build_object('ok',false,'code','CLAIM_CONFLICT');end if;
  insert into aevic.profiles(id) values(uid) on conflict(id) do nothing;
  insert into aevic.teams(id,name,slug,approval_status,rejection_reason,created_at,legacy_history_incomplete) values(h.team_id,h.name,'team-'||h.team_id,h.approval_status,h.rejection_reason,h.original_created_at,true);
  insert into aevic.team_members(team_id,user_id,role) values(h.team_id,uid,'OWNER');
  update aevic_private.legacy_team_holdings set claimed_by=uid,claimed_at=now() where team_id=h.team_id;
  update aevic_private.legacy_claim_requests set status='consumed',consumed_at=now(),token_hash=null,version=version+1 where id=r.id;
  update aevic_private.legacy_claim_requests set status='rejected',token_hash=null,version=version+1 where source_key=r.source_key and id<>r.id and status in ('pending','approved');
  insert into aevic.audit_events(actor_id,action,entity_type,entity_id) values(uid,'legacy.claim.complete','team',h.team_id);
  return jsonb_build_object('ok',true,'teamId',h.team_id);
 elsif action='roster-info' then
  select * into h from aevic_private.legacy_team_holdings where aevic_private.member_of(team_id,array['OWNER']);
  if not found then return 'null'::jsonb;end if;
  return jsonb_build_object('teamId',h.team_id,'rosterNames',h.roster_names,'completed',h.roster_completed_at is not null,'historyIncomplete',true);
 elsif action='roster' then
  select * into h from aevic_private.legacy_team_holdings where aevic_private.member_of(team_id,array['OWNER']) for update;
  if not found or h.roster_completed_at is not null then raise sqlstate '22023' using message='INVALID_STATE';end if;
  perform aevic_private.require_member(h.team_id,array['OWNER']);
  if exists(select 1 from aevic.team_players where team_id=h.team_id) or exists(select 1 from aevic.tournament_registrations where team_id=h.team_id) then raise sqlstate '22023' using message='ROSTER_LOCKED';end if;
  if jsonb_typeof(p->'players') is distinct from 'array' or jsonb_array_length(p->'players')<>5 then raise sqlstate '22023' using message='ROSTER_INCOMPLETE';end if;
  if (select count(distinct value->>'uid') from jsonb_array_elements(p->'players'))<>5 or (select count(*) from jsonb_array_elements(p->'players') where value->>'role'='captain')<>1 or (select count(*) from jsonb_array_elements(p->'players') where value->>'role'='starter')<>3 or (select count(*) from jsonb_array_elements(p->'players') where value->>'role'='substitute')<>1 then raise sqlstate '22023' using message='ROSTER_INCOMPLETE';end if;
  for item in select value from jsonb_array_elements(p->'players') loop
   if item->>'ign' is distinct from h.roster_names->>pos or coalesce(item->>'uid','') !~ '^[0-9]{5,20}$' then raise sqlstate '22023' using message='INVALID_REQUEST';end if;
   pid=gen_random_uuid();insert into aevic.players(id,ign,slug) values(pid,item->>'ign','player-'||pid);
   insert into aevic.player_identities(player_id,pubg_id) values(pid,item->>'uid');
   insert into aevic.team_players(team_id,player_id,role) values(h.team_id,pid,item->>'role');pos=pos+1;
  end loop;
  update aevic_private.legacy_team_holdings set roster_completed_at=now() where team_id=h.team_id;
  insert into aevic.audit_events(actor_id,action,entity_type,entity_id) values(uid,'legacy.roster.complete','team',h.team_id);
  return jsonb_build_object('ok',true);
 end if;
 raise sqlstate '22023' using message='INVALID_REQUEST';
end $$;
create function aevic.legacy_claim(action text,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select aevic_private.legacy_claim(action,payload); $$;
revoke all on function aevic.legacy_claim(text,jsonb),aevic_private.legacy_claim(text,jsonb) from public,anon,service_role;
grant execute on function aevic.legacy_claim(text,jsonb),aevic_private.legacy_claim(text,jsonb) to authenticated;

-- A new registration must not squat a held team's verified name before claim.
create function aevic_private.reserve_legacy_name() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from aevic_private.legacy_team_holdings where lower(trim(name))=lower(trim(new.name)) and team_id<>new.id) then raise unique_violation using message='TEAM_NAME_UNAVAILABLE';end if;
 return new;
end $$;
create trigger legacy_reserved_name before insert or update of name on aevic.teams for each row execute function aevic_private.reserve_legacy_name();
revoke all on function aevic_private.reserve_legacy_name() from public,anon,authenticated,service_role;
