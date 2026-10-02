# Final commit checkpoint — 2026-10-02

**SOURCE COMMIT: READY. PRODUCTION DEPLOYMENT: UNVERIFIED.** Phase 2 feature, SEO, performance and route-completion work stopped at the user's request. Commit locally only; do not push, deploy, mutate production or send the first-admin email.

- Current source unchanged since passing TypeScript and production build (75 static shells / 99 route definitions); those checks were not repeated. Diff check and candidate secret/artifact review passed.
- Minimal compatibility check used the existing application role in a READ ONLY transaction: 43 source-required relations, 356 source-referenced contract columns, schema USAGE/read/write privileges and three required built-in functions passed. Actual account-store readiness check passed. No concrete missing-object/access blocker found within this scope; not a full database audit or end-to-end deployment certification.
- Actual public-team repository read returned original IDs **2, 7, 8, 9, 10, 12, 16**, with private contacts absent. No originals or other production data changed.
- Required local environment names present, including configured fallbacks. **Deployed Netlify environment names/values were not verified**, so deployment remains UNVERIFIED. Missing historical migration ledger entries alone are not evidence to replay or repair migrations; required objects checked above exist.
- Raw catalog, Lighthouse and browser measurement reports remain local and excluded from the commit, along with all ignored screenshots, temporary artifacts, environment files and dumps. Sanitized failure classification is retained as documentation. Minimal check result: `/tmp/aevic-minimal-compat-result.json` (local only).
- Existing evidence: 26 focused regressions passed; previous persisted/accessibility tests passed; full browser run 77 passed / 19 failed / 32 skipped, with all 19 failures passing subsequent targeted reruns. No expensive suites repeated.
- Non-blocking unfinished work: 88 PARTIAL route acceptances, dynamic entity SEO and performance improvements; legal pages remain PARTIAL pending approval. These do not prevent a source commit. Stop after the requested commit; no further work authorized.

---

# Resume checkpoint — 2026-10-02

This checkpoint supersedes historical notes below. Preserve the entire working tree. No production mutation, migration execution/history repair, environment change, deployment or admin setup email occurred.

## Exact verification state

- Existing full 128-test result inspected without restarting: **77 passed / 19 failed / 32 skipped (3.2h)**. `/tmp/aevic-phase2-broad.log`; original traces remain in `test-results`.
- **All 19 failures now pass targeted reruns**, not a new full-suite pass. Classification/evidence: `docs/quality/phase2-browser-failures.json`.
- Mobile failed-case rerun: **13 passed (2.0m)**, `/tmp/aevic-resume-mobile.log`.
- Final public-shell/logout/product journey rerun: **2 passed (14.7s)**, `/tmp/aevic-resume-public-final.log`.
- Calendar matrix and both footer contracts: **3 passed / 1 intentionally skipped duplicate matrix (21.1s)**, `/tmp/aevic-resume-targets.log`.
- Reduced-transparency navbar case passed in `/tmp/aevic-resume-public.log`. That intermediate run was **2 passed / 2 failed**; those two failures are resolved by the final public run above. Do not report the intermediate log as all green.
- Focused component regressions: **26 passed / 3 files (1.92s)**, `/tmp/aevic-resume-logout.log`. Includes server-acknowledged logout, failed-revocation retry and request handling.
- TypeScript: PASS, `/tmp/aevic-resume-types.log`. Production build: PASS, 75 static shells / 99 route definitions, `/tmp/aevic-resume-build.log`. `git diff --check`: PASS.
- Previous persisted critical tests (12), accessibility quality (18), component (254), server (86) and other earlier passes were not needlessly rerun. No new persisted acceptance or full release-suite pass is claimed.

## Changes in this continuation

- Calendar: below 308px actual picker width, reuse adjacent-day strip with three visible dates ≥44px, preserving selected date, adjacent-date navigation, month controls, keyboard focus and AEVIC colors. Original eight-width × normal/200% text assertions remain. Normal/200% screenshots live in `/tmp/aevic-resume-targets/final-stabilization-cold-c-bbff0-t-eight-widths-and-200-text-desktop-chrome/`. At 200% the element screenshot includes sticky header/skip-link overlay; content geometry assertions pass. No Home loading/CLS optimization was reintroduced.
- Footer: enforce ≥44px width on short text links, retaining ≥44px height. Update old footer destination expectation to existing explicit primary/contact/legal structure. Replace obsolete height cap with column alignment and non-overlap assertions; target assertions intact.
- Logout: wait for revocation acknowledgement before clearing identity caches; preserve identity on failed logout for retry. Finish HTTP 204 response before mutation callers navigate. Original network-failure assertion now passes, with no ignored request errors.
- Fixtures: emit genuine bodyless 204 responses. Tests updated for current six linked Home team cards, actual captain standings/room markup and explicit reduced-transparency token. Keyboard profile navigation and room navigation assertions retained.

## Production read-only result and release boundary

