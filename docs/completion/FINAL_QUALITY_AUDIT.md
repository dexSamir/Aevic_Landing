# Continuation evidence — 2026-10-02

- Historical full browser result: **77 passed / 19 failed / 32 skipped (128 total, 3.2h)**. All 19 failures now pass targeted reruns; the full suite has not been rerun. Inventory: `../quality/phase2-browser-failures.json`.
- Targeted mobile: **13 passed (2.0m)**. Final public shell/product: **2 passed (14.7s)**. Calendar eight widths × normal/200% text plus desktop/mobile footer: **3 passed / 1 duplicate matrix skipped (21.1s)**. Reduced-transparency navbar also passed separately.
- Focused component regressions: **26 passed / 3 files (1.92s)**. TypeScript passed. Production build passed (75 static shells / 99 route definitions), `/tmp/aevic-resume-build.log`. Diff check passed.
- Fixed real calendar/footer target defects, logout acknowledgement/cache race and empty-response completion. Updated demonstrably stale current-design expectations without dropping target/keyboard/network failure assertions. Mobile failures did not reproduce in isolation; long-run stability still needs a complete release run.
- Production catalog recovered on one bounded retry: 79 relations, 628 columns, 206 indexes, no private client table grants and no platform tables without RLS. Missing history versions and BYPASSRLS application connection require compatibility/privilege review. All 38 explicitly created platform relations are present; that is not proof of complete migration equivalence. Deployed config was not checked. Release readiness remains **UNVERIFIED**.
- **11 COMPLETE / 88 PARTIAL**, no new promotions. Legal pending approval stays PARTIAL. Persisted acceptance expansion, dynamic SEO and performance remain outstanding. No production changes, deployment or setup email.

Historical audit follows; continuation evidence above takes precedence where counts differ.

# AEVIC quality audit — 2026-10-01

## Release decision

The source is improved and preserved in the working tree, but **production readiness is not established**. No deployment, production migration, production mutation, credential reset, original-team modification or upload deletion occurred. The deployed demo returned zero public teams; the corrected local repository returned all seven original IDs against the production database in a read-only transaction.

## Scope and acceptance

Current manifest: **99 routes**. Acceptance: **11 COMPLETE / 88 PARTIAL / 0 BLOCKED / 0 NOT VERIFIED**. The complete routes are static system/access states verified for direct entry, reload, meaningful retry, keyboard exit, back navigation, noindex and seven viewport widths. The other routes have rendered desktop/mobile smoke evidence, not complete mutation/persistence/authorization acceptance. See [route matrix](../performance/route-coverage.md) and [structured acceptance](routes.json). Historical per-field notes in routes.json remain historical; quality20261001 is the current evidence boundary.

The 208-test production-build route/state run passed before the final Home/accessibility refinements. Final quality browser suite before reverting the unsuccessful Home calendar-layout experiment: **18 passed (1.2 minutes)**. The broad historical 128-test suite was interrupted after its browser process exited and the runner stalled: **1 passed, 127 did not run/completion unverified (5.8 minutes)**. An earlier attempt exposed fixture and layout failures corrected in this pass; no full-suite pass is claimed. Lighthouse results are reported below. Synthetic HTTP fixtures never establish production API health. Do not promote 89 partial routes based solely on headings or HTTP 200.

## Business logic and data safety

The old SQL admitted approved teams, the requesting captain's own team, or all teams for an administrator. All seven originals were pending: guests got zero; captain 16 could see only 16. Public identity now includes pending and approved teams while preserving rejection, ban and archive exclusions. Tournament eligibility still requires approval. This rule is applied to both current SQL and legacy public readers. Private projections and ownership checks remain intact; no data migration was needed.

Read-only verification returned IDs **2, 7, 8, 9, 10, 12, 16**, with private captain contacts absent. The first repository read took **874.367 ms**, including extension reads; a repeated request-scoped read took **0.003833 ms** from memory. This is not a cold/warm production endpoint benchmark. Deployed GET observations were **5,858 ms** for public teams and **2,052 ms** for public context, both with empty team arrays. There is no measured deployed latency improvement yet.

