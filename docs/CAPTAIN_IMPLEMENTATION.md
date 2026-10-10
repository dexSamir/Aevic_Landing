# Captain implementation — 2026-09-24

This supersedes the auth/media limitations in ORIGINAL_PRODUCTION_INTEGRATION.md. It does not activate any historical migration, normalized schema, claiming, or Supabase Auth workflow. No production writes, emails, deployment, DDL, grants, migrations, or new database objects were performed. Other concurrent workspace edits were preserved.

## Implemented

The running Hono app now mounts `server/routes/captain.ts` before the existing public routes. Its store uses only the existing `public.teams` record, retains bigint IDs as strings, and leaves ID generation to the existing database default/identity. Parameterized PostgreSQL transactions provide atomic reset consumption and registration/name uniqueness checks with a shared transaction advisory lock. No database functions are installed. Duplicate registrations return 409 without overwriting an existing record; an idempotency key is accepted for client compatibility but no persistent replay receipt is claimed.

- Recovery mails a 256-bit random token to the stored team email using existing Resend configuration. Missing email and delivery failure yield the same empty 204. A minimum response delay reduces ordinary delivery timing differences; upstream latency is not a proof of constant-time operation. Provider calls have bounded timeouts. No assumption that an unknown legacy password verifies. No independent email-verification flag exists: the reset link proves access to the stored mailbox.
- `reset_token` stores a versioned HMAC digest and issued/expiry timestamps, never the reusable token. Expiry is 30 minutes. Reset replaces only `password_hash` and clears `reset_token` in one conditional SQL UPDATE; DB time also checks expiry. Concurrent redemption has one winner. Rotation supersedes any previous reset token.
- New passwords use scrypt N=131072, r=8, p=1, random 16-byte salt and 64-byte key; at most two hashes run concurrently in an instance. A versioned envelope also includes a random session epoch. No legacy verifier or guessed passwords.
- Cookie sessions are HMAC-signed, bound to the current stored hash and original team ID, with an 8-hour expiry or 30 days for remember-me. Every private API request reloads the stored hash. HTTPS cookies are `__Host-`, Secure, HttpOnly, SameSite=Strict. Localhost development cookies are non-Secure. Logout changes the epoch and invalidates all existing sessions while preserving password verification. Password reset/change also revokes all sessions. Revoke-other-sessions rotates the epoch and issues one fresh current cookie; individual device enumeration is unavailable without an existing session registry.
- Same-origin checks reject cross-site/missing-origin writes. Local IP/account attempt limits plus Netlify edge function rate limiting are configured; edge enforcement has not been deployed/verified. In-memory local limits alone are not a distributed counter.
- Registration validates fields, serializes duplicate checks/insertion and stores captain/name/email, four required IGNs plus optional fifth IGN, pending status and entry tier. Production already has pending/entry records, but production constraints/triggers and the sequence have not been exercised. Unsupported tags/UIDs are rejected if nonempty, and their existing UI inputs are disabled with explanations.
- Protected team/account endpoints expose owner data only, update name/captain contact and the five IGN slots, and reject status/tier/room/results updates. Another submitted team ID is rejected before mutation or upload. No public response includes private columns.
- Existing registration, recovery, login, profile, roster, settings and account forms use these endpoints. Original layouts/components are retained; the roster form now edits the existing slots directly. Unsupported dashboard routes render unavailable states. Tier/status and private rejection reason are shown. Only the verified empty `match_results` array format is supported; nonempty unknown formats remain unavailable, not guessed. Room release rules are unverified, so room credentials are never read or returned.
- PNG/JPEG/WebP upload validation decodes actual bytes, verifies MIME, caps 4 MB/20 MP, rejects unsupported/animated formats and preserves original bytes/aspect ratio. Fresh UUID object names use `upsert:false`; old objects are never overwritten/deleted. Only an already-public configured bucket can be used. Profile writes recheck authentication after upload. If that last write fails, the unused new object can remain; no existing media is damaged.
- Original `/api/media/<uuid>` resolution checks that a team currently references the UUID, then looks for exactly one corresponding ID or filename in `storage.objects` joined to an already-public bucket. It reads bounded original bytes and serves the detected Content-Type. Missing/ambiguous mappings return 404; unavailable DB configuration returns 503. This mapping is implemented but not yet verified against real objects.

## Production blockers, checked without reading private values