One bounded catalog retry succeeded: **79 relations / 628 columns / 206 indexes**, zero private client table grants, no platform tables without RLS. `docs/quality/phase2-release-catalog.json` records sanitized catalog and local config presence only. Current connection role is non-superuser with BYPASSRLS. Local canonical origin remains demo. History lacks 20260919185453 and 20260924224615 although all 38 explicitly created platform relations from the latter are present. Presence alone does not verify columns, constraints, functions, effective schema grants, complete compatibility or deployed configuration. Do not replay/repair migrations. Production release readiness remains **UNVERIFIED**.

Earlier proxy error did not recur; its exact previous error is not in retained logs. Recovery is consistent with transient failure but does not prove the underlying cause. No additional retry needed. No original-team mutation.

## Acceptance and next action

**99 routes: 11 COMPLETE / 88 PARTIAL.** Support FAQ retains its existing acceptance; legal pages remain PARTIAL pending approval. No promotions in this continuation.

Next action: read `tests/platform-browser/` and `docs/completion/routes.json` to extend missing persisted account/captain/tournament/admin/public acceptance with isolated disposable data. Existing runner: `playwright.platform.config.ts`. Then finish supported crawlable dynamic entity HTML/metadata/JSON-LD and sitemap validation, keeping preview noindex. Measure remaining Lighthouse findings after functional stabilization. Run full release suites only near completion; broad suite must still prove one stable full pass. Do not deploy or send first-admin email while release readiness is uncertain.

---

# Current handoff — 2026-10-01 quality pass

The latest user request resumed work in the current project and supersedes the historical stop instruction below. Work is preserved as uncommitted source changes; no deployment or production writes occurred. See [FINAL_QUALITY_AUDIT.md](FINAL_QUALITY_AUDIT.md) for current evidence and limitations, [CANONICAL_DATA_OWNERSHIP.md](CANONICAL_DATA_OWNERSHIP.md) for authoritative reads/writes, and [route acceptance](../performance/route-coverage.md).

- 99 routes: 10 COMPLETE static system/access states, 89 PARTIAL workflows. No claim of production readiness.
- Fixed pending-team visibility independently of account/claim identity. Read-only production-backed verification returns original IDs 2,7,8,9,10,12,16 with private contacts absent. The deployed demo still returned zero; source has not been deployed.
- Added request-scoped team/capacity deduplication, sanitized operational timing, four-category search, dynamic sitemap, preview noindex, metadata and WebSite structured-data foundation.
- Fixed actual ARIA/definition-list/animation contrast findings, meaningful errors/empty states, narrow/200% text reflow.
- Final build/typecheck, 20 domain + 254 component + 86 server tests, 35 isolated platform tests, disposable DB contract and package/assets checks pass. Detailed browser/Lighthouse evidence and outstanding broad-suite results are in the final audit.
- Production inspection found aevic_platform.accounts and team_details exist. The old statement below that the platform migration is wholly UNAPPLIED is historical and no longer reliable. Inspect the current complete migration/grant state before any release; this pass neither applied nor reconciled production migrations.
- Temporary browser/Lighthouse tools are in /tmp/aevic-quality-tools. Quality browser tests accept AEVIC_AXE_SOURCE; Lighthouse accepts AEVIC_QUALITY_TOOLS. They are not new product dependencies. For the default local browser suite, explicitly blank AEVIC_DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_ANON_KEY so local dev never accesses production.
- The initial uncommitted routeManifest change was a stray syntax character; it was corrected. No legitimate changes were discarded. No credentials, screenshots, environment files or recovery dumps are added to the product package.

Next work: finish persisted journey/state/permission acceptance on the 89 partial routes; resolve broad browser failures; validate real canonical origin and dynamic SEO content; independently verify safe release configuration, deploy, then confirm live directory and competition/account flows. Preserve the seven original teams throughout.

---

## Historical handoff (superseded status)

# CODEX SAFE HANDOFF — 2026-09-25

## Stop condition and original goal

The user explicitly stopped implementation because credits were nearly exhausted. The original unbounded goal is PAUSED. Do not resume it automatically. This handoff preserves work; it is not a production-ready declaration.

Original goal: complete every existing AEVIC route (99), redesign all 23 captain routes, verify actual persisted workflows and access boundaries, preserve the existing repository/Supabase/Netlify setup and original data, then safely deploy. The user designated the first administrator email in the task and authorized its setup email after readiness. No setup email has been sent; no production admin was created.

## Production safety — mandatory

**The seven original production teams must not be modified or deleted during testing.** Original `public.teams` IDs: 2, 7, 8, 9, 10, 12, 16. Preserve IDs, all profile/roster columns, password hashes, existing media and relationships. Never use real accounts as browser fixtures. Never copy originals into fabricated UUID/Auth users. Do not publish this backend before migration, permissions, configuration and release validation are independently ready.

Production database/migration status: the new migration is UNAPPLIED. Production data has not been changed by this work. Existing project: `nmjjibifcuzjlsvfcaaz`; existing site: https://aevic-demo.netlify.app. No deployment performed. Handoff is pushed to a separate `codex/` branch with `[skip netlify]`, leaving production main unchanged. Do not merge automatically.

## Architecture discovered and implemented

