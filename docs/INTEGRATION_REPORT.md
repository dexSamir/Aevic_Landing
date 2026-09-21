# AEVIC integration completion report

2026-09-20. React / TypeScript / Hono / Supabase and the API-only architecture are preserved. The current legacy-claim changes are uncommitted. No production access/change, real Auth user creation, activation email, remote migration, push or deployment occurred. **LIVE STAGING VERIFIED: none.**

## Current legacy-account implementation

**IMPLEMENTED:** the existing planner required Auth owners even though the verified source has zero Auth users. V2 now preserves reviewed legacy teams in private pending holdings with stable IDs and no invented owners, PUBG IDs or history. Migration seven adds confirmed-account claiming, narrow moderator review, audit and persistent rate limits, versioned approvals, hashed 256-bit single-use codes with a 30-minute lifetime, and atomic concurrency protection. Original names, dates, mapped/raw status, tier, roster names, rejection reason and associated media references are preserved. Claiming does not lift a ban. Existing six migrations are unchanged.

Activation, own request/redeem/roster completion and admin review UI use nine real API methods across three new routes. A browser test exposed empty 202 responses incompatible with the JSON adapter; both receipt endpoints now return neutral JSON and an adapter-to-Hono regression covers them. Capability metadata was added for the new private/Auth routes. Email confirmation now offers claiming to accounts without a team, retaining the team-workspace path for existing captains. The incomplete-history flag is explicitly selected and granted for read access; owners cannot clear it. Public profile, directory, comparison, workspace, Wrapped and complete-career cards distinguish new official results from unresolved older history. Tournament Share Studio remains based on actual published results.

Main additions: `scripts/legacy-migration/unclaimed.mjs`, V2 import handling and pinned contract; `supabase/migrations/20260920082715_legacy_account_claiming.sql`; `server/routes/legacyClaims.ts`; `src/pages/LegacyClaimPages.tsx`; `src/types/legacyClaims.ts`; planner/SQL/server/component/browser tests. Coordinated changes: service contracts/adapter, router/manifest, login/account/admin entry links, repository projections and history display components. The route/contract inventories now cover **99 routes / 162 methods**.

| Current verification category | Actual result |
|---|---|
| Planner unit tests | 18 PASS; synthetic V1/V2 inputs, source binding, exclusions, stable IDs, held states and private reports |
| PostgreSQL migration/claim suite | 32 PASS including parent tests; zero-Auth seven-holding import, replay, private access, proof/confirmation/expiry, wrong account, revoke/stale review, parallel claimants, rate/audit, genuine roster completion, history-column access and preserved ban |
| Existing SQL policy/integration suite | PASS against seven migrations in disposable local PostgreSQL; Supabase system bootstrap is test-only |
| Domain / component suite | 20 / 236 PASS; includes six new legacy UI tests; no broad responsive matrix |
| Hono / Supabase HTTP fixtures | 41 PASS; activation, confirmation cookie exchange, neutral recovery/receipts, errors/rates, roles, token hashing, adapter response contracts and public history projection |
| Focused browser HTTP fixtures | 6 PASS; desktop/mobile activation failure/retry, neutral request and receipt reload, evidence review/code display/removal, DOM overflow checks |
| TypeScript/lint, production build, release package policy, diff whitespace | PASS; build produces 75 route shells and 99 definitions; no release ZIP created |
| Live Supabase/Netlify staging | NOT VERIFIED; no provider mail, real confirmation, Storage or actual-seven reconciliation performed |
| Production cutover | NOT VERIFIED / NOT AUTHORIZED |

The browser receipt reload test uses persisted state in an explicit test HTTP handler; it proves rendering across reload, **not database persistence**. Database persistence/atomicity are exercised separately in actual local PostgreSQL, and Hono/Auth calls use HTTP fixtures. No fixture category is described as live staging.