1. This environment has no `AEVIC_DATABASE_URL`. Public PostgREST OpenAPI requires a secret key, so the actual `reset_token` type, nullability, constraints, triggers and prior use could not be verified. Every auth/write operation first checks catalogs: hash/reset must be text or varchar large enough for their envelopes (169/80 characters respectively), reset nullable; ID bigint with existing default/identity; connection non-superuser. Incompatible contracts fail closed without writing. The digest/hash formats are conditional on those checks, not a claim that the production contract already passes.
2. Zero-row public-key requests selecting `password_hash`, `reset_token`, and `email,captain_contact,room_password` all returned HTTP 200. No values were fetched. This confirms accepted column selection, not a row-level exposure audit. Runtime refuses to activate if anon/authenticated roles have those private-column SELECT grants or any team INSERT/UPDATE/DELETE privileges, even if RLS might otherwise restrict them. Existing grants must be reviewed/corrected by the database owner before activation; this task changed none. Public projection remains safe, but it cannot repair direct database permissions.
3. No `SUPABASE_SERVICE_ROLE_KEY` or `TEAM_MEDIA_BUCKET` is configured. The public-key bucket inventory returned `[]`; that does **not** prove the original buckets/objects are absent. Full storage inventory and original media mapping need existing privileged access. No bucket was created or exposed.
4. Resend settings exist, but sender/domain authorization and real delivery were not tested because real emails were prohibited. Set `EMAIL_FROM` to the existing verified sender (otherwise `SMTP_USER` is used); no SMTP fallback is claimed. `AEVIC_SESSION_SECRET` must be at least 32 random characters; existing `ADMIN_SERVER_KEY` is a compatibility fallback. All credentials remain server-only.

Required existing server database permissions: SELECT on the explicit private projection in teams; INSERT on registration fields; UPDATE on hash/reset/profile/IGN/photo columns; usage on its existing ID sequence if needed; catalog inspection; optional SELECT on storage.objects/storage.buckets for media lookup. Use the existing least-privileged server login for this project. No credentials should be sent in chat. The application never uses the publishable key for private writes.

## Exact unresolved original logos

The read-only check still returned the same seven team IDs. All 35 player-photo fields were empty. These logo references are unresolved, **not proven missing**:

| Team ID | Original reference |
|---|---|
| 2 | `/api/media/f7b98b59-32ca-4577-a3e5-84f7185b3e22` |
| 7 | `/api/media/0bc2ec73-9bcd-4507-ad67-7dec5c73c726` |
| 8 | `/api/media/5c5a4a8f-3d37-442a-998b-a415e76d2488` |
| 9 | `/api/media/80f60e1c-ca2b-4930-97ed-ca15f245e51f` |
| 10 | `/api/media/a8bf42da-c493-4842-a7ea-470488be05a9` |
| 12 | `/api/media/373e5c0e-9c18-4675-8152-358d70e054ad` |
| 16 | `/api/media/2d83d340-adec-4b29-9325-73f5edd36e2d` |

## Verification

`npm run lint` and `npm run build` passed. Build retains existing artwork-placeholder warnings. Focused Vitest command: `npx vitest run --config vitest.server.config.ts tests/server/captain.test.ts tests/server/production.test.ts` — 28 passing tests. Fixtures cover modern hashing, legacy-team reset/preservation, expiry, token association, concurrent single-use consumption, session persistence/revocation, login/cookies, generic recovery receipts, registration/duplicates, protected profile/roster/contact updates, ID tampering/CSRF/rate limits, media retrieval/upload ownership and PNG byte/ratio preservation. Fixture stores do not verify real PostgreSQL grants, constraints, locking, storage policies, or delivery. Production writes remain unverified and blocked.

Three additional component tests pass (`npx vitest run tests/captain-ui.test.tsx`): reset-token fragment removal/no browser storage, fail-closed reset form on inspection failure, and unsupported registration field state. Browser registration rendered with the existing design and disabled unsupported tag field; the unavailable reset state was also verified. No browser registration or real reset was submitted. The historical normalized-schema test suites are not evidence for this integration.

Read-only inspection can be repeated with `node --env-file=.env scripts/inspect-captain-contract.mjs`; it prints only response statuses, config-presence booleans, visible bucket metadata and public image references. It never prints secrets or authentication-column values.


## Registration verification rollout (2026-10-10, not deployed)

Apply `20261010121243_registration_verification_requirement.sql` before deploying this change. It adds a private account flag: existing accounts keep their access, while new accounts require email verification for team-management writes. It does not mark old emails verified or modify team/media records. Configure `EMAIL_FROM` with either `RESEND_API_KEY` or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; `PUBLIC_SITE_URL` must match the HTTPS origin. Registration checks sender configuration before creating records, sends a 30-minute random verification token in a URL fragment, and stores only its digest. Confirmation atomically consumes it and verifies the account. Delivery failure preserves registration and permits resending; monitor the privacy-safe `verification_delivery_failed` event. Resend has a database-enforced 60-second per-account cooldown; Legacy mode retains per-runtime IP limits; transition/token mode adds shared database counters. Verify Netlify edge limits for distributed abuse protection.

