# AEVIC remediation and retest — 2026-11-05

## 1. Executive summary

Source changes address all eight original defects and apply the existing Team workspace design to every authenticated Admin route. Seven bugs are **FIXED locally**; BUG-002 is **PARTIALLY FIXED** because the deployed serverless latency cause and response timing cannot be certified without deploying and retesting. The original deployed audit and its completed tournament are preserved. No commit, push, deployment, production schema/security change, or unrelated user-data mutation was performed.

**Release recommendation: NOT READY.** Local evidence supports remediation review, not a claim that the live demo contains these changes. Production latency, direct Supabase policies/configuration, external notification delivery and broader device coverage remain gates.

The remediation brief takes precedence over the unavailable prior-chat implementation attachment, as explicitly directed by the user. Existing architecture, backend authority and Team design tokens were retained. The ui-check evidence/review approach was used; its audit-only approval packet was not used to block the explicitly authorized implementation. The security-audit skill was used in focused guidance mode, not its complete certification workflow.

## 2. Original bug resolution

Paths below are repository-relative. Status means local implementation and validation, not deployed resolution.

| Bug | Original severity | Root cause and fix | Relevant files | Regression evidence / result | Status |
|---|---|---|---|---|---|
| AEVIC-QA-001 | High / P1 | Provider eligibility matched exact path; trailing slash missed PublicPlatformProvider. Normalize pathname before provider selection. | `src/layouts/layouts.tsx` | Browser direct `/leaderboard` and `/leaderboard/`, refresh and client navigation; no provider exception. | FIXED |
| AEVIC-QA-002 | High / P1 | Client aborted mutations at the shared 10s deadline; sequential recipient notifications increased transaction work. Batch notifications in one SQL statement, use a 30s write-only budget, preserve 10s reads, reconcile projections after uncertain writes, report uncertainty accurately, and reuse identical edit/correction idempotency keys. | `src/services/apiAdapter.ts`, `server/platform/{competition,tournaments,staff,routes}.ts` | Lost-response retry component test, real DB idempotency/notification checks and independent lifecycle writes. Local timings cannot identify the deployed slow stage; no remote server trace was available. | PARTIALLY FIXED |
| AEVIC-QA-003 | High / P1 | Form treated prior-version history as current result; empty history hid first correction and response typing broke subsequent version baseline. Add authorized current-result read, initialize from current row, strip version from strict payload, refresh actual history after save. | `AdminResultCorrectionPage.tsx`, `services/{contracts,apiAdapter}.ts`, `types/domain.ts`, `server/platform/staff.ts` | First and second real UI corrections to version 3; two preserved prior versions; PostgreSQL audit/reversal, unauthorized access, standings and PNG checks. | FIXED |
| AEVIC-QA-004 | Medium / P2 | Navigation raced stale Admin snapshot. Hydrate authoritative create response, revalidate schedule, and disable editing until complete schedule is loaded. | `TournamentCreateForm.tsx`, `TournamentEditForm.tsx` | Browser deliberately gates Admin context response: new detail appears immediately without false 404; schedule-dependent save stays disabled. | FIXED |
| AEVIC-QA-005 | Low / P3 | Raw floating-point average rendering. Format finite averages to one decimal, retain integer counts and missing-value dash; calculations unchanged. | `src/components/team/TeamExperience.tsx` | Component assertions cover fractional/zero/missing values; no scoring precision changed. | FIXED |
| AEVIC-QA-006 | Low / P3 | Raw enum rendering and overly broad identity-span CSS defeated semantic badges. Central localized display mapping and targeted selector fixes; enum contracts unchanged. | `src/utils/statusLabels.ts`, affected Admin pages, `src/styles/lifecycle.css` | Status contract tests, real route captures, independent visual review. | FIXED |
| AEVIC-QA-007 | Medium / P2 | Completed participation projection omitted placement. Derive from authoritative completed tournament leaderboard for matching team; do not fabricate unpublished rank. | `server/services/data.ts` | Real completed event projection equals corrected official rank; Team history screenshot. | FIXED |
| AEVIC-QA-008 | Medium / P2 | Unauthenticated branch preceded terminal/full lifecycle checks. Evaluate registration availability first, preserving actual existing participation states. | `src/utils/tournamentJoin.ts` | Terminal anonymous contract tests and completed public detail without login-and-join CTA; backend remains authoritative. | FIXED |

