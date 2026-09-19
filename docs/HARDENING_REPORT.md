# Production hardening verification — 19 September 2026

## Delivery status

The working tree contains the real Hono / Netlify Functions / Supabase implementation and the final local hardening changes. Explicit mock development remains available. Production builds exclude the mock adapter and do not replace failed requests with fixtures. No commit, push, remote migration or deployment was performed.

This is **not a production-readiness certification**. Live Supabase Auth, Storage, Realtime, SMTP and Netlify’s Linux function runtime still require staging verification. Existing credentials exposed in the earlier archive must be rotated and revoked manually before launch.

## UI, product and responsive fixes

- Session-check outages now show a retry state; login outages preserve editable values and show an availability message. Logout failures remain visible and recoverable. Visitor account links point to accessible account settings.
- Room credentials clear when the active round changes. Evidence uploads cannot race form submission or match changes; uploads enforce the five-image limit and disable overlapping actions.
- Public match calendar links resolve to the actual match route. Team organization identity follows stored membership. Result operators can read the participant list needed for scoring without gaining access to the admin user directory.
- Official team records now derive from published scores with captured tournament rosters and historical progression. Record selection, recap changes and search/filter reads guard against stale asynchronous responses. Sharing failures display useful feedback.
- Fixed the 320px overview clock, Wrapped heading, profile/social fields, settings switches, Career heading and admin forms under enlarged text. Footer layout responds to its available width; navigation controls retain 44px targets. The sidebar active state follows the documented restrained treatment.
- Career owns its section heading styles, and admin competition forms explicitly load their form styles, so direct arrivals match client navigation. Shared form grids use intrinsic sizing and fields can shrink/wrap instead of widening the document.
- Removed misleading developer-facing implementation copy from several public, verification and empty states. Result correction penalties match the server’s upper bound.

The complete manifest audit checked 96 routes at 320, 360, 375, 390, 412, 430, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1536, 1920 and 2560 pixels, plus five 200% text cases: 1,637 checks, zero document overflow or page errors. Additional 200% text checks used 320/768/1280 widths with a 600px viewport height; discovered defects were fixed and all four affected routes passed targeted retesting. Browser regressions also cover reduced motion, keyboard navigation, dialogs, calendar targets, Wrapped and PNG exports. These are explicit development fixtures, not proof of live backend persistence.

## Backend and schema

Five ordered migrations create the isolated `aevic` domain and private helper schema: 36 product tables and two internal operational tables. They define keys, constraints, indexes, RLS, transactional commands, Auth provisioning, Storage buckets and the selected Realtime publication. Legacy `public` data is untouched.

The API covers Auth and account lifecycle, public discovery/search/archive/records, team identity and socials, rosters and invitations, organizations, tournament creation and entry review, check-in, timed room access, official scoring/publication/versioned correction, disputes, notifications/messages, support, verification and governance reviews. Team career, standings, map metrics, badges, Wrapped and share cards use the official result source.

Registration capacity is protected by a tournament lock; duplicate registration/check-in is constrained in the database. Results publish atomically, corrections require an expected version, and historical roster snapshots remain distinct from current rosters. SQL tests exercise direct database calls as well as RLS, so Hono validation is not the sole security boundary.

## Security, Auth, Storage and Realtime

- Ordinary reads and commands carry the user JWT and obey RLS. Role-specific policies isolate contacts, administrative roles, inboxes, evidence and room credentials. Public column grants exclude private review notes. Direct-RPC null bypasses in confirmations, reviews and result corrections are rejected.
- Auth uses verified Supabase users, HttpOnly SameSite=Lax cookies and Secure `__Host-` cookies outside localhost. Same-origin checks protect mutations. Service credentials remain function-only; rate-sensitive endpoints use persistent rate limits and errors contain safe request IDs.
- Logo cropping remains available. Brand sources up to 6 MB are resized/re-encoded before transport; uploaded files are capped at 4 MB and multipart requests at 4.1 MB. The server independently validates decoded format/MIME/dimensions, re-encodes WebP and uses random Storage keys. Evidence stays private and authorized download URLs expire after 60 seconds. Deletion removes stored identity assets.
- Realtime is lazy-loaded in authenticated team workspaces with scoped notification, check-in and message subscriptions, public match updates, cleanup, token refresh and polling recovery. Private room rows, evidence, profiles and registration review text are not published. No background delivery worker is implied.
- Private caches clear when identity changes or logout succeeds; reads deduplicate per cache/request and affected resources invalidate after acknowledged mutations. Heavy generators and Realtime are separate lazy chunks.