Login checks the password, then an optional enabled TOTP/recovery factor before issuing the HttpOnly cookie. The frontend now preserves MFA challenges instead of treating them as generic login failures. TOTP secrets are encrypted; recovery codes are digested and consumed once. Enrollment requires password and a confirming code. MFA stays optional. Registration replay cannot bypass an enabled second factor. Logout revokes the current platform session; other sessions remain usable. Password changes and explicit other-session revocation retain their existing broader invalidation behavior.

### Previous architecture

Before this follow-up, the active custom captain/admin BFF used HttpOnly, Secure,
SameSite=Strict cookies scoped to `/`, with registry revocation. It had no short-lived
access/rotating-refresh protocol. That remaining work is implemented below; the
unused Supabase Auth routes remain unmounted.

## Completed local session protocol — 2026-10-10 follow-up

The earlier “session-v2 plan” is superseded by implemented custom session tokens.
There is no additional Supabase Auth identity provider. Login uses the existing
scrypt credentials and existing optional MFA, then creates a session family.

- Access: signed, versioned, family-bound token, 600 seconds, browser memory only.
  Protected requests send `Authorization: Bearer`. Every backend use checks the
  registry, current credential digest, active account and MFA epoch.
- Refresh: 32 random bytes, opaque, digest-only database storage. Cookie uses
  `__Secure-aevic-refresh-v2`, Secure/HttpOnly/SameSite=Strict, `/api/auth` path,
  no Domain. Local HTTP uses an unprefixed non-Secure development cookie only.
  Without “remember”, expiry is 8 hours and the cookie is browser-session scoped;
  remembered sessions have 30-day absolute and 24-hour rolling idle limits.
- Family row locking serializes rotation. Concurrent use within five seconds
  returns `409 REFRESH_BUSY`, without minting another token or clearing a cookie.
  Reuse after that window revokes the entire family in a committed transaction.
  Frontend single-flight plus Web Locks prevents ordinary cross-tab collisions;
  BroadcastChannel carries invalidation only, never tokens. Three bounded refresh
  attempts handle a busy response. Lost refresh responses can require login;
  plaintext successor tokens are deliberately not retained for replay.
- Refresh restores memory on reload. GET/HEAD can refresh/retry once on expired
  access; POST/PUT/PATCH/DELETE are never replayed. Uploads and private JSON/image
  downloads use the same transport. Logout revokes the cookie's family; other-device
  revocation preserves the current family. Password changes/resets invalidate all
  access/refresh tokens through the credential digest. MFA enable/remove/recovery
  replacement revokes other sessions. Exact Origin checks remain mandatory.
- Persistent digest-keyed rate limits supplement warm-runtime limits for token
  authentication/security requests. Netlify edge limits still need verification.
  These counters are shared across instances and are not rolled back with a failed
  login. Old counters receive bounded cleanup; retain consumed refresh digests for
  the whole family lifetime so replay detection survives restart/deployment.

### Deployment order and rollback (approval required)

Read-only production catalog inspection confirmed original account/session/MFA
contracts, no anonymous/authenticated grants on the inspected private auth tables,
and original IDs 2, 7, 8, 9, 10, 12, 16 present. Neither new migration is applied.

1. Verify backup/recovery and existing migration history; do not replay historical
   migrations or media migration scripts. Apply
   `20261010121243_registration_verification_requirement.sql` transactionally.
   Existing rows receive false; only new rows default true. No identities move.
2. Apply `20261010134759_rotating_platform_sessions.sql` transactionally. It adds
   family metadata, digest-only refresh history and persistent attempt counters;
   client roles receive no access. Confirm the deployed server role has required
   privileges and that its session insert grants were propagated to new tables.
3. Deploy the matching server + frontend together, initially `AEVIC_SESSION_MODE=legacy`.
   The verification migration must already exist even in legacy mode. Check mail
   delivery before allowing new registration; the API rejects missing sender setup.
4. Set `AEVIC_SESSION_MODE=transition` and a short explicit UTC
   `AEVIC_LEGACY_SESSION_UNTIL`. New logins use tokens. Existing registered cookies continue
   only to this deadline; cookies missing from the registry require login immediately; users then log in again. There is no silent MFA bypass or
   automatic conversion of an old cookie into a refresh family.
