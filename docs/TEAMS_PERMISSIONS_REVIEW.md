# Existing public.teams permission review

Target: `nmjjibifcuzjlsvfcaaz`. Date: 2026-09-24. **Read-only investigation; proposal not applied.** No application edits, database objects, grants, policies, records, sequence values or deployments were changed in this review. The only new files are this report and the two review SQL files alongside it.

## Evidence and limits

- Owner-provided finding: `anon` and `authenticated` have SELECT, INSERT, UPDATE and REFERENCES on sensitive columns. This is accepted as supplied evidence; their exact grant sources and policy definitions were not supplied.
- Repeated live GET-only public-key check: selecting `password_hash`, `reset_token`, and `email,captain_contact,room_password` with `limit=0` returned HTTP 200. No sensitive values were fetched. This establishes accepted column selection, not successful writes or the RLS configuration.
- The public GET returned precisely IDs **2, 7, 8, 9, 10, 12, 16**. No record was modified.
- Available workspace configuration still has no `AEVIC_DATABASE_URL`, service-role key, or management token. No Supabase SQL/MCP connector is available in this session. The available in-app browser has no authenticated dashboard tab. Consequently **live policy names/expressions, table owner, inherited grant sources, actual backend database role, ID identity/default/trigger, and sequence name remain unverified**. A publishable key cannot substitute for catalog access. There was no attempt to manufacture an authenticated JWT or execute write probes.

Artifacts:

- [Exact ACL proposal and conditional RLS/sequence SQL](TEAMS_PERMISSIONS_PROPOSAL.sql). Deliberately not a migration. Backend-role identifiers are unresolved placeholders; conditional policy/sequence statements are commented, and the transaction ends with ROLLBACK. It is not a production-ready apply script until catalog results resolve those conditions.
- [Catalog-only inspection SQL](TEAMS_READ_ONLY_CATALOG.sql). BEGIN READ ONLY; catalog SELECTs; ROLLBACK. No product-row values, credentials, raw trigger bodies, nextval/setval, or write tests. Run through an already-authorized catalog connection; supply sanitized metadata, not connection secrets. Trigger body fingerprints/hints are not proof of behavior; a literal-bearing policy or trigger dependency may require private operator review.

## Minimum target permissions

| Principal | Required teams permissions | Must not have |
|---|---|---|
| `anon`, `authenticated` | SELECT on the exact 17-column public projection below; existing public-schema USAGE | Table-wide SELECT; private-column SELECT; any INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER or grant options |
| Existing dedicated trusted captain DB role | Explicit 23-column SELECT, 12-column INSERT, 16-column UPDATE from proposal B; public-schema USAGE | UPDATE of id/email/status/tier/room credentials/results/creation date/rejection reason; DELETE/TRUNCATE/REFERENCES/TRIGGER/grant options; browser role membership |
| Existing ID sequence, if a nextval default requires it | Backend USAGE only, on the verified exact sequence | Public/API sequence access; backend UPDATE/setval permission |

The exact public projection is `id, team_name, logo_url, tier, status, created_at, player1_ign, player2_ign, player3_ign, player4_ign, player5_ign, player1_photo_url, player2_photo_url, player3_photo_url, player4_photo_url, player5_photo_url, match_results`. It matches `PUBLIC_TEAM_COLUMNS` in `server/services/productionTeams.ts:7`; SQL column privileges refer to `id`, whereas the API selects `id::text` to preserve bigint precision. `match_results` remains public to preserve current queries; it must remain public result data, not a container for private information. The current adapter supports only its verified empty-array format.

Public ACL core:

```sql
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, team_name, logo_url, tier, status, created_at,
  player1_ign, player2_ign, player3_ign, player4_ign, player5_ign,
  player1_photo_url, player2_photo_url, player3_photo_url,
  player4_photo_url, player5_photo_url, match_results
) ON TABLE public.teams TO anon, authenticated;
```