React 19 + TypeScript + Vite 6 frontend; Hono 4 same-origin API in Netlify Functions; postgres.js direct PostgreSQL gateway; existing Supabase project provides PostgreSQL/storage. Original numeric teams remain authoritative. Existing normalized `aevic` tournament/match/room/organization tables are reused. Additive private `aevic_platform` schema supplies accounts, authority, operations and security records. Its account identity view unifies original and standalone accounts without duplicating original credentials. Existing normalized UUID-auth handlers remain for their isolated compatibility tests but are not mounted as production authentication.

`server/app.ts` composes platform middleware/routes, original captain and public routes. Actor identity distinguishes signed-in account, selected team workspace, team role and admin role. Selected workspace cookies are revalidated against database membership. Request-scoped repository snapshots feed public/team/admin frontend providers. No service-role browser access. RLS and removal of client grants protect all private tables; server authorization remains mandatory.

## Database files and recovery evidence

- `supabase/migrations/20260924224615_original_team_platform.sql`: complete additive private platform migration, still unapplied in production.
- `supabase/tests/platform.sql`, `tests/fixtures/original-platform.sql`, `scripts/test-platform-database.mjs`: isolated migration/contract fixtures and checks.
- Protected local recovery artifacts: `/tmp/aevic-completion-recovery/` (not committed). Existing backup restored and full migration transactionally rehearsed: fingerprints of all 44 existing tables unchanged, 7 originals/7 registry accounts/7 owners, all 37 private tables RLS, zero anon/authenticated table/view grants. Evidence `migration-rehearsal.json`; migration SHA256 `75c43fd12c66b6efe652c40026e348de4cd6936175f3adcf4de0430e398867da`.
- This rehearsal does not authorize deployment. Obtain a fresh protected backup/catalog inspection and repeat restoration before eventual production migration. Verify actual production gateway role grants and `ready` checks. Never commit dumps or restoration data.

## Backend and frontend work completed locally

- Registration and original/standalone account authentication, profile, verified activation, password recovery, sessions, exports and deletion requests.
- Workspace invitations, acceptance/cancellation/removal, manager/member permissions, ownership transfer, leaving and archive guards.
- Team profile/roster/media, public profile/following, official recorded statistics, identity cards and exports, badges, comparison/history/recap displays.
- Support tickets, replies/status/preferences and private image attachments; persistent announcement read receipts scoped per account and selected workspace.
- Player UID profiles and claims, independently verified legacy claims, team verification submission/moderation.
- Organization creation, edits/social links, invitations with acceptance and current-owner validation.
- Shared loading/error recovery now distinguishes 401 versus 403 with working recovery navigation. Settings notification failure copy/retry was the last small completed code edit; compilation checks cover it, but its new browser preference test was cancelled before execution.

## Captain redesign

All 23 captain routes use the new tonal, borderless shared shell, Raleway headings, restrained corners, responsive navigation and panels. Narrow tournament/roster detail overflow corrected. Badges have actual vector artwork/progress and permit featuring zero through three earned badges; first-badge persistence verified. Completed tournaments close room access and do not offer withdrawal. All 23 routes measured at 320/768/1440/1920 (92 cells). Final corrections/settings recapture: 20 cells, zero overflow/runtime/navigation-opacity issues; mobile roster modal and navigation drawer open/Escape passed. This is layout evidence, not full route completion. See `captain-redesign.md` and `ROUTE_STATUS.md` for every outstanding route.

## Administrator and tournament work

Administrator account setup/recovery, profile/password/sessions/MFA, role management/invitations, last-super-admin protection, audit records, bulk approvals, team/player/legacy/verification moderation and support operations implemented. Tournament creation/edit/version/lifecycle/publication, registration capacity/approval, check-in and reasoned slot corrections, per-round timed room release, roster locks, results save/publication/correction and immutable standings implemented. Browser evidence includes create/publish/register/slot/check-in, four published rounds, final recap, claims/verification and rejected dispute/roster reviews. Not every administrative action or failure state has browser sign-off.

## Authentication and security decisions

Original scrypt credential contract retained; opaque signed/epoch-checked sessions, revocation, same-origin writes, body limits and sanitized errors. Admin recovery is short-lived single-use digest storage; delivery failure rolls back issuance. MFA TOTP secrets are encrypted and account-bound with replay prevention, expiring enrollment and single-use recovery-code digests. Idempotency fingerprints are keyed and avoid persisted plaintext credentials. Account exports exclude auth material. Media validates decoded format/size, re-encodes WebP and strips metadata. Evidence is private and ownership/staff protected; public assets require actual published references. Private permissions are checked server-side even when UI controls are disabled.

## Verification and known failures

Handoff checks: see final appended result below. Earlier full suite passed 20 domain, 254 component and 83 server tests. Existing platform suite most recently passed 34 tests before handoff rerun. Restore rehearsal passed as described above. Focused browser evidence in `/tmp/aevic-completion-qa2/` includes registration/roster/account export, follows, results, cards, support, reviews, identity/recap, message reads, workspace governance, badges and recovery.

