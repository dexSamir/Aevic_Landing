# AEVIC local implementation report — 12 October 2026

## Outcome and boundaries

Implemented a shared placement component, unified rounded loading primitives, global/workspace palette consolidation, public map performance redesign, and authentication/request lifecycle fixes. Existing Google OAuth implementation was audited and regression-tested, with a read-only readiness check and manual activation runbook. **Google remains disabled; no commit, push, deployment, production configuration/data change, or migration.**

No screenshots, videos, traces, images, Figma files or presentation artifacts were generated. Browser verification uses DOM and computed styles. The pre-existing untracked `tests/pwa/navigation.test.mjs` was preserved.

## 1. Audit findings

See [audit and component inventory](audit.md). The main confirmed inconsistencies were three independent recent-result renderers, square-corner skeleton declarations, repeated public profile overrides, and a workspace shell that redefined the global palette. Existing common Button, Input/Field, Modal, Drawer, Toast and EmptyState components already provide appropriate shared behavior; rebuilding them was unnecessary. Player listing is an intentionally removed route, not a missing redesign page.

The audit used source architecture, route inventory, provided screenshots and official design guidance. Apple motion principles informed restrained feedback; Carbon's layering approach informed semantic surfaces; FACEIT's map/match context informed statistical presentation. Links and selection rationale are in the audit.

## 2. Unified architecture

`src/styles/tokens.css` remains the palette, typography, radius, spacing and motion authority. Team surface/text roles now alias global roles. The workspace frame retains layout/density variables but no separate palette. Global roles cover page/base/secondary/elevated/hover/active surfaces, primary/secondary/muted/inverse text, brand/success/warning/error/info/identity, radii, spacing, motion and focus/elevation shadows.

New component tokens define invariant placement size, gap, font, radius and colors. A 2.2-second loading pulse is shared. Existing phoenix, dark foundation, Raleway, Oswald/Orbitron and gold are retained. Inputs and keyboard focus keep essential boundaries.

## 3. Shared components

- `RecentPlacementStrip`: directory, public profile and captain overview use one renderer and stylesheet. Newest-first, at most five results, numeric-only tiles, gold/dark first place, identical normal tiles. Context remains in accessible labels/tooltips. Invalid placement is an em dash; empty history remains explicit. Sorting never mutates source data.
- `SkeletonBlock`: shared by all LoadingSkeleton variants and the workspace's geometry-preserving placeholders. Navigation gains an explicit variant.
- `MapPerformance`: owns public map presentation and eligibility comparison rather than inline profile markup and several competing CSS blocks.
- Existing buttons, fields, dialogs, drawers, toasts and empty states remain shared; common empty-state radius now follows the card token.

## 4. Pages affected

Direct presentation changes: `/teams`, `/teams/:teamSlug`, `/team`. Navigation identity changes affect the entire public shell, including home, tournaments, matches and authentication pages. Loading/token changes propagate to all consumers: public discovery/detail pages, account settings/security, team profile/roster/history/tournaments/messages/notifications/requests/disputes/badges/verification/settings, and admin forms/tables/loading states. Public, account and admin page compositions are retained.

DOM route matrix covers home, tournament/match/team directories, public team profile, login/register, account profile, and team overview/roster/history/settings/tournaments/messages at all four requested widths. Existing critical-flow tests additionally exercise recovery, verification/security, tournament detail and operations, dispute/support forms, public result navigation, search, share-card route, invitations, organization and admin lifecycles. This is representative route-family coverage, not every possible record/state combination in all 99 route definitions.

## 5. Loading system

Rounded blocks, images, controls, panels and team-card placeholders replace explicit square corners. Public and workspace loading use the same pulse and tokens, preserving existing aspect ratios, row grids and shell geometry. All looping loading styles stop under reduced motion. Removed workspace palette/radius overrides and its independent breathe animation. Legacy preview/logo placeholders use the shared visual rules.

## 6. Placement consistency

Removed the directory WWCD letters, workspace WWCD word, and duplicated public form styling. All three contexts render the same 44px tiles, 8px radius/gap, font and borderless surface. Browser assertions compare actual computed geometry/font/gap/border across contexts at 375/768/1024/1440px; keyboard focus remains visible. Match-history/table placements remain contextual result data, not a second last-five strip.

## 7. Authentication and loading: confirmed vs unconfirmed

Confirmed and fixed:

- `PublicAuthActions` previously used `!session`, conflating unresolved/failed verification with a confirmed guest. It now renders a navigation skeleton during verification, a recovery action on failure, and guest controls only after a verified null session.
- Public session provider reset on every pathname change. It now verifies on mount, identity changes, and throttled focus/online events rather than public navigation. Genuine expiration still resolves to guest state.
- Shared session wrapper cleared successful private caches for every error, including transient server/network failures. It now invalidates on actual authorization denial; transient errors remain errors without evicting valid cached responses.
- One cancelled observer can stop waiting without aborting the shared session read for other consumers. Revision guards continue to prevent old identities winning races.
- Profile adapter did not accept query cancellation. Route and directory profile requests now pass AbortSignal through to transport. Existing query-cache stale-result guards and one bounded retry remain; mutations are not retried.
- Public profiles retain successful cached data and show a refresh-failure notice instead of silently hiding refresh errors.
- Session 403 is no longer silently normalized into a guest session. API classification preserves authorization denial.

Already present and preserved: distinct HTTP/network/timeout/abort errors, safe sanitized messages, retry-after handling, bounded jittered read retries, concurrent token refresh coordination, in-memory access tokens, server cookie sessions and PWA navigation regression.

