-- Current custom sessions/rate limits use aevic_platform, not these legacy tables.
-- Public identities remain on public.teams and published platform projections.
-- Media writes use authenticated backend handlers (Cloudinary, private DB media,
-- or the server-only Supabase service credential); public object delivery is retained.
-- Apply to production ONLY after separate authorization and consumer review.
begin;
do $$
declare target text; columns text;
begin
 foreach target in array array['admin_sessions','rate_limits','tournament_state'] loop
  if to_regclass(format('public.%I',target)) is null then continue; end if;
  execute format('revoke all privileges on table public.%I from public, anon, authenticated',target);
  select string_agg(format('%I',attname),', ' order by attnum) into columns
   from pg_attribute where attrelid=to_regclass(format('public.%I',target)) and attnum>0 and not attisdropped;
  if columns is not null then
   execute format('revoke select (%1$s), insert (%1$s), update (%1$s), references (%1$s) on table public.%2$I from public, anon, authenticated',columns,target);
  end if;
 end loop;
end $$;
-- Remove only the three observed unrestricted mutation policies. Do not revoke
-- Storage table grants globally, drop buckets/objects, or change public visibility.
drop policy if exists aevic_media_public_write on storage.objects;
drop policy if exists aevic_media_public_update on storage.objects;
drop policy if exists aevic_media_public_delete on storage.objects;
commit;
