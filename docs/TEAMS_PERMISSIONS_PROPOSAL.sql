-- Applied with explicit user approval on 2026-09-24; retained for review, not auto-run.
-- Verified at commit: all seven complete records unchanged; both public roles see
-- IDs 2,7,8,9,10,12,16; private columns and public writes inaccessible.
-- Original project nmjjibifcuzjlsvfcaaz. Execute as existing postgres owner.
-- No rows, IDs, policies, schemas, tables or passwords are changed.
-- Existing teams_public_select USING(true) and enabled RLS remain in place.
-- Existing postgres backend connection retains its owner/BYPASSRLS access;
-- this proposal does not claim that connection is least privilege.
-- Direct browser SELECT * and writes will stop; the public 17-column listing
-- remains available. Captain reset/login/registration/profile/roster use the BFF.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';

REVOKE ALL PRIVILEGES ON TABLE public.teams FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, team_name, logo_url, tier, status, created_at,
  player1_ign, player2_ign, player3_ign, player4_ign, player5_ign,
  player1_photo_url, player2_photo_url, player3_photo_url,
  player4_photo_url, player5_photo_url, match_results
) ON TABLE public.teams TO anon, authenticated;
-- Browser roles never allocate IDs. Identity allocation stays with PostgreSQL.
REVOKE ALL PRIVILEGES ON SEQUENCE public.teams_id_seq FROM PUBLIC, anon, authenticated;

DO $checks$
BEGIN
  IF (SELECT array_agg(id ORDER BY id) FROM public.teams)
      IS DISTINCT FROM ARRAY[2,7,8,9,10,12,16]::bigint[] THEN
    RAISE EXCEPTION 'Unexpected team IDs; rolling back permission changes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (
      has_table_privilege(r.oid,'public.teams','SELECT,DELETE,TRUNCATE,TRIGGER') OR
      has_any_column_privilege(r.oid,'public.teams','INSERT,UPDATE,REFERENCES') OR
      EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid='public.teams'::regclass
        AND a.attnum>0 AND NOT a.attisdropped
        AND a.attname IN ('password_hash','reset_token','email','captain_name',
          'captain_contact','room_id','room_password','rejection_reason')
        AND has_column_privilege(r.oid,a.attrelid,a.attnum,'SELECT'))
    )
  ) THEN RAISE EXCEPTION 'Unexpected browser privileges; rolling back'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.teams'::regclass)
    THEN RAISE EXCEPTION 'RLS must remain enabled'; END IF;
END
$checks$;
COMMIT;