BUG-002 does not move notification work into an unawaited serverless task. Notifications remain transactional, respect preferences and use existing duplicate protections. No automatic mutation retry was added. Validation errors retain specific localized messages; an uncertain network outcome does not claim rollback. The source establishes the client abort mechanism, but does not prove whether deployed database contention, network latency or serverless scheduling contributed to the original 10,001.7ms observation.

Additional reproduced fixes: password-change success feedback survived the acknowledged save instead of being erased by same-tab session invalidation; peer tabs still revalidate. Public participation CTA grid no longer creates page overflow at 200% text size. Support assistance uses valid non-landmark grouping. Admin status widths/colors, mobile UUID rows, date wrapping, doubled search border and legacy holding hierarchy were corrected after independent review. Test-only maintenance updated obsolete auth redirect/MFA/recovery expectations and isolated fixture rate-limit identities; production rate limits remain enabled.

## 3. Admin Panel redesign

Admin now uses `TeamWorkspaceFrame` with its own area identity, navigation and collapse preference. It shares Team geometry, graphite surfaces, typography, borders, gold actions, existing icons and primitives. Team navigation/permissions were not copied. Admin session-loading, context-loading and error frames use the same main-content geometry. Mobile navigation retains its dialog, Escape handling and focus restoration. Shared selectors exclude semantic badges rather than restyling them as avatars.

`src/styles/admin-workspace.css` applies the common operational treatment across the full route manifest: dashboard; tournament list/create/detail; team list/detail; organizations; users; roster queue/detail; results/correction; rooms; verification queue/detail; disputes/detail; messages; support; audit; blacklist; settings; player detail; legacy claims. Existing forms, filters, confirmations, permissions and data remain in place. No fake metrics or dashboard widgets were added. Tables remain locally scrollable where necessary; mobile ledgers preserve identity and actions.

25 authenticated routes were rendered at **320, 360, 390, 430, 768, 1024, 1280 and 1440px** (200 route/width cells), including populated dynamic routes. The screenshot matrix and measurement ledger are in [evidence](evidence/AEVIC-REMEDIATION-2026-11-05/). The independent [visual review](evidence/AEVIC-REMEDIATION-2026-11-05/independent-visual-review.md) retains initial observations. All four objections were accepted and implemented: readable Users status; semantic roster colors; full mobile identity width; labelled legacy ledger. Its screenshots are preserved under `initial-local-pass/`; final captures use the root evidence directory. This is a sampled visual review plus measured geometry, not a claim that every control has been manually audited.

## 4. Remaining QA coverage

The following rows reproduce all 14 originally Blocked and 16 originally Not Tested IDs from the authoritative ledger. A partial subflow does **not** turn the complete original scenario into PASS. PASS is explicitly scoped to local executed tests; unavailable deployed identities and production-only checks remain blocked. NOT TESTED means the complete original scenario is still incomplete even where useful subsets were executed.

Totals for the original 30: **15 newly passed locally, 0 newly failed, 6 still blocked, 9 still not fully tested**.

