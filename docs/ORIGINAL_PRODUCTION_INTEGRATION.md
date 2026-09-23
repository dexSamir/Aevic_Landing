# Original production integration

2026-09-24. This document supersedes the normalized-schema, migration, staging and claiming instructions elsewhere in this repository for the current application. Do not run those workflows for this integration.

## Runtime and sources

`server/app.ts` mounts only `server/routes/production.ts`. `server/db.ts` uses `public` with the publishable/anon key. Privileged-client requests fail closed. No `aevic` router, RPC, membership, holding or claim workflow is reachable from the running API. Older source files remain unmounted as historical implementation; they are not alternate data sources.

The only runtime database source is existing `public.teams` in `nmjjibifcuzjlsvfcaaz`. It uses an explicit public column projection and `id::text` at the database boundary to preserve bigint IDs. Team IDs and profile URLs stay numeric strings. Player IDs are stable presentation keys `<team id>:player<slot>`, not new database records or ownership identities. No captain role is inferred from a player slot or email. Original tier/status are separate from verification badges.

Connected reads: public context, team directory/search/name availability, original-ID detail pages, five-slot roster and photo mapping, tier/status filtering, match-history/form/map/season endpoints scoped strictly to `teams.match_results`, and public identity sharing. A nonempty or unknown result format returns `MATCH_RESULTS_CONTRACT_UNAVAILABLE`; profile identity remains usable with `historyAvailable:false`. Empty source arrays do not establish that external history never existed. Career/Wrapped/competition comparisons are unavailable rather than invented.

Public responses exclude captain contacts, email, password hashes, reset tokens, room credentials and rejection notes. Existing logos and public photo URLs are mapped; no media binaries or records are copied.

## Read-only production verification

The configured server publishable key initially failed with `Invalid API key`. The already-present frontend publishable key for the same project succeeded. Local ignored `.env` was corrected to use that existing key, without exposing its value.

The actual Hono implementation was exercised against production with GET requests only:

- Context: HTTP 200, exactly seven teams.
- IDs: `2`, `7`, `8`, `9`, `10`, `12`, `16`.
- All seven detail/history endpoints: HTTP 200; matching original identity; five roster entries each.
- All teams have `tier=entry`, `status=pending`; all seven `match_results` arrays are empty.
- All 35 player-photo fields are empty. Each logo field contains a relative `/api/media/<uuid>` reference. These references are preserved, but the original media handler/object mapping is unavailable. The current frontend falls back to initials; logo rendering is NOT claimed as verified.
- Read-only `public.tournament_state` query: HTTP 200 with no rows visible to the publishable key. This does not prove the table is empty under other roles.
- Public OpenAPI metadata: HTTP 401, `Secret API key required`. No privileged key was requested or used.
- Supabase CLI has no authenticated management session.

The local browser rendered all seven production teams with original-ID links. No production writes, Auth signup/login/reset attempts, migrations, deployments, record copies or schema modifications were performed.

## Original implementation investigation and blockers

`/Users/samirhebibov/Documents/aevic-FE` and its available Git history/branches were inspected. Its current `src/services/teamAuth.ts` assumes Supabase Auth UUIDs equal team IDs; its configured project is a DIFFERENT project (`bxpestaxdcuzbjhdzuos`). This cannot establish ownership of the bigint records in the requested production project. A history search for `password_hash` found no original verifier. Its season/match/admin_users services likewise do not verify those tables in the requested production database.

The earlier owner-supplied audit (`LEGACY_DATABASE_AUDIT.md`) identifies production `teams`, `tournament_state`, `admin_sessions`, `rate_limits`, and zero Auth users at the time of that audit. The latter count was NOT rechecked in this task.

