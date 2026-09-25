# Isolated browser verification — September 25

This is progress evidence, not full route sign-off. Production has not been changed.

- Fresh local PostgreSQL database `aevic_completion_qa2` uses all current migrations and synthetic captain/admin accounts. All mail credentials are disabled in the test server.
- Actual Chrome UI login succeeded for captain and administrator. Browser walkthrough captured 202 cells across 74 unique static routes. Captain/account pages used 1440, 768, 375 and 320 px; other routes used 1440 and 375 px. No document horizontal overflow was measured. Complete interactive states and visual review remain pending.
- Capture script, screenshots, geometry and API error ledger: `/tmp/aevic-completion-qa2/walkthrough.mjs` and `/tmp/aevic-completion-qa2/report.json`.
- Signed-out `/following` initially made unauthorized private-inbox calls. Fixed with session-aware sign-in state; verified zero private-inbox calls in a subsequent browser run. Added real team profile links and persistent unfollow controls, including failure retention.
- `/team/verification` returns 404 when no request exists. The adapter explicitly maps that response to an absent request and displays the application form. These recorded responses are expected empty-state transport, not server failures.
- Tournament creation, draft → published → registration-open succeeded through actual browser forms. Evidence: `/tmp/aevic-completion-qa2/tournament.json`, `tournament-flow.log`, `tournament-created-desktop.png`. Following fix evidence: `following-signed-out-fixed.png` in the same directory.
- The first tournament workflow attempt timed out because the harness used an exact label matcher that included native select option text. Corrected to a combobox accessible-name matcher and reran successfully. No application error was suppressed.
- Fixed editor lifecycle choices (including ongoing/completed), snapshot refresh, accurate draft creation label, and per-round room release ten minutes before scheduled time. Terminal-state protection remains enforced. Ongoing/completed browser transitions still need testing with populated competition data.

Next: dynamic routes with representative records, all 23 captain routes including overlays and mutations, remaining inert controls (notably administrator slot/check-in assignment), populated end-to-end result/check-in/dispute/support workflows, complete visual QA, production migration rehearsal and deployment.

## Populated tournament and follow workflows

- Expanded tournament browser flow passed team assignment, audited attendance correction, occupied-slot filter and 375px populated layout. Corrected actual inaccessible toolbar label, stale registration subview and compressed slot geometry found during the run.
- Real follow/unfollow flow passed with an isolated captain, including reload persistence and profile navigation from the following list. See `follow-flow.json` and `following-populated-mobile.png` in the evidence directory.
- These are additional behavioral checks, not full sign-off of every action on the involved routes.

## Result entry and season summary

Actual administrator UI advanced the synthetic tournament to ongoing and saved/published three rounds. Public Wrapped returned three matches and twelve kills, retained the incomplete-history flag, and rendered the summary. Mobile navigation and PNG download passed in `wrapped-flow.mjs`; the exported image was opened and visually checked. The fourth round remains unpublished for further workflow verification. No original production team was used.

## Private support, profile cards, identity and final tournament state

Support image upload/download, anonymous denial, staff/captain replies and closure passed in actual browser UI. Dispute/roster rejection decisions persisted and terminal controls disappeared. Public profile cards exported all three formats with incomplete-history disclosure. See `support-flow.json`, `reviews-card-flow.json`, and `card-export-flow.json` under `/tmp/aevic-completion-qa2`.

The fourth synthetic round was subsequently published; player claim submission/approval, team verification approval, tournament completion, winner recap and record detail passed (`identity-recap-flow.json`). Current synthetic tournament is completed; earlier pending/ongoing mutation scripts must not be rerun without adapting their fixtures. These checks do not certify every remaining route action/state. Production was not used.
