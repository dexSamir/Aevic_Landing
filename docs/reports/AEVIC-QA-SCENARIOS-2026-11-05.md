# AEVIC QA scenario ledger — 2026-11-05

Status applies only to the stated assertion. Route discovery is separate; a loaded page does not establish that all its actions work.

## QA-001 — Dedicated admin login and persistence

**Status:** Pass · **Area:** Authentication · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** User completes admin-specific login; navigate and refresh protected admin pages.
- **Expected:** Authorized admin workspace remains accessible.
- **Actual:** Admin operations, audit and settings accessible; QA creation and result writes authorized. Google login alone initially returned captain; dedicated admin login succeeded.
- **URL:** [https://aevic-demo.netlify.app/admin](https://aevic-demo.netlify.app/admin)
- **Evidence:** [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-002 — Participant Google login and identity

**Status:** Pass · **Area:** Authentication · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** User completes Google login in separate browser context; open Team Panel.
- **Expected:** Captain sees own team.
- **Actual:** Session role captain; workspace TEST HESABI, team 16.
- **URL:** [https://aevic-demo.netlify.app/team](https://aevic-demo.netlify.app/team)
- **Evidence:** [participant-dashboard.json](evidence/AEVIC-QA-2026-11-05/participant-dashboard.json), [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json)

## QA-003 — Separate-session persistence

**Status:** Pass · **Area:** Authentication · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Refresh and navigate both contexts during tournament operations.
- **Expected:** Each retains its own role and workspace.
- **Actual:** Admin executes admin actions; participant sees only own workspace; authenticated negative tests confirm captain role.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [authenticated-security-completion.json](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json), [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json)

## QA-004 — Required login fields

**Status:** Pass · **Area:** Authentication · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Submit empty login form.
- **Expected:** Browser rejects missing required fields.
- **Actual:** Native required-field validation observed.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-005 — Invalid recovery/verification links

**Status:** Pass · **Area:** Authentication · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open reset-password and verify-email without valid tokens.
- **Expected:** Reject invalid links safely.
- **Actual:** Recovery and verification display invalid/missing-link handling. No email sent.
- **URL:** [https://aevic-demo.netlify.app/reset-password](https://aevic-demo.netlify.app/reset-password)
- **Evidence:** [public-route-observations.json](evidence/AEVIC-QA-2026-11-05/public-route-observations.json)

## QA-006 — Invalid timeline rejection

**Status:** Pass · **Area:** Tournament creation · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Set end before start and submit real Admin form.
- **Expected:** No tournament created; validation error.
- **Actual:** POST 422 INVALID_TIMELINE.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments](https://aevic-demo.netlify.app/admin/tournaments)
- **Evidence:** [create-validation.json](evidence/AEVIC-QA-2026-11-05/create-validation.json)

## QA-007 — Valid creation and double-submit protection

**Status:** Pass · **Area:** Tournament creation · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Submit valid QA form with double click.
- **Expected:** One QA tournament created.
- **Actual:** One captured POST 201; one tournament ID, 4 rounds, 16 slots.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments](https://aevic-demo.netlify.app/admin/tournaments)
- **Evidence:** [qa-created.json](evidence/AEVIC-QA-2026-11-05/qa-created.json)

## QA-008 — Post-create navigation

**Status:** Fail · **Area:** Tournament creation · **Role:** Admin · **Severity:** Medium

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Follow automatic navigation after successful creation.
- **Expected:** New tournament workspace opens.
- **Actual:** Immediately displays Turnir tapılmadı; refresh recovers. AEVIC-QA-004.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-created.json](evidence/AEVIC-QA-2026-11-05/qa-created.json), [qa-created.png](evidence/AEVIC-QA-2026-11-05/qa-created.png), [qa-created-refreshed.json](evidence/AEVIC-QA-2026-11-05/qa-created-refreshed.json)

## QA-009 — Draft privacy

**Status:** Pass · **Area:** Tournament creation · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Request draft through anonymous public list/detail.
- **Expected:** Draft excluded and inaccessible publicly.
- **Actual:** Draft absent from list; detail 404.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-draft-public.json](evidence/AEVIC-QA-2026-11-05/qa-draft-public.json)

## QA-010 — Publish and open registration

**Status:** Pass · **Area:** Tournament creation · **Role:** Admin + anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Change draft to published and registration-open in Admin UI.
- **Expected:** Public QA tournament becomes discoverable.
- **Actual:** Public detail and directory show QA title, rules, 4 rounds and open registration.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-publication.json](evidence/AEVIC-QA-2026-11-05/qa-publication.json), [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-011 — Configuration persistence

**Status:** Pass · **Area:** Tournament creation · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Refresh Admin; fetch public QA configuration and compare.
- **Expected:** Saved maps, points, capacity and dates agree.
- **Actual:** Erangel/Miramar/Rondo/Erangel, 16 slots and saved scoring rules match.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-created-refreshed.json](evidence/AEVIC-QA-2026-11-05/qa-created-refreshed.json), [qa-public-persistence.json](evidence/AEVIC-QA-2026-11-05/qa-public-persistence.json)

## QA-012 — Save outcome accuracy

**Status:** Fail · **Area:** Tournament lifecycle · **Role:** Admin · **Severity:** High

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Save capacity/schedule/status changes; independently reload persisted state.
- **Expected:** Feedback reflects whether the change committed.
- **Actual:** 10-second browser abort/failure message despite persisted changes; repeated on result publication and completion. AEVIC-QA-002.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [admin-save-timeout.png](evidence/AEVIC-QA-2026-11-05/admin-save-timeout.png), [qa-compressed-timeline.json](evidence/AEVIC-QA-2026-11-05/qa-compressed-timeline.json), [result-publish-ui.json](evidence/AEVIC-QA-2026-11-05/result-publish-ui.json), [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json)

## QA-013 — Participant join and approval persistence

**Status:** Pass · **Area:** Registration · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use public join confirmation for team 16, then approve its pending QA entry in Admin.
- **Expected:** One confirmed entry appears in both panels.
- **Actual:** Real join was slow/ambiguous, but pending entry reached Admin and approval persisted; team 16 occupies slot 1. This pass covers persistence, not join feedback.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-join-attempt.json](evidence/AEVIC-QA-2026-11-05/qa-join-attempt.json), [qa-public-persistence.json](evidence/AEVIC-QA-2026-11-05/qa-public-persistence.json), [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json)

