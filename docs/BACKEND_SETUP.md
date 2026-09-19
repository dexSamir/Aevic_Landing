# Backend setup and release gates

The supported competition flow is implemented in `server/` and five ordered SQL migrations under `supabase/migrations/`. It uses the `aevic` schema, leaving legacy `public` tables untouched. Nothing applies migrations during a frontend build or deployment. A clean database has no tournaments or accounts until deliberately created.

## Runtime and local development

Use Node 22 or newer (`.nvmrc`), then `npm ci`. For UI development, select mock explicitly with `VITE_DATA_SOURCE=mock npm run dev`. Fixtures remain available to tests and design work. Production rejects mock mode and never substitutes fixtures after an API failure.

For the real stack:

1. Install and start Docker, then run `npx supabase start`.
2. Run `npx supabase db reset --local` to rebuild **only the disposable local database** from migrations. Seeding is disabled by default. An optional development tournament is in `supabase/seed.sql`; execute it deliberately against the local database only.
3. Configure the environment names below from the local Supabase instance. Use the same browser origin for `PUBLIC_SITE_URL` and Netlify Dev. Do not put a service key in a browser variable.
4. Run `VITE_DATA_SOURCE=api npx netlify-cli dev`. Open the Netlify Dev port, not Vite directly, so `/api` reaches the function and cookies use the same origin.
5. Register a new five-player team. Confirm the email through local Supabase mail. The Auth insert trigger creates the profile, pending team, owner membership, roster and private PUBG identities in the same transaction.
6. Create an administrator deliberately through the Supabase Auth dashboard and grant its UUID a role in `aevic.admin_roles` using a trusted database operator. There is no default admin, shared admin password, client role override, or role derived from user-editable metadata.

If Docker is unavailable, `npm run test:db` can use an isolated PostgreSQL 15+ instance. The test runner creates and drops a disposable database; it refuses nonlocal hosts. Its lightweight Auth/Storage bootstrap validates SQL and RLS, **not Supabase Auth, Storage or Realtime services**.

## Environment names

| Name | Scope and purpose |
| --- | --- |
| `SUPABASE_URL` | Function only; Supabase project endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Function client for ordinary user/anonymous RLS access |
| `SUPABASE_ANON_KEY` | Legacy alternative to the publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Function only; narrowly used for Auth administration, validated Storage operations and rate limiting |
| `PUBLIC_SITE_URL` | Exact canonical origin; build metadata, Auth links, cookie and Origin checks |
| `VITE_DATA_SOURCE` | Explicit `api` or development-only `mock` |
| `VITE_API_BASE_URL` | Same-origin API prefix; normally `/api` |
| `VITE_PUBLIC_MEDIA_ORIGIN` | Exact Supabase HTTPS origin; image and Realtime CSP allowlist |
| `VITE_DEMO_MODE` | Fictional-data disclosure for explicit mock development |
| `PG_BIN` | Optional local PostgreSQL binary directory for SQL tests |
| `AEVIC_TEST_PG_HOST`, `AEVIC_TEST_PG_PORT` | Isolated local PostgreSQL test connection |

Do not commit environment files, tokens, mail credentials, or output from commands that reveal them. See `SECURITY.md` for mandatory rotation of previously exposed credentials.

## Auth, email and session behavior

The function verifies users with Supabase Auth and stores access/refresh tokens in HttpOnly SameSite=Lax cookies; production uses Secure `__Host-` cookies. Every mutation requires an exact same-origin Origin header. Auth errors are sanitized, sensitive routes are not cached, and rate-sensitive Auth endpoints use persistent hashed-IP limits. Auth's own limits also remain enabled.

Configure Auth Site URL and allowed redirect URLs for the real origin. Enable email confirmation and configure the recovery and confirmation templates from `supabase/templates/`. These use `TokenHash`, allowing the function to exchange a one-use token server-side. Default fragment-based access-token templates do not implement this flow. Template inspection checks shape only; Supabase performs actual validity/expiry verification on confirmation. Configure and verify a production SMTP sender separately.

`/me/sessions/others` uses Supabase's supported session revocation API. Revocation prevents refresh; already issued JWTs can remain valid until expiry. Configure an appropriate access-token lifetime in Auth. Detailed device inventory, TOTP setup/recovery-code management and account export jobs remain explicitly unavailable. Existing verified MFA factors are reported accurately; this release does not claim to enforce MFA or complete MFA login challenges. Account deletion is a persisted review request, never a claim that an account was erased.

