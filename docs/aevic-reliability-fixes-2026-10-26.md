# AEVIC reliability fixes — 26 October 2026

Implemented in the existing working tree. No production data was changed. No commit, push, or deployment was performed.

## Completed tasks and root causes

| # | Task | Cause and implementation |
|---|---|---|
| 1 | Mobile download cards | Mobile CSS reduced previews to 24px and cards to 72px. Cards now have a 124px minimum height, larger previews and padding, equal side-by-side columns, and the existing desktop rules. |
| 2 | Consistent login artwork | AuthLayout compared the pathname to `/login` literally; `/login/` fell through to the old boxed layout/artwork. Path normalization now selects the gold login layout for both forms, independent of query parameters. OAuth history restoration also clears the pending button state. |
| 3 | Login ends at home | Email login explicitly navigated to `/team`; Google selected a workspace/return hint. Ordinary successful email and Google logins now end at `/`, using history replacement in client completion. MFA and linking proofs still complete before a session is issued; recovery and verification routes remain separate. |
| 4 | Results action alignment | Responsive shared CSS wrapped the action underneath the heading. A specifically scoped results-header rule keeps the heading/subtitle on the left and compact action on the right; 320px uses a deliberate wrapping fallback. |
| 5 | MFA enrollment | Successful MFA mutations invalidated `session:guard`. The protected route unmounted the security page during revalidation and lost the returned setup/QR state. MFA mutations now invalidate account data without remounting the guard. Added required-password feedback, loading/retry states, useful errors, and configuration feedback. Existing server-side encrypted TOTP, verification, replay protection and recovery codes remain authoritative. |
| 6 | Password controls and strength | Security fields used ordinary masked inputs and only checked length/matching. Each field now uses the shared independent visibility toggle, with pointer-focus preservation. Shared client/server password-change validation preserves the existing 8–128 character, uppercase and digit rules and rejects common/repeated patterns; the UI shows strength, requirements and mismatch feedback. No new dependency. |
| 7 | Stay signed in after password change | The backend invalidated the credential used by the current session; the frontend cleared transport/cache identity and remounted the page. Platform password changes now lock/check credentials and update the current session atomically, revoke other sessions, and preserve current expiry/MFA verification. Legacy cookies are replaced; token sessions receive the new credential digest. Admin and non-platform legacy paths also retain the current login. Recovery reset behavior is unchanged. |
| 8 | Guest-only auth forms | Login/register lacked a guest boundary. Their layout now waits for the shared session check, hides forms during loading, handles verification failure, and replaces authenticated visits with `/`. Recovery/admin/challenge routes are not blanket-redirected. |
| 9 | ShareCards options and artifacts | The studio omitted mapStats/recentMatches from its card data. It now derives map metrics with the existing analytics utility and passes the last five published matches. The preview uses real content, matching export. A broad disabled-input CSS rule overrode invisible native switch opacity; checkboxes/radios are excluded from that rule. Empty data remains disabled with an explanation; loading/error states remain handled by the workspace data boundary. |
| 10 | Cache/refetch behavior | Public profiles inherited the live one-minute policy; directory snapshots and historical data also used one minute. Directory/profile data now uses five minutes, history ten; public expiry respects the selected lifetime. Existing concurrent deduplication, cancellation, mutation invalidation, private identity isolation, live one-minute competition reads, workspace polling and session revalidation remain intact. Security mutations no longer cause unnecessary workspace snapshot reloads. |

## Verification

- Repository lint/type checks: passed (`npm run lint`; this repository uses TypeScript checks as its lint script).
- Production build: passed, including 97 prerendered route shells and the public-output secret check.
- Component suite: **434 passed**, 63 files.
- Server suite: **241 passed**, 5 skipped, 32 files.
- Isolated PostgreSQL integration suite: **49 passed**, 2 skipped, 3 files. Real legacy/token session behavior, MFA, authorization, recovery and database operations are exercised in disposable local databases.
- Domain tests: **25 passed**.
- Browser checks across targeted runs: **26 passed** across desktop Chrome, mobile Chrome and the isolated real-database browser suite. This includes six comprehensive checks in each Chrome project, four OAuth-navigation checks in each, two results/roster/export checks in each, and two real security scenarios.
- Viewports: 320×568, 360×740, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1440×900, and 1920×1080. Login, security, ShareCards and download UI were checked for overflow; header alignment and modal focus restoration were asserted. Rendered login, results-header, modal, and ShareCards views were also visually inspected.
- PNG checks: real PNG signatures and dimensions for both result options and all three ShareCard ratios in Standard/Extended mode. Existing card-layout tests cover optional-region bounds and combinations.
- Real security browser tests: wrong MFA password, invalid TOTP, enrollment, persisted activation, mandatory subsequent challenge, one-use recovery, password rotation, current-session retention, other-session revocation, and guest-route redirection.
- Google browser tests intercept the external provider boundary; server tests verify callback security and homepage completion. No real Google account was used.
- `git diff --check`: passed.

Earlier failures were resolved: unconstrained test concurrency caused worker timeouts; bounded reruns passed. Old server assertions expecting logout/workspace redirects were updated to the requested behavior. A mobile roster test counted still-pending initial reads as hover requests; it now waits for initial network activity to settle. An explicit header-position assertion caught a stylesheet-order conflict that was fixed. No unresolved failures remain in the checks listed above.