Apply only in a subsequently approved transaction that also supplies any required backend/RLS permissions. Revoking a private column alone cannot counter a table-wide SELECT grant. PostgreSQL table revocation also removes corresponding direct column grants from that grant source; a redundant per-column revocation is not necessary. Grants inherited from other roles, grants by other grantors, or SET ROLE access still need inspection. The effective `has_*_privilege` checks must pass after the proposal. `PUBLIC` denotes every role, not the `public` schema; identify any existing consumer relying solely on those grants before applying. Do not use CASCADE to bypass a dependent-grant error. [PostgreSQL REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html), [Supabase column security](https://supabase.com/docs/guides/database/postgres/column-level-security).

Removing REFERENCES removes future foreign-key-definition authority, not existing team records or existing FK constraints. RLS does not replace REFERENCES/TRUNCATE privilege control. No schema-wide revoke or ALTER DEFAULT PRIVILEGES is needed for this existing-table correction.

The backend safety check examines effective permissions for both API roles. Keeping INSERT/UPDATE grants but relying on RLS denial still produces `AUTH_DATABASE_PERMISSIONS_UNSAFE`. Its private SELECT statement always requests the full projection, even for login, so granting just email/password_hash would not make the current code work. Proposal B matches the actual columns used; it omits room_id and room_password completely.

## RLS: conditional minimum, not guessed policy changes

1. If RLS is enabled and the existing SELECT/ALL policies already expose the intended seven public records, retain that public read behavior. **Zero RLS edits may be necessary** once public ACLs are corrected and backend access is verified. Do not add an `approved`-only predicate: all seven known teams were pending in the prior read-only audit, and that would hide them.
2. Existing public write policies cannot authorize writes after the corresponding ACL privileges are removed. Deleting them is optional defense-in-depth, not necessary for the minimum ACL fix. They become relevant again if privileges are later regranted.
3. If RLS is disabled, enabling it must occur in the same approved transaction as the required read/server policies. Otherwise PostgreSQL defaults to no visible rows for ordinary roles. Preserve a verified existing business predicate; `USING(true)` is appropriate only if every team's public identity is intended to be listed.
4. For a non-owner/NOBYPASSRLS backend role, retain suitable existing policies or add only missing SELECT, INSERT and UPDATE policies scoped to that exact server role. Proposal C includes conditional SQL. SELECT/UPDATE require all-row eligibility because the server performs email lookup, uniqueness checks, reset and session verification. Backend INSERT can check pending/entry, provided no other applicable permissive policy widens it. There is no DELETE requirement.
5. Policies combine: permissive policies can widen access, restrictive policies can still block it. A new permissive `USING(true)` does not cancel a restrictive predicate. `ALTER POLICY` can change roles/expressions but not the command or permissiveness. Without catalog results, exact existing policy alterations would be invented. [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html), [ALTER POLICY](https://www.postgresql.org/docs/current/sql-alterpolicy.html).

The current BFF uses its own signed captain cookies and one trusted PostgreSQL connection. It does not use Supabase Auth JWTs or set a per-team SQL session variable. **Do not add `auth.uid() = id` or grant authenticated write access**: a UUID Auth identity is not an original bigint team ID. Row ownership is checked in the server, and writes compare the current hash. Backend-wide row policies must be confined to a server-only role that anon/authenticated cannot inherit or SET ROLE into. An existing owner/BYPASSRLS role may already bypass RLS, but is not the least-privileged target; granting BYPASSRLS is not part of this proposal. If no suitable existing role exists, strict least privilege cannot be achieved here without a separately authorized role change. No role is created by this work.

Check public-callable SECURITY DEFINER routines and owner-executed views for alternate read/write paths. Base-table revokes do not prove such wrappers safe. The catalog file lists candidates without executing them or printing their bodies. Dynamic SQL dependencies may need private inspection; do not bulk-revoke unrelated routines or views.

## ID generator: not yet determined

The seven numeric IDs and gaps between them do not identify their generator. Inspection must distinguish:

| Metadata result | Interpretation | Required action |
|---|---|---|
| `attidentity='a'` or `'d'` | GENERATED ALWAYS/BY DEFAULT identity | Preserve definition and associated sequence. Insert omits id. No separate sequence grant for the identity-generated value itself. |
| Empty `attidentity`, default calls nextval, sequence dependency found | Serial/sequence-backed default | Preserve default/sequence; backend requires USAGE on that exact sequence unless already effectively granted. No UPDATE or setval permission. |
| No identity/default; BEFORE INSERT trigger assigns NEW.id | Trigger-based generator | Preserve trigger; review invoker/definer and actual dependencies before granting anything. **Current backend rejects this form** at `server/captain/postgres.ts:24`, for all operations using ready(), not just registration. A verified-trigger-aware code adjustment is needed; GRANT/RLS changes alone cannot fix it. |
| No verified generator, or opaque function default | Still unresolved | Stop registration activation; do not invent a sequence, set IDs manually, or reseed. |

`pg_get_serial_sequence('public.teams','id')` discovers an associated identity/serial sequence; NULL does not rule out an unowned sequence or trigger. The catalog file also examines default dependencies and INSERT triggers. It does not call generators. [PostgreSQL catalog functions](https://www.postgresql.org/docs/current/functions-info.html), [identity columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html). The identity privilege distinction is supported by PostgreSQL's identity expression using `nextval_internal(..., false)`; explicit nextval has its own sequence privilege check. [PostgreSQL executor source](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/executor/execExprInterp.c#L2563), [sequence functions](https://www.postgresql.org/docs/17/functions-sequence.html).

Do not grant sequence rights to anon/authenticated, change bigint IDs, detach/recreate a sequence, disable triggers, or call nextval/setval for verification. Proposed changes contain no row DML. `password_hash`/`reset_token` type compatibility and required registration defaults remain separate catalog prerequisites; grants cannot fix incompatible column types.

## Route/query impact

All route paths below are prefixed `/api`. The React app uses this API adapter; the active public reader uses the publishable key and an explicit projection. Retired normalized-schema files are not mounted by `server/app.ts`.

| Query or route / frontend area | Permission change and effect |
|---|---|
| GET `/public/context`, `/public/teams`, `/public/teams/:id`; public directory, profile and identity cards | Kept working by the 17-column SELECT grant plus existing public read visibility. No captain/private fields are granted. |
| GET `/search`, `/registrations/team-name`; search and registration name check | Preserved. Both currently load the entire shared projection; granting only id/team_name is insufficient without a code change. |
| GET `/public/teams/:id/matches`, `/form`, `/map-specialization`, `/seasons`, `/map-performance`; history/form | Preserved through match_results and the same projection. Does not enable unsupported history formats. |
| Direct REST `select=*`, private-column reads, INSERT/PATCH/DELETE using anon/authenticated | Intentionally denied; select=* cannot read the withheld columns. No active supported frontend route requires these direct private operations. External/old clients relying on them must use the BFF. |
| POST `/auth/login`; GET `/me/session`, `/me/team`, `/me/account`, `/me/2fa` | Backend SELECT projection is required. Public grant cleanup removes the ready() safety failure. No browser private SELECT grant is needed. |
| POST `/auth/password-reset`, `/inspect`, `/confirm` | Backend SELECT plus UPDATE reset_token/password_hash only. Same existing row; no public reset-token privilege. |
| POST `/auth/logout`; DELETE `/me/sessions/others`; PUT `/me/account/password` | Backend hash/reset UPDATE. HTTP DELETE here does **not** require SQL DELETE on teams. |
| POST `/registrations` | Backend SELECT for uniqueness, INSERT of the 12 submitted columns, and existing generator permissions. No id INSERT or team overwrite. Photos are later UPDATEs. |
| PATCH `/teams/:id`; PUT `/teams/:id/roster/:slot`; PATCH `/me/account` | Backend column UPDATE for name/IGN/captain info. ID and current hash are used in authorized WHERE clauses, not changed. |
| POST `/media/uploads` | Backend UPDATE logo_url or one photo URL after owner verification. Storage upload permissions/key remain a separate prerequisite; no new public Storage rights are proposed. |
| GET `/media/:id` | Backend SELECT of id/image references remains available. Existing storage.objects/storage.buckets SELECT/RLS must separately permit public-object lookup; teams grants alone do not restore unresolved files. |
| GET `/me/context`; captain dashboard | Requires both private backend projection and the public projection because history is loaded through ProductionTeams. Preserve both paths. |
| Room credentials, admin/competition/notifications/ownership and other unavailable routes | No new privileges proposed. Grants do not establish their missing authorization/data contracts. |

## Verification before any future approval to apply

Obtain the catalog results, actual backend role, and ID generator. Select only required RLS changes, resolve inherited grants and review dependent consumers. Run the eventual approved changes atomically, then require: all effective public private-read/write/REFERENCES checks false; all 17 public SELECT checks true; RLS visibility still the same seven IDs; backend effective grants exactly sufficient; no unreviewed wrapper exposure. Public read tests can run in read-only transactions after policies/functions are reviewed. No production INSERT/UPDATE test or sequence advancement is needed for this review.

Only text/static consistency checks were performed on these SQL proposals; they were **not executed or validated against the production catalogs**. Application TypeScript/build tests would not establish PostgreSQL policy correctness, so no implementation/test rerun is claimed for this read-only task.
