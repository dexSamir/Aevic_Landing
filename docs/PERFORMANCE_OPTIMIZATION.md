# AEVIC performance optimization — current follow-up

## Current result

**99/99 routes optimized**, including all **66 formerly backend-blocked routes**, through page-specific or shared frontend changes. Backend feature availability is a separate column in the [route checklist](performance/route-coverage.md). No missing backend service was implemented or simulated. No production data, uploads, authorization, environment variables, databases or email markup changed. No commit, push or deployment.

**Verification boundary:** the earlier 33 optimized routes and the other 66 had checks on the previous build. This follow-up uses source analysis and static build validation for all 99 routes. **No additional browser or route tests were run**, as requested. The earlier browser results do not validate these new changes. The 66 requested routes are no longer classified as unoptimized because of unavailable backend contracts.

## Implemented in this follow-up

- Page-owned modules for admin operations/forms, captain operations, accounts, registration/login, legacy claims, public profiles, archives and discovery. Compatibility barrels preserve existing imports; router entries import the page directly. Captain home imports TeamOverview directly, avoiding the unrelated TeamPages graph. These are bundle boundaries, not a redesign.
- Competition-awareness CSS moved from global styles to its component. Tournament detail, records/archive and match styles load with their owners. Public search/following use a small discovery stylesheet instead of the entire workspace stylesheet. Responsive rules are retained in source order; generic shared rules remain shared. No blanket CSS purge.
- Image export library now imports on export action. Captain overview stops its 30-second render timer for original-team snapshots without competition state and skips hidden-tab updates for the other provider. Existing authorization and API contracts remain.
- Recompressed existing raster delivery assets; maps now use WebP sources. Added 480/800-pixel candidates to home/auth/tournament/profile artwork. Public profile map thumbnails and match cards use responsive map srcsets. Public uploaded banners now use bounded CDN widths and original-source fallback; original uploaded files remain untouched. Logos and local upload previews are unchanged.
- Email background compressed as PNG at the same public HTTPS URL and same 1024×1535 dimensions. Its approved HTML, layout, gradients, identity and client-compatible format remain; email-client rendering was not re-tested. Source masters/design screenshots are retained because they are not network-delivered page assets.

## Before/after: this follow-up only

Baseline is the previously delivered local build. Static graph measurements sum unique emitted files reachable through static imports from the entry/startup and the named route. They exclude runtime conditional imports such as Realtime and exports, and are **not browser timing or network measurements**. Admin rows describe the graph if enabled; current capability gates remain. Full details: [build metrics](performance/follow-up-build-metrics.json).

| Static dependency graph | JS before → after | CSS before → after |
| --- | ---: | ---: |
| Home | 479.5 → 483.5 KB | 186.0 → 180.0 KB |
| Teams | 542.8 → 500.1 KB | 296.4 → 268.1 KB |
| Search | 483.1 → 485.3 KB | 233.3 → 181.4 KB |
| Captain home | 547.8 → 517.5 KB | 298.6 → 276.4 KB |
| Admin settings (if enabled) | 526.3 → 500.1 KB | 236.7 → 229.7 KB |
| Account sessions | 494.9 → 488.6 KB | 233.3 → 227.8 KB |
| Login | 517.2 → 496.1 KB | 249.9 → 243.9 KB |
| Tournament detail | 520.8 → 501.9 KB | 268.4 → 249.2 KB |

- Total emitted JS: **1,147,875 → 1,171,611 bytes (+2.1%)**. More independently loadable chunks/variant URLs add overhead; Home/search JS grew modestly while the larger feature graphs shrank. No claim of a total-JS reduction.
- Total emitted CSS: **483,989 → 484,815 bytes (+0.2%)**; global entry CSS: **164,153 → 158,157 bytes (−3.7%)**. Route ownership reduces downloads despite repeated media wrappers adding a little total CSS.
- Emitted image assets (excluding fonts): **13,194,110 → 9,887,539 bytes (−25.1%)**, including the newly added mobile variants. This is the whole emitted asset set, not a single-page transfer.
- Email background: **1,301,359 → 609,196 bytes (−53.2%)**. Official logo bytes/URLs unchanged.
- Example 1600px map: Miramar JPEG **430,768 bytes** → WebP **157,712 bytes** (see inventory for exact current bytes). Smaller cards select smaller variants.
- Every local image has a [size/dimension/alpha/loading/context decision](performance/image-inventory.csv). Display sizes are source/CSS declarations, not new browser measurements. Remote upload byte sizes depend on user files; CDN sizing is configured, not a measured deployed byte saving.

