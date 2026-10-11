# AEVIC local UI redesign — 11 October 2026

Local changes only. No commit, push, deployment, database mutation, authentication change, environment change, or generated visual asset.

## Completed design areas

1. **Global design system:** increased tonal separation between page, card, and elevated surfaces; reused semantic surface, radius, spacing, and motion tokens. Removed decorative outlines in shared component owners while retaining form boundaries, keyboard focus, meaningful selection indicators, and semantic separators.
2. **Account dropdown:** elevated dark surface, compact identity block, consistent leading Lucide icons, grouped logout through spacing, rounded hover/focus states. Existing actions, routes, arrow/Home/End navigation, Escape, outside click, and focus restoration preserved.
3. **Map statistics:** average placement is the dominant metric, with match count and win percentage secondary. Existing map imagery retained. Best-average labels only compare eligible sample sizes, include tied leaders when appropriate, and do not label all-equal maps. Low-sample caution and lower-is-better explanation retained. Calculations and source statistics unchanged.
4. **Recent matches:** responsive linked rows replace the wide table. Placement is prominent, first place uses gold, metadata has a clear hierarchy, and kills/points align. Existing newest-first order, dates, maps, tournament links, round navigation state, values, and best-result recognition retained.
5. **Career summary:** five metrics in one desktop row with recent form directly to the right. The overview stacks on narrow screens; smallest screens wrap metrics without page overflow.
6. **Last five matches:** 44×44px tiles replace 78px tiles (about 1.77× smaller), with 16px corners, number-only presentation, white ordinary placements, and gold/black first place. Accessible labels retain map and performance context; order remains newest first.
7. **Profile actions:** removed the standalone copy-link button; borderless tonal action controls. Share uses native sharing where supported and clipboard fallback otherwise. Clipboard success appears only after confirmed copying; failures and native cancellation retain their existing handling.
8. **Toasts:** smaller padding and type, rounded tonal surface, no extra shadow, wrapping for long content, existing live-region and dismiss behavior retained.
9. **Loading states:** square, borderless placeholders across shared skeletons, home rails, workspace panels, preview placeholders, and loading team marks. Subtle pulse and reduced-motion support; spinners left intact.
10. **Additional team sections:** borderless seasonal summary, official card preview, legacy/profile surfaces, and relevant account/workspace/dashboard containers. Dark surface grouping and existing content preserved.
11. **Navbar:** removed capsule outline and decorative inset edge; rounded controls, sticky behavior, active indications, mobile drawer, and routes preserved.
12. **Tournaments and matches:** borderless planning events, feature containers, match cards, metric panels, filter containers, and schedule surfaces. Input affordances, filters, dates, statuses, and navigation preserved.

## Shared tokens and components

No new dependencies or visual assets. Updated `--color-bg-secondary`, `--color-bg-elevated`, `--card-radius`, and `--team-card-radius`. Reused existing surface and radius aliases, Button, Toast, LoadingSkeleton, and menu behavior. Added scoped `public-match-history` and `public-map-primary` presentation classes rather than a chart dependency or backend change.

## Verification

- TypeScript: `npm run lint` passed; production build also runs client/server TypeScript validation.
- Production: `npm run build` passed, including 98 static route shells and the public-output secret check.
- Components: `npm run test:component` — 51 files, 317 tests passed. Existing copy-button and decorative-border assertions updated to the requested behavior.
- Domain: `npm run test:domain` — 20 tests passed.
- Browser: `npx playwright test --config playwright.redesign.config.ts` — 2 tests passed. Desktop metric alignment, tile dimensions, menu Home/End/Escape/focus/outside click, reduced-motion skeleton computed styles, and page overflow checked.
- Browser widths: 375, 768, 1024, 1440px across team profile, tournaments, matches, account profile, and team workspace.
- `git diff --check` passed.

## Limits

Browser checks use existing HTTP-boundary test fixtures, not live production sessions or data. No screenshot-based visual review was performed and no screenshots, Figma exports, or new assets were generated. Native operating-system share-sheet appearance was not manually inspected; native sharing and clipboard behavior are component-tested. These focused checks do not establish exhaustive accessibility compliance or cover every account/admin state. No backend/database test suite was needed for this UI-only scope.

## Research

Applied the installed Apple Design and UI/UX Pro Max skills. The skill search returned generic enterprise recommendations; its unrelated palette and marketing layout were not adopted. AEVIC branding and the user brief governed the implementation.

- [Apple Dark Mode guidance](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [FACEIT Track overview](https://support.faceit.com/hc/en-us/articles/17012729714972-FACEIT-Track-Overview)

## Modified files

- [src/components/common/loading-skeleton.css](/Users/samirhebibov/Documents/Aevic_Landing/src/components/common/loading-skeleton.css)
- [src/components/competition/competition-schedule.css](/Users/samirhebibov/Documents/Aevic_Landing/src/components/competition/competition-schedule.css)
- [src/components/profile/PublicTeamDetail.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/components/profile/PublicTeamDetail.tsx)
- [src/components/profile/PublicTeamExperience.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/components/profile/PublicTeamExperience.tsx)
- [src/components/profile/public-team-identity.css](/Users/samirhebibov/Documents/Aevic_Landing/src/components/profile/public-team-identity.css)
- [src/layouts/layouts.tsx](/Users/samirhebibov/Documents/Aevic_Landing/src/layouts/layouts.tsx)
- [src/styles/auth.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/auth.css)
- [src/styles/components.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/components.css)
- [src/styles/home.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/home.css)
- [src/styles/image-editor.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/image-editor.css)
- [src/styles/lifecycle.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/lifecycle.css)
- [src/styles/match-center.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/match-center.css)
- [src/styles/public-pages.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/public-pages.css)
- [src/styles/public-shell.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/public-shell.css)
- [src/styles/route-components.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/route-components.css)
- [src/styles/share-studio.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/share-studio.css)
- [src/styles/team-profile-components.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/team-profile-components.css)
- [src/styles/team-workspace.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/team-workspace.css)
- [src/styles/tokens.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/tokens.css)
- [src/styles/tournament-detail.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/tournament-detail.css)
- [src/styles/workspace.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/workspace.css)
- [src/styles/wrapped.css](/Users/samirhebibov/Documents/Aevic_Landing/src/styles/wrapped.css)
- [tests/directory-team-results.test.tsx](/Users/samirhebibov/Documents/Aevic_Landing/tests/directory-team-results.test.tsx)
- [tests/redesign-interactions.test.tsx](/Users/samirhebibov/Documents/Aevic_Landing/tests/redesign-interactions.test.tsx)
- [playwright.redesign.config.ts](/Users/samirhebibov/Documents/Aevic_Landing/playwright.redesign.config.ts)
- [tests/e2e/premium-redesign.spec.ts](/Users/samirhebibov/Documents/Aevic_Landing/tests/e2e/premium-redesign.spec.ts)
