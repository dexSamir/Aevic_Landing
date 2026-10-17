# AEVIC global design audit — 12 October 2026

## Scope and inventory
Source review covers routeManifest, router, public layouts, AuthLayout, WorkspaceLayouts, TeamWorkspaceFrame, public-pages, home, tournament/match components, account route modules, TeamOverview/Analytics, team-workspace and common primitives. Player/organization and admin tournament routes use the same workspace forms, tables and feedback primitives.

| Area | Existing owner | Finding / action |
|---|---|---|
| Home and public discovery | home.css, public-pages.css, PublicLayout | Retain phoenix, editorial Oswald, existing media; use shared loading language |
| Tournaments and matches | competition components, public context | Preserve real result hierarchy and request cache; shared skeleton variants |
| Directory, public profile, workspace form | three independent render loops | Consolidate into RecentPlacementStrip, identical 44px numeric tiles |
| Profile maps | PublicTeamDetail and repeated CSS blocks | Extract map module; landscape identity, primary average, compact counts and honest win percentage |
| Account/auth/player/admin | route modules, common primitives | Keep shared controls, forms, Modal/Drawer/Toast/EmptyState; normalize semantic roles |
| Team workspace, all routes | team-workspace-frame.css and tokens.css | Competing literal palettes and radii; centralize aliases, semantic analytics/identity/competition accents |
| Loading | LoadingSkeleton plus legacy .skeleton, preview and logo placeholders | Explicit radius zero in four stylesheets; one pulse and radius system |
| Navigation identity | PublicSessionProvider / PublicAuthActions | Header treats unresolved or failed session as guest; route changes reset identity |
| Public profile reads | queryCache / apiAdapter | Existing bounded retry and stale-response guard; profile adapter drops cancellation signal; stale refresh error invisible |

## Decisions before implementation
Keep existing token architecture and component library. tokens.css is the only palette/radius/motion source. Component-owned CSS supplies geometry; route CSS supplies layout, not alternate placement styling. Tonal, borderless surfaces; focus/input boundaries remain. Maintain Raleway for UI and Oswald/Orbitron brand display. No new assets, library, screenshots, database changes or deployment.

## Research and application
- Apple HIG motion: https://developer.apple.com/design/human-interface-guidelines/motion — restrained feedback, reduced motion and continuity.
- IBM Carbon color: https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines — semantic layered surfaces, applied through existing aliases.
- FACEIT Track: https://support.faceit.com/hc/en-us/articles/17012729714972-FACEIT-Track-Overview — distinguish map and match context from aggregate metrics.
- UI/UX Pro Max esports search suggested hyperrealism/neon, rejected as incompatible with the request. Narrower analytics query supports compact data hierarchy; retain AEVIC palette and typography rather than its enterprise template.

## Reliability evidence boundary
Confirmed source defects: unresolved identity renders login; every pathname resets identity; profile requests ignore cancellation. Screenshot 503 alone does not establish a DNS, database or auth root cause. Browsers cannot distinguish DNS from other fetch/network failures; preserve network classification without inventing diagnostics. Existing query retry/cache and service-worker regressions must remain.
