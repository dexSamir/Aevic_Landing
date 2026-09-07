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