5. Validate the canary matrix below, then set `AEVIC_SESSION_MODE=tokens` to reject
   all legacy cookies. Keep secret and database endpoint/port unchanged.

Rollback: retain additive schema and all verification flags; roll back application
and mode together only with a reviewed security decision. Switching to legacy
requires v2 users to log in again after access expiry. Do not unset verification
requirements or drop token tables as a quick rollback. Revoked legacy cookies
stay revoked; no team/player/media records need restoration or alteration.

### Production acceptance checklist (not executed)

- Verify Netlify matrix/scopes and same-origin HTTPS cookies through a real browser.
  Test captain/admin, optional MFA/recovery, reload, two tabs, idle/absolute expiry,
  current/other logout, password/reset invalidation, rejected cross-origin refresh.
- Use an explicitly approved test account for registration, real mail delivery,
  expired/resend/reused verification links and blocked alternate team mutations.
- With explicit permission, upload logo/banner on a designated test team; reload
  and inspect saved immutable URLs, replacement, cancellation, failed upload and
  old-reference preservation. Never use original IDs for destructive smoke tests.
  No real upload, historical migration, asset deletion or production write was run.
- Query Netlify request/failure logs by request ID and deploy version. Compare cold
  vs warm p50/p95/p99, database timeout/connection/permission codes, pool counts and
  slow-query evidence. Current code provides correlation, route templates, durations,
  safe error classification and bounded pool settings; no incident root cause is
  asserted without these logs. Do not rewrite port 5432 to 6543.
- Verify deployed secrets scanning, CSP/CDN delivery, stale bundle/offline recovery,
  unverified-account guidance, private downloads and all responsive interactions.
- Monitor `media_upload_unconfirmed` and `media_reference_not_saved` events by random
  media ID. Cancellation or persistence failure can leave an unreferenced immutable
  asset; reconciliation is a manual read-only review followed by separately approved
  cleanup. The application never deletes historical assets or blindly retries uploads.

## Final local validation and priority status

| Priority | Status | Evidence / remaining gate |
|---|---|---|
| 1. Access/refresh sessions | Implemented and locally tested; awaiting activation | Memory access, rotation/reuse, expiry, MFA, revocation, cross-tab browser checks; new migration and flag activation require approval |
| 2. Registration verification | Implemented and locally tested; awaiting production verification | Atomic token consumption, 30-minute expiry, resend cooldown, sensitive-write gate; production migration and real delivery pending |
| 3. Optional TOTP | Implemented and locally tested; awaiting production verification | Enrollment, encrypted storage, concurrent recovery consumption, replay, removal/regeneration, session invalidation |
| 4. Cloudinary | Implemented and locally tested; awaiting production verification | Isolated vendor + real SQL persistence, reload reads, replacement, failures, cancellation, ownership and orphan diagnostics; real uploads not run |
| 5. Reliability | Local improvements tested; incident diagnosis blocked by production evidence | Correlation/structured logs, timeout/config classification, shared bounded pools, cancellation and bounded match requests; hosted cold-start/pool/slow-query cause remains unproven |
| 6. Mobile UX | Implemented and locally tested | Six widths; page, roster-dialog, analytics-table and match-state checks; expanded-table overflow fixed |
| 7. Matches/team UX | Implemented and locally tested | Progressive bounded detail reads, compact rows, live/upcoming/completed/empty/error states, long names and missing scores, account verification guidance |
| 8. Analytics | Implemented and locally tested | Units, labels, summaries, touch/keyboard selection, daily/map/match tables, Baku boundaries, deterministic fixtures, explicit partial-month limitation |
| 9. Netlify readiness | Local preparation complete; hosted configuration blocked/unverified | Variable matrix in netlify-secrets.md, defaults and secret guards tested; no remote values/scopes changed |
| 10. Regression validation | Completed locally | Exact results below; opt-in live demo tests intentionally not executed |

No mandatory production prerequisite is represented as completed. Real mail/upload
acceptance, migration activation, hosted configuration review and production log
analysis remain unperformed. They require approval/access; no unrelated feature
or second identity provider was introduced.

### Test results

- Frontend: **310 passed, 0 failed** (49 files).
- Server/API/security/media transport: **159 passed, 0 failed** (22 files).
- Isolated PostgreSQL platform + TOTP: **49 passed, 0 failed, 2 skipped** (3 files).
- Domain calculations/contracts: **20 passed, 0 failed**.
- Total automated unit/integration tests: **538 passed, 0 failed, 2 skipped**.
- Responsive browser checks: **102 passed, 0 failed**, widths 320, 375, 390, 430,
  768, 1440. Eleven primary routes plus roster dialogs, expanded analytics tables,
  completed matches, empty/error schedules, long names and missing media/scores.