## QA-014 — Supported DEMO assignment

**Status:** Pass · **Area:** Registration · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Assign 11 existing approved DEMO teams via Admin slot dialog.
- **Expected:** QA competition has 12 unique confirmed teams.
- **Actual:** Supported assignments returned 204; public participants and Admin agree on 12.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [demo-assign-1.json](evidence/AEVIC-QA-2026-11-05/demo-assign-1.json), [demo-assign-2.json](evidence/AEVIC-QA-2026-11-05/demo-assign-2.json), [demo-assign-3.json](evidence/AEVIC-QA-2026-11-05/demo-assign-3.json), [qa-public-persistence.json](evidence/AEVIC-QA-2026-11-05/qa-public-persistence.json)

## QA-015 — Open/closed schedule reflection

**Status:** Pass · **Area:** Registration · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use supported QA schedule edit, observe registration closure and check-in window.
- **Expected:** UI reflects actual saved deadlines.
- **Actual:** Compressed schedule persisted and participant could check in during 14:45–14:51 AZT. No system clock change.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-compressed-timeline.json](evidence/AEVIC-QA-2026-11-05/qa-compressed-timeline.json), [qa-check-in-confirmed.json](evidence/AEVIC-QA-2026-11-05/qa-check-in-confirmed.json)

## QA-016 — Participant check-in

**Status:** Pass · **Area:** Check-in · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Click Check-in et and confirm Bəli, hazırıq.
- **Expected:** One check-in persists and appears for Admin.
- **Actual:** HTTP 200 checked-in at 14:48:43 AZT; Team Panel and Admin show completion.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-check-in-confirmed.json](evidence/AEVIC-QA-2026-11-05/qa-check-in-confirmed.json), [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json)

## QA-017 — Checked-in UI after refresh

**Status:** Pass · **Area:** Check-in · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Refresh Team Tournament Detail after check-in.
- **Expected:** Completed state replaces check-in action.
- **Actual:** Roadmap and eligibility show checked-in; duplicate UI action unavailable. Does not prove server idempotency.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json)

## QA-018 — Missed check-in visibility

**Status:** Pass · **Area:** Check-in · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open Admin missed check-ins after deadline.
- **Expected:** Un-checked-in QA DEMOs are identified.
- **Actual:** 11 DEMO entries listed as missed; no synthetic captain check-ins were fabricated.
- **URL:** [https://aevic-demo.netlify.app/admin/check-ins/missed](https://aevic-demo.netlify.app/admin/check-ins/missed)
- **Evidence:** [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json)

## QA-019 — Room save and round association

**Status:** Pass · **Area:** Room management · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Save QA room ID/password for each of four rounds through Admin.
- **Expected:** Credentials associated with selected round.
- **Actual:** Four UI writes completed; participant R1 credential retrieval matched configured room. Passwords excluded from artifacts.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-room-security.json](evidence/AEVIC-QA-2026-11-05/qa-room-security.json)

## QA-020 — Protected release/mask/reveal/switch

**Status:** Pass · **Area:** Room management · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Request released R1 room; reveal, hide, switch to R2.
- **Expected:** Eligible captain sees masked credentials; switching clears prior secrets.
- **Actual:** 200 released; masked=true, revealCorrect=true, clearedOnRoundSwitch=true; private,no-store.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [qa-room-security.json](evidence/AEVIC-QA-2026-11-05/qa-room-security.json), [qa-room-masked.png](evidence/AEVIC-QA-2026-11-05/qa-room-masked.png)

## QA-021 — Closed room after publication

**Status:** Pass · **Area:** Room management · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Reload completed rounds in participant Room Center.
- **Expected:** Published/completed room secrets no longer shown.
- **Actual:** Room closed, protected values absent from rendered panel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [team-responsive-390.png](evidence/AEVIC-QA-2026-11-05/team-responsive-390.png)

## QA-022 — Numeric input constraints