Skipped tests: five opt-in driver lifecycle tests require a separate PostgreSQL service on port 55439; two demo-database checks require explicit demo verification/lifecycle environment flags. These were not enabled. Safari/Firefox and production-authenticated workflows were not tested.

## Performance evidence

Controlled browser comparison uses the same app and HTTP fixtures, replaying the previous 60-second policy against the updated five-minute directory policy. Browser time is advanced; these are request-count measurements, not production latency benchmarks.

| Scenario | Previous policy | Updated policy |
|---|---:|---:|
| Cold public snapshot reads | 1 | 1 |
| Additional public reads after 10-second focus return | 0 | 0 |
| Additional public reads after 130-second focus return | 1 | 0 |
| Session revalidation after 130 seconds | 1 | 1 |

The updated navigation scenario reused the warm snapshot; a later six-minute advance caused a fresh read. Existing deduplication and user-cache isolation tests passed. Security mutation tests verify that account data refreshes while the session guard is retained. Live data and security checks still revalidate.

Chrome DevTools inspected the live guest login page before changes: `/login/` had `auth-shell` without the login variant. Its three API requests were Google status (~534ms), refresh negotiation (~442ms), and anonymous session (~216ms). These are observations of the old live deployment, not an improvement claim. Production before/after latency, LCP, CLS, INP and bundle-size deltas were not measured. No package or lockfile dependency changes were introduced.

## External configuration and deployment

No new schema migration or provider feature is required by these fixes. Existing custom MFA requires the existing platform migrations, AEVIC_DATABASE_URL, and a stable AEVIC_SESSION_SECRET of at least 32 characters. The UI reports missing capability/configuration instead of silently failing. Do not replace the existing encryption secret as part of deploying this patch.

Supabase MCP tools were not exposed in this session, so production database settings were not independently audited. The implementation was verified using the repository's real backend against disposable local PostgreSQL. Existing Google callback configuration was preserved; production Google sign-in and authenticated production MFA/password changes still require a post-deployment smoke test. Deployment has not been performed.

## Modified files

### Backend authentication and session handling

- [server/app.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/app.ts)
- [server/auth/google-routes.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/auth/google-routes.ts)
- [server/captain/service.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/captain/service.ts)
- [server/platform/admin-account.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/platform/admin-account.ts)
- [server/platform/mfa.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/platform/mfa.ts)
- [server/platform/password-change.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/platform/password-change.ts)
- [server/routes/captain.ts](/Users/samirhebibov/Documents/Aevic_Landing/server/routes/captain.ts)

### Frontend routes and controls

- [src/components/auth/GoogleAuth.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/components/auth/GoogleAuth.tsx)
- [src/components/common/primitives.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/components/common/primitives.tsx)
- [src/components/competition/results-download.css](/Users/samirhebibov/Documents/Aevic_Landing/src/components/competition/results-download.css)
- [src/components/profile/ProfileCardGenerator.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/components/profile/ProfileCardGenerator.tsx)
- [src/layouts/AuthLayout.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/layouts/AuthLayout.tsx)
- [src/pages/routes/AccountSecurityPage.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/pages/routes/AccountSecurityPage.tsx)
- [src/pages/routes/LoginPage.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/pages/routes/LoginPage.tsx)
- [src/pages/routes/TeamSharecardsPage.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/pages/routes/TeamSharecardsPage.tsx)

### Client services, password policy and styling

- [src/services/PublicPlatformDataContext.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/services/PublicPlatformDataContext.tsx)
- [src/services/apiError.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/services/apiError.ts)
- [src/services/index.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/services/index.ts)
- [src/services/mutationInvalidation.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/services/mutationInvalidation.ts)
- [src/services/queryCache.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/services/queryCache.ts)
- [src/services/tokenSession.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/services/tokenSession.ts)
- [src/styles/team-workspace.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/team-workspace.css)
- [src/styles/tournament-detail.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/tournament-detail.css)
- [src/styles/workspace.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/workspace.css)
- [src/utils/passwordStrength.ts](/Users/samirhebibov/Documents/Aevic_Landing/src/utils/passwordStrength.ts)

### Regression tests and TypeScript configuration

- [tests/e2e/comprehensive-fixes.spec.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/e2e/comprehensive-fixes.spec.ts)
- [tests/e2e/google-oauth-navigation.spec.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/e2e/google-oauth-navigation.spec.ts)
- [tests/e2e/results-roster-refinement.spec.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/e2e/results-roster-refinement.spec.ts)
- [tests/mutation-cache.test.tsx](/Users/samirhebibov/Documents/Aevic_Landing/tests/mutation-cache.test.tsx)
- [tests/password-strength.test.tsx](/Users/samirhebibov/Documents/Aevic_Landing/tests/password-strength.test.tsx)
- [tests/platform-browser/security-improvements.spec.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/platform-browser/security-improvements.spec.ts)
- [tests/platform/competition.test.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/platform/competition.test.ts)
- [tests/server/google-routes.test.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/server/google-routes.test.ts)
- [tests/server/token-transport.test.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/server/token-transport.test.ts)
- [tsconfig.node.json](/Users/samirhebibov/Documents/Aevic_Landing/tsconfig.node.json)

## Git status

The tree started clean. All implementation and regression-test changes, plus this report, are uncommitted. Nothing was committed, pushed, or deployed. No production records or authentication databases were modified.