[Canonical ownership](CANONICAL_DATA_OWNERSHIP.md) documents teams, roster, ownership, player metadata, organizations, competition, results, standings, badges, notifications, disputes, verification and sessions. No duplicated identities or account-dependent public joins were introduced.

## Unavailable features and compatibility

- Current platform handlers are mounted before original captain/public routes when AEVIC_DATABASE_URL exists. Previously enumerated request paths have handlers; this does not prove every workflow works.
- The 501 handlers in server/routes/workspace.ts (sessions/MFA/player administration/timed sanctions) belong to the unmounted normalized compatibility router. Its retained test contract is not the production implementation.
- Without the platform connection, server/routes/production.ts deliberately returns unavailable responses for unsupported competition/account features. This fallback cannot be certified as a complete product and must not be deployed as one.
- The legacy match-results adapter rejects unsupported historical payloads with MATCH_RESULTS_CONTRACT_UNAVAILABLE; it does not invent results. Privileged normalized authentication is explicitly disabled with ORIGINAL_AUTH_CONTRACT_UNAVAILABLE.
- User copy on system/access states no longer exposes internal implementation jargon. No real 501 was converted into a fake success. Explicit fixture coverage was added only to test harnesses.

## Product, accessibility and responsive changes

Applied installed apple-design and ui-ux-pro-max principles: readable natural team counts, useful filter-reset/empty-state actions, truthful errors and retry, responsive wrapping, semantic labels and preserved contrast during motion. Dark/gold/phoenix identity, typography direction and password-reset email design are preserved.

Search now returns teams, roster players, tournaments and organizations, with Azerbaijani category labels; queries shorter than two characters perform no data reads. Player results lead to their team profile because the product has no standalone public player route. Results are labelled rather than separate visual section headings.

Fixed verification-crest ARIA semantics, invalid tournament definition-list children and workspace navigation contrast during entrance animation. Eight representative pages were scanned at 320/1440 with axe; the 16 scans found no violations after fixes within its selected rule tags. Lighthouse additionally found unresolved visible-label/accessibility-name mismatches (WCAG 2.1 A), which are not covered by that passing claim. Seven widths (320,375,390,768,1024,1440,1920) were checked on those pages plus ten system states. Six critical workspaces passed 320px with 200% text size after wrapping long headings and fixing narrow action/form sizing. This is not a WCAG certification or a complete assistive-technology audit.

## SEO and PWA

Dynamic sitemap endpoint includes canonical static routes plus guest-visible teams, tournaments and organizations. It deliberately excludes private/auth/error routes, dynamic templates and entities without a canonical indexable detail page. Preview/demo sitemap is empty and preview pages have noindex. Team/tournament/organization metadata opts into indexing only on an indexable deployment. The robots rule for /team no longer accidentally blocks /teams.

WebSite JSON-LD is emitted for indexable static shells with JSON serialization and HTML-safe escaping. No unsupported Event claims were added. Organization/BreadcrumbList and server-rendered dynamic entity content remain unfinished; entity content still depends on JavaScript. The real production canonical domain was not verified, so existing environment values were not invented or changed. The service worker already bypasses API/private/live data and does not cache navigation HTML as current competition data.

## Security and observability

Isolated platform regressions and database contract checks cover authority, account/competition behavior and private schema boundaries. New directory regression proves guest/private rejection and public moderation exclusions. No RLS, MFA, upload, idempotency, rate-limit or session protection was weakened. This is regression evidence, not a new penetration test.

Request logs include request ID, matched route template, method/status, application duration, deployment commit, first-request indicator, stable error code and directory query metrics. Server-Timing exposes application duration. Logs omit URL query values, bodies, cookies and raw errors. Directory timing covers its base query only, not every database operation; first request is a process-local cold-start proxy. There is no field INP or complete serverless/DB tracing baseline. No existing product analytics integration was found and no heavy dependency was added.

## Assets and verification

Emitted asset totals (uncompressed, dist/assets):

| Asset | Before bytes | Final bytes |
| --- | ---: | ---: |
| JavaScript | 1,214,105 | 1,215,383 |
| CSS | 485,894 | 486,622 |
| Images | 9,887,539 | 9,887,539 |
| Largest emitted asset | 240,308 | 240,308 |