## Safeguards and remaining limitations

Client/server TypeScript, production build, static asset/import validation and release packaging policy all pass. The build produced 75 static shells and 99 route definitions. The asset checker validated 721 manifest asset references, all manifest module edges, CSS URLs and 228 runtime/source images. No unresolved Vite asset placeholders remain in emitted JS/CSS. Email background and a map derivative were visually inspected as image files; no browser tests were run. Reproduce with `npm run lint`, `npm run build`, `node scripts/validate-performance-assets.mjs`, and `npm run package:check`.

Existing 66 backend limitations, historical CONNECT_TIMEOUT uncertainty, baseline full-suite failures and deployed CDN verification remain as documented below. This is ready for review/commit; browser and deployed validation of the new changes remain unperformed by explicit scope.

---

# First-pass record (historical measurements)

Implemented locally on 2026-09-25. No commits, pushes, deployment, environment changes, migrations, storage changes or production writes. Existing visual design and public.teams remain in use.

## Historical first-pass coverage and evidence

- **99 discovered routes, 99 source-reviewed**: **33 reviewed and optimized**, **0 unchanged**, **66 reviewed but blocked** by existing production feature contracts. Shared startup improvements count toward the 33; blocked takes precedence for the other 66 even where shared code improved.
- **272 named function component declarations in 88 TSX modules**, including all **44 shared component modules**, reviewed within a 172-module source inventory. Local helper components and same-named declarations in different modules are counted separately.
- [Every route and its exact blocker](performance/route-coverage.md), [component/service/server checklist](performance/component-inventory.md), and [198 before/after route measurements](performance/route-measurements.csv).
- Production builds served locally; fresh browser pages at desktop 1440×900 and mobile 390×844. HTTP fixtures use synthetic identities/data, current capability gates and representative dynamic IDs. These are not successful live admin/captain mutation tests. Existing unavailable pages are explicitly identified, not treated as verified working features.

## Changes implemented

1. **Bundle boundaries:** extracted lazy authentication/workspace layouts; separated legal/information pages from tournament code; split public discovery, captain, admin and player-claim completion modules; separated workspace profile pages; lazy-loaded profile-card export UI. Home does not request workspace layouts, TeamRoute, AdminRoute or admin completion chunks. Existing route splitting, minification and tree shaking retained. No dependencies added.
2. **Requests and database reads:** public directory responses now carry existing result-preview semantics, eliminating per-card profile requests for production summaries. Detail reads filter on the validated original bigint ID and reuse a request-scoped promise. Directory queries omit player-photo fields. Captain context reuses the authenticated row instead of making another public REST read. Public projections still exclude credentials/contact fields.
3. **Session and readiness deduplication:** concurrent session reads share only an in-flight promise, scoped by identity revision. Concurrent private DB readiness checks share only the in-progress catalog checks. Completed results are not retained: later requests revalidate identity/permissions. Existing mutation invalidation, private cache isolation, authorization and fail-closed checks remain.
4. **Rendering:** tournament page clocks update at lifecycle boundaries; the visible countdown owns its per-second state. Hidden tabs suspend timers. No blanket memoization or unnecessary virtualization for seven teams.
5. **Media:** safe public team uploads receive width-specific WebP Image CDN URLs, with original-source fallback, explicit dimensions and decode hints. Transparent logos and original files are preserved. Existing local AVIF/WebP variants, aspect ratios, critical image priorities, lazy loading, font subsets, font-display rules and reduced-motion styles retained.
6. **Serverless initialization:** sharp and SMTP transport initialization deferred to upload/email paths. Email HTML, security and connection timeout values unchanged. Existing singleton DB pool, max=3, prepare=false and verified TLS retained.

## Measured results

Decimal KB; route JavaScript is the sum of actual script response bodies on desktop, not only the entry chunk. Gzip is calculated from those bodies, not a claim about the local test server's wire encoding.

| Metric | Before | After |
| --- | ---: | ---: |
| Home JS | 495.1 KB | 479.5 KB |
| Search JS | 521.0 KB | 483.1 KB |
| Privacy JS | 533.3 KB | 484.8 KB |
| Login JS | 529.4 KB | 517.2 KB |
| Teams JS | 552.3 KB | 542.8 KB |
| Captain home JS | 741.6 KB | 741.8 KB |
| Home gzip JS | 146.9 KB | 143.3 KB |
| Search gzip JS | 154.6 KB | 145.1 KB |
| Privacy gzip JS | 159.7 KB | 145.5 KB |
| Teams gzip JS | 166.6 KB | 167.5 KB |
| Captain home gzip JS | 212.8 KB | 215.7 KB |
| Total emitted JS | 1,138,914 B | 1,147,875 B |
| Total emitted CSS | 483,988 B | 483,989 B |
| Home requested CSS | 188.0 KB | 186.0 KB |

