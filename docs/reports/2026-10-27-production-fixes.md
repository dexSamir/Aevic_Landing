# AEVIC production fixes — implementation and verification

Prepared 27 October 2026. Changes are local and unstaged. No production records, accounts, deployments or published results were modified.

## Completed work

1. **Authenticated redirects and session loading.** Added a 60-second, memory-only cache populated by authoritative session responses or successful login. Concurrent readers still share a single request, and cancelling one observer does not cancel another. Identity events, cross-tab changes, logout, password changes and explicit refresh invalidate the cache. Auth routes skip team enrichment entirely; public routes publish verified identity before optional team data completes. Both trailing-slash forms use the same guest guard and history replacement. Auth CSS now loads with AuthLayout instead of waiting for the lazy form page, preventing the malformed loading panel. Navigation shows a restrained account-status label.
2. **Password strength.** Five vivid strength levels, an animated bar, screen-reader meter values, requirement checks and reduced-motion support. Feedback considers length, character categories, distinct characters, common/leet words, repeated sequences, predictable runs and the available account email. Long passphrases receive appropriate credit. The existing shared server/client validity requirements remain unchanged. Strength is a lightweight heuristic, not a claim of measured cracking time.
3. **Authenticator-first MFA.** Shared six-digit numeric input with paste and autofill support. Recovery codes have an explicit separate mode which clears the previous input. Email/password challenges replace the credential form while preserving credentials only in component memory. Google continuation hides unrelated credential fields only after a real continuation has loaded; expiry can still offer restart. Both methods expose loading/error states. Google submits through a native form. Focus uses preventScroll, fixing automatic page jumps that could place the heading underneath navigation. Existing secret encryption, challenge expiry, replay controls, rate limits and single-use recovery transactions remain intact.
4. **International scoring.** Canonical `pubgm-international-v1` configuration and ranking live in `src/utils/scoring.ts`. New tournament insertion and the database default use the preset. Overall standings, scoped leaderboard queries, individual match responses, publication/correction snapshots and admin review pass through canonical functions. Stored points remain authoritative. Admin detail and public tournament detail identify the associated preset. Unversioned tournaments keep the previous comparator.
5. **Result-tab scroll.** The custom outlet previously treated every new location key, including a query-only update, as a page arrival. It now distinguishes pathname/hash changes from same-document query navigation. Tabs preserve URLs, focus, page instance and Back/Forward behavior without delayed scroll hacks.
6. **Mobile download cards.** Mobile minimum height increased from 124px to 156px; equal two-column arrangement, disabled states and existing export logic remain. Desktop rules were not changed.
7. **Mobile standings.** Replaced duplicated mobile cards with the same semantic competition table used on desktop. Compact 44px minimum row geometry, smaller identities, aligned numbers and internal horizontal scrolling retain all statistics. Total points stay visible at the right edge. Desktop structure remains unchanged.
8. **AEVIC rulebook.** Added original Azerbaijani content for sections A–N, retaining the existing layout, typography and section components. Sidebar navigation remains usable on shorter desktop screens. Scoring text derives placement values and tiebreak labels from the canonical preset. The page remains explicitly a draft awaiting owner/legal approval, with no invented effective date or financial guarantees.

## Root causes

- Public and auth layouts remounted separate session providers; only concurrent reads were deduplicated, and team enrichment delayed the final identity state.
- AuthLayout depended on CSS imported by its guarded lazy child. While the guard was loading, the required form-shell overrides were unavailable.
- Native meter styling and length-heavy scoring offered little differentiation.
- MFA UI combined recovery and authenticator credentials and left the ordinary login form visible during Google continuation. Autofocus could scroll the heading beneath the fixed header.
- Placement values already matched the international table, but the legacy comparator used eliminations and best-ever finish rather than placement points and latest-match placement.
- Custom scroll handling ignored the result tabs' `preventScrollReset` intention.
- A separate mobile card list created oversized rows, while another mobile CSS rule hid the semantic table.
- The previous rulebook contained seven short placeholder sections.

## Scoring research and compatibility

Sources reviewed:

