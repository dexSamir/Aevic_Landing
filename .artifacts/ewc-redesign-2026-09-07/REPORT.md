# AEVIC site redesign — 2026-09-07

## Direction and constraints
AEVIC gold (#f3c450), purple (#6a1b9a), near-black surfaces, existing fonts and assets. The [EWC reference](https://esportsworldcup.com/en) was read as text only; no assets or copy were imported. Existing Azerbaijani copy, routes, service contracts and business logic are preserved. No dependencies added. No browser, screenshot, image generation or visual audit tools used.

## Phase 1 — Foundation
- `src/styles/tokens.css`: semantic/card/control/stat tokens, softer frames, existing medium/large radii preserved, brighter muted text, shared team radii.
- `src/styles/components.css`: rounded controls, readable status/error text, wrapping actions, upload focus treatment.
- `src/styles/globals.css`: sticky-header clearance for anchors and focus navigation.
- Verification: `npm run build && npm run test && npm run lint` passed (20 domain + 175 component tests).

CSS-only visual changes are documented by their owning component in subsequent phases; source files do not need artificial edits when existing selectors provide the presentation hook.

## Phase 2 — Navigation and shell
- `layouts.tsx`: public navigation receives decorative Lucide icons, keeping labels, URLs, active-route indicator and account behavior.
- `WorkspaceNav.tsx`, `workspace-nav.css`: consistent icon wells, 50px rows, 44px group controls, gold selection and preserved collapse state.
- `public-shell.css`: rounded nav, gold indicator, opaque scrolled header, mobile drawer alignment and tablet spacing.
- `workspace.css`, `team-workspace.css`: quieter Team/Admin chrome, shared sidebar sizing, rounded account controls and identity surfaces.
- Verification: build, 20 domain tests, 175 component tests and lint passed.

## Phase 3 — Public pages
- `HomePage.tsx` via `home.css`: inset arena cover, responsive display typography, rounded tournament rail/fact cells, team cards, map cards, record spotlight and final CTA.
- `PublicPages.tsx` / `public-pages.css`: tournament listing date tiles, tournament hero and context navigation, shared 3:2 stat strip for existing format facts, registration panel, results summary, scoring and rules; leaderboard champion surface; regulations and information pages.
- Added `common/StatCardStrip.tsx` + owned CSS, retaining the existing `team-stat-slider` class family for a single reusable pattern. Public date/check-in facts retain their existing values and labels in the new cards.
- `PublicArchivePages.tsx` via `public-pages.css`: records masthead, featured record, registry cards, inline detail, recap hero/champion/stat surfaces.
- `PublicIdentityPages.tsx` via `public-pages.css`: season archive sections and year hierarchy. This file contains archive/legacy redirects, not the team profile.
- `ProfilePages.tsx` / `public-pages.css`: directory cards and selection, search/count treatment, full public team hero and panels; explicit presentation hook for the limited public-team preview. These are the actual owners of directory/profile markup.
- `PublicFooter.tsx` via `public-shell.css`: inset purple footer, gold group headings, spacing and separated lower navigation.
- `competition-schedule.css`: shared Home/listing calendar surface, heading and controls.
- Verification: build, 20 domain tests, 175 component tests and lint passed. No tests changed.

## Phase 4 — Team workspace
- `TeamPages.tsx`: dashboard now renders the shared StatCardStrip with the same five destinations and existing values. `team-workspace.css` replaces obsolete KPI CSS (including dark purple-card text and an undefined ink-card foreground token).
- Dashboard next-action presentation, quickline, competition anchor, run-sheet, awareness/change area, readiness, standings and room panels restyled. `NextActionCard.tsx` has no JSX; its `deriveNextAction` logic is unchanged and its consuming `.team-now` presentation is reskinned.
- Every `TeamPages.tsx` page: dashboard, tournament list/detail, history, comparison, roster, messages, share studio, settings. Existing selectors in `team-workspace.css` handle their surfaces, heading hierarchy, selected states and spacing.
- `TeamOperationsPages.tsx`: notifications, roster request list/detail, disputes list/new/detail via notification/request ledgers, replacement pair, operation forms and detail panels.
- `CompletionPages.tsx` Team routes: invitations, manager governance and verification via invitation/authority ledgers, completion-grid forms and existing branded header tokens.
- Every file in `src/components/team/`: `TeamExperience.tsx` career/performance/comparison/schedule treatments; `Achievements.tsx` medals, progress, placeholder and legacy surfaces; `BadgeCabinet.tsx` featured cabinet, detail, collection, reorder and picker surfaces; `CompetitionAwareness.tsx` severity-led presentation; `NextActionCard.tsx` consuming presentation as explained above. Shared component rules live in `public-pages.css`/`components.css` so public profiles and drawers benefit too.
- Test update: `tests/architecture-reset.test.tsx` replaces the stale run-sheet-only test name and adds assertions for five KPI links and roster/notification destinations. No existing assertion was removed or weakened. The obsolete CSS comment is updated.
- Verification: build, 20 domain tests, 175 component tests and lint passed.

## Phase 5 — Admin
- `AdminPages.tsx`: overview reuses StatCardStrip, retaining all four metrics, source-unavailable states and copy. Each KPI links to the existing team, slot, missed-check-in or results destination.
- `workspace.css`: compact command lead, dashboard queues, table/header density, tabular numbers, filter toolbar, tournament rows, wizard, slot management, results entry/review, messages, blacklist and settings. This covers every export of `AdminPages.tsx`.
- `AdminOperationsPages.tsx`: team review, roster requests, disputes, audit and users receive rounded panels/queues, consistent row spacing, readable metadata and grouped decisions through their existing selectors.
- Related admin views in `CompletionPages.tsx` and `ProfilePages.tsx`: verification/support queues and detail forms, player review, result correction, lifecycle, missed check-ins and organization review use the same panel/queue treatment.
- Verification: build, 20 domain tests, 175 component tests and lint passed. No test changes in this phase.

## Phase 6 — Auth, account, completion and profile finish
- `AuthPages.tsx` via `auth.css`: LoginPage (including admin login), RegisterPage and ForgotPasswordPage receive opaque rounded form surfaces, restrained headings, shared input radii, step indicator and preview/action treatment. Form handlers, validation, autocomplete and copy stay intact.
- `AuthLifecyclePages.tsx` via `auth.css`/`lifecycle.css`: ResetPasswordPage, VerifyEmailPage and access/session/locked/rate-limit states share readable headings, purple icon wells and rounded state panels.
- `AccountPages.tsx`: account navigation icons marked decorative and labels wrapped; `lifecycle.css` restyles AccountLayout, AccountProfilePage, AccountSecurityPage (password, 2FA and recovery codes), AccountNotificationsPage and AccountSessionsPage. Destructive/export controls remain distinct and wrap under their descriptions.
- `CompletionPages.tsx`: SearchResultsPage, FollowingPage, PlayerClaimPage, TeamGovernancePage, BadgeDetailPage, TeamInvitationsPage, VerificationApplicationPage, AdminVerificationQueuePage, AdminVerificationDetailPage, AdminPlayerDetailPage, AdminSupportQueuePage, AdminResultCorrectionPage, OrganizationWorkspacePage, TournamentLifecycleAdminPage and AdminMissedCheckInsPage are covered across phases 4–6 by completion panels, entity/search/review/history/invitation/authority/request ledgers, operation forms, lifecycle states, verification and badge surfaces. Nested forms keep a single panel boundary.
- `ProfilePages.tsx`: phase 3 covered TeamsDirectoryPage, PublicTeamProfileRoute and TeamProfilePage; phase 4 covered PublicTeamComparisonPage and TeamBadgeCabinetPage; phase 5 covered AdminOrganizationsPage. This phase completes OrganizationsDirectoryPage and OrganizationProfilePage (directory/team rows, organization overview and profile navigation).
- Supporting full-site surfaces: SupportPages FAQ/search/contact panel and account ticket threads; SystemPages state icon/heading treatment; shared public empty states, recap highlights and tournament round/media cards.
- Final responsive refinements: shared KPI strips remain one horizontal row at intermediate widths; long KPI values can grow in height rather than truncate. Small-screen record values, directory detail, scoring facts and account controls wrap. The 3:2 ratio remains the preferred card ratio with content-driven growth for longer labels. No auto-rotation or swipe-only links.
- Verification: final `npm run build && npm run test && npm run lint` passed (20 domain tests + 175 component tests). All six phase gates passed before their commits. No tests changed in this phase.

## Commit sequence
1. `901e852` — foundation tokens and components
2. `5e05c9b` — navigation and shell
3. `9e4e211` — public pages and shared stat pattern
4. `501d9b8` — team workspace and stronger existing dashboard test
5. `fea3090` — admin overview and operational density
6. Final commit — auth/account, remaining completion/profile surfaces and this report

## Preserved contracts and verification limits
- `src/services/contracts.ts`, `src/app/routeManifest.ts` and `src/components/team/NextActionCard.tsx` have no changes.
- Sidebar grouping/collapse state, data derivation, API calls, existing routes and Azerbaijani content remain in place. No dependencies or external images added. No `.status-badge` CSS selectors introduced.
- Build includes existing Node/server HTML prerendering, not a browser. Tests use the existing domain/Vitest setup; no E2E suite or image export was run.
- This is source-level and build/test/lint verification as requested. Rendered appearance, actual viewport layout and visual parity with the reference were not inspected or certified.