**UNSUPPORTED / DEFERRED:** automatic claim-code delivery (authorized moderator manually uses the independently verified original channel); missing-contact recovery shortcuts; hosted CLI transport; source media binary transfer/attachment; external historical transformers and automatic legacy URL aliases. Unknown history keeps full-career exports unavailable. The legacy password algorithm could not be established from repository code or supplied column metadata; no real hash was viewed or reused.

**MANUAL CONFIGURATION / BLOCKERS:** authorize a separate staging Supabase project and Netlify site, review/apply migrations separately, expose only `aevic`, enable required Auth email confirmation, configure staging TokenHash templates/redirects and SMTP with controlled inboxes, provision a least-privilege reviewer, and maintain a protected independent-evidence register/original-channel delivery process. Hosted import transport needs separate review. Independently reconcile all seven actual teams and ownership cases in staging before declaring migration complete. Production remains untouched.

Detailed procedures: [source audit](LEGACY_DATABASE_AUDIT.md), [migration and staging rehearsal](DATA_MIGRATION_PLAN.md), [configuration](BACKEND_SETUP.md), [separately authorized cutover/rollback](PRODUCTION_CUTOVER_PLAN.md).

## Earlier API-only hardening evidence

The following sections retain the previous hardening results and limitations. Their six-migration test counts describe that earlier baseline; the current verification above supersedes them.

## Implemented defects and fixes

| Actual defect | Implemented correction | Main files |
|---|---|---|
| Selectable local mock adapter, fictional application datasets, auth bypass and simulated media success | Deleted runtime selectors/adapters/data; API-only bootstrap; real guards, upload path and explicit errors; retained fixtures only under tests | `src/services/index.ts`, `capabilities.ts`, `src/layouts/layouts.tsx`, `TeamMediaPreview.tsx`, `vite.config.ts`, `tests/fixtures` |
| Local frontend had no same-process real API | Vite mounts the existing Hono app; server environment must be supplied explicitly; missing configuration returns 503 | `vite.config.ts`, `.env.example`, `scripts/build-config.mjs` |
| PostgreSQL global PUBLIC EXECUTE survived earlier per-schema default-privilege revokes | Explicitly revoke PUBLIC execution across application schemas while preserving named-role grants; test service-only and anonymous boundaries | `supabase/migrations/20260919185453_integration_integrity.sql` |
| Published result corrections could duplicate an official placement | Match-row locking and a published-placement validation trigger | Same migration; `supabase/tests/integration.sql` |
| Super-admin personal inbox/follows/support reads could include other users' records | Explicit current-user filters; separate authorized administrator support endpoints | `server/services/data.ts`, `server/routes/workspace.ts` |
| Team contacts omitted, admin context placeholders and incomplete slot/publication state | Authorized contacts RPC; real organization/banned-team data; capacity, check-in and publication projections | Same migration, repository and workspace routes |
| Tournament edit had no persistent operational form/contract | Versioned, authorized tournament edit with audit; metadata/status editing; pre-lock dates/capacity/map schedule editing; official completion remains result-driven | `AdminCompetitionForms.tsx`, `AdminPages.tsx`, `contracts.ts`, `apiAdapter.ts`, migration |
| Comparison, leaderboard identity/movement and Wrapped aggregates were incomplete | Published-result projections, team-ID-aligned ranking, cumulative corrected standings, period championships/badges/records | `server/services/data.ts`, `server/routes/public.ts`, `src/utils/wrapped.ts` |
| Successful mutations could leave dependent pages stale; private state could survive an account change | Mutation invalidation, focus/visible polling, scoped subscription cleanup, identity revision and cross-tab session invalidation | `apiAdapter.ts`, `queryCache.ts`, `realtime.ts`, `PlatformDataContext.tsx`, `layouts.tsx` |
| Support reply/review forms missing; admin controls implied nonexistent persistence | Real team/admin reply/status operations; honest unavailable settings and timed sanctions; real ban/review listing | `SupportPages.tsx`, `CompletionPages.tsx`, `ProfilePages.tsx`, `AdminPages.tsx`, workspace routes |
| Archive succeeded but response tried to reread an RLS-hidden team | Void archive response and navigation to account after archive/leave | `workspace.ts`, `contracts.ts`, `apiAdapter.ts`, `TeamManagementPage.tsx` |
| Organization creation discarded description; missing founding date became invalid text | Hono input and transactional persistence/validation; optional date mapped and displayed truthfully | `server/routes/identity.ts`, `server/services/identity.ts`, migration, `domain.ts`, profile components |