| Feature | Current result | Exact missing contract |
|---|---|---|
| Captain login, password recovery, registration | Explicit unavailable state / HTTP 501 | Original password verifier, session validation/issuance, registration and recovery handlers |
| Team profile/roster/contact writes and captain dashboard | Explicit unavailable state / HTTP 501 | Verified session-to-bigint-team authorization; no email ownership inference |
| Admin login and all operations | Explicit unavailable state / HTTP 501 | Original admin session verifier/role authority and supported mutation handlers |
| Tournament list/details/registration, scheduling, results, standings | Explicit unavailable state / HTTP 501 | `tournament_state` record structure and business rules; none visible with authorized public access |
| Media references | Preserved; initials fallback if unavailable | Original `/api/media/<id>` resolver and object mapping |
| Organizations, follows, notifications, support, achievements, uploads, ownership transfer | Explicit unavailable state / HTTP 501 | No verified corresponding original backend contracts |

**Authorized production writes connected: none.** Implementing them without the missing original authorization contract would violate the requested security boundary. No new Auth account, ownership claim, replacement table or service-role bypass is offered as a substitute.

Snapshot array containers for unsupported domains are retained only for frontend type compatibility and paired with an explicit `unavailable` map. The frontend displays an integration notice and blocks competition views from presenting those containers as verified empty datasets. Dedicated unavailable APIs return 501, not successful empty results. Stale normalized Auth cookies do not grant access; logout clears local cookies.

## Configuration

For the existing deployment's configuration (do not deploy as part of this task):

- `SUPABASE_URL=https://nmjjibifcuzjlsvfcaaz.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`): the valid existing project's public key. Replace the rejected server value with the verified existing public key in the deployment environment; do not send secrets in chat.
- `PUBLIC_SITE_URL`: the existing site's HTTPS origin. Keep `VITE_PUBLIC_SITE_URL` consistent if set.
- `VITE_API_BASE_URL=/api`.
- `VITE_PUBLIC_MEDIA_ORIGIN=https://nmjjibifcuzjlsvfcaaz.supabase.co` for existing public Storage images. Build CSP now also derives this origin from server `SUPABASE_URL`.
- No service-role key is needed or read. No new secrets are required.

`npm run dev` now loads server configuration from local `.env` without putting it into browser defines. Netlify retains its same-origin function rewrite and production function entry point; no hosting changes were made.

## Validation

- `npm run lint`: passes frontend and server TypeScript checks.
- `npx vitest run --config vitest.server.config.ts tests/server/production.test.ts`: 15 passing isolated transport tests. They cover lossless IDs, pagination, privacy projections/response whitelists, original-key configuration, unsafe URLs, unknown history, unavailable operations, stale sessions and origin checks. These fixtures are tests only; runtime endpoints never return fixture records.
- `npm run build`: passes TypeScript, Vite and static-shell generation. Vite reports unresolved asset-placeholder warnings in existing artwork CSS; no new artwork pipeline changes were made.
- `node --env-file=.env scripts/verify-original-production.mjs`: read-only live Hono verification; reports IDs/counts/statuses, not private team fields.
- The pre-existing `tests/server` tests for normalized Auth, claiming and UUID competition RPCs describe the retired architecture. They were not used as evidence for this integration and have not been rewritten to pretend those operations remain available.

The inspect scripts use only GET with the public key. `inspect-original-tournament-state.mjs` prints shapes/types, not scalar record values; it deliberately does not print credentials. Nothing here creates database objects.

## Changed files

- Backend: `server/app.ts`, `server/config.ts`, `server/db.ts`, `server/routes/production.ts`, `server/services/productionTeams.ts`.
- Frontend data/capabilities: `src/types/domain.ts`, `src/services/PlatformDataContext.tsx`, `src/services/capabilities.ts`, `src/services/apiError.ts`.
- Existing UI bindings: `src/pages/ProfilePages.tsx`, `src/pages/AuthPages.tsx`, `src/components/profile/DirectoryTeamCard.tsx`, `src/components/profile/PublicTeamDetail.tsx`, `src/components/profile/PublicTeamIdentity.tsx`, `src/components/profile/PublicTeamFeatures.tsx`, `src/styles/public-pages.css`.
- Configuration/build: `.env.example`, `vite.config.ts`, `scripts/build-config.mjs`; local ignored `.env` server public-key correction.
- Verification: `tests/server/production.test.ts`, `scripts/verify-original-production.mjs`, `scripts/inspect-original-production.mjs`, `scripts/inspect-original-tournament-state.mjs`.
- Documentation: `README.md`, this document.