No known unresolved failure in the existing automated suites at handoff, subject to final result below. Earlier browser harness failures were selector/timing assumptions and were resumed successfully: registration account input effect timing; obsolete `.team-shell` selector; export control selector. Several mutating scripts now assume stale pending fixtures and MUST NOT be rerun blindly. Preferences browser script was rejected/cancelled by the user and is NOT verified. No exhaustive new testing should be started merely to finish this handoff.

## Partial, absent and unverified work

- Overall 99-route functional/security/state sign-off remains incomplete. Route statuses in `routes.json` and `ROUTE_STATUS.md` are intentionally conservative; render success or matching endpoints never implies completion.
- Shared captain redesign is implemented; per-page final visual/forms/loading/error/empty/accessibility and action acceptance remain incomplete. Captain checkboxes retain full sign-off semantics.
- Latest settings preference retry UI is implemented/typechecked but not browser verified. All other pending route-level evidence is enumerated in the route inventory.
- Real mail delivery, deployment environment/readiness and first-admin setup are not exercised by isolated fixtures. Production gateway permissions for the new schema require validation.
- Organization verification beyond team verification is not implemented; current verification contract supports teams. Support PDF attachments are not implemented (UI honestly accepts supported images). Determine whether these are required by the original scope before adding work; do not infer new scope from this note.
- First production admin setup/email, production migration/application and production deployment are NOT performed.
- No confirmed missing URL mappings in the last static endpoint comparison (`api-gaps.json` has an empty gap list). This is NOT proof of complete endpoint semantics. Remaining gaps are verification/contract sign-off, production permissions/readiness and any newly discovered route requirements, not a claim that all backend behavior is complete.
- Public/admin/account route search/filter/calendar and administrative correction/security/permission edge cases still need acceptance review. Existing unit/integration tests cover some of these; consult evidence before repeating work.

## Required configuration (names only; no values)

Node >=22, npm dependencies from lockfile. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), `PUBLIC_SITE_URL`, `AEVIC_DATABASE_URL`, `AEVIC_SESSION_SECRET` (legacy `ADMIN_SERVER_KEY` fallback), `RESEND_API_KEY`/`EMAIL_FROM` or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; storage uses server-only `SUPABASE_SERVICE_ROLE_KEY` and optional `TEAM_MEDIA_BUCKET`. Validate frontend public build variables through existing scripts/config; never expose server keys in VITE variables. Production site URL must be HTTPS and match the existing deployment. Keep session encryption/signing configuration stable; do not rotate it casually.

Local integration tests use PostgreSQL 18 binaries at `/opt/homebrew/opt/postgresql@18/bin`, socket `/tmp`, port 55432, disposable databases and roles. They must never point at production. The existing isolated browser database is `aevic_completion_qa2`, local app at `http://127.0.0.1:8894`. Disable SMTP/Resend/storage service credentials for synthetic UI tests. Test credentials are not included here; create synthetic fixtures through test helpers if needed. Local /tmp scripts/evidence are not durable across machines; repository tests/migrations are the reproducible source of truth.

## Exact continuation order

1. Read this handoff, user stop instruction, route inventory and implementation notes. Confirm a new authorized scope/budget before resuming the original goal. Check the handoff branch/worktree and latest check results; do not deploy or merge as a first step.
2. Use only isolated synthetic data. Establish local PostgreSQL/test fixtures and preserve existing local evidence; never use the seven production teams for tests.
3. Review `ROUTE_STATUS.md` and each route's evidence; prioritize critical authorization/data-persistence paths. Verify the final notification-preference retry/save flow first as the smallest outstanding change, then close remaining acceptance gaps without duplicating completed workflows.
4. Finish remaining route actions/states and captain visual sign-off only as authorized; explicitly resolve whether any absent optional capabilities are in scope. Update statuses based on evidence, not optimism.
5. Run relevant regression/type/build/integration checks, inspect diff for secrets and confirm migration hash/rehearsal matches the final code.
6. Only when release-ready: inspect production schema/role/config read-only, take a NEW protected backup and prove restore, rehearse the exact migration and compare all originals. Verify least-privilege gateway grants, all RLS/client grants, roll-forward/rollback strategy and compatibility/order with the old deployed app.
7. Apply only the verified additive migration during the explicitly authorized release, verifying original fingerprints afterwards. Coordinate safe deployment order; do not deploy the pending backend against an absent schema.
8. Merge/push to production branch and deploy only after readiness; verify actual Netlify deployment, endpoints, asset/config health and production read-only smoke checks. Existing repository/site only; no replacement projects.
9. Create the approved first administrator and send its authorized one-time setup email only after deployment is ready, without exposing or documenting its token/password. Verify delivery outcome without claiming inbox receipt.
10. Report truthful final release status and preserve the original teams. Mark the original goal complete only after all required work is actually finished.

## Modified/created file inventory

The inventory below covers every changed or new repository file in this work, including supporting tests and documentation. Module names describe responsibility; existing detailed implementation notes provide historical rationale.