Dead mock styles/configuration were removed. The optional local SQL seed moved into `tests/fixtures/local-database.sql`; Supabase automatic seeding remains disabled with no configured seed paths. Original five migrations were preserved; all database changes are additive in migration six. Existing visual language, navigation and footer were retained.

## Dynamic integration coverage

The [route inventory](FEATURE_INTEGRATION_INVENTORY.md) covers all **99 manifest entries** and their public, team, admin, account, Auth or system family. The [contract inventory](SERVICE_CONTRACT_INVENTORY.csv) maps **162 service methods**, API requests, direct UI references and availability. These are code traces, not claims that every route was manually exercised.

- **PUBLIC — IMPLEMENTED / LOCALLY TESTED:** public context, tournament/calendar/participant/standings graph, teams/profiles/comparison, organizations, records, match directory, search, season archive and Wrapped use API-backed data. No API failure selects fictional records. Public requests use anonymous database access and official published results. `/matches/:matchId` retains the existing redirect into the canonical tournament view. Targeted tests cover empty/error states, published-result isolation, participant projection and ranking identity; other listed paths have code-trace evidence.
- **TEAM — IMPLEMENTED:** existing registration, identity/socials/roster governance, tournament entry, check-in, timed rooms, messages/notifications, disputes, career, badges, Wrapped, Share Studio and settings remain connected to the real services. Archive/leave, profile refresh and cache identity behavior were corrected. Local evidence is component/domain tests, Hono transport tests and database rules, plus focused profile/preference/image browser checks. Refresh/relogin across actual Supabase users remains NOT VERIFIED.
- **ADMIN — IMPLEMENTED:** existing creation, registration/roster/dispute/verification review, room/results/publication/correction, announcement, user/team and audit operations remain under server/database role checks. Tournament editing and support replies/status are now connected; dashboard organizations, slots, publication and ban views use actual rows. Local evidence includes authorization, edit/version/lock/audit, official-result and support isolation tests. Full operator browser journeys remain NOT VERIFIED.
- **CROSS-PAGE — IMPLEMENTED:** downstream metrics use published official results; cumulative standings reconstruct current corrected rows, not immutable historical versions. Historical player rosters remain captured snapshots. Mutation and session invalidation refresh consumers. Actual concurrent browser/Realtime propagation remains NOT VERIFIED.

## Tests actually executed

| Category | Command / scope | Actual result |
|---|---|---|
| TypeScript / existing lint command | `npm run lint` (project and server TypeScript) | PASS |
| Domain unit tests | `npm test` → `test:domain` | 20 PASS |
| Component tests with isolated services | `npm test` → `test:component` | 230 PASS |
| Hono tests with Supabase HTTP fixtures | `npm test` → `test:server` | 27 PASS |
| Local SQL / RLS | `npm run test:db`; all six migrations, original policies plus integration regressions | PASS; disposable localhost PostgreSQL, Auth/Storage bootstrap stubs |
| Development API browser boundaries | `npx playwright test --config=playwright.integration.config.ts` | 6 PASS; desktop/mobile missing-config Hono, explicit empty response and unauthenticated route guards |
| Production-build outage behavior | `npx playwright test --config=playwright.api-hardening.config.ts` | 4 PASS; controlled HTTP empty/error responses |
| Focused form and media browser checks | `npx playwright test --config=playwright.hardening.config.ts --grep 'identity preview is local\|large accepted brand sources'` | 4 PASS; HTTP fixture form/preference requests plus real browser preprocessing |
| Production build | `npm run build` | PASS; 72 static shells, 96 route definitions |
| Release inputs | `npm run package:check` | PASS; no new release ZIP generated |
| Diff whitespace | `git diff --check` | PASS |
| Real Supabase / Netlify staging | Journeys A–G | NOT VERIFIED; no safe staging identified |
| Production | No production test or mutation performed | NOT VERIFIED |