- [PUBG Mobile Official Competition Rulebook v1.6.0, 27 February 2025](https://esports.pubgmobile.com/static/doc/PUBGMOfficialCompetitionRulebookV1.6.0.pdf), especially Appendix 2. This is the umbrella competition document covering PMWC and PMGC; no claim is made that a separate current PMGC event handbook was verified.
- [EWC 2026 PUBG Mobile rulebook index](https://resources.esportsworldcup.com/en/competitive-ops/rulebooks/pubg-mobile) and its [PMWC player handbook v1.0, 29 July 2026](https://cdn.esportsworldcup.com/resources/uploads/PUBG_MOBILE_World_Cup_at_EWC_26_Player_Handbook_2c30c6fd59.pdf), sections 3.1.4 and 4.5–4.6.
- [EWC 2026 Global Rulebook 1.1](https://d3h9qea4qy4169.cloudfront.net/EWC_2026_Global_Rulebook_1_1_55b3cc60e1.pdf), including governance, misconduct, privacy and protest structure; the [EWC resource center](https://resources.esportsworldcup.com/en) was also consulted.

The standard placement values are **10, 6, 5, 4, 3, 2, 1, 1, then zero for places 9–16**, with **one point per elimination** and no extra WWCD bonus. Total is placement plus elimination points minus recorded penalties. Second place and seven eliminations yields 13 points before penalties.

After total points, the comparator uses WWCD count, accumulated placement points, accumulated elimination points and placement in the latest relevant published match. Stable team-ID order is the final technical fallback; it adds no points. A team absent from that latest match sorts behind a team with a placement when that criterion is needed.

The EWC grand final SMASH championship rule is separate from cumulative scoring and is **not implemented or enabled**. The umbrella document also discusses compensation; AEVIC has no new automatic compensation mechanism. Event-specific age, travel, roster and payout conditions were not copied into ordinary AEVIC events.

Historical protection is explicit: an absent/unrecognized preset ID retains the previous total/WWCD/eliminations/best-finish ordering. Existing point formulas, stored totals and snapshots are not migrated. The SQL migration changes only the default for newly inserted rows. A regression test compares that default with the TypeScript preset, preventing drift.

## Rulebook policy basis and pending decisions

The fourteen sections cover platform conduct; team registration; names; uploaded media; eligibility; registration/check-in; match procedures; fair play; scoring; publication/disputes; prizes/payments; broadcasting; privacy; versioning/enforcement.

Implementation-backed details include four starters and one optional reserve, optional team tags up to five characters, PNG/JPEG/WebP uploads up to 4,000,000 bytes, decoded-image validation and a 20-million-pixel limit, 1:1 logo and 16:5 banner recommendations, manual support review, roster locks, configured dispute windows and published-only results.

**Owner decisions still required before publishing binding policy:** effective date, minimum-age/guardian policy, tournament-specific eligibility and dispute windows, media permissions, prize allocation/payment/refund terms, data controller/retention/deletion procedures and final legal wording. The implementation introduces no new registration restrictions. No legal entity, address, arbitration clause, payout deadline, refund guarantee or new support channel was fabricated. Existing privacy/terms/contact pages are linked. AEVIC is not represented as affiliated with EWC, Tencent, KRAFTON or PUBG Mobile.

## Verification

- TypeScript frontend/server validation and the repository's `lint` command passed. This repository uses TypeScript checking as lint; it has no separate ESLint command.
- Production build passed, including prerender generation and public-output secret scanning.
- Domain tests: **25 passed**.
- Component tests: **442 passed** across 65 files.
- Server tests: **241 passed, 5 skipped**. The skipped driver-lifecycle tests require a separate opt-in PostgreSQL instance on port 55439; they were not enabled.
- Platform tests with isolated local PostgreSQL: **49 passed, 2 skipped**. The skipped tests are opt-in installed-demo database verification/mutation tests, intentionally not enabled.
- Database migration/policy/integration suite passed against an ephemeral local database. Its harness was repaired to load the existing synthetic original-platform fixture before migrations.
- Seven new Chromium browser tests passed. They cover all requested viewport sizes, guest/authenticated slash routes, Google MFA presentation, email MFA invalid-code/fallback behavior, session loading/cache reuse, result-tab history, modal geometry, password meters and rulebook navigation.
- Existing PNG browser regression passed for both leaderboard and own-team exports: PNG signature, 2400px width, nontrivial byte output and modal closure.
- `git diff --check` passed. Final changes were reviewed.

Viewport matrix: **320×568, 360×740, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080**. Browser tests checked horizontal page overflow, visible controls and navigation spacing; mobile and desktop MFA and mobile standings screenshots were visually inspected. Browser coverage is Chromium, not Safari or Firefox.

Local measured behavior: releasing a controlled authoritative session response reached the homepage in approximately **241ms** in one fixture run; navigating back to an auth route with a known session made **zero additional session-verification requests**. This is not a production latency benchmark or a before/after network comparison.

Initial test failures were resolved: old combined-MFA label expectations, old duplicated mobile-card expectations, always-revalidate session expectations, a native-ESM import extension, the missing database bootstrap fixture, browser fixture setup and autofocus scrolling. No remaining failure is known in the final checks above.

Chrome DevTools MCP could not attach because its managed browser profile was already occupied. Playwright supplied browser verification. Supabase MCP tools were not exposed in this session; database analysis used repository schemas and isolated local tests. No live production auth, Google-provider flow, account mutation or deployed scoring behavior was tested. No production data was read to inventory individual historical presets; compatibility is based on the stored per-tournament formula and the unversioned fallback.

## Remaining configuration and release work

Review and apply `supabase/migrations/20261027083043_international_scoring_default.sql` through the normal release process, then deploy the code yourself. The migration was applied only to temporary test databases. Direct platform creation explicitly supplies the preset, while database-default consumers require the migration. No additional package or environment variable was introduced. Existing Google OAuth, MFA secret and email settings remain required.

Approve the policy decisions above before treating the rulebook draft as binding. No historical tournament conversion is included.

## Git status

All changes are unstaged. No `git add`, commit, push, reset or deployment was performed. Production accounts and tournament records were untouched.

## Modified files


### Frontend and shared domain

- `src/components/auth/GoogleAuth.tsx`
- `src/components/common/Motion.tsx`
- `src/components/competition/TournamentResults.tsx`
- `src/layouts/AuthLayout.tsx`
- `src/layouts/layouts.tsx`
- `src/pages/InformationPages.tsx`
- `src/pages/routes/AccountSecurityPage.tsx`
- `src/pages/routes/AdminTournamentDetailPage.tsx`
- `src/pages/routes/LoginPage.tsx`
- `src/pages/routes/TournamentDetailPage.tsx`
- `src/services/PublicSessionContext.tsx`
- `src/services/index.ts`
- `src/types/domain.ts`
- `src/utils/lifecycle.ts`
- `src/utils/passwordStrength.ts`
- `src/utils/scoring.ts`
- `src/components/auth/MfaCodeInput.tsx`
- `src/content/regulations.ts`

### Backend

- `server/platform/repository.ts`
- `server/platform/standings.ts`
- `server/platform/tournaments.ts`
- `server/routes/public.ts`
- `server/services/data.ts`

### Database and test bootstrap

- `scripts/test-database.mjs`
- `supabase/migrations/20261027083043_international_scoring_default.sql`

### Styles

- `src/components/competition/results-download.css`
- `src/styles/auth.css`
- `src/styles/public-pages.css`
- `src/styles/public-shell.css`
- `src/styles/regulations.css`
- `src/styles/tournament-detail.css`
- `src/styles/workspace.css`

### Tests and browser configuration

- `tests/google-auth-ui.test.tsx`
- `tests/performance-optimization.test.tsx`
- `tests/platform/competition.test.ts`
- `tests/refinement-behavior.test.tsx`
- `tests/tournament-match-results.test.tsx`
- `playwright.production-fixes.config.ts`
- `tests/e2e/production-fixes.spec.ts`
- `tests/international-scoring.test.tsx`
- `tests/mfa-challenge.test.tsx`