Unconfirmed: the specific intermittent production profile 503 in the screenshot. A read-only request returned HTTP 200 in about 5.3 seconds; this does not disprove intermittent database/backend/network issues. No evidence links that 503 to authentication. Browser fetch cannot distinguish DNS failure from other network failures, so no invented DNS-specific label was added. Logs/request IDs from an actual recurrence are required for infrastructure diagnosis.

## 8. Map statistics

Existing Erangel/Miramar/Rondo images are landscape identity bands. Average placement is primary; match count and win percentage are secondary. Win meters represent wins divided by matches on a 0–1 scale, not an invented performance score. Small samples remain labeled; best-average emphasis requires minimum sample eligibility and an actual difference among eligible maps. No data or sample rules changed.

## 9. Workspace hierarchy

Workspace and public surfaces share global tokens. Team identity uses a muted purple surface, the next competitive action a restrained gold surface, and key analytics/check-in information a cool blue surface. General cards remain neutral. Existing workspace-wide typography, forms, responsive layout, danger states and navigation behavior are preserved; chart/card radii now follow shared tokens.

## 10. Google readiness

See [Google readiness and exact manual steps](google-readiness.md). Existing flow security tests pass; exact generated callback and cross-origin rejection assertions were added. Both existing tables have RLS and required privileges for the configured local connection. Production callback is reachable and Google status remains false. Cloud client redirect/audience/test-user settings, Netlify effective runtime credentials/permissions and an authorized real-provider login are **not verified**. The implementation has not been declared production-ready solely on mocked tests.

## 11. Validation

| Check | Result |
|---|---|
| TypeScript / project lint | Passed; repository lint script runs frontend/server TypeScript |
| Production build | Passed; 98 static route shells / 99 route definitions |
| Public-output secret scan | Passed; 9 configured sensitive keys checked without printing values |
| Component tests | 323 passed / 52 files |
| Server tests | 186 passed / 25 files before added CSRF case; focused Google/token rerun 36 passed including the added case |
| Domain tests | 20 passed |
| Existing PWA regression | 1 passed after running its local server outside sandbox |
| New responsive/DOM suite | 7 passed: four width matrices, identity/reduced-motion, transient profile recovery, shared workspace loading |
| Existing critical browser interactions | 6 passed using the no-media configuration |
| Session cancellation/cache regressions | 8 tests passed in focused session/global component run; included in final component suite |
| Optional platform DB suite | 10 passed, 41 skipped; integration setup failed because isolated Postgres on `/tmp:55432` was absent. No DB schema/migration operation succeeded |
| Changed/untracked source secret scan | 41 files, 9 configured sensitive values, zero matches |
| Git whitespace check | Passed |

Initial unconstrained component/server concurrency produced two 5-second timeouts; both suites passed with two workers. Initial local-server tests were sandbox-blocked, then passed with approved execution. These are environment results, not hidden application failures.

## 12. Release recommendation and limitations

Review the local diff and this report before authorizing a commit or deployment. Preserve the current production Google flag/session mode. Verify the real-provider prerequisites in the separate runbook before requesting Google activation. If the profile 503 recurs, correlate its sanitized request ID and timestamp with backend/database logs; current read-only success cannot establish its original cause.

No visual screenshot comparison was performed by instruction. DOM checks establish geometry, overflow, interaction and selected computed-style consistency, not subjective visual approval or every accessibility criterion. Historic page-specific CSS still exists for page composition; this change removes the competing implementations in the requested shared systems rather than rewriting unrelated working pages.

## 13. Modified files

The inventory below excludes the pre-existing untracked PWA regression (preserved unchanged).

- `DESIGN.md`
- `docs/global-design/audit.md`
- `docs/global-design/google-readiness.md`
- `docs/global-design/report.md`
- `playwright.global-design.config.ts`
- `scripts/inspect-google-readiness.mjs`
- `src/components/common/LoadingSkeleton.tsx`
- `src/components/common/RecentPlacementStrip.tsx`
- `src/components/common/loading-skeleton.css`
- `src/components/common/recent-placement-strip.css`
- `src/components/profile/DirectoryTeamCard.tsx`
- `src/components/profile/MapPerformance.tsx`
- `src/components/profile/PublicTeamDetail.tsx`
- `src/components/profile/map-performance.css`
- `src/components/team/TeamOverview.tsx`
- `src/layouts/TeamWorkspaceFrame.tsx`
- `src/layouts/layouts.tsx`
- `src/layouts/team-workspace-frame.css`
- `src/pages/routes/TeamProfilePage.tsx`
- `src/services/PublicSessionContext.tsx`
- `src/services/apiAdapter.ts`
- `src/services/contracts.ts`
- `src/services/index.ts`
- `src/styles/components.css`
- `src/styles/home.css`
- `src/styles/public-pages.css`
- `src/styles/route-components.css`
- `src/styles/team-insights.css`
- `src/styles/team-overview.css`
- `src/styles/team-workspace.css`
- `src/styles/tokens.css`
- `tests/architecture-reset.test.tsx`
- `tests/directory-team-results.test.tsx`
- `tests/global-design-system.test.tsx`
- `tests/global-design/consistency.spec.ts`
- `tests/global-design/interactions.spec.ts`
- `tests/public-shell-contract.test.tsx`
- `tests/refinement.test.tsx`
- `tests/server/google-routes.test.ts`
- `tests/session-logout.test.tsx`