The full responsive matrix and the broad historical browser suite were not rerun. Older browser suites now use a test-only HTTP fixture helper; its mapping is intentionally finite and returns an explicit error for undefined test endpoints. Fourteen focused browser checks passed; this does not claim the entire browser suite passes. Browser checks preceded the final organization-description/date and dead-style cleanup; the final TypeScript, unit/server, SQL and production build checks include those changes. Two obsolete mock-adapter-only assertions were removed; useful fixture-based component coverage was retained and API/SQL regressions added.

## Unsupported and remaining boundaries

**UNSUPPORTED:** individual-player performance/MVP and detailed player administration; device inventory/per-device revocation; MFA setup/challenge/recovery; asynchronous exports; notification email/push workers; timed sanctions; bulk approval; platform-wide policy editing; manual slot/check-in overrides; organization binary media and configurable organization awards; PDF evidence. These return unavailable states or remain capability-gated. Account deletion persists a review request, not immediate erasure. Existing session revocation cannot invalidate already issued JWTs before their expiry.

**IMPLEMENTED API, INCOMPLETE MANAGEMENT UI:** organization creation and some organization membership/team-invitation operations have authorized endpoints but no complete management surface. They are not claimed as completed user journeys. No decorative control was used to invent a new management capability.

**NOT VERIFIED:** actual SMTP delivery/confirmation/recovery; Netlify cookie/refresh behavior; real Storage upload, replacement, deletion, signed evidence access and expiry; Realtime reconnect/account switching; concurrent capacity/result operations; two-user direct Data API isolation; end-to-end admin→public/team propagation. Local SQL proves database rules under its bootstrap, not the deployed Supabase services.

Known retained limits: old branding objects are retained on replacement until explicit deletion; single-row corrections cannot temporarily duplicate a published placement to perform a rank swap; repository aggregation has a 100,000-row ceiling and no measured production latency; dynamic-entity social metadata still needs API-aware rendering. No performance claim was invented.

## Required manual configuration and blockers

Follow [BACKEND_SETUP.md](BACKEND_SETUP.md#required-isolated-staging-verification-not-yet-performed): identify and authorize a separate Supabase staging project and Netlify site; review and separately approve the seven remote migrations; expose `aevic` but not `aevic_private`; provide server-only environment values and the staging media origin; configure Auth redirects, repository TokenHash templates and SMTP; provision least-privilege administrators and two controlled test accounts. Follow the existing credential-rotation requirement in SECURITY.md.

Plain `npm run dev` safely returns a configuration error until server variables are supplied. For an explicitly isolated environment, use `node --env-file=.env.staging node_modules/vite/bin/vite.js` with `PUBLIC_SITE_URL=http://localhost:8888`. Never reuse unidentified production credentials for tests.

The remaining release blocker is authorized staging configuration and completion of journeys A–G with actual persistence, private-data isolation and cross-session propagation. No remote action is authorized by this report.

## Earlier V1 compatibility work

The earlier local-only migration utility established target enrollment, pinned schema checks, stable mappings, profile backfill for existing Auth UUIDs and confidential reports. Its 12 planner / 17 database tests remain in the current suites. The owner subsequently supplied the completed read-only production findings (seven teams and zero Auth users); V2 pending holdings and secure claiming now handle that actual source. V1 is retained for separately reviewed existing-Auth sources, not as a workaround that invents owners for these teams.
