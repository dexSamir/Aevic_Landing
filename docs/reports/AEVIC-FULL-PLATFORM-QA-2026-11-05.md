# AEVIC Esports — full-platform QA audit

**Date:** 5 November 2026 · **Environment:** [aevic-demo.netlify.app](https://aevic-demo.netlify.app) · **Mode:** live QA only, no fixes.

## 1. Executive summary

**Release recommendation: NOT READY.** A real QA tournament progressed from creation through completion with 12 authorized test teams, four rounds, and 48 published team-round results. Independent scoring found **zero mismatches** in the checked per-round values and all 12 cumulative standings. Core competition data is usable, but three high-priority failures prevent launch confidence: the public leaderboard crashes, committed Admin writes are reported as failed, and newly published results cannot be opened for correction.

| Ledger status | Count |
|---|---:|
| Total | 153 |
| Pass | 115 |
| Fail | 8 |
| Blocked | 14 |
| Not Tested | 16 |

The ledger contains **56 page-width overflow assertions** and **97 other scoped scenarios**, not 153 complete business workflows. Eight failed scenarios map to eight confirmed bugs: **3 High, 3 Medium, 2 Low; no confirmed Critical issue**. A passing row means its stated assertion was executed; it does not certify an entire feature area.

The [complete scenario ledger](AEVIC-QA-SCENARIOS-2026-11-05.md) records IDs, role, preconditions, actions, expected/actual behavior, status, URL and evidence. The [machine-readable ledger](evidence/AEVIC-QA-2026-11-05/scenario-ledger.json) supports exact recounting. Discovery used the active route manifest: **98 route definitions** (25 Admin, 23 Team, 23 Public, 10 Account, 7 Auth and 10 System). See [route-inventory.json](evidence/AEVIC-QA-2026-11-05/route-inventory.json). These are definitions, including parameterized routes, not 98 fully tested flows.

**Scope and method.** Chromium/Playwright against the real deployment; authenticated Admin and participant in separate contexts; separate anonymous browsing; actual UI mutations; read-only public/backend API verification; targeted source inspection to understand supported operations. The user completed authentication interactively. No tokens, cookies, passwords or room secrets were requested in chat or included in this report. No mock responses or fixture-backed passes were used. The two audit sessions were logged out at the end.

**Important limits.** No authorized Supabase connector was available. Persistence is established by successful application responses, independent API reads and page reloads, **not direct database or RLS inspection**. Only one participant captain identity was authenticated. Eleven additional existing DEMO teams were assigned through the supported Admin process; their independent captain sessions were not fabricated. Sixteen-team capacity enforcement, ordinary member permissions, a separate unregistered captain, correction downstream behavior and some management branches remain blocked or untested. Global settings, mass announcements and unrelated historical/user data were not changed.

## 2. Coverage matrix

| Area | Pass | Fail | Blocked | Not Tested |
|---|---:|---:|---:|---:|
| Authentication | 7 | 0 | 2 | 0 |
| Tournament creation | 5 | 1 | 0 | 0 |
| Tournament lifecycle | 1 | 1 | 0 | 0 |
| Registration | 3 | 0 | 3 | 4 |
| Check-in | 3 | 0 | 0 | 1 |
| Room management | 3 | 0 | 1 | 1 |
| Results | 4 | 1 | 1 | 1 |
| Standings | 6 | 0 | 1 | 1 |
| Share Studio | 2 | 0 | 1 | 0 |
| Team Panel | 6 | 1 | 2 | 2 |
| Admin | 2 | 1 | 3 | 1 |
| Public website | 8 | 3 | 0 | 1 |
| Security/authorization | 8 | 0 | 0 | 2 |
| Responsive | 57 | 0 | 0 | 2 |

The action coverage below distinguishes exercised workflows from read-only discovery:

| Surface | Executed actions and verification | Limits |
|---|---|---|
| Admin tournaments/operations | Required fields, invalid timeline, double submission, creation, draft privacy, publish/open, editing, slots, approval, room save, ongoing/completed state | Capacity temporarily saved as 12/12, then restored to 16; no extra eligible team rejection test. No withdrawal/rejection or lifecycle override/reversal |
| Admin results/corrections | Draft save/edit, invalid numeric input, incomplete publication rejection, 48 entries, four publications, correction attempt | Correction fails; nonzero penalties and duplicate-placement publish rejection untested |
| Admin teams/organizations/verifications | Team search positive/empty; team detail, organization list and verification states inspected | Existing pending real records left unchanged; no bulk approval |
| Admin roster requests/disputes | Existing request inspected; new QA objection reviewed/rejected and decision seen by participant | No new roster request lifecycle |
| Admin missed check-ins/audit | QA missed teams checked; QA result writes matched to audit entries | No manual check-in override |
| Admin messages/blacklist/support | Composer, empty blacklist, support listing inspected; support filter changed | Broadcast send prohibited; filter final async result not conclusively captured; no ticket create/reply |
| Admin users/settings/legacy claims | Roles, controls, current settings and claim states inspected | No invitations, role/security/configuration or real ownership changes |
| Team overview/tournaments/detail | Identity, joined QA entry, check-in, schedule, closed rooms, roadmap, results, performance, standings, completed summary | Only own-team middle-position preview; no authenticated top/bottom-team cases |
| Team profile/media | Temporary synthetic bio saved/reloaded/restored; crop zoom/pan/reset, actual upload, original logo appearance restored | Logo restoration creates a new asset URL; banner upload and invalid-file matrix not exhausted |
| Team career/history/comparison/share | Career totals checked; Miramar filter; comparison; actual PNG export and refresh preselection | All chart controls, Wrapped slide/export branches and featured achievements not exhausted |
| Team notifications/messages | QA notifications produced; two QA notifications marked read; persistence checked; message inbox inspected | No mass mark-read or general message send; external email/push delivery not verified |
| Team roster/invitations/managers/verification | Roster and existing request, no-invite state, management controls, approved verification inspected | No authorized second recipient; transfer/archive/leave and permission mutations not executed |
| Account profile/security/notifications/sessions | Read-only fields, MFA status, channel options and session list; current audit session logout | No personal data edits, password/MFA changes, data export, deactivation or termination of other existing sessions |
| Public | Directory search/filter/sort/calendar, teams filter/sort, follow login gate, comparison, public card PNG, QA detail/round tabs/recap, rules/legal/auth navigation | Public leaderboard crashes; not every archive/record/organization drill-down tested |
| Responsive/security | 7 principal pages × 8 widths; selected visual review, modal scroll, keyboard skip; anonymous/captain API checks; logout | Not a complete accessibility, browser/device, load or security certification |

Read-only page observations are in [public discovery](evidence/AEVIC-QA-2026-11-05/public-route-observations.json), [Admin/Team scan 1](evidence/AEVIC-QA-2026-11-05/panel-scan1.json), [scan 2](evidence/AEVIC-QA-2026-11-05/panel-scan2.json), and [account review](evidence/AEVIC-QA-2026-11-05/account-final-scan.json). Initial loading screens/tool locator timeouts were not counted as product failures. For example, the managers page loaded on retry; early badge/provider error needs further reproducibility work, and Wrapped shows a single animated slide rather than all content at once.

## 3. Complete confirmed bug list

All bugs below are **Open — not fixed**. Viewport dimensions in responsive tests are CSS pixels; some interactive-browser evidence is captured at device scale 2. Original desktop capture geometry was not consistently logged, so image pixel dimensions are stated where available rather than guessed CSS widths.

### High priority

#### AEVIC-QA-001 — Public leaderboard crashes

**Severity:** High · **Priority:** P1 · **Area:** Public / routing

**Environment:** [/leaderboard](https://aevic-demo.netlify.app/leaderboard); Anonymous Chromium; 1440×1000 CSS viewport.

**Preconditions:** Logged out; deployed public leaderboard route.

**Steps to reproduce:**

1. Open /leaderboard directly.
2. Allow loading to settle; retry the same route.
3. Inspect rendered error and console.

**Expected:** Leaderboard and its controls render.

**Actual:** Application 500 screen on repeated visits. Console: `usePublicPlatformData must be used inside PublicPlatformProvider`. The HTML HTTP status is 200, so availability monitoring based only on HTTP status misses this failure.

**Evidence:** [leaderboard-console.json](evidence/AEVIC-QA-2026-11-05/leaderboard-console.json), [PUB-leaderboard-retest.png](evidence/AEVIC-QA-2026-11-05/PUB-leaderboard-retest.png), [route-_leaderboard.png](evidence/AEVIC-QA-2026-11-05/route-_leaderboard.png)

**Affected workflow:** Public ranking discovery is unusable.

**Assessment note:** Targeted source inspection supports a provider/route integration issue; no change made.

**Status:** Open — not fixed.

#### AEVIC-QA-002 — Admin reports failure after writes have committed

**Severity:** High · **Priority:** P1 · **Area:** Admin / API integration

**Environment:** [/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5); Authenticated Admin Chromium desktop. Save-error image 2910×8400 pixels, full page; also visible during 1440px panel retests.

**Preconditions:** QA tournament with registered teams; valid edits or a complete result set.

**Steps to reproduce:**

1. Make a valid QA schedule/capacity/status edit and click Dəyişiklikləri saxla, or fill all 12 results and publish the round.
2. Observe the error after approximately 10 seconds.
3. Reload independently or read the public QA API and compare saved state.

**Expected:** Committed success is acknowledged; uncertain timeouts are reconciled and validation messages are accurate.

**Actual:** Client resource duration about 10001.7 ms, responseStatus 0; UI says save failed. Completed state, edited schedule/capacity and published results are nevertheless persisted. Publication incorrectly says every confirmed team requires a result even after all 12 were saved. Completion repeated the same false failure.

**Evidence:** [admin-save-timeout.png](evidence/AEVIC-QA-2026-11-05/admin-save-timeout.png), [result-publish-ui.json](evidence/AEVIC-QA-2026-11-05/result-publish-ui.json), [qa-compressed-timeline.json](evidence/AEVIC-QA-2026-11-05/qa-compressed-timeline.json), [round1-public-verification.json](evidence/AEVIC-QA-2026-11-05/round1-public-verification.json), [authenticated-security-completion.json](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json), [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json)

**Affected workflow:** Operators cannot trust save status and may retry already committed changes; publication looks unsuccessful to tournament staff.

**Assessment note:** Local requestJson defaults to a 10-second abort. Backend latency/notification processing is a possible contributor, not a proven root cause. Initial incomplete-publication 409 was legitimate and is separate from the later timeout.

**Status:** Open — not fixed.

#### AEVIC-QA-003 — Newly published result cannot enter correction workflow

**Severity:** High · **Priority:** P1 · **Area:** Admin / results

**Environment:** [/admin/results/fce97099-d62a-4683-a69e-7b5155b4fa21/correct](https://aevic-demo.netlify.app/admin/results/fce97099-d62a-4683-a69e-7b5155b4fa21/correct); Authenticated Admin Chromium desktop; correction screenshot 2940×1670 pixels.

**Preconditions:** QA R1 result for team 16 exists and is published; public result has 18 points.

**Steps to reproduce:**

1. Open Admin Results for the QA tournament.
2. Follow the correction link for result fce97099-d62a-4683-a69e-7b5155b4fa21.
3. Inspect result history response and the correction form.

**Expected:** The current published result is available for a first correction with a required reason.

**Actual:** GET versions returns 200 with []; UI says Nəticə tapılmadı and presents zero input fields.

**Evidence:** [result-correction.json](evidence/AEVIC-QA-2026-11-05/result-correction.json), [result-correction.png](evidence/AEVIC-QA-2026-11-05/result-correction.png), [result-validation.json](evidence/AEVIC-QA-2026-11-05/result-validation.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

**Affected workflow:** Staff cannot correct scoring mistakes. Recalculation, reversal, corrected rank movement, cache invalidation and corrected Share Studio propagation cannot be tested through the supported flow.

**Assessment note:** Source inspection shows form initialization depends on version history. No direct API workaround or database insertion was used.

**Status:** Open — not fixed.

### Medium priority

#### AEVIC-QA-004 — Successful creation lands on false “tournament not found” state

**Severity:** Medium · **Priority:** P2 · **Area:** Admin / loading state

**Environment:** [/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5); Authenticated Admin Chromium desktop; creation screenshot 2940×1670 pixels.

**Preconditions:** Valid new QA tournament form; no existing tournament with this generated ID.

**Steps to reproduce:**

1. Submit the valid QA tournament form.
2. Follow automatic navigation after POST 201.
3. Observe initial destination, then refresh.

**Expected:** Newly created tournament loads or displays an explicit loading state.

**Actual:** Destination displays Turnir tapılmadı and Yanlış turnir ünvanı immediately after successful creation; refreshed page loads the new tournament.

**Evidence:** [qa-created.json](evidence/AEVIC-QA-2026-11-05/qa-created.json), [qa-created.png](evidence/AEVIC-QA-2026-11-05/qa-created.png), [qa-created-refreshed.json](evidence/AEVIC-QA-2026-11-05/qa-created-refreshed.json), [qa-created-refreshed.png](evidence/AEVIC-QA-2026-11-05/qa-created-refreshed.png)

**Affected workflow:** Successful creation appears broken, encourages unnecessary retries and undermines operator confidence.

**Assessment note:** Confirmed immediate false error; duration was not measured beyond the captured initial state. It is not claimed to be permanently stuck.

**Status:** Open — not fixed.

#### AEVIC-QA-007 — Completed tournament history omits the final rank

**Severity:** Medium · **Priority:** P2 · **Area:** Team / data consistency

**Environment:** [/team/tournaments](https://aevic-demo.netlify.app/team/tournaments); Authenticated captain team 16; Chromium desktop. Completed-history screenshot 2910×6044 pixels.

**Preconditions:** QA tournament completed; four published rounds; official rank 4, 33 points, 1 WWCD.

**Steps to reproduce:**

1. Complete the QA tournament through Admin.
2. Refresh /team/tournaments.
3. Inspect the QA completed card and compare Team Detail/public standings.

**Expected:** Yekun yer shows #4 alongside 33 points and 1 WWCD.

**Actual:** Yekun yer is — while the adjacent score and WWCD are correct. The match-history final summary also omits the rank.

**Evidence:** [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json), [completed-history.png](evidence/AEVIC-QA-2026-11-05/completed-history.png), [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

**Affected workflow:** Participants cannot see their final placing in tournament history; summaries disagree with official standings.

**Assessment note:** Observed after explicit completed status, not merely after all rounds finished while ongoing.

**Status:** Open — not fixed.

#### AEVIC-QA-008 — Completed event still promises registration to logged-out visitors

**Severity:** Medium · **Priority:** P2 · **Area:** Public / registration UX

**Environment:** [/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5); Anonymous Chromium at 1440×900 CSS viewport.

**Preconditions:** QA tournament status completed; registration deadline is past.

**Steps to reproduce:**

1. Open completed QA public tournament detail while logged out.
2. Read the TAMAMLANIB status and registration-closed explanation.
3. Inspect the active Daxil ol və qoşul link.

**Expected:** A completed event offers appropriate result/status navigation without implying that joining remains available.

**Actual:** Active “sign in and join” link appears beside completed/closed registration messaging, pointing to login with this tournament as return target.

**Evidence:** [final-public.json](evidence/AEVIC-QA-2026-11-05/final-public.json), [public-round-tabs.json](evidence/AEVIC-QA-2026-11-05/public-round-tabs.json), [final-public-_tournaments_19130ea6_8fc0_4bc6_9773_12b1a49de0a5.png](evidence/AEVIC-QA-2026-11-05/final-public-_tournaments_19130ea6_8fc0_4bc6_9773_12b1a49de0a5.png)

**Affected workflow:** Visitors are sent through authentication for an unavailable registration action.

**Assessment note:** This is a confirmed misleading CTA, not evidence that the backend accepts late registrations.

**Status:** Open — not fixed.

### Low priority

#### AEVIC-QA-005 — Comparison exposes excessive decimal precision

**Severity:** Low · **Priority:** P3 · **Area:** Public / formatting

**Environment:** [/teams/compare](https://aevic-demo.netlify.app/teams/compare); Anonymous Chromium 1440px CSS width; full-page comparison screenshot 1440×2975 pixels.

**Preconditions:** Select TEST HESABI and a DEMO opponent in public comparison.

**Steps to reproduce:**

1. Open /teams/compare.
2. Choose TEST HESABI and DEMO Rəqib 01.
3. Read the average statistics.

**Expected:** Consistent concise display precision, such as one or two decimal places.

**Actual:** Values such as 7.709677419354839 and 15.193548387096774 are rendered unrounded in the captured comparison.

**Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json), [PUB-team-comparison.png](evidence/AEVIC-QA-2026-11-05/PUB-team-comparison.png)

**Affected workflow:** Statistics are harder to scan and can crowd compact layouts.

**Assessment note:** These values were captured before QA results changed career aggregates; exact averages will change with later results.

**Status:** Open — not fixed.

#### AEVIC-QA-006 — Raw enum values leak into localized status UI

**Severity:** Low · **Priority:** P3 · **Area:** Admin / Team / localization

**Environment:** [/admin/tournaments](https://aevic-demo.netlify.app/admin/tournaments); Authenticated Admin and captain Chromium; route scans at 1440px CSS width.

**Preconditions:** Tournament in ongoing state, or verification/dispute records available.

**Steps to reproduce:**

1. During QA ongoing state open Admin tournament list.
2. Compare its status label to the localized edit selector/public view.
3. Inspect verification and objection status labels.

**Expected:** Consistent human-readable Azerbaijani labels.

**Actual:** Raw ongoing shown in Admin list; APPROVED and pending/rejected/other also appear in related localized panels.

**Evidence:** [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json), [admin_admin_tournaments.png](evidence/AEVIC-QA-2026-11-05/admin_admin_tournaments.png), [dispute-profile-verification.json](evidence/AEVIC-QA-2026-11-05/dispute-profile-verification.json)

**Affected workflow:** Inconsistent language and implementation terminology reduce clarity.

**Assessment note:** One localization issue grouped across surfaces; not counted as separate bugs per enum.

**Status:** Open — not fixed.

## 4. End-to-end tournament timeline

All times below are **Asia/Baku (UTC+4), 5 November 2026**. Where an exact timestamp is unavailable, order is stated without inventing one.

| Stage | Observed outcome |
|---|---|
| Creation — 14:30:11 | POST 201, draft ID generated, four supported maps/rounds, 16 slots. Immediate false not-found destination; refresh recovered |
| Publication → registration-open | Admin status changes persisted; draft became publicly visible |
| Participant registration → approval | Captain team 16 used real public join UI. Slow/unclear feedback; pending entry appeared in Admin and was approved. Confirmed slot 1 persisted |
| DEMO registration/slots | Eleven existing approved DEMO teams assigned by supported Admin dialog. 12 confirmed participants; no direct DB inserts |
| Schedule preparation | Original realistic schedule was extended during setup, then compressed through supported QA edit. Final registration deadline 14:44; check-in 14:45–14:51; no clock manipulation |
| Check-in — 14:48:43 | Primary participant completed check-in and Admin saw it. Eleven DEMOs did not authenticate/check in; missed state later visible |
| Room distribution | Four QA room configurations saved. R1 released to eligible primary captain; mask/reveal/switch/no-store checked. Passwords omitted |
| Ongoing and rounds | Supported status set to ongoing. Final planned starts: 14:52, 14:53, 14:54, 14:55. No game-server session or actual PUBG match was played; synthetic QA scores were entered |
| Results | 12 teams × 4 rounds saved through Admin. Incomplete publication correctly rejected first; complete publications committed despite false failure feedback. All four public match records verified |
| Standings and export | Four snapshots, 12 cumulative standings; independent calculation zero mismatches; five-row own-team preview and actual 12-team PNG checked |
| Correction attempt | Blocked by empty-version correction form for a valid published result; no corrected scores or reversals fabricated |
| Objection — 15:09:46 | QA-only objection created against R4, with explicit instruction that scores are correct |
| Objection decision — 15:10:42 | Admin rejected the synthetic objection with a QA note; participant saw persisted decision; results unchanged |
| Profile/media check | QA bio marker saved/reloaded/restored. QA crop uploaded; original logo image re-uploaded to restore appearance |
| Completion — 15:14:19 | Status persisted as completed, all four rounds published; completed public recap and Team Detail verified. History final rank missing |
| End-of-audit | QA notification read persistence, responsive panels, public round tabs/recap, separate-context logout and post-logout 401 checks completed |

Evidence: [creation](evidence/AEVIC-QA-2026-11-05/qa-created.json), [final schedule](evidence/AEVIC-QA-2026-11-05/completed-verification.json), [check-in](evidence/AEVIC-QA-2026-11-05/qa-check-in-confirmed.json), [objection decision](evidence/AEVIC-QA-2026-11-05/dispute-profile-verification.json), [logout](evidence/AEVIC-QA-2026-11-05/logout-final.json).

## 5. Data consistency

| Value/workflow | Admin / backend / public / participant result |
|---|---|
| Identity and participants | QA ID consistent; 12 confirmed teams and 16 capacity; primary team 16 / slot 1 |
| Configuration | Four rounds, Erangel/Miramar/Rondo/Erangel; dates and point preset persisted and reflected in Team/Public views |
| Check-in | Primary check-in timestamp agrees with participant roadmap and Admin view |
| Room | Protected response matched configured R1; masked by default, private/no-store; switching cleared previous values; completed room closed |
| Result arithmetic | All 48 result rows checked independently; zero mismatches |
| Cumulative standings | All 12 teams checked independently; zero mismatches in rank, matches, WWCD, placement/kill points, kills, penalties and total |
| Participant performance | #4, 33 total, 15 kills, 1 WWCD, 18 placement points; average placement 5.25 displayed 5.3 |
| Career | 66 matches / 255 kills / 10 WWCD / 511 points after QA; point increase 33 from baseline 478 |
| Public recap | 4 matches, 171 total kills, 4 WWCD, 1 day; champion DEMO Rəqib 01 with 64 points |
| Share Studio | QA preselected, actual image correct; after refresh QA data restored. Full-table choice resets to default Top 10, while tournament preselection remains |
| Inconsistencies | Save/error feedback versus committed backend state; false new-tournament not-found; completed history rank missing; completed public join CTA |

Independent point formula: placements 1–8 earn **10, 6, 5, 4, 3, 2, 1, 1**; 9–16 earn 0. Each elimination earns 1. WWCD bonus 0; tested penalties 0. Tie order: WWCD, placement points, eliminations, then final-match placement. Only the exercised tie situations are certified.

| Team 16 round | Placement | Kills | Placement points | Total |
|---|---:|---:|---:|---:|
| R1 Erangel | 1 | 8 | 10 | 18 |
| R2 Miramar | 2 | 4 | 6 | 10 |
| R3 Rondo | 12 | 0 | 0 | 0 |
| R4 Erangel | 6 | 3 | 2 | 5 |
| **Total** | Average 5.25 | **15** | **18** | **33** |

Final ordered totals: **64, 47, 40, 33, 33, 26, 18, 14, 8, 6, 5, 5**. TEST HESABI wins its 33-point tie on WWCD (1 versus 0). Round-table rank is the score rank, so R2 shows score rank 4 even though finish placement was 2; this is not counted as a scoring defect.

Evidence: [independent calculations and API records](evidence/AEVIC-QA-2026-11-05/scoring-verification.json), [Team Detail](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [settled public round tabs](evidence/AEVIC-QA-2026-11-05/public-round-tabs-settled.json), [public final recap](evidence/AEVIC-QA-2026-11-05/final-public.json), [actual PNG](evidence/AEVIC-QA-2026-11-05/qa-leaderboard.png).

Some captured intermediate reads occurred during asynchronous loading. They are retained as attempts, not final product assertions: early Share Studio `afterRefresh:false` is superseded by `team-controls-verified.json`; early public-tab rows by `public-round-tabs-settled.json`; initial `/matches` network-idle timeout by successful retest. Legacy `/matches/:id` aliases redirect to tournament results; round selection was explicitly tested using the public tabs. Backend API persistence cannot prove direct database constraints or transaction isolation.

## 6. Security observations

**No authorization bypass was confirmed in the executed checks.** This does not constitute a completed security sign-off.

| Check | Observed result |
|---|---|
| Logged-out protected routes | Redirected to login; no Admin/Team workspace data rendered |
| Anonymous private APIs, including actual room endpoint | 401, no protected credentials; private,no-store |
| Invalid bearer on QA Admin PATCH | 401 ACCESS_EXPIRED; no change |
| Authenticated captain → Admin context/UI | API 403 FORBIDDEN; UI /forbidden |
| Team 16 → DEMO team 870000000002 authority | 403 FORBIDDEN |
| Team 16 → other DEMO team update and QA registration | Both 403 FORBIDDEN with valid Origin. Earlier ORIGIN_REJECTED responses were not mistaken for ownership enforcement |
| QA tournament ID combined with another tournament round | 403 ROOM_NOT_ELIGIBLE; no secret payload |
| Eligible room read | private,no-store; masked/reveal controls work; round switch clears secrets |
| Public payload sensitive-key scan | No password/token/private-contact fields in checked public context |
| Both audit sessions after logout | Appropriate login redirects; private context APIs 401; protected workspace absent |

Blocked/limited: no second unregistered authenticated captain, ordinary player/member, authenticated alternate DEMO owner, direct Supabase/RLS inspection, exact lease-expiry timing, account-switch race, real token-expiry renewal, or exhaustive private endpoint/storage matrix. No disruptive exploitation or stress test was attempted. Same-email Google captain versus dedicated Admin login reflects separate authentication paths; it was not classified as an escalation vulnerability.

Evidence: [anonymous checks](evidence/AEVIC-QA-2026-11-05/anonymous-security.json), [authenticated checks](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json), [ownership retest with Origin](evidence/AEVIC-QA-2026-11-05/completed-verification.json), [room](evidence/AEVIC-QA-2026-11-05/qa-room-security.json), [logout](evidence/AEVIC-QA-2026-11-05/logout-final.json).

## 7. UX, responsive and performance

The principal pages were checked at **320, 360, 390, 430, 768, 1024, 1280 and 1440px**: public home, tournament directory, team 16 profile, QA tournament detail, login, authenticated QA Team Detail and Admin QA operations. **All 56 document-overflow checks passed.** These checks do not imply every hidden carousel slide or table column fits without intentional scrolling.

Selected rendered screenshots and contact sheets were visually inspected. Team/Admin mobile layouts remain reachable; standings highlight the current team. At 390×500 the full standings modal horizontally scrolled 414px to reveal remaining columns and vertically scrolled 117px to its footer. Escape closed it. At 390×700 all 12 rows fit vertically. First Tab exposed the skip link with a visible outline; Enter moved focus to main content.

Observed interface defects are in the bug list: crash/error states, false mutation feedback, false post-create not-found, missing final rank, contradictory closed-event CTA, excessive decimal precision and raw statuses. Occasional provider-loading errors on managers/badges require further controlled measurement; managers succeeded on retry. Unloaded or intentionally lazy images were not automatically classified as broken assets.

Evidence: [public measurements](evidence/AEVIC-QA-2026-11-05/responsive.json), [panel measurements](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [public contact sheet](evidence/AEVIC-QA-2026-11-05/responsive-contact-sheet.jpg), [panel contact sheet](evidence/AEVIC-QA-2026-11-05/panel-contact-sheet.jpg), [modal scroll](evidence/AEVIC-QA-2026-11-05/modal-scroll.json), [keyboard](evidence/AEVIC-QA-2026-11-05/mobile-keyboard-skip.png).

### Measured performance samples

Single headless Chromium sample per page/width, no CPU/network throttling, 6-second observation after navigation; browser PerformanceObserver for LCP/layout shifts. These are lab snapshots, not field percentiles or load-capacity claims. CLS below is accumulated non-input layout-shift score over this short observation window, not a full field session-window calculation.

| Page | Width | LCP (ms) | Observed layout-shift sum | TTFB (ms) |
|---|---:|---:|---:|---:|
| Home | 390 | 2360 | 0.0370 | 583.0 |
| Tournaments | 390 | 1516 | 0.2178 | 732.8 |
| Home | 1440 | 1216 | 0.0015 | 336.1 |
| Tournaments | 1440 | 868 | 0.1701 | 367.5 |

Tournament-directory layout shifts warrant investigation; no cause or production percentile is asserted. The more consequential measured performance issue is the roughly 10-second mutation abort that masks committed writes. Simultaneous read-only Admin and participant access was exercised safely; no throughput or concurrent-player capacity was measured. [Raw measurements](evidence/AEVIC-QA-2026-11-05/performance.json).

## 8. Prioritized fix roadmap — recommendations only

| Priority | Recommendation and acceptance check |
|---|---|
| P0 | No confirmed Critical/P0 issue. Do not reinterpret limited security checks as an all-clear |
| P1 | Fix public leaderboard provider/routing integration; verify anonymous render and meaningful error telemetry |
| P1 | Reconcile mutation timeouts with persisted state; distinguish validation failure, transport uncertainty and successful commit. Verify save/publish/completion once under realistic latency without duplicate effects |
| P1 | Make first correction load the current published result and preserve version audit. Then execute correction, reversal, standings/Team/public cache refresh and corrected PNG tests |
| P2 | Prevent false not-found after creation; retain loading until authoritative result is available |
| P2 | Derive/populate completed history final rank consistently with official standings |
| P2 | Remove misleading join CTA for completed/closed competitions and verify anonymous/authenticated lifecycle states |
| P2 | Investigate intermittent context timeouts and directory layout shift with repeated measurement; provision authorized extra captains/member identities and direct read-only Supabase access for remaining coverage |
| P3 | Round comparison metrics consistently; localize raw statuses and remove implementation-oriented copy from user-facing panels |

No recommendation was implemented. No React/backend source, schema, migration, RLS, production configuration or security setting was modified; no commit, push or deployment was performed.

## 9. Test artifacts and QA data left in the environment

**Tournament:** [[QA-2026-11] AEVIC Full E2E Test](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5) · ID `19130ea6-8fc0-4bc6-9773-12b1a49de0a5` · short name `QA NOV 2026` · final status **completed** · capacity **16**, confirmed teams **12**.

| Round | Map | ID |
|---|---|---|
| 1 | Erangel | `0ab9666e-5501-47b2-b99e-ce2be068fafc` |
| 2 | Miramar | `084ccd99-7a1b-4047-8942-22bd53c619ff` |
| 3 | Rondo | `557049ae-4dc9-4c82-9de7-2c74e441c775` |
| 4 | Erangel | `a9ef71d4-9e4a-4cd4-9376-40a610be87a8` |

**Teams:** `16` TEST HESABI; `870000000002`–`870000000012`, corresponding to `[DEMO] Rəqib 01`–`[DEMO] Rəqib 11`. Only team 16 used an authenticated captain session. The supported Admin assignment flow supplied the other eleven entrants.

**Retained QA resources:** tournament, 12 registrations/slots, primary check-in, four QA room configurations, 48 published results, four leaderboard snapshots, related QA notifications/audit events, rejected QA objection `f02330f8-8d1e-4ca9-a6ca-c1b2d9f8c7d0`. R1 team-16 result `fce97099-d62a-4683-a69e-7b5155b4fa21` is the reproducible correction target. No result correction or reversal was applied.

**Profile test restoration:** original team bio restored exactly. Original logo appearance restored by uploading the original image through the crop workflow; its new asset ID is `6277b8e9-6f8f-4d09-b84b-818fabe21a77`. The temporary labeled QA upload ID is `72f74991-fc13-4cbd-9ce4-83892257108d`; it may remain as an unreferenced media object. No deletion was attempted. Two QA-specific participant notifications were marked read. Other account profile/security settings and unrelated notifications were not changed.

**Evidence:** [directory](evidence/AEVIC-QA-2026-11-05/), [scenario JSON](evidence/AEVIC-QA-2026-11-05/scenario-ledger.json), [scenario narrative](AEVIC-QA-SCENARIOS-2026-11-05.md), [artifact manifest](evidence/AEVIC-QA-2026-11-05/artifact-manifest.json). The manifest hashes evidence files for later comparison. Screenshots include actual live rendering; no mockup is offered as production evidence. Contact information was redacted from text captures; one generated screenshot containing unrelated contact details was removed. Room credentials, auth headers and tokens are excluded. Tool-attempt failures are retained and explicitly superseded where a valid retry exists.

The only new repository material is QA reporting/evidence and automatic Playwright artifacts. Final tracked-source diff verification is recorded in [workspace-integrity.txt](evidence/AEVIC-QA-2026-11-05/workspace-integrity.txt). QA records remain intentionally, as requested. Both audit browser sessions are signed out; unrelated existing user sessions were not revoked.

## 10. Final release recommendation

**NOT READY.** Confidence is **high** in the eight documented defects and in the tested scoring calculation, registration/approval persistence, room protection checks, objection decision, profile upload and published output. Confidence is **limited** for unexecuted permission roles, full-capacity competition, first-result corrections, direct database/RLS guarantees, device coverage and sustained performance.

Before launch, resolve the three P1 failures, rerun the entire corrected-result chain, and complete the blocked authorization/capacity checks with authorized safe identities. A limited pilot should be considered only after those core operational failures pass retest. This report is an evidence-backed QA assessment, not a declaration that all routes/actions or security controls have been certified.