- `docs/completion/CODEX_HANDOFF.md`
- `docs/completion/ROUTE_STATUS.md`
- `docs/completion/api-gaps.json`
- `docs/completion/browser-verification.md`
- `docs/completion/captain-redesign.md`
- `docs/completion/implementation-notes.md`
- `docs/completion/routes.json`
- `scripts/test-platform-database.mjs`
- `server/app.ts`
- `server/captain/postgres.ts`
- `server/http.ts`
- `server/platform/account-store.ts`
- `server/platform/account.ts`
- `server/platform/activation.ts`
- `server/platform/admin-account.ts`
- `server/platform/admin-management.ts`
- `server/platform/admin-recovery.ts`
- `server/platform/authority.ts`
- `server/platform/community.ts`
- `server/platform/competition.ts`
- `server/platform/context.ts`
- `server/platform/email.ts`
- `server/platform/identity.ts`
- `server/platform/legacy-claims.ts`
- `server/platform/media.ts`
- `server/platform/mfa.ts`
- `server/platform/middleware.ts`
- `server/platform/organizations.ts`
- `server/platform/players.ts`
- `server/platform/profile.ts`
- `server/platform/registration.ts`
- `server/platform/repository.ts`
- `server/platform/roster.ts`
- `server/platform/routes.ts`
- `server/platform/staff.ts`
- `server/platform/standings.ts`
- `server/platform/totp.ts`
- `server/platform/tournaments.ts`
- `server/platform/verification.ts`
- `server/platform/workspace.ts`
- `server/routes/captain.ts`
- `server/routes/public.ts`
- `server/services/data.ts`
- `server/services/identity.ts`
- `server/types.ts`
- `src/app/routeManifest.ts`
- `src/components/auth/TeamLogoEditor.tsx`
- `src/components/profile/DirectoryTeamCard.tsx`
- `src/components/profile/PublicTeamExperience.tsx`
- `src/components/profile/PublicTeamFeatures.tsx`
- `src/components/profile/TeamFollowButton.tsx`
- `src/components/team/Achievements.tsx`
- `src/components/team/BadgeCabinet.tsx`
- `src/components/team/TeamMediaPreview.tsx`
- `src/components/team/TeamOverview.tsx`
- `src/layouts/PublicFooter.tsx`
- `src/layouts/WorkspaceLayouts.tsx`
- `src/layouts/layouts.tsx`
- `src/pages/PlayerClaimPage.tsx`
- `src/pages/ProfileCardPage.tsx`
- `src/pages/TeamProfilePage.tsx`
- `src/pages/TeamSettingsPage.tsx`
- `src/pages/WrappedPage.tsx`
- `src/pages/routes/AccountProfilePage.tsx`
- `src/pages/routes/AccountSecurityPage.tsx`
- `src/pages/routes/AdminLegacyClaimsPage.tsx`
- `src/pages/routes/AdminPlayerDetailPage.tsx`
- `src/pages/routes/AdminSettingsPage.tsx`
- `src/pages/routes/AdminTeamsPage.tsx`
- `src/pages/routes/AdminTournamentDetailPage.tsx`
- `src/pages/routes/AdminUsersPage.tsx`
- `src/pages/routes/AdminVerificationDetailPage.tsx`
- `src/pages/routes/AuthPagesShared.tsx`
- `src/pages/routes/BadgeDetailPage.tsx`
- `src/pages/routes/DisputeDetailPage.tsx`
- `src/pages/routes/FollowingPage.tsx`
- `src/pages/routes/LegacyClaimPage.tsx`
- `src/pages/routes/LoginPage.tsx`
- `src/pages/routes/NewSupportTicketPage.tsx`
- `src/pages/routes/OrganizationWorkspacePage.tsx`
- `src/pages/routes/RegisterPage.tsx`
- `src/pages/routes/ResetPasswordPage.tsx`
- `src/pages/routes/RosterRequestDetailPage.tsx`
- `src/pages/routes/SupportPagesShared.tsx`
- `src/pages/routes/SupportTicketDetailPage.tsx`
- `src/pages/routes/TeamBadgeCabinetPage.tsx`
- `src/pages/routes/TeamInvitationsPage.tsx`
- `src/pages/routes/TeamMessagesPage.tsx`
- `src/pages/routes/TeamSharecardsPage.tsx`
- `src/pages/routes/TeamTournamentDetailPage.tsx`
- `src/pages/routes/TeamsDirectoryPage.tsx`
- `src/pages/routes/TournamentCreateForm.tsx`
- `src/pages/routes/TournamentEditForm.tsx`
- `src/pages/routes/VerificationApplicationPage.tsx`
- `src/pages/routes/VerifyEmailPage.tsx`
- `src/services/PlatformDataContext.tsx`
- `src/services/apiAdapter.ts`
- `src/services/brandAssetValidation.ts`
- `src/services/capabilities.ts`
- `src/services/contracts.ts`
- `src/styles/public-shell.css`
- `src/styles/team-workspace.css`
- `src/styles/workspace.css`
- `src/types/domain.ts`
- `src/utils/teamIdentityCard.ts`
- `src/utils/wrappedSharecard.ts`
- `supabase/migrations/20260924224615_original_team_platform.sql`
- `supabase/tests/platform.sql`
- `tests/captain-ui.test.tsx`
- `tests/directory-team-results.test.tsx`
- `tests/fixtures/component-services.ts`
- `tests/fixtures/normalized-app.ts`
- `tests/fixtures/original-platform.sql`
- `tests/following-page.test.tsx`
- `tests/home-prerender.test.tsx`
- `tests/legacy-claim-ui.test.tsx`
- `tests/master-remediation.test.tsx`
- `tests/platform/competition.test.ts`
- `tests/platform/totp.test.ts`
- `tests/public-team-features.test.tsx`
- `tests/server/api.test.ts`
- `tests/server/integration.test.ts`
- `tests/server/legacy-auth.test.ts`
- `tests/server/legacy-claims.test.ts`
- `tests/teams-reference.test.tsx`
- `tests/uxscan-remediation.test.tsx`
- `tsconfig.node.json`
- `vitest.platform.config.ts`

