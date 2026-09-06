# Platform and environment matrix

Use this reference when choosing evidence tools and declaring the coverage plan. Derive values from the project; the dimensions below are checklists, not assumptions that every project supports them.

## Tool routing

| Surface | Preferred evidence path | Fallback | Record |
| --- | --- | --- | --- |
| Web desktop | Browser tool with desktop viewport | Computer use | Browser, viewport, zoom, DPR |
| Web mobile/responsive | Browser tool with supported device profiles | Simulator only when native behavior matters | Label emulation vs native |
| Native desktop | Computer use | Project test harness | Window state, OS scale, theme |
| Native mobile | Simulator or connected device | Computer use around the simulator | Device, OS, orientation, safe area |
| Hybrid | Tool per surface | Manual evidence | Link code path to rendered surface |

A DOM snapshot, unit test, or static render is supporting evidence, never a substitute for a rendered screenshot. Scripted batch capture written by the auditor (for example a Playwright script) produces real rendered evidence when it drives the actual product; keep the script in the audit workspace next to its output so captures are reproducible.

## Environment dimensions

Inventory the project-supported values for:

- platform and surface; OS and version; browser/engine/runtime and version;
- physical screen, application window (size and mode), viewport, and orientation;
- responsive breakpoints;
- browser zoom, OS display scale, text/font scale, and DPR;
- Light/Dark/System/Auto theme, including initialization, persistence, and runtime switching;
- locale, timezone, number/date/currency formats, and RTL;
- contrast, reduced motion, keyboard/focus, and screen-reader-relevant settings;
- account role, permissions, feature flags, lifecycle state;
- network and data volume.

Record unsupported values as `NOT_SUPPORTED` with source evidence; do not inspect unsupported modes as if they were requirements.

## Coverage plan rules

1. Critical screens = entry routes, top navigation targets, screens named in the user request, and screens with open P0/P1 findings.
2. Critical screens get the full applicable matrix of primary dimensions (viewport class, theme, locale). Expansion dimensions — breakpoint one-pixel neighbors, zoom/text-scale extremes, theme lifecycle behaviors — are capped: test each on one representative critical screen, not on every critical screen × every state, and record the chosen representatives in the plan.
3. All other screens get one default environment plus one contrast environment (dark theme or the narrowest supported width) per state.
4. Collapse further only with an equivalence argument: code evidence (for example a single root-level theme implementation shared by all screens) plus rendered evidence from at least one representative screen, generalized explicitly in the manifest with the collapsed cells listed. Do not demand rendered proof from every collapsed cell — that would cost what collapsing saves.
5. Cells outside the declared plan are `NOT_RUN` with the plan cited as the reason; a single plan-level statement suffices — do not create one row per skipped cell. Planned but unreachable cells are `BLOCKED` with the attempted path. Unexecuted planned cells stay `NOT_RUN` until captured.
6. Tier `EXHAUSTIVE` replaces rules 2–4 with the uncapped full matrix; rule 5's status semantics still apply. Use it only on explicit user request with a stated budget.

## Screenshot contract

Each planned `SCREEN × STATE × ENV` cell needs a complete screenshot or an explicit blocker. Record the capture tool, exact environment, fixture, timestamp, and path. For tall content, capture full-page output plus a viewport capture when sticky or overlay behavior matters. Capture transient states while active, or record why the tool cannot hold them.

## Mobile-specific notes

When mobile is in scope, enumerate device profiles, OS versions, orientations, safe areas, notches, soft keyboard states, permission prompts, touch/gesture states, and app lifecycle transitions. Do not call browser device emulation a native-device result; use a simulator or device for native behavior and label web emulation separately.
