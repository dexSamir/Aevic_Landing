# Team workspace redesign

Scope: frontend presentation only. No production writes, migrations, API contract changes or deployment.

## Design decisions

Use the supplied career screenshot as the foundation: neutral canvas, tonal groups, quiet gold actions, readable Raleway text with Azerbaijani glyphs. UI/UX Pro Max’s dense dashboard guidance informs aligned data and responsive grouping; Apple Design informs stable spatial relationships, immediate press feedback, text scaling and reduced motion. Keep existing navigation and operations.

## Source route checklist (23 routes)

- [x] `/team/profile`
- [x] `/team/career`
- [x] `/team`
- [x] `/team/tournaments`
- [x] `/team/tournaments/:tournamentId`
- [x] `/team/history`
- [x] `/team/comparison`
- [x] `/team/roster`
- [x] `/team/messages`
- [x] `/team/notifications`
- [x] `/team/roster-requests`
- [x] `/team/roster-requests/:requestId`
- [x] `/team/disputes`
- [x] `/team/disputes/new`
- [x] `/team/disputes/:disputeId`
- [x] `/team/sharecards`
- [x] `/team/badges`
- [x] `/team/badges/:badgeId`
- [x] `/team/invitations`
- [x] `/team/settings/managers`
- [x] `/team/verification`
- [x] `/team/organization/:organizationSlug`
- [x] `/team/settings`

## Shared system

- `TeamWorkspaceFrame` owns the sidebar footprint, header and centered content geometry for route loading, session checks, team-context loading, errors and the ready workspace.
- `team-workspace-frame.css` owns scoped semantic surface, text, spacing and interaction tokens. Existing shared components inherit the same values without changing public or admin theme tokens.
- `team-workspace.css` owns the team component theme: headers, buttons, form controls, tabs, status badges, lists, tables, empty states, dialogs, statistics, badge cabinet and studio controls.
- The sidebar keeps its navigation groups, adds a readable brand lockup, retains the team/status/profile block, and reveals the active item inside the scrollable navigation. Mobile navigation exposes its expanded state and retains focus trapping and Escape dismissal.
- The content canvas remains neutral. Gold identifies actions and selection; purple is limited to meaningful tournament/Wrapped surfaces. Exported graphics retain their existing art direction.
- Mobile history rows now retain the date and WWCD result alongside tournament, stage, map, placement, kills and total points.
- Component styles keep control boundaries and focus visible while removing decorative borders from noninteractive containers. Badge selection still has an explicit boundary and selected-state label.

## Loading and state handling

The old protected-route screen combined a centered “secure access” identity with a generic dashboard skeleton. The team-context query then replaced it with another generic loader outside the workspace shell.

Route hydration, session checking and team-context loading now use one shared frame. It reserves the desktop sidebar, responsive header, title, next-action panel, statistics and operational panels. Skeleton blocks are hidden from assistive technology; the status announces the team workspace. Reduced motion and reduced transparency disable the pulse.

Shell geometry is asserted across session → context → ready at 320, 390, 768, 1440 and 1920px: header height and main-content position/width stay equal. Data-dependent content can still vary in height; no artificial delay is introduced.

Unavailable competition content stays inside the authenticated shell. Failed session/context states keep the same frame with retry/recovery actions instead of animated navigation placeholders.

## Responsive review

All 23 routes are captured and checked for document overflow at 320, 390, 768, 1440 and 1920px. Representative dashboard, career, management, tournament and badge routes also cover 375, 430, 1024 and 1280px.

Complex routes are reviewed at 200% root text size at 390 and 1440px: tournament operations, management, profile editing, share studio, badge cabinet and history. Content grids reflow; table companion rows preserve facts; room controls and countdown values wrap; large displays retain a centered maximum content width.

## Validation

- Production build includes application TypeScript, server TypeScript, Vite and the existing prerender step.
- Focused component tests: workspace rebuilding, team overview, captain UI, route recovery, common primitives and login timeout.
- Browser coverage combines the existing six workspace interaction tests with six focused design checks. All backend traffic is intercepted at the HTTP boundary using local fixtures. Production was not queried or changed.
- Axe WCAG 2 A/AA and 2.1 AA checks cover eleven representative routes (including a locked badge) at 390 and 1440px. This is automated evidence, not a claim of exhaustive accessibility certification.
- Keyboard checks cover drawer focus containment, Escape/focus restoration, modal controls and visible field/link focus. Browser emulation checks reduced motion and reduced transparency.

Run locally:

```sh
npm run build
npx vitest run tests/team-workspace-rebuild.test.tsx tests/team-overview.test.tsx tests/captain-ui.test.tsx tests/route-recovery.test.tsx tests/components.test.tsx tests/login-timeout.test.tsx
AEVIC_AXE_SOURCE=/path/to/local/axe.min.js npx playwright test --config playwright.workspace-design.config.ts
```

The axe check is explicitly skipped if `AEVIC_AXE_SOURCE` is absent. Review images and measurement JSON are written to `/tmp/aevic-workspace-design`. The final local review captures are also retained in `.artifacts/team-workspace-redesign`.

## Final results

Application and server TypeScript: passed. Production build: passed. Focused component tests: 22 passed across six files. Browser design and existing interaction tests: 12 passed. Expanded locked-badge accessibility recheck: passed.

The final review recorded 115 route/width combinations across all 23 routes, zero document-overflow failures and zero browser runtime errors. All nine requested widths were reviewed. Axe returned zero violations across 22 route/width scans. No remaining UI defect was found in the reviewed fixture states; live production mutations were intentionally not exercised.

## Scope preserved

No database files, migrations, API contracts, production environment configuration, deployment or production data were changed. Existing public pages and exported artwork were not redesigned. No team route was intentionally skipped. Existing untracked historical quality reports are excluded from this commit.