| ID | Original scenario | Prior status | Current status | Actual coverage / limitation |
|---|---|---|---|---|
| QA-116 | Direct Supabase verification | Blocked | BLOCKED | No authorized direct Supabase connector/production database session; local SQL policy checks are separate. |
| QA-117 | Sixteen authenticated teams / full-capacity rejection | Blocked | PASS | Local real backend: 16 independent authenticated captains registered; 17th rejected at capacity; 16 distinct slots. |
| QA-118 | Each DEMO account self-registration | Blocked | BLOCKED | 16 synthetic local accounts self-register normally. Credentials for every deployed DEMO identity are unavailable; exact deployed-account scenario remains blocked. |
| QA-119 | Unregistered captain and ordinary member access | Blocked | BLOCKED | Unregistered captain room read rejected locally; the full ordinary-member browser identity matrix remains unverified. |
| QA-120 | Correction publication/reversal/recalculation | Blocked | PASS | Local UI first and second corrections; real PostgreSQL test restores a penalty correction and preserves versions/audit. |
| QA-121 | Corrected result propagation | Blocked | PASS | Local corrected totals/rank, history and three real PNG exports; current result is version 3. |
| QA-122 | Five-row top/bottom own-team edge cases | Blocked | PASS | Actual local Team views at first and last rank each render five rows including own team. |
| QA-123 | Mass announcement send | Blocked | PASS | Announcement sent to isolated local fixture audience and read by another account; no real recipients contacted. |
| QA-124 | Global settings / admin invitations / roles | Blocked | PASS | Real PostgreSQL fixtures exercise settings, staff invitations, roles and permission checks; mail captured at transport boundary. |
| QA-125 | Bulk real team approval / legacy ownership decisions | Blocked | BLOCKED | Atomic bulk approval and ownership consent exercised on local fixtures; unrelated real team/legacy decisions intentionally not performed. |
| QA-126 | Manager/player invitations and transfer/archive/leave | Blocked | NOT TESTED | Delegation/ownership integration coverage is partial; complete invitation, transfer, archive and leave sequence not executed. |
| QA-127 | Password, MFA, recovery-code changes / account deactivation | Blocked | NOT TESTED | Real browser password rotation, MFA enrollment/disable and recovery covered; account deactivation not executed. |
| QA-128 | Revoke other existing sessions | Blocked | PASS | Local second real cookie revoked; current session survives reload. |
| QA-129 | Email/push notification delivery | Blocked | BLOCKED | Local recovery mail token verified through captured transport; actual external email/push delivery not exercised. |
| QA-130 | Before-registration-open lifecycle | Not Tested | PASS | Real PostgreSQL fixture rejects registration before its configured future opening time; system clock unchanged. |
| QA-131 | Duplicate registration server response and join feedback | Not Tested | PASS | Local duplicate join returns duplicate=true with one entry; primary captain join feedback exercised through UI. |
| QA-132 | Ineligible roster / banned team rejection | Not Tested | PASS | Real PostgreSQL banned-team and incomplete-roster rejection. |
| QA-133 | Reject and withdraw QA participation | Not Tested | PASS | Real PostgreSQL rejection/rejoin/withdrawal fixtures. |
| QA-134 | Server duplicate/late check-in and admin override/reversal | Not Tested | PASS | Real browser/API duplicate check-in; PostgreSQL late check-in rejection and Admin override/reversal. |
| QA-135 | Clipboard copy, 60-second lease, account-switch race | Not Tested | NOT TESTED | Component lease expiry/race guards and browser room mask/reveal covered; complete clipboard/lease/account-switch browser sequence not executed. |
| QA-136 | Nonzero penalty and duplicate-placement publication rejection | Not Tested | PASS | Local 64-row event includes nonzero penalty; database test rejects duplicate placement with explicit error code. |
| QA-137 | All deeper tie-break combinations | Not Tested | PASS | International-scoring tests exercise deeper tie levels; independent browser-event oracle checks full rank order before/after correction. |
| QA-138 | Roster change request/create/review/cancel | Not Tested | NOT TESTED | Local request creation, rejection and approval exercised. Cancellation not executed; no new cancellation capability invented. |
| QA-139 | Preferences persistence and featured badge editing | Not Tested | NOT TESTED | Preferences persist and suppress result notifications in real backend; featured badge editing not exercised. |
| QA-140 | All archive/records/organization/wrapped interactive branches | Not Tested | NOT TESTED | Existing archive/record/organization/Wrapped component and projection coverage is partial, not every interactive branch. |
| QA-141 | Support filter persistence and ticket reply lifecycle | Not Tested | NOT TESTED | Local ticket creation, two-way replies, resolution and queue status filtering exercised; filter persistence across navigation/reload not asserted. |
| QA-142 | Every route/control at every width; complete accessibility audit | Not Tested | NOT TESTED | 25 Admin routes × 8 widths, six Admin axe scans, keyboard drawer and text zoom covered; exhaustive every-control accessibility/device audit not completed. |
| QA-143 | Token expiry renewal / concurrent stale-response race | Not Tested | PASS | Actual PostgreSQL token refresh-family rotation/expiry/reuse tests plus component stale-response guards; no production session forced expired. |
| QA-144 | Full RLS/storage/security assessment | Not Tested | BLOCKED | Local SQL RLS suites and private upload tests pass; full production RLS/storage/security assessment lacks direct authorized access. |
| QA-145 | Load capacity / browser-device matrix | Not Tested | NOT TESTED | Local 32-read concurrency sample and Chromium testing only; sustained-load, Safari/Firefox and physical-device matrix not executed. |