- Browser token checks: **6 passed**: single-flight, real two-tab Web Locks,
  reload restoration, no unsafe replay, HttpOnly isolation, no token in storage.
- TypeScript/repository lint, production build and `git diff --check`: passed.
  This repository's lint command is TypeScript checking, not an ESLint ruleset.
- Build secret scan: passed against **8 configured sensitive values**; hosted
  Netlify scanning and remote secret classification remain unverified.

Skipped tests are the opt-in installed production demo repository read and demo
apply/remove lifecycle. The latter performs writes even when rehearsed/rolled back;
they were not enabled as part of this task. Existing CDN checks observed seven
logos and one banner returning image HTTP 200; no real upload was performed.

### Regression classification

- `architecture-reset`: browser API/environment defect (`ResizeObserver` absent);
  added a resize fallback, preserving the action-order assertions.
- `public-shell-contract` (2) and `route-recovery` (4): outdated footer contract;
  current shared brand footer is intentional, operational participation CTA stays
  absent. Assertions now inspect actual primary/legal navigation boundaries.
- `teams-reference`: real missing whitespace between team count and label; fixed.
- `tournaments-planning`: asynchronous state race in the test; wait for the actual
  registration button before asserting that it is disabled.
- `uxscan-remediation`: stale source-location assertions after session handling
  moved into its provider and homepage record requests were removed.
- Server `public-context`: outdated expected projection; explicit safe public IGN
  roster is now asserted, while private columns remain forbidden.
- New transport integration required the performance fixture to distinguish refresh
  negotiation from session reads; concurrent session-read deduplication is retained.
- Security tests use independent admin accounts/IPs so accumulated fixture attempts
  do not bypass or force relaxation of real rate limits.

### Files changed in this worktree

The inventory includes preserved changes from the preceding implementation and
this follow-up. No commit, push, deployment or production write was performed.

- `.env.example`
- `docs/CAPTAIN_IMPLEMENTATION.md`
- `docs/netlify-secrets.md`
- `server/app.ts`
- `server/config.ts`
- `server/http.ts`
- `server/platform/account.ts`
- `server/platform/admin-account.ts`
- `server/platform/context.ts`
- `server/platform/media.ts`
- `server/platform/mfa.ts`
- `server/platform/middleware.ts`
- `server/platform/registration.ts`
- `server/platform/routes.ts`
- `server/routes/captain.ts`
- `server/routes/public.ts`
- `server/services/cloudinary.ts`
- `server/types.ts`
- `src/components/team/TeamAnalytics.tsx`
- `src/components/team/TeamIntelligence.tsx`
- `src/components/team/TeamMediaPreview.tsx`
- `src/components/team/TeamOverview.tsx`
- `src/pages/SpectatorPages.tsx`
- `src/pages/routes/AccountProfilePage.tsx`
- `src/pages/routes/DisputeDetailPage.tsx`
- `src/pages/routes/SupportTicketDetailPage.tsx`
- `src/pages/routes/TeamsDirectoryPage.tsx`
- `src/pages/routes/VerifyEmailPage.tsx`
- `src/services/apiAdapter.ts`
- `src/services/apiError.ts`
- `src/services/contracts.ts`
- `src/services/realtime.ts`
- `src/services/requestJson.ts`
- `src/styles/match-center.css`
- `src/styles/team-insights.css`
- `src/types/domain.ts`
- `tests/auth-registration-repair.test.tsx`
- `tests/match-center.test.tsx`
- `tests/performance-optimization.test.tsx`
- `tests/platform/competition.test.ts`
- `tests/public-shell-contract.test.tsx`
- `tests/route-recovery.test.tsx`
- `tests/server/cloudinary-flow.test.ts`
- `tests/server/public-context.test.ts`
- `tests/server/reliability.test.ts`
- `tests/tournaments-planning.test.tsx`
- `tests/uxscan-remediation.test.tsx`
- `server/auth/persistent-limit.ts`
- `server/auth/platform-tokens.ts`
- `server/auth/token-routes.ts`
- `server/platform/email-requirement.ts`
- `src/services/tokenSession.ts`
- `supabase/migrations/20261010121243_registration_verification_requirement.sql`
- `supabase/migrations/20261010134759_rotating_platform_sessions.sql`
- `tests/server/email-requirement.test.ts`
- `tests/server/token-config.test.ts`
- `tests/server/token-transport.test.ts`