Splitting improves public loading boundaries but adds total chunk overhead; it does **not** reduce every route or total build bytes. Largest retained bundles include Realtime 228.5 KB (deferred), React 194.2 KB and router 92.0 KB; global CSS is still 164.2 KB. Broad CSS removal would risk the preserved visual contract and was not justified.

- Production directory preview path: one extra profile request per card → **zero** when form/history are supplied. General fixture route counts are separate because older fixture summaries intentionally lack these fields.
- Concurrent session regression: three simultaneous reads → **one HTTP request**; next read revalidates.
- Concurrent DB readiness regression: overlapping callers share **three catalog reads**, with later permission changes still rejected.
- Tournament clock regression: **zero additional page renders over 60 seconds between lifecycle boundaries**; countdown remains independently active.
- Static asset audit found 145 source images totaling 43.3 MB, but large source masters are not all shipped. Built image/font assets total 13.3 MB; largest built image about 431 KB. The 1.3 MB email background and email design were preserved.
- Image CDN delivery is configured but **deployed CDN output/byte savings are not measured**. The local host does not emulate Netlify transformations. No original upload was rewritten.
- Slower-network check: 150 ms latency, 200,000 bytes/s download and 4× CPU slowdown; Home/teams/login/captain home remained usable on both viewport sizes. Observed navigation-to-network-idle times were 6.0–8.6 seconds on a local uncompressed server with synthetic APIs. These are neither field CWV nor before/after speedup evidence. No Lighthouse score or INP improvement is claimed; fixture clock replacement makes browser timing comparisons unsuitable.

## CONNECT_TIMEOUT investigation

Read-only access to the configured production connection confirmed **seven teams**. SELECT count(*) measured 3,328 ms on first connection and 281/280 ms on reused connections. The configured endpoint is the Supabase **session pooler (5432)**. A single pg_stat_activity snapshot showed one active and six idle connections plus two null-state entries; this is not historical saturation evidence.

The timeout did not reproduce. No incident-time Netlify/Supabase connection logs were available, so the historical root cause remains **unconfirmed**. Current code already reuses a singleton pool; this change reduces duplicate reads/checks and unnecessary module initialization without increasing timeouts. Supabase recommends transaction pooling for transient/serverless connections; switching ports/configuration requires a separately approved environment change and verification. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres). Incident investigation should correlate request IDs, function cold starts and pooler connection logs before attributing the timeout to a specific cause.

## Validation and remaining limits

- Production build (client/server TypeScript and Vite), separate TypeScript check, release packaging policy check, and diff whitespace check pass.
- Domain suite: 20 passed. Focused UI: 24 passed. Focused server: 41 passed, plus updated readiness suite: 6 passed (overlapping suites, not additive totals).
- Route checks: **198/198** passed, with zero uncaught page errors and no new horizontal overflow or broken fixture images relative to baseline. Existing broken synthetic image references occur in public team detail and desktop captain profile; these predate the change. Desktop/mobile screenshots were captured; team layouts were visually inspected.
- Additional state tests: **8/8 passed**, covering loading, missing/error profiles, guest guards, navigation caching and public chunk isolation. Slower-network tests: **2/2 passed**, exercising four journeys per viewport. The mobile navigation test was corrected to target the drawer explicitly after a broader locator selected an obscured link.
- Full suites are **not green**: baseline component tests had 14 failures/234 passes; after has the same 14 failures/238 passes. Baseline server tests had 31 failures/49 passes; after has the same 31 failures/52 passes. Existing tests include stale normalized-backend assumptions and UI assertions; no new full-suite failures were introduced. Production DB mutation tests were deliberately not run.
- Reproduction: `npm run build`; `npm run lint`; `npx playwright test --config playwright.performance.config.ts`. Optional `PERF_BUILD_ROOT`, `PERF_PORT`, `PERF_OUTPUT` select an archived build and output destination. Measurements append JSONL; compare the last record per route/device. Baseline source/build and full logs are local temporary evidence under `/tmp/aevic-performance-*` and `/tmp/aevic-perf-*`; committed-readable summaries are in this directory.

**Ready for review and a user-created commit; not an unconditional deployment sign-off.** Existing backend blockers, baseline test failures, real authenticated flow verification and Netlify CDN validation remain. No deployment was performed.

