-- Runs only inside the CLI's locked transaction. No source reads or writes.
-- Existing target rows must be unchanged matches of this import's own ledger.
do $$ declare p jsonb; player jsonb; prior aevic_private.legacy_import_map; account jsonb; inserted integer; held aevic_private.legacy_team_holdings;
begin
 for p in select value from jsonb_array_elements(current_setting('aevic.legacy_import_payload')::jsonb->'unclaimed') loop
  select * into held from aevic_private.legacy_team_holdings where source_ref=p->>'sourceRef' and source_key=p->>'sourceKey';
  if found then
   if held.team_id<>(p->>'teamId')::uuid or held.payload_hash<>p->>'payloadHash' or held.name<>p->>'name' or held.approval_status<>p->>'approvalStatus' or held.roster_names<>p->'rosterNames' or held.captain_contact<>p->'captainContact' or held.media_references<>p->'mediaReferences' or held.original_created_at<>(p->>'createdAt')::timestamptz or held.legacy_status<>p->>'legacyStatus' or held.tier is distinct from p->>'tier' or held.rejection_reason is distinct from p->>'rejectionReason' then raise exception 'MAPPED_SOURCE_CHANGED';end if;
   insert into import_outcome values(p->>'reference','unchanged');
  else
   if exists(select 1 from aevic.teams where id=(p->>'teamId')::uuid or lower(trim(name))=lower(trim(p->>'name'))) or exists(select 1 from aevic_private.legacy_team_holdings where team_id=(p->>'teamId')::uuid or lower(trim(name))=lower(trim(p->>'name'))) then raise exception 'TARGET_TEAM_CONFLICT';end if;
   insert into aevic_private.legacy_team_holdings(team_id,source_ref,source_key,name,approval_status,legacy_status,tier,rejection_reason,original_created_at,roster_names,media_references,captain_contact,history_scope,payload_hash)
   values((p->>'teamId')::uuid,p->>'sourceRef',p->>'sourceKey',p->>'name',p->>'approvalStatus',p->>'legacyStatus',p->>'tier',p->>'rejectionReason',(p->>'createdAt')::timestamptz,p->'rosterNames',p->'mediaReferences',p->'captainContact',p->>'historyScope',p->>'payloadHash');
   insert into import_outcome values(p->>'reference','created');
  end if;
 end loop;
 for account in select value from jsonb_array_elements(current_setting('aevic.legacy_import_payload')::jsonb->'accounts') loop
  if not exists(select 1 from auth.users where id=(account->>'id')::uuid) then raise exception using errcode='P0001',message='AUTH_IDENTITY_MISSING';end if;
  insert into aevic.profiles(id) values((account->>'id')::uuid) on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  insert into import_profile_outcome values(account->>'reference',case when inserted=1 then 'created' else 'retained' end);
 end loop;
 for p in select value from jsonb_array_elements(current_setting('aevic.legacy_import_payload')::jsonb->'teams') loop
  if not exists(select 1 from auth.users where id=(p->>'ownerId')::uuid) then raise exception using errcode='P0001',message='OWNER_AUTH_MISSING';end if;
  select * into prior from aevic_private.legacy_import_map where source_ref=p->>'sourceRef' and source_table='public.teams' and source_key=p->>'sourceKey';
  if found then
   if prior.target_id<>(p->>'teamId')::uuid or prior.payload_hash<>p->>'payloadHash' then raise exception using errcode='P0001',message='MAPPED_SOURCE_CHANGED';end if;
   if not exists(select 1 from aevic.teams where id=prior.target_id and name=p->>'name' and slug=p->>'slug' and approval_status=p->>'approvalStatus' and created_at=(p->>'createdAt')::timestamptz) then raise exception using errcode='P0001',message='TARGET_TEAM_CHANGED';end if;
   if not exists(select 1 from aevic.profiles where id=(p->>'ownerId')::uuid) or not exists(select 1 from aevic.team_members where team_id=prior.target_id and user_id=(p->>'ownerId')::uuid and role='OWNER' and status='ACTIVE') then raise exception using errcode='P0001',message='TARGET_OWNER_CHANGED';end if;
   if (select count(*) from aevic.team_players where team_id=prior.target_id)<>5 then raise exception using errcode='P0001',message='TARGET_ROSTER_CHANGED';end if;
   for player in select value from jsonb_array_elements(p->'players') loop
    if not exists(select 1 from aevic.players pl join aevic.player_identities i on i.player_id=pl.id join aevic.team_players r on r.player_id=pl.id where pl.id=(player->>'id')::uuid and pl.ign=player->>'ign' and i.pubg_id=player->>'pubgId' and r.team_id=prior.target_id and r.role=player->>'role') then raise exception using errcode='P0001',message='TARGET_ROSTER_CHANGED';end if;
   end loop;
   insert into import_outcome values(p->>'reference','unchanged');
  else
   if exists(select 1 from aevic.teams where id=(p->>'teamId')::uuid or lower(trim(name))=lower(trim(p->>'name')) or slug=p->>'slug') then raise exception using errcode='P0001',message='TARGET_TEAM_CONFLICT';end if;
   if exists(select 1 from aevic.team_members where user_id=(p->>'ownerId')::uuid) then raise exception using errcode='P0001',message='TARGET_OWNER_CONFLICT';end if;
   for player in select value from jsonb_array_elements(p->'players') loop
    if exists(select 1 from aevic.players where id=(player->>'id')::uuid) or exists(select 1 from aevic.player_identities where pubg_id=player->>'pubgId') then raise exception using errcode='P0001',message='TARGET_PLAYER_CONFLICT';end if;
   end loop;
   -- Historical users predate on_signup. Backfill only missing profile IDs;
   -- never invoke on_signup, copy editable metadata or modify Auth accounts.
   insert into aevic.teams(id,name,slug,approval_status,created_at) values((p->>'teamId')::uuid,p->>'name',p->>'slug',p->>'approvalStatus',(p->>'createdAt')::timestamptz);
   insert into aevic.team_members(team_id,user_id,role,created_at) values((p->>'teamId')::uuid,(p->>'ownerId')::uuid,'OWNER',(p->>'ownerSince')::timestamptz);
   for player in select value from jsonb_array_elements(p->'players') loop
    insert into aevic.players(id,ign,slug) values((player->>'id')::uuid,player->>'ign','player-'||(player->>'id'));
    insert into aevic.player_identities(player_id,pubg_id) values((player->>'id')::uuid,player->>'pubgId');
    insert into aevic.team_players(team_id,player_id,role) values((p->>'teamId')::uuid,(player->>'id')::uuid,player->>'role');
   end loop;
   insert into aevic_private.legacy_import_map(source_ref,source_table,source_key,target_id,payload_hash) values(p->>'sourceRef','public.teams',p->>'sourceKey',(p->>'teamId')::uuid,p->>'payloadHash');
   insert into import_outcome values(p->>'reference','created');
  end if;
 end loop;
end $$;