## Validation evidence

- TypeScript/frontend/backend lint: pass.
- `npm test`: 20 domain tests, 228 component/contract tests and 18 server tests pass.
- Disposable PostgreSQL 18 migration/RLS/transactional suite: pass. Its Auth/Storage bootstrap is a SQL test fixture, not the live Supabase services.
- Combined relevant E2E suite: 56 pass, eight existing duplicate-project skips. No failing tests were disabled.
- Production-build API outage browser tests: four pass on desktop/mobile.
- Production build: pass; 72 generated static route shells across 96 manifest routes. Build asset-placeholder warnings were checked; no unresolved placeholders remain in emitted assets.
- Release-policy checks and `git diff --check`: pass. The source package excludes environment files, credentials, generated reports/caches and previous archives.

## Remaining boundaries and launch actions

Not implemented: MFA setup/challenge UX and recovery codes, per-device session inventory, asynchronous account exports, push/mail notification workers, scheduled sanctions, bulk approvals and platform policy editing. Per-player statistics/MVP have no authoritative scoring source; PDF evidence needs a validation/scanning pipeline. These are explicitly unavailable, not simulated and not mislabeled as credential-only blockers. Account deletion is a persisted review request, not completed erasure.

The repository batches and pages database reads but aggregates some full history in application memory, with a 100,000-row safety ceiling. Replace these aggregations with indexed database summaries before reaching that scale. Live latency, concurrent load and end-to-end service delivery are unmeasured. Dynamic detail-page metadata still requires API-aware SSR or edge rendering.

Manual launch work: rotate and revoke all previously exposed Supabase/service/database, SMTP/Resend, admin and other third-party secrets; review provider audit logs; review/back up the target database; apply migrations to a separate staging project first; expose `aevic` in the Data API; configure Auth redirect URLs/token-hash email templates and SMTP; set function environment and media/CSP origin; provision administrators deliberately; verify publication and bucket policy; exercise a two-team flow including refresh/revocation, uploads, release timing, results, disputes and Realtime reconnect. Verify the Netlify Linux Sharp bundle and operational limits before production deployment.

See [backend setup](BACKEND_SETUP.md) and [credential policy](../SECURITY.md) for exact commands and configuration names.

## Performance comparison

Baseline: Git HEAD `7ab2f45`, independently built from tracked source. Current: the final working tree. Each uses the same test-only empty API fixtures, local static host, cold browser context, 390×844 viewport, 4× CPU slowdown, 150ms latency and 1.6Mbps download. Three samples per build; service workers disabled. This is a controlled local comparison, not field Core Web Vitals or live Supabase timing.

| Median | Baseline | Current |
| --- | ---: | ---: |
| LCP | 2,188 ms | 2,180 ms |
| CLS | 0.00738 | 0.00738 |
| Initial JS transfer | 479,535 bytes | 486,521 bytes |
| Initial CSS transfer | 185,124 bytes | 185,476 bytes |

The LCP element is the responsive hero image; existing high-priority image delivery remains intact. The difference is within normal measurement variation, with no meaningful LCP/CLS regression. The Home request graph contains the entry/application, React and router chunks; it does not fetch workspace, Realtime, PNG-generator or media-editor chunks. Local TTFB is not a useful estimate of deployed database latency. The added API/session handling increases initial JavaScript slightly; backend code is not bundled into the browser.

Reproduce with `AEVIC_PERF_BASELINE_ROOT=/absolute/path/to/baseline/dist node scripts/audit-performance.mjs` after building the current tree. The script starts and closes its own local fixture hosts. Use `AUDIT_ALL_ROUTES=1 node scripts/audit-responsive.mjs` against an explicit mock preview for the route matrix.