The original 153 assertions are not relabelled wholesale or combined with unit test counts. Original evidence remains under `AEVIC-QA-2026-11-05/`; the new [machine-readable ledger](evidence/AEVIC-REMEDIATION-2026-11-05/remaining-scenarios.json) records this retest scope.

## 5. End-to-end tournament retest

FINAL_LIFECYCLE_PENDING

## 6. Focused security results

The unchanged authentication/authorization middleware was exercised together with the modified endpoints. Real local tests cover Admin login, wrong credentials, captain denial of current-result/correction operations, foreign support-record denial, private uploads and ownership, check-in/room eligibility, post-completion room denial, session revocation, password rotation, MFA enrollment/verification/disable and single-use recovery. PostgreSQL suites exercise refresh-token rotation/reuse, session expiry and role constraints. Server suites cover CSRF, input/schema validation, private response cache headers, upload processing and origin checks. Public build output passed the configured sensitive-key check.

No new unauthenticated correction path was added. Current-result GET requires Admin role and a published row. Strict correction payload/version checks, transactional old-version capture, operator/reason audit and authoritative scoring remain intact. The create-cache hydration contains an already-authorized response, not a fabricated session or role. Fixture captains authenticate through actual password endpoints; test middleware used by lower-level integration suites is not represented as browser authentication evidence.

The **full security-audit workflow was not completed**. These are focused regression results, not security certification. Direct deployed Supabase RLS/storage policies, production secrets/configuration, CDN behavior and external delivery remain unverified. No production policy/configuration changes were made. The local `test:db` migration/policy suites are separate evidence, not proof of deployed policy state.

## 7. Test results and performance

FINAL_TEST_RESULTS_PENDING

## 8. Release recommendation

**NOT READY** for a production release on this evidence alone. The fixes and Admin redesign are present only in the local working tree. Before release, an authorized deployment must be followed by target-environment retests of save/status/publication/completion response timing, first/second correction, cache propagation, room isolation and final-rank/PNG consistency. An owner with direct access must verify production RLS/storage/private-response configuration and external notification delivery. Complete the remaining account/interaction branches and broader browser/device/load coverage proportionate to the intended launch.

No commit, push or deployment was performed. Original deployed QA tournament `19130ea6-8fc0-4bc6-9773-12b1a49de0a5` and its correction reproduction result were not rewritten. Disposable local database clusters and synthetic fixture data were used for destructive lifecycle/reset operations. The report separates local success from outstanding live acceptance rather than assuming deployment is authorized.