**Status:** Pass · **Area:** Results · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Try placement 0 and elimination -1 in result form.
- **Expected:** Reject invalid input.
- **Actual:** Browser numeric validation prevented submission; server validation of bypassed inputs not separately tested.
- **URL:** [https://aevic-demo.netlify.app/admin/results](https://aevic-demo.netlify.app/admin/results)
- **Evidence:** [result-validation.json](evidence/AEVIC-QA-2026-11-05/result-validation.json)

## QA-023 — Valid draft result

**Status:** Pass · **Area:** Results · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Save team 16 R1 placement 1, kills 8.
- **Expected:** 10 placement + 8 elimination = 18.
- **Actual:** 200 with total 18 and published=false.
- **URL:** [https://aevic-demo.netlify.app/admin/results](https://aevic-demo.netlify.app/admin/results)
- **Evidence:** [result-validation.json](evidence/AEVIC-QA-2026-11-05/result-validation.json)

## QA-024 — Incomplete publication rejection

**Status:** Pass · **Area:** Results · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Publish when only first team result exists.
- **Expected:** Reject incomplete round.
- **Actual:** 409 INCOMPLETE_RESULTS; round remained unpublished at that attempt.
- **URL:** [https://aevic-demo.netlify.app/admin/results](https://aevic-demo.netlify.app/admin/results)
- **Evidence:** [result-validation.json](evidence/AEVIC-QA-2026-11-05/result-validation.json)

## QA-025 — Draft edits and 48 published rows

**Status:** Pass · **Area:** Results · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Enter all 12 teams in each of 4 rounds via UI; edit duplicate draft placement; publish each round.
- **Expected:** 48 persisted result rows in four published rounds.
- **Actual:** All 48 rows returned in public match APIs; four leaderboard snapshots. Publication feedback failed separately.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [round1-results.json](evidence/AEVIC-QA-2026-11-05/round1-results.json), [round2-results.json](evidence/AEVIC-QA-2026-11-05/round2-results.json), [round3-results.json](evidence/AEVIC-QA-2026-11-05/round3-results.json), [round4-results.json](evidence/AEVIC-QA-2026-11-05/round4-results.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-026 — Published result correction

**Status:** Fail · **Area:** Results · **Role:** Admin · **Severity:** High

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open correction link for published team 16 R1 result.
- **Expected:** Current result loads into editable correction form.
- **Actual:** Versions GET 200 []; page Nəticə tapılmadı with zero fields. AEVIC-QA-003.
- **URL:** [https://aevic-demo.netlify.app/admin/results/fce97099-d62a-4683-a69e-7b5155b4fa21/correct](https://aevic-demo.netlify.app/admin/results/fce97099-d62a-4683-a69e-7b5155b4fa21/correct)
- **Evidence:** [result-correction.json](evidence/AEVIC-QA-2026-11-05/result-correction.json), [result-correction.png](evidence/AEVIC-QA-2026-11-05/result-correction.png)

## QA-027 — Independent per-round arithmetic

**Status:** Pass · **Area:** Standings · **Role:** Read-only API verification

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Calculate expected placement and kill points without importing application scoring code; compare all 48 rows.
- **Expected:** Every persisted row matches independent calculation.
- **Actual:** Zero mismatches across placement, eliminations, placement points and total points.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-028 — Cumulative rank and tie-break

**Status:** Pass · **Area:** Standings · **Role:** Read-only API verification

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Independently aggregate and sort all 12 teams.
- **Expected:** Totals/rank/WWCD/kill/placement columns agree.
- **Actual:** Zero mismatches; TEST HESABI rank 4, 33 points, WWCD 1; beats 33-point team with WWCD 0.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-029 — Participant performance and map results

**Status:** Pass · **Area:** Standings · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Compare Team Detail metrics with independent inputs.
- **Expected:** 4 rounds, 33 points, 15 eliminations, average placement 5.25.
- **Actual:** UI rank 4, 33 points, 15 eliminations, average 5.3; rounds 18/10/0/5 points.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-030 — Snapshots and movement

**Status:** Pass · **Area:** Standings · **Role:** Read-only API verification

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Read snapshots/movement after final publication.
- **Expected:** Four snapshots and final-round movement consistent with ranks.
- **Actual:** Four snapshots; unchanged final-round ranks agree with independent calculation.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-031 — Five-row preview and full table

**Status:** Pass · **Area:** Standings · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Inspect preview; open full standings.
- **Expected:** Exactly 5 nearby rows, own team highlighted, full 12 teams.
- **Actual:** Preview ranks 2–6 including own rank 4; modal 12 rows.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [team-fourrounds.json](evidence/AEVIC-QA-2026-11-05/team-fourrounds.json), [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json)

## QA-032 — Mobile modal scroll and Escape

**Status:** Pass · **Area:** Standings · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open at 390×500; wheel horizontally/vertically; press Escape.
- **Expected:** All columns/footer reachable; modal closes.
- **Actual:** Table scrollLeft 414; modal scrollTop 117; Escape closed dialog.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [modal-scroll.json](evidence/AEVIC-QA-2026-11-05/modal-scroll.json), [standings-mobile-scroll-x.png](evidence/AEVIC-QA-2026-11-05/standings-mobile-scroll-x.png), [standings-mobile-scroll-y.png](evidence/AEVIC-QA-2026-11-05/standings-mobile-scroll-y.png)

## QA-033 — Preselection and actual PNG

**Status:** Pass · **Area:** Share Studio · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Follow standings download, select full standings, download PNG and inspect image.
- **Expected:** QA data appears in readable exported image.
- **Actual:** PNG completed without download failure; actual image inspected and contains 12 teams with expected scores.
- **URL:** [https://aevic-demo.netlify.app/team/sharecards/?type=leaderboard&tournament=19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/sharecards/?type=leaderboard&tournament=19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [share-studio-download.json](evidence/AEVIC-QA-2026-11-05/share-studio-download.json), [qa-leaderboard.png](evidence/AEVIC-QA-2026-11-05/qa-leaderboard.png)

## QA-034 — Completion persisted

**Status:** Pass · **Area:** Tournament lifecycle · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Select completed in Admin edit, save, reload public API and Team Panel.
- **Expected:** Tournament status completed with all published rounds.
- **Actual:** Backend completed at 15:14:19 AZT; completed Team detail; false save-error tracked separately.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json), [team-responsive-390.png](evidence/AEVIC-QA-2026-11-05/team-responsive-390.png)

## QA-035 — Completed final-place summary

**Status:** Fail · **Area:** Team Panel · **Role:** Participant · **Severity:** Medium

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open completed QA tournament card in /team/tournaments and history.
- **Expected:** Final place #4 with 33 points and 1 WWCD.
- **Actual:** Points/WWCD present but Yekun yer is —. AEVIC-QA-007.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments](https://aevic-demo.netlify.app/team/tournaments)
- **Evidence:** [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json), [completed-history.png](evidence/AEVIC-QA-2026-11-05/completed-history.png)

## QA-036 — Profile text save/reload/restore

**Status:** Pass · **Area:** Team Panel · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Add QA marker to synthetic team bio, save, reload, restore original and reload.
- **Expected:** Persistence and restoration work.
- **Actual:** Both PATCH requests 200; restored=true.
- **URL:** [https://aevic-demo.netlify.app/team/profile](https://aevic-demo.netlify.app/team/profile)
- **Evidence:** [dispute-profile-verification.json](evidence/AEVIC-QA-2026-11-05/dispute-profile-verification.json)

## QA-037 — Image crop/upload and visual restore

**Status:** Pass · **Area:** Team Panel · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Upload labeled QA image, zoom/pan/reset, apply; reload; re-upload original test logo.
- **Expected:** Crop applies, upload persists, original appearance recoverable.
- **Actual:** Zoom 1.1/reset 1; upload 201 and image URL persisted; restoration upload 201. Restored asset has a new URL.
- **URL:** [https://aevic-demo.netlify.app/team/profile](https://aevic-demo.netlify.app/team/profile)
- **Evidence:** [profile-media.json](evidence/AEVIC-QA-2026-11-05/profile-media.json), [profile-crop.png](evidence/AEVIC-QA-2026-11-05/profile-crop.png), [profile-uploaded.png](evidence/AEVIC-QA-2026-11-05/profile-uploaded.png)

## QA-038 — Result objection and admin decision

**Status:** Pass · **Area:** Team Panel · **Role:** Admin + participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Submit QA-only objection; admin rejects with QA note; refresh participant detail.
- **Expected:** Decision persists across roles without changing scores.
- **Actual:** POST 201 pending; PATCH 200 rejected; participant shows decision/note.
- **URL:** [https://aevic-demo.netlify.app/team/disputes/f02330f8-8d1e-4ca9-a6ca-c1b2d9f8c7d0](https://aevic-demo.netlify.app/team/disputes/f02330f8-8d1e-4ca9-a6ca-c1b2d9f8c7d0)
- **Evidence:** [qa-dispute-submitted.json](evidence/AEVIC-QA-2026-11-05/qa-dispute-submitted.json), [dispute-profile-verification.json](evidence/AEVIC-QA-2026-11-05/dispute-profile-verification.json)

## QA-039 — Career totals reflect QA results

**Status:** Pass · **Area:** Team Panel · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Inspect career after publication and compare participant totals.
- **Expected:** Four new matches and 33 points added.
- **Actual:** 66 total matches, 255 kills, 10 WWCD, 511 points (478+33).
- **URL:** [https://aevic-demo.netlify.app/team/career](https://aevic-demo.netlify.app/team/career)
- **Evidence:** [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-040 — Team search positive/empty

**Status:** Pass · **Area:** Admin · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Search nonmatching QA string, then TEST HESABI.
- **Expected:** Zero rows then exactly target row.
- **Actual:** 0 rows then 1 row; no unrelated data modified.
- **URL:** [https://aevic-demo.netlify.app/admin/teams](https://aevic-demo.netlify.app/admin/teams)
- **Evidence:** [admin-controls.json](evidence/AEVIC-QA-2026-11-05/admin-controls.json)

## QA-041 — Audit trail read verification

**Status:** Pass · **Area:** Admin · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open audit after QA result entry and publication.
- **Expected:** QA writes associated with admin actor and target IDs.
- **Actual:** results.save and results.publish entries match QA round IDs and timestamps.
- **URL:** [https://aevic-demo.netlify.app/admin/audit](https://aevic-demo.netlify.app/admin/audit)
- **Evidence:** [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-042 — Localized status labels

**Status:** Fail · **Area:** Admin · **Role:** Admin + participant · **Severity:** Low

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Inspect Admin tournament list and status-oriented panels.
- **Expected:** Azerbaijani UI renders human-readable localized statuses.
- **Actual:** Raw ongoing in tournament list; pending/rejected/other and APPROVED elsewhere. AEVIC-QA-006.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments](https://aevic-demo.netlify.app/admin/tournaments)
- **Evidence:** [panel-scan1.json](evidence/AEVIC-QA-2026-11-05/panel-scan1.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json), [admin_admin_tournaments.png](evidence/AEVIC-QA-2026-11-05/admin_admin_tournaments.png)

## QA-043 — Directory search

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Enter existing tournament name and then nonmatching text.
- **Expected:** Control performs its documented action.
- **Actual:** Matching tournament shown; explicit no-results state on nonmatch.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-044 — Status filter and sort

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Select registration-open filter; reset and choose newest sorting.
- **Expected:** Control performs its documented action.
- **Actual:** Only open QA event under filter; newest ordering places QA event before historical DEMOs.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-045 — Calendar navigation

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Click next calendar month.
- **Expected:** Control performs its documented action.
- **Actual:** Calendar month changes.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-046 — Team directory filters/sort

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Select pending status and team-name sorting.
- **Expected:** Control performs its documented action.
- **Actual:** Status-filter empty state and name ordering observed.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-047 — Follow while logged out

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Click team follow action.
- **Expected:** Control performs its documented action.
- **Actual:** Redirects to login rather than silently following.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-048 — Public share-card download

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Download public TEST HESABI team card and inspect PNG.
- **Expected:** Control performs its documented action.
- **Actual:** Image downloaded and visually inspected.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json)

## QA-049 — Public leaderboard

**Status:** Fail · **Area:** Public website · **Role:** Anonymous · **Severity:** High

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open /leaderboard; retry in anonymous context.
- **Expected:** Leaderboard renders.
- **Actual:** Repeated application 500 screen; usePublicPlatformData must be used inside PublicPlatformProvider. HTML response itself 200. AEVIC-QA-001.
- **URL:** [https://aevic-demo.netlify.app/leaderboard](https://aevic-demo.netlify.app/leaderboard)
- **Evidence:** [leaderboard-console.json](evidence/AEVIC-QA-2026-11-05/leaderboard-console.json), [PUB-leaderboard-retest.png](evidence/AEVIC-QA-2026-11-05/PUB-leaderboard-retest.png)

## QA-050 — Comparison precision

**Status:** Fail · **Area:** Public website · **Role:** Anonymous · **Severity:** Low

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Compare TEST HESABI and DEMO opponent.
- **Expected:** Human-readable rounded average statistics.
- **Actual:** Raw repeating values such as 7.709677419354839 displayed. AEVIC-QA-005.
- **URL:** [https://aevic-demo.netlify.app/teams/compare](https://aevic-demo.netlify.app/teams/compare)
- **Evidence:** [public-interactions.json](evidence/AEVIC-QA-2026-11-05/public-interactions.json), [PUB-team-comparison.png](evidence/AEVIC-QA-2026-11-05/PUB-team-comparison.png)

## QA-051 — Logged-out route guards

**Status:** Pass · **Area:** Security/authorization · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open Admin, Admin results, Team, QA Team Detail and account profile while logged out.
- **Expected:** Protected content unavailable; appropriate login required.
- **Actual:** Redirected to corresponding login routes.
- **URL:** [https://aevic-demo.netlify.app/admin](https://aevic-demo.netlify.app/admin)
- **Evidence:** [auth-boundaries.json](evidence/AEVIC-QA-2026-11-05/auth-boundaries.json)

## QA-052 — Anonymous private APIs

**Status:** Pass · **Area:** Security/authorization · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** GET private context/team/account/admin/notification endpoints without session.
- **Expected:** No private payload; unauthorized response.
- **Actual:** 401 responses with private,no-store; correct room route also 401.
- **URL:** [https://aevic-demo.netlify.app/api/me/context](https://aevic-demo.netlify.app/api/me/context)
- **Evidence:** [anonymous-security.json](evidence/AEVIC-QA-2026-11-05/anonymous-security.json), [round1-public-verification.json](evidence/AEVIC-QA-2026-11-05/round1-public-verification.json)

## QA-053 — Invalid bearer

**Status:** Pass · **Area:** Security/authorization · **Role:** Invalid session

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Send invalid bearer with empty PATCH to QA tournament.
- **Expected:** Reject invalid authentication without modification.
- **Actual:** 401 ACCESS_EXPIRED.
- **URL:** [https://aevic-demo.netlify.app/api/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/api/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [anonymous-security.json](evidence/AEVIC-QA-2026-11-05/anonymous-security.json)

## QA-054 — Participant admin boundary

**Status:** Pass · **Area:** Security/authorization · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** As authenticated captain GET admin context and visit Admin results UI.
- **Expected:** API denies and UI blocks.
- **Actual:** 403 FORBIDDEN; UI /forbidden.
- **URL:** [https://aevic-demo.netlify.app/admin/results](https://aevic-demo.netlify.app/admin/results)
- **Evidence:** [authenticated-security-completion.json](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json)

## QA-055 — Cross-team protected authority read

**Status:** Pass · **Area:** Security/authorization · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** As captain of team 16 GET authorized demo team 870000000002 authority.
- **Expected:** Deny other team protected membership.
- **Actual:** 403 FORBIDDEN.
- **URL:** [https://aevic-demo.netlify.app/api/teams/870000000002/authority](https://aevic-demo.netlify.app/api/teams/870000000002/authority)
- **Evidence:** [authenticated-security-completion.json](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json)

## QA-056 — Cross-team update and registration ownership

**Status:** Pass · **Area:** Security/authorization · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use same participant session and valid Origin; PATCH other demo team with empty body; attempt QA registration for it.
- **Expected:** Ownership check rejects both.
- **Actual:** Both 403 FORBIDDEN. Earlier requests without Origin got ORIGIN_REJECTED and were not treated as ownership proof.
- **URL:** [https://aevic-demo.netlify.app/api/teams/870000000002](https://aevic-demo.netlify.app/api/teams/870000000002)
- **Evidence:** [completed-verification.json](evidence/AEVIC-QA-2026-11-05/completed-verification.json)

## QA-057 — Mismatched tournament/round room IDs

**Status:** Pass · **Area:** Security/authorization · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use QA tournament ID with a round from another DEMO tournament.
- **Expected:** No credentials returned.
- **Actual:** 403 ROOM_NOT_ELIGIBLE, private,no-store.
- **URL:** [https://aevic-demo.netlify.app/api/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5/rounds/866bdff3-b1b7-5ab6-ae99-29107267e9aa/room](https://aevic-demo.netlify.app/api/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5/rounds/866bdff3-b1b7-5ab6-ae99-29107267e9aa/room)
- **Evidence:** [authenticated-security-completion.json](evidence/AEVIC-QA-2026-11-05/authenticated-security-completion.json)

## QA-058 — Public payload privacy

**Status:** Pass · **Area:** Security/authorization · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Recursively inspect public context payload keys for secrets and private contacts.
- **Expected:** No password/token/private-contact fields.
- **Actual:** Sensitive-key scan found none. This is a scoped payload check, not complete security sign-off.
- **URL:** [https://aevic-demo.netlify.app/api/public/context](https://aevic-demo.netlify.app/api/public/context)
- **Evidence:** [public-privacy-scan.json](evidence/AEVIC-QA-2026-11-05/public-privacy-scan.json)

## QA-059 — Keyboard skip link

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** At mobile width press first Tab then Enter.
- **Expected:** Visible skip link moves focus to main content.
- **Actual:** Visible 2px focus outline and main focus observed.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [mobile-keyboard-skip.png](evidence/AEVIC-QA-2026-11-05/mobile-keyboard-skip.png)

## QA-060 — Public document overflow / at 320px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-320.png](evidence/AEVIC-QA-2026-11-05/responsive-home-320.png)

## QA-061 — Public document overflow / at 360px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-360.png](evidence/AEVIC-QA-2026-11-05/responsive-home-360.png)

## QA-062 — Public document overflow / at 390px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-390.png](evidence/AEVIC-QA-2026-11-05/responsive-home-390.png)

## QA-063 — Public document overflow / at 430px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-430.png](evidence/AEVIC-QA-2026-11-05/responsive-home-430.png)

## QA-064 — Public document overflow / at 768px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-768.png](evidence/AEVIC-QA-2026-11-05/responsive-home-768.png)

## QA-065 — Public document overflow / at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-1024.png](evidence/AEVIC-QA-2026-11-05/responsive-home-1024.png)

## QA-066 — Public document overflow / at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-1280.png](evidence/AEVIC-QA-2026-11-05/responsive-home-1280.png)

## QA-067 — Public document overflow / at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/](https://aevic-demo.netlify.app/)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-home-1440.png](evidence/AEVIC-QA-2026-11-05/responsive-home-1440.png)

## QA-068 — Public document overflow /tournaments at 320px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-320.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-320.png)

## QA-069 — Public document overflow /tournaments at 360px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-360.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-360.png)

## QA-070 — Public document overflow /tournaments at 390px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-390.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-390.png)

## QA-071 — Public document overflow /tournaments at 430px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-430.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-430.png)

## QA-072 — Public document overflow /tournaments at 768px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-768.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-768.png)

## QA-073 — Public document overflow /tournaments at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-1024.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-1024.png)

## QA-074 — Public document overflow /tournaments at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-1280.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-1280.png)

## QA-075 — Public document overflow /tournaments at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments](https://aevic-demo.netlify.app/tournaments)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments-1440.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments-1440.png)

## QA-076 — Public document overflow /teams/16 at 320px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-320.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-320.png)

## QA-077 — Public document overflow /teams/16 at 360px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-360.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-360.png)

## QA-078 — Public document overflow /teams/16 at 390px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-390.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-390.png)

## QA-079 — Public document overflow /teams/16 at 430px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-430.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-430.png)

## QA-080 — Public document overflow /teams/16 at 768px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-768.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-768.png)

## QA-081 — Public document overflow /teams/16 at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-1024.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-1024.png)

## QA-082 — Public document overflow /teams/16 at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-1280.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-1280.png)

## QA-083 — Public document overflow /teams/16 at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/teams/16](https://aevic-demo.netlify.app/teams/16)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_teams_16-1440.png](evidence/AEVIC-QA-2026-11-05/responsive-_teams_16-1440.png)

## QA-084 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 320px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-320.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-320.png)

## QA-085 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 360px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-360.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-360.png)

## QA-086 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 390px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-390.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-390.png)

## QA-087 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 430px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-430.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-430.png)

## QA-088 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 768px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-768.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-768.png)

## QA-089 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1024.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1024.png)

## QA-090 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1280.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1280.png)

## QA-091 — Public document overflow /tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5 at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1440.png](evidence/AEVIC-QA-2026-11-05/responsive-_tournaments_19130ea6-8fc0-4bc6-9773-12b1a49de0a5-1440.png)

## QA-092 — Public document overflow /login at 320px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-320.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-320.png)

## QA-093 — Public document overflow /login at 360px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-360.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-360.png)

## QA-094 — Public document overflow /login at 390px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-390.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-390.png)

## QA-095 — Public document overflow /login at 430px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-430.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-430.png)

## QA-096 — Public document overflow /login at 768px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-768.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-768.png)

## QA-097 — Public document overflow /login at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-1024.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-1024.png)

## QA-098 — Public document overflow /login at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-1280.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-1280.png)

## QA-099 — Public document overflow /login at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** Anonymous

- **Preconditions:** Live page; height 900; browser viewport emulation.
- **Actions:** Render actual page at requested width; capture screenshot and measure document scroll width.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440. This checks overflow, not every control or pixel.
- **URL:** [https://aevic-demo.netlify.app/login](https://aevic-demo.netlify.app/login)
- **Evidence:** [responsive.json](evidence/AEVIC-QA-2026-11-05/responsive.json), [responsive-_login-1440.png](evidence/AEVIC-QA-2026-11-05/responsive-_login-1440.png)

## QA-100 — team tournament overflow at 320px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-320.png](evidence/AEVIC-QA-2026-11-05/team-responsive-320.png)

## QA-101 — team tournament overflow at 360px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-360.png](evidence/AEVIC-QA-2026-11-05/team-responsive-360.png)

## QA-102 — team tournament overflow at 390px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-390.png](evidence/AEVIC-QA-2026-11-05/team-responsive-390.png)

## QA-103 — team tournament overflow at 430px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-430.png](evidence/AEVIC-QA-2026-11-05/team-responsive-430.png)

## QA-104 — team tournament overflow at 768px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-768.png](evidence/AEVIC-QA-2026-11-05/team-responsive-768.png)

## QA-105 — team tournament overflow at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-1024.png](evidence/AEVIC-QA-2026-11-05/team-responsive-1024.png)

## QA-106 — team tournament overflow at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-1280.png](evidence/AEVIC-QA-2026-11-05/team-responsive-1280.png)

## QA-107 — team tournament overflow at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** team

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440.
- **URL:** [https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [team-responsive-1440.png](evidence/AEVIC-QA-2026-11-05/team-responsive-1440.png)

## QA-108 — admin tournament overflow at 320px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 320; document 320.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-320.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-320.png)

## QA-109 — admin tournament overflow at 360px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 360; document 360.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-360.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-360.png)

## QA-110 — admin tournament overflow at 390px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 390; document 390.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-390.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-390.png)

## QA-111 — admin tournament overflow at 430px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 430; document 430.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-430.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-430.png)

## QA-112 — admin tournament overflow at 768px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 768; document 768.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-768.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-768.png)

## QA-113 — admin tournament overflow at 1024px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1024; document 1024.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-1024.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-1024.png)

## QA-114 — admin tournament overflow at 1280px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1280; document 1280.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-1280.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-1280.png)

## QA-115 — admin tournament overflow at 1440px

**Status:** Pass · **Area:** Responsive · **Role:** admin

- **Preconditions:** Completed QA tournament; height 900; browser viewport emulation.
- **Actions:** Render completed QA operation/detail page at requested width; capture screenshot and measure.
- **Expected:** Document no wider than viewport.
- **Actual:** Viewport 1440; document 1440.
- **URL:** [https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/admin/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [panel-responsive.json](evidence/AEVIC-QA-2026-11-05/panel-responsive.json), [admin-responsive-1440.png](evidence/AEVIC-QA-2026-11-05/admin-responsive-1440.png)

## QA-116 — Direct Supabase verification

**Status:** Blocked · **Area:** Registration · **Role:** Applicable authorized role

- **Preconditions:** No authorized Supabase connector was exposed; persisted backend API and reload verification used, not direct DB inspection.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** No authorized Supabase connector was exposed; persisted backend API and reload verification used, not direct DB inspection.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-117 — Sixteen authenticated teams / full-capacity rejection

**Status:** Blocked · **Area:** Registration · **Role:** Applicable authorized role

- **Preconditions:** Only 12 approved authorized test teams available; 11 added by supported admin process. No additional authenticated eligible captain available for a full rejection.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Only 12 approved authorized test teams available; 11 added by supported admin process. No additional authenticated eligible captain available for a full rejection.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-118 — Each DEMO account self-registration

**Status:** Blocked · **Area:** Registration · **Role:** Applicable authorized role

- **Preconditions:** Only primary participant and admin sessions available. Database/team rows are not authenticated participant sessions.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Only primary participant and admin sessions available. Database/team rows are not authenticated participant sessions.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-119 — Unregistered captain and ordinary member access

**Status:** Blocked · **Area:** Room management · **Role:** Applicable authorized role

- **Preconditions:** No separate unregistered authorized captain or player/member session available. Anonymous and mismatched-ID checks executed separately.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** No separate unregistered authorized captain or player/member session available. Anonymous and mismatched-ID checks executed separately.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-120 — Correction publication/reversal/recalculation

**Status:** Blocked · **Area:** Results · **Role:** Applicable authorized role

- **Preconditions:** Blocked by AEVIC-QA-003: newly published result cannot load into correction form.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Blocked by AEVIC-QA-003: newly published result cannot load into correction form.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-121 — Corrected result propagation

**Status:** Blocked · **Area:** Share Studio · **Role:** Applicable authorized role

- **Preconditions:** No correction can be saved through supported UI; blocked by AEVIC-QA-003.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** No correction can be saved through supported UI; blocked by AEVIC-QA-003.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-122 — Five-row top/bottom own-team edge cases

**Status:** Blocked · **Area:** Standings · **Role:** Applicable authorized role

- **Preconditions:** Authenticated primary team finished in middle; no other captain identities. Did not falsify standings just to reach edge positions.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Authenticated primary team finished in middle; no other captain identities. Did not falsify standings just to reach edge positions.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-123 — Mass announcement send

**Status:** Blocked · **Area:** Admin · **Role:** Applicable authorized role

- **Preconditions:** Admin composer broadcasts to all teams; prohibited by scope because unrelated users may be notified.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Admin composer broadcasts to all teams; prohibited by scope because unrelated users may be notified.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-124 — Global settings / admin invitations / roles

**Status:** Blocked · **Area:** Admin · **Role:** Applicable authorized role

- **Preconditions:** Configuration and security changes explicitly prohibited; inspected only.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Configuration and security changes explicitly prohibited; inspected only.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-125 — Bulk real team approval / legacy ownership decisions

**Status:** Blocked · **Area:** Admin · **Role:** Applicable authorized role

- **Preconditions:** Only available pending applications/claims concern pre-existing records; not QA-created resources.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Only available pending applications/claims concern pre-existing records; not QA-created resources.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-126 — Manager/player invitations and transfer/archive/leave

**Status:** Blocked · **Area:** Team Panel · **Role:** Applicable authorized role

- **Preconditions:** No authorized recipient test identity; ownership/security or unrelated team state could change. Inspected controls/empty states only.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** No authorized recipient test identity; ownership/security or unrelated team state could change. Inspected controls/empty states only.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-127 — Password, MFA, recovery-code changes / account deactivation

**Status:** Blocked · **Area:** Authentication · **Role:** Applicable authorized role

- **Preconditions:** Changes to account/security settings prohibited. Read-only account review only.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Changes to account/security settings prohibited. Read-only account review only.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-128 — Revoke other existing sessions

**Status:** Blocked · **Area:** Authentication · **Role:** Applicable authorized role

- **Preconditions:** Sessions belong to existing user activity; no authority to terminate unrelated sessions.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** Sessions belong to existing user activity; no authority to terminate unrelated sessions.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-129 — Email/push notification delivery

**Status:** Blocked · **Area:** Team Panel · **Role:** Applicable authorized role

- **Preconditions:** UI labels external delivery service requirement; no safe authorized email/push end-to-end delivery exercised.
- **Actions:** Inspect prerequisites and available controls/tools; do not execute unsafe or unavailable branch.
- **Expected:** Execute with authorized safe test identities/environment.
- **Actual:** UI labels external delivery service requirement; no safe authorized email/push end-to-end delivery exercised.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [account-final-scan.json](evidence/AEVIC-QA-2026-11-05/account-final-scan.json), [panel-scan2.json](evidence/AEVIC-QA-2026-11-05/panel-scan2.json)

## QA-130 — Before-registration-open lifecycle

**Status:** Not Tested · **Area:** Registration · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** QA tournament used already-open registration dates; no future-open registration scenario executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-131 — Duplicate registration server response and join feedback

**Status:** Not Tested · **Area:** Registration · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Repeated UI attempts and one persisted entry observed, but definitive duplicate rejection/status and clean success feedback not captured.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-132 — Ineligible roster / banned team rejection

**Status:** Not Tested · **Area:** Registration · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** No safe eligible-to-ineligible QA-only roster or ban transition executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-133 — Reject and withdraw QA participation

**Status:** Not Tested · **Area:** Registration · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Approval and assignment tested; rejection/withdrawal branch not executed before results.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-134 — Server duplicate/late check-in and admin override/reversal

**Status:** Not Tested · **Area:** Check-in · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** UI duplicate suppression tested; direct duplicate/late POST and admin override not executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-135 — Clipboard copy, 60-second lease, account-switch race

**Status:** Not Tested · **Area:** Room management · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Mask/reveal/round-switch and closed-state checks executed; clipboard and precise lease/race scenarios not measured.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-136 — Nonzero penalty and duplicate-placement publication rejection

**Status:** Not Tested · **Area:** Results · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Zero penalties used. Duplicate placement saved in draft, then corrected before publish; publication rejection for duplicate placements not tested.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-137 — All deeper tie-break combinations

**Status:** Not Tested · **Area:** Standings · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** WWCD tie-break exercised; equal-WWCD/placement/kill final-match and complete ties not independently constructed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-138 — Roster change request/create/review/cancel

**Status:** Not Tested · **Area:** Team Panel · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Roster displayed and existing request inspected; no new QA roster replacement request executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-139 — Preferences persistence and featured badge editing

**Status:** Not Tested · **Area:** Team Panel · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Read-only settings/achievement inspection; preference and badge mutations not executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-140 — All archive/records/organization/wrapped interactive branches

**Status:** Not Tested · **Area:** Public website · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Routes inventoried and main pages read; not every drill-down, chart control, or export executed.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-141 — Support filter persistence and ticket reply lifecycle

**Status:** Not Tested · **Area:** Admin · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Filter changed but final async filtered result not conclusively captured; no QA support-ticket create/reply cycle.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-142 — Every route/control at every width; complete accessibility audit

**Status:** Not Tested · **Area:** Responsive · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** 56 page-width overflow checks and selected screenshots/modal/keyboard checks executed; not an exhaustive WCAG/touch-target review.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-143 — Token expiry renewal / concurrent stale-response race

**Status:** Not Tested · **Area:** Security/authorization · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Invalid token and session separation tested; actual expiry/refresh races not forced.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-144 — Full RLS/storage/security assessment

**Status:** Not Tested · **Area:** Security/authorization · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** No direct Supabase access, exhaustive privilege matrix, or security configuration changes.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-145 — Load capacity / browser-device matrix

**Status:** Not Tested · **Area:** Responsive · **Role:** Applicable role

- **Preconditions:** Additional controlled QA execution needed.
- **Actions:** No conclusive execution of this branch.
- **Expected:** Branch executes with expected state, validation and persistence.
- **Actual:** Only safe concurrent reads and Chromium lab samples; no load/stress test or Safari/Firefox/physical-device campaign.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** No executed result for this branch; see stated blocker or limitation.

## QA-146 — History map filter

**Status:** Pass · **Area:** Team Panel · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Select Miramar tab on Team match history.
- **Expected:** Only Miramar rows remain.
- **Actual:** 24 rows, unique map value Miramar.
- **URL:** [https://aevic-demo.netlify.app/team/history](https://aevic-demo.netlify.app/team/history)
- **Evidence:** [team-controls-verified.json](evidence/AEVIC-QA-2026-11-05/team-controls-verified.json)

## QA-147 — QA notification mark-read persistence

**Status:** Pass · **Area:** Team Panel · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Mark QA objection notification read; reload.
- **Expected:** Read state and unread counter persist.
- **Actual:** 204; unread 14 to 13; targeted read action removed after reload. Two QA notifications marked read across testing; unrelated notifications untouched.
- **URL:** [https://aevic-demo.netlify.app/team/notifications](https://aevic-demo.netlify.app/team/notifications)
- **Evidence:** [team-controls-verified.json](evidence/AEVIC-QA-2026-11-05/team-controls-verified.json)

## QA-148 — Tournament preselection after refresh

**Status:** Pass · **Area:** Share Studio · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Reload QA leaderboard studio and wait for rendered controls.
- **Expected:** Selected QA tournament and scores remain.
- **Actual:** QA title and official standings restored. Initial earlier capture during loading was inconclusive and superseded.
- **URL:** [https://aevic-demo.netlify.app/team/sharecards/?type=leaderboard&tournament=19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/team/sharecards/?type=leaderboard&tournament=19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [team-controls-verified.json](evidence/AEVIC-QA-2026-11-05/team-controls-verified.json)

## QA-149 — Participant logout and protected-access termination

**Status:** Pass · **Area:** Authentication · **Role:** Participant

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use account menu logout, revisit protected route, request private context.
- **Expected:** Session ends and private access denied.
- **Actual:** Participant redirected to corresponding login; private API 401 UNAUTHORIZED, private,no-store.
- **URL:** [https://aevic-demo.netlify.app/team](https://aevic-demo.netlify.app/team)
- **Evidence:** [logout-final.json](evidence/AEVIC-QA-2026-11-05/logout-final.json)

## QA-150 — Admin logout and protected-access termination

**Status:** Pass · **Area:** Authentication · **Role:** Admin

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Use account menu logout, revisit protected route, request private context.
- **Expected:** Session ends and private access denied.
- **Actual:** Admin redirected to corresponding login; private API 401 UNAUTHORIZED, private,no-store.
- **URL:** [https://aevic-demo.netlify.app/admin](https://aevic-demo.netlify.app/admin)
- **Evidence:** [logout-final.json](evidence/AEVIC-QA-2026-11-05/logout-final.json)

## QA-151 — Published round tabs

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Select each of four public result tabs; wait for settled 12-row data.
- **Expected:** Each round shows its published scores.
- **Actual:** 12 rows per round; TEST HESABI totals 18, 10, 0, 5. Initial asynchronous snapshots superseded by settled evidence.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [public-round-tabs-settled.json](evidence/AEVIC-QA-2026-11-05/public-round-tabs-settled.json)

## QA-152 — Completed public standings and recap

**Status:** Pass · **Area:** Public website · **Role:** Anonymous

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open completed QA detail and Final icmalı; compare against independent totals.
- **Expected:** Final standings and aggregate recap agree.
- **Actual:** 12 ranked teams; champion DEMO Rəqib 01, 64 points; recap 171 kills, 4 WWCD, 4 matches; participant rank 4 / 33 points.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5/recap](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5/recap)
- **Evidence:** [final-public.json](evidence/AEVIC-QA-2026-11-05/final-public.json), [scoring-verification.json](evidence/AEVIC-QA-2026-11-05/scoring-verification.json)

## QA-153 — Completed registration CTA

**Status:** Fail · **Area:** Public website · **Role:** Anonymous · **Severity:** Medium

- **Preconditions:** Dedicated QA tournament and authorized test sessions; no unrelated data changes.
- **Actions:** Open completed QA tournament while logged out.
- **Expected:** Closed competition offers results/status, without promising registration.
- **Actual:** TAMAMLANIB and closed registration copy appear beside active Daxil ol və qoşul link. AEVIC-QA-008.
- **URL:** [https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5](https://aevic-demo.netlify.app/tournaments/19130ea6-8fc0-4bc6-9773-12b1a49de0a5)
- **Evidence:** [final-public.json](evidence/AEVIC-QA-2026-11-05/final-public.json), [public-round-tabs.json](evidence/AEVIC-QA-2026-11-05/public-round-tabs.json)