## Data and authorization

- Public reads use ordinary anonymous RLS. Pending teams, private contact details, PUBG identifiers, room secrets and evidence are omitted.
- All product tables have RLS. Authenticated clients receive read permissions only; transactional RPC operations enforce verified user, team role, eligibility, time windows and state transitions. Official result writes require result-operator or super-admin authority.
- Team entry reserves capacity under a tournament row lock, captures the submitted roster and rejects duplicates. Check-in requires a confirmed entry, authorized role and server time inside the window. Room secrets are fetched separately, after release, for an eligible checked-in team.
- Result drafts remain private until all approved teams have a result and placements are unique. Publication is atomic; points are derived from the tournament formula. Corrections require an expected version and reason, append history, notify teams and reopen the dispute deadline. Stats, standings, map metrics, career, badges and Wrapped derive from these official rows.
- PostgreSQL locks and unique constraints protect invitations, ownership transfers, roster changes and idempotent commands. Idempotency keys must be reused only for the same payload. They are not a reason to blindly retry mutations.
- Logo/banner sources up to 6 MB are resized and encoded in the browser before transport; each uploaded file is limited to 4 MB, with a 4.1 MB multipart request budget below Netlify’s binary limit. The server independently decodes, MIME-checks, bounds and re-encodes images to WebP, then uploads under random keys. Explicit deletion removes stored team identity images. Old versions are retained during replacement until explicit deletion. Evidence supports private PNG/JPEG/WebP images, five files at most and 4 MB each; download URLs require authorization and expire after 60 seconds. PDF evidence is unavailable pending a document validation/scanning pipeline.
- Realtime is imported only in the team workspace. Notification/check-in/message subscriptions are user/team scoped; match status uses its public table. Cleanup, token refresh, reconnect invalidation and independent visible-tab polling handle missed events and timed room release. Room credentials, evidence, profiles and registration review text are never broadcast. Entry changes refresh through notifications and scoped polling.

The current read repository batches tables once per request and uses stable pagination to avoid Supabase's default 1,000-row truncation. It has a 100,000-row safety ceiling. Large historical deployments should replace whole-history aggregation with indexed aggregate RPCs before approaching that ceiling; live production latency has not been measured.

## Validation commands

```sh
npm run lint
npm test
npm run test:db
npm run build
npm run package:check
npm run package:release
npx playwright test --config playwright.hardening.config.ts tests/e2e/team-workspace-rebuild.spec.ts tests/e2e/accessibility-layout.spec.ts tests/e2e/critical-flows.spec.ts tests/e2e/media-transport.spec.ts
npx playwright test --config playwright.api-hardening.config.ts
```

The SQL suite covers anonymity, unrelated users, owner/player roles, registration duplicate/closure, check-in windows, room release, official scoring, disputes and write grants. Server tests exercise Hono using controlled Supabase transport fixtures. Browser tests using mock mode validate interface behavior, not live persistence. `scripts/audit-responsive.mjs` covers all 17 requested widths and representative 200% text cases. `scripts/audit-performance.mjs` compares locally served empty-data builds; it is not field Core Web Vitals.

## Manual staging and production actions

Before any launch: rotate and revoke all previously exposed credentials; review provider audit logs; back up the target database; review the migrations and existing bucket names; apply migrations first to a separate staging project; expose `aevic` in the Supabase Data API; configure Auth/email, function environment and media CSP origin; provision admins deliberately; verify the Realtime publication; then exercise the complete two-team flow through Netlify with real Auth, binary uploads, RLS, release times, publication, corrections and reconnects.

Also verify Netlify's Linux Sharp bundle and payload limits, redirect order, function timeout, SMTP delivery, rate limits and refresh/logout behavior across two browsers. No remote migration, commit, push or deployment was performed during this task. **Do not label the release production-ready until those staging gates pass.**

Public individual-player statistics and MVP remain unavailable because there is no official per-player scoring source. Team match kill and point records, their progression and captured historical rosters derive from published results. Other record categories are not fabricated. Push/email notification delivery, scheduled sanctions, platform policy editing and bulk approvals are unavailable; their controls must not claim success. Historic leaderboard snapshots are not fabricated. Manual player claims/verification/deletion reviews require actual operators.