This pass does not claim bundle/image reductions. Added behavior has a small size cost. Existing route splitting, responsive images and original assets remain. Regression budgets have reasonable headroom and validated 726 asset references and 216 images.

Production build includes TypeScript validation. Domain tests **20**, component tests **254**, server tests **86** passed. Isolated platform tests **35** passed; disposable database/RLS contract runner passed. Release packaging passed. The pre-existing routeManifest syntax typo was corrected without discarding other work. No dependencies, migrations or environment files were changed. Temporary tools/screenshots remain outside the product package.

## Remaining work

Complete persisted user-journey acceptance for the 89 partial routes, reconcile any failures in the broad historical browser suite, finish dynamic crawlable entity content/structured-data coverage, validate the real canonical origin, and measure authenticated real-API behavior on a safe release environment. Deploy only after release gates and current production permissions/configuration are verified; then recheck all seven public teams, auth/session behavior and competition lifecycle. Existing platform tables were observed in production, superseding the old claim that the schema is wholly unapplied; this pass did not establish the full migration/grant state or change it.

No numerical UI/UX/security/overall scores are invented. Lighthouse is a synthetic lab measurement; it does not certify production readiness.


## Reproducing local evidence

Production-build checks: `npm run build`, `npm test`, `npm run package:check`, `node scripts/validate-performance-assets.mjs`. Platform tests require disposable PostgreSQL 18 on socket /tmp, port 55432 and use their own throwaway database. Never point mutation tests at production.

For the additional quality suite, install Lighthouse and @axe-core/playwright in a temporary tool prefix (default /tmp/aevic-quality-tools), run `npx playwright test --config playwright.quality.config.ts`, then `node scripts/audit-lighthouse.mjs`. The browser suite records synthetic response fixtures for Lighthouse; it must run first. AEVIC_AXE_SOURCE and AEVIC_QUALITY_TOOLS override tool paths. The build host serves gzip in both baseline and final runs, reflecting compressed delivery; do not compare earlier uncompressed harness runs as product improvements. Browser tools require a local browser/socket permission. Full raw reports/screenshots are temporary; sanitized summaries are retained under docs/quality.

The default development-server browser suite must run with AEVIC_DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_ANON_KEY explicitly blank. This protects against the project's real environment configuration being used by the test host. Do not use original accounts as test fixtures.

## Final Lighthouse measurements

Mobile lab runs on local builds using compressed delivery and synthetic API replay. Single runs are noisy; baseline captain fixture lacked workspace discovery, so its 100 performance score is not a comparable complete dashboard. No field INP or production latency conclusion.

| Route | Performance before → final | Accessibility before → final | Best practices final | SEO final | LCP final (s) | TBT final (ms) | CLS before → final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 79 → 76 | 100 → 100 | 100 | 66 | 3.76 | 19 | 0.235 → 0.235 |
| `/teams` | 88 → 88 | 97 → 100 | 100 | 66 | 3.92 | 24 | 0.000 → 0.000 |
| `/tournaments` | 90 → 91 | 100 → 100 | 100 | 66 | 3.46 | 24 | 0.000 → 0.000 |
| `/tournaments/daily-cup-24` | 69 → 82 | 96 → 100 | 100 | 66 | 4.66 | 25 | 0.236 → 0.000 |
| `/login` | 88 → 92 | 100 → 100 | 100 | 66 | 3.31 | 24 | 0.000 → 0.000 |
| `/team` | 100 → 83 | 100 → 100 | 96 | 66 | 4.53 | 31 | 0.000 → 0.000 |
| `/admin` | 88 → 88 | 100 → 100 | 100 | 66 | 3.77 | 26 | 0.000 → 0.000 |

Final SEO is intentionally limited by preview noindex (baseline Home/listing were incorrectly indexable). Accessibility category scores of 100 coexist with additional unscored visible-label/name findings. Remaining performance findings include late LCP discovery, render-blocking CSS, unused route code/CSS and font/layout shifts. Home calendar experiment was reverted after CLS increased to 0.448; final Home CLS returned to 0.235. No across-the-board performance gain or 95–100 result is claimed.

Sanitized full summaries, FCP, speed index and individual audit findings: [lighthouse.json](../quality/lighthouse.json).