## Implemented platform endpoint inventory

Mounted under `/api`; inventory is extracted from platform route definitions, not a full behavior-verification claim. Original captain/public route integrations also changed as listed above.

| Method | Path | Implementation |
|---|---|---|
| DELETE | `/me/2fa` | `server/platform/mfa.ts` |
| DELETE | `/me/sessions/:id` | `server/platform/account.ts` |
| DELETE | `/me/sessions/:id` | `server/platform/admin-account.ts` |
| DELETE | `/me/sessions/others` | `server/platform/account.ts` |
| DELETE | `/me/sessions/others` | `server/platform/admin-account.ts` |
| DELETE | `/media/teams/:id/:kind` | `server/platform/media.ts` |
| DELETE | `/organizations/:id/teams/:teamId` | `server/platform/organizations.ts` |
| DELETE | `/teams/:id/authority/:memberId` | `server/platform/authority.ts` |
| GET | `/admin/audit` | `server/platform/routes.ts` |
| GET | `/admin/blacklist` | `server/platform/staff.ts` |
| GET | `/admin/check-ins/missed` | `server/platform/staff.ts` |
| GET | `/admin/context` | `server/platform/routes.ts` |
| GET | `/admin/legacy-claims` | `server/platform/legacy-claims.ts` |
| GET | `/admin/legacy-teams` | `server/platform/legacy-claims.ts` |
| GET | `/admin/players/:id` | `server/platform/players.ts` |
| GET | `/admin/results` | `server/platform/routes.ts` |
| GET | `/admin/results/:id/versions` | `server/platform/staff.ts` |
| GET | `/admin/settings` | `server/platform/staff.ts` |
| GET | `/admin/support/tickets` | `server/platform/community.ts` |
| GET | `/admin/support/tickets/:id` | `server/platform/community.ts` |
| GET | `/admin/tournaments/:id/entries` | `server/platform/routes.ts` |
| GET | `/admin/users` | `server/platform/admin-management.ts` |
| GET | `/admin/verifications` | `server/platform/identity.ts` |
| GET | `/admin/verifications/:id` | `server/platform/identity.ts` |
| GET | `/disputes` | `server/platform/community.ts` |
| GET | `/disputes/:id` | `server/platform/community.ts` |
| GET | `/me/2fa` | `server/platform/mfa.ts` |
| GET | `/me/account` | `server/platform/account.ts` |
| GET | `/me/account` | `server/platform/admin-account.ts` |
| GET | `/me/context` | `server/platform/authority.ts` |
| GET | `/me/data-export/:id` | `server/platform/account.ts` |
| GET | `/me/data-export/:id` | `server/platform/admin-account.ts` |
| GET | `/me/data-export/:id/download` | `server/platform/account.ts` |
| GET | `/me/data-export/:id/download` | `server/platform/admin-account.ts` |
| GET | `/me/follows` | `server/platform/routes.ts` |
| GET | `/me/follows/status` | `server/platform/routes.ts` |
| GET | `/me/legacy-claims` | `server/platform/legacy-claims.ts` |
| GET | `/me/legacy-roster` | `server/platform/roster.ts` |
| GET | `/me/messages` | `server/platform/routes.ts` |
| GET | `/me/notification-preferences` | `server/platform/community.ts` |
| GET | `/me/notifications` | `server/platform/routes.ts` |
| GET | `/me/player-invitations` | `server/platform/authority.ts` |
| GET | `/me/session` | `server/platform/routes.ts` |
| GET | `/me/sessions` | `server/platform/account.ts` |
| GET | `/me/sessions` | `server/platform/admin-account.ts` |
| GET | `/me/support/tickets` | `server/platform/community.ts` |
| GET | `/me/support/tickets/:id` | `server/platform/community.ts` |
| GET | `/me/team` | `server/platform/profile.ts` |
| GET | `/me/workspaces` | `server/platform/authority.ts` |
| GET | `/media/:id` | `server/platform/media.ts` |
| GET | `/media/:id/access` | `server/platform/media.ts` |
| GET | `/organizations` | `server/platform/routes.ts` |
| GET | `/organizations/:id/invitations` | `server/platform/organizations.ts` |
| GET | `/organizations/:id/members` | `server/platform/organizations.ts` |
| GET | `/organizations/:slug` | `server/platform/routes.ts` |
| GET | `/players` | `server/platform/players.ts` |
| GET | `/players/:id` | `server/platform/players.ts` |
| GET | `/players/:id/claims` | `server/platform/players.ts` |
| GET | `/players/:id/membership-history` | `server/platform/players.ts` |
| GET | `/public/settings` | `server/platform/staff.ts` |
| GET | `/registrations/player-eligibility` | `server/platform/profile.ts` |
| GET | `/registrations/team-name` | `server/platform/profile.ts` |
| GET | `/roster-requests` | `server/platform/community.ts` |
| GET | `/roster-requests/:id` | `server/platform/community.ts` |
| GET | `/support/attachments/:id` | `server/platform/community.ts` |
| GET | `/team-invitations` | `server/platform/authority.ts` |
| GET | `/team/tournaments/:id/rounds/:roundId/room` | `server/platform/routes.ts` |
| GET | `/teams` | `server/platform/routes.ts` |
| GET | `/teams/:id/achievements` | `server/platform/routes.ts` |
| GET | `/teams/:id/achievements/featured` | `server/platform/routes.ts` |
| GET | `/teams/:id/authority` | `server/platform/authority.ts` |
| GET | `/teams/:id/legacy` | `server/platform/routes.ts` |
| GET | `/verifications/entity` | `server/platform/identity.ts` |
| GET | `assetType` | `server/platform/media.ts` |
| GET | `config` | `server/platform/activation.ts` |
| GET | `config` | `server/platform/admin-account.ts` |
| GET | `config` | `server/platform/admin-management.ts` |
| GET | `config` | `server/platform/admin-recovery.ts` |
| GET | `config` | `server/platform/authority.ts` |
| GET | `config` | `server/platform/context.ts` |
| GET | `config` | `server/platform/legacy-claims.ts` |
| GET | `config` | `server/platform/mfa.ts` |
| GET | `config` | `server/platform/middleware.ts` |
| GET | `config` | `server/platform/registration.ts` |
| GET | `config` | `server/platform/routes.ts` |
| GET | `config` | `server/platform/verification.ts` |
| GET | `db` | `server/platform/middleware.ts` |
| GET | `db` | `server/platform/routes.ts` |
| GET | `file` | `server/platform/community.ts` |
| GET | `file` | `server/platform/media.ts` |
| GET | `ownerId` | `server/platform/media.ts` |
| GET | `platform` | `server/platform/account.ts` |
| GET | `platform` | `server/platform/context.ts` |
| GET | `platform` | `server/platform/routes.ts` |
| GET | `slot` | `server/platform/media.ts` |
| PATCH | `/admin/disputes/:id` | `server/platform/community.ts` |
| PATCH | `/admin/player-claims/:id` | `server/platform/players.ts` |
| PATCH | `/admin/roster-requests/:id` | `server/platform/community.ts` |
| PATCH | `/admin/support/tickets/:id/status` | `server/platform/community.ts` |
| PATCH | `/admin/teams/:id/approval` | `server/platform/routes.ts` |
| PATCH | `/admin/tournaments/:id` | `server/platform/routes.ts` |
| PATCH | `/admin/tournaments/:id/entries/:teamId` | `server/platform/routes.ts` |
| PATCH | `/admin/users/:id` | `server/platform/admin-management.ts` |
| PATCH | `/admin/verifications/:id` | `server/platform/identity.ts` |
| PATCH | `/me/account` | `server/platform/account.ts` |
| PATCH | `/me/account` | `server/platform/admin-account.ts` |
| PATCH | `/teams/:id` | `server/platform/profile.ts` |
| POST | `/admin/blacklist` | `server/platform/staff.ts` |
| POST | `/admin/legacy-claims/:id/review` | `server/platform/legacy-claims.ts` |
| POST | `/admin/matches/:id/publication` | `server/platform/routes.ts` |
| POST | `/admin/messages` | `server/platform/staff.ts` |
| POST | `/admin/results` | `server/platform/routes.ts` |
| POST | `/admin/results/:id/corrections` | `server/platform/staff.ts` |
| POST | `/admin/support/tickets/:id/messages` | `server/platform/community.ts` |
| POST | `/admin/teams/bulk-approval` | `server/platform/admin-management.ts` |
| POST | `/admin/tournaments` | `server/platform/routes.ts` |
| POST | `/admin/tournaments/:id/archive` | `server/platform/staff.ts` |
| POST | `/admin/tournaments/:id/cancellation` | `server/platform/staff.ts` |
| POST | `/admin/tournaments/:id/check-in-correction` | `server/platform/staff.ts` |
| POST | `/admin/tournaments/:id/slot-assignment` | `server/platform/staff.ts` |
| POST | `/admin/users` | `server/platform/admin-management.ts` |
| POST | `/admin/users/:id/setup-email` | `server/platform/admin-management.ts` |
| POST | `/auth/admin/login` | `server/platform/routes.ts` |
| POST | `/auth/email-verification/confirm` | `server/platform/verification.ts` |
| POST | `/auth/email-verification/inspect` | `server/platform/verification.ts` |
| POST | `/auth/email-verification/resend` | `server/platform/verification.ts` |
| POST | `/auth/legacy-activation` | `server/platform/activation.ts` |
| POST | `/auth/logout` | `server/platform/routes.ts` |
| POST | `/auth/password-reset` | `server/platform/admin-recovery.ts` |
| POST | `/auth/password-reset/confirm` | `server/platform/admin-recovery.ts` |
| POST | `/auth/password-reset/inspect` | `server/platform/admin-recovery.ts` |
| POST | `/disputes` | `server/platform/community.ts` |
| POST | `/me/2fa/recovery-codes` | `server/platform/mfa.ts` |
| POST | `/me/2fa/setup` | `server/platform/mfa.ts` |
| POST | `/me/2fa/setup/verification` | `server/platform/mfa.ts` |
| POST | `/me/data-export` | `server/platform/account.ts` |
| POST | `/me/data-export` | `server/platform/admin-account.ts` |
| POST | `/me/deletion` | `server/platform/account.ts` |
| POST | `/me/deletion` | `server/platform/admin-account.ts` |
| POST | `/me/legacy-claims` | `server/platform/legacy-claims.ts` |
| POST | `/me/legacy-claims/:id/consume` | `server/platform/legacy-claims.ts` |
| POST | `/me/support/tickets` | `server/platform/community.ts` |
| POST | `/me/support/tickets/:id/attachments` | `server/platform/community.ts` |
| POST | `/me/support/tickets/:id/messages` | `server/platform/community.ts` |
| POST | `/me/workspace` | `server/platform/authority.ts` |
| POST | `/media/uploads` | `server/platform/media.ts` |
| POST | `/media/validate` | `server/platform/media.ts` |
| POST | `/organization-invitations/:id/response` | `server/platform/organizations.ts` |
| POST | `/organizations` | `server/platform/organizations.ts` |
| POST | `/organizations/:id/ownership` | `server/platform/organizations.ts` |
| POST | `/organizations/:id/teams` | `server/platform/organizations.ts` |
| POST | `/players/:id/claims` | `server/platform/players.ts` |
| POST | `/registrations` | `server/platform/profile.ts` |
| POST | `/registrations` | `server/platform/registration.ts` |
| POST | `/roster-requests` | `server/platform/community.ts` |
| POST | `/team-invitations/:id/response` | `server/platform/authority.ts` |
| POST | `/teams/:id/archive` | `server/platform/authority.ts` |
| POST | `/teams/:id/invitations` | `server/platform/authority.ts` |
| POST | `/teams/:id/invitations/:invitationId/cancellation` | `server/platform/authority.ts` |
| POST | `/teams/:id/leave` | `server/platform/authority.ts` |
| POST | `/teams/:id/ownership` | `server/platform/authority.ts` |
| POST | `/tournaments/:id/check-in` | `server/platform/routes.ts` |
| POST | `/tournaments/:id/entries` | `server/platform/routes.ts` |
| POST | `/tournaments/:id/withdraw` | `server/platform/routes.ts` |
| POST | `/verifications` | `server/platform/identity.ts` |
| PUT | `/admin/matches/:id/room` | `server/platform/routes.ts` |
| PUT | `/admin/settings` | `server/platform/staff.ts` |
| PUT | `/me/account/password` | `server/platform/admin-account.ts` |
| PUT | `/me/follows` | `server/platform/routes.ts` |
| PUT | `/me/legacy-roster` | `server/platform/roster.ts` |
| PUT | `/me/messages/:id/read` | `server/platform/routes.ts` |
| PUT | `/me/notification-preferences` | `server/platform/community.ts` |
| PUT | `/me/notifications/:id/read` | `server/platform/routes.ts` |
| PUT | `/me/notifications/read-all` | `server/platform/routes.ts` |
| PUT | `/organizations/:id/social-links` | `server/platform/organizations.ts` |
| PUT | `/teams/:id/achievements/featured` | `server/platform/routes.ts` |
| PUT | `/teams/:id/roster/:slot` | `server/platform/profile.ts` |
| PUT | `/teams/:id/roster/:slot` | `server/platform/roster.ts` |
| PUT | `/teams/:id/social-links` | `server/platform/profile.ts` |

## Final handoff check result

- `npm run lint`: PASS (TypeScript frontend and server).
- `npm run build`: PASS; 75 static shells / 99 route definitions.
- `npx vitest run --config vitest.platform.config.ts`: PASS; 2 files / 34 tests, isolated PostgreSQL.
- `git diff --check`: PASS.
- No known failing automated test in these requested checks. No further browser test was run for handoff.
- Route totals: COMPLETE 0, PARTIAL 40, NOT IMPLEMENTED 0, NOT VERIFIED 59. These are full acceptance statuses, not counts of implemented pages. All 23 captain pages have implemented redesign foundations.
- Secret-pattern review of new platform/migration/test/documentation content found no real credential material. Local `.env`, `.netlify` environment files, protected dumps and browser fixture artifacts remain excluded. Synthetic test helpers are not production credentials.
- Preservation branch: `codex/platform-safe-handoff`. Commit message includes `[skip netlify]`; main is left unchanged. Confirm remote push result in Git history/task final response. No production deploy or migration is part of handoff.
