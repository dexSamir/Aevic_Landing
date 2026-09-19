-- Server validates/re-encodes binary input. Direct client uploads are deliberately denied.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('team-logos','team-logos',true,6000000,array['image/png','image/webp']),
 ('team-banners','team-banners',true,6000000,array['image/png','image/webp']),
 ('dispute-evidence','dispute-evidence',false,4000000,array['image/png','image/webp','application/pdf']);
create policy aevic_public_brand_read on storage.objects for select to anon,authenticated using(bucket_id in ('team-logos','team-banners'));
-- No evidence read policy: authorized API signs a short-lived URL after verifying team access.
-- Never publish match_rooms, player_identities, profiles, or evidence to Realtime.
alter publication supabase_realtime add table aevic.notifications, aevic.matches, aevic.check_ins, aevic.tournament_registrations, aevic.messages;

-- Only a count is public; pending registrations and their identities remain private.
create function aevic.tournament_capacity() returns table(tournament_id uuid, used_slots bigint) language sql stable security definer set search_path='' as $$
 select t.id,count(r.id) from aevic.tournaments t left join aevic.tournament_registrations r on r.tournament_id=t.id and r.status in ('pending','confirmed') where t.status<>'draft' group by t.id;
$$;
grant execute on function aevic.tournament_capacity() to anon,authenticated;
