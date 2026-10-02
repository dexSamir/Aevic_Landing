# Current route acceptance — 2026-10-02

99 source routes: **11 COMPLETE, 88 PARTIAL, 0 BLOCKED, 0 NOT VERIFIED**. COMPLETE applies to ten system/access states and the public Support FAQ and their relevant behavior, not to production readiness. All other routes have desktop/mobile fixture-backed rendering evidence; a successful heading or HTTP response does not complete their functional acceptance.

Phase 2 persisted account/support/security evidence is recorded in [progress](../completion/PHASE2_PROGRESS.md). Legal/rules/contact pages passed layout/navigation checks but remain partial pending content/configuration acceptance.

See [final audit](../completion/FINAL_QUALITY_AUDIT.md), [machine-readable acceptance](../completion/routes.json), and [measurements](../quality/route-measurements.json). Historical source-optimization claims below are not functional acceptance and old backend-availability notes are superseded by the final audit.

| Route | Acceptance | Evidence boundary |
| --- | --- | --- |
| `/activate-legacy` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/legacy-claim` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/legacy-claims` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/profile` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/career` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/tournaments` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/tournaments/:tournamentId/recap` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/tournaments/:tournamentId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/leaderboard` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/regulations` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/contact` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/privacy` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/terms` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/support` | COMPLETE | Real application: FAQ filter/reset/empty, keyboard disclosures, guest ticket boundary, reload/back, seven widths, 200% text, axe |
| `/organizations` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/organizations/:organizationSlug` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/records` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/records/:recordId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/teams` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/teams/compare` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/teams/:teamSlug/share-card` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/teams/:teamSlug` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/matches` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/matches/:matchId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/search` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/following` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/archive` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/403` | COMPLETE | System-state acceptance |
| `/500` | COMPLETE | System-state acceptance |
| `/maintenance` | COMPLETE | System-state acceptance |
| `/offline` | COMPLETE | System-state acceptance |
| `*` | COMPLETE | System-state acceptance |
| `/teams/:teamSlug/wrapped/:year` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/login` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/register` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/forgot-password` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/reset-password` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/verify-email` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/unauthorized` | COMPLETE | System-state acceptance |
| `/session-expired` | COMPLETE | System-state acceptance |
| `/account-locked` | COMPLETE | System-state acceptance |
| `/too-many-attempts` | COMPLETE | System-state acceptance |
| `/forbidden` | COMPLETE | System-state acceptance |
| `/admin/login` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/tournaments` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/tournaments/:tournamentId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/history` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/comparison` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/roster` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/messages` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/notifications` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/roster-requests` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/roster-requests/:requestId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/disputes` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/disputes/new` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/disputes/:disputeId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/sharecards` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/badges` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/badges/:badgeId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/invitations` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/settings/managers` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/verification` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/organization/:organizationSlug` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/team/settings` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/tournaments` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/tournaments/new` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/tournaments/:tournamentId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/tournaments/:tournamentId/lifecycle` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/check-ins/missed` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/teams` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/teams/:teamId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/organizations` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/results` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/results/:resultId/correct` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/messages` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/blacklist` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/roster-requests` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/roster-requests/:requestId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/disputes` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/disputes/:disputeId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/players/:playerId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/verifications` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/verifications/:verificationId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/support` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/audit` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/users` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/admin/settings` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/profile` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/security` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/notifications` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/sessions` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/player/claim/:playerId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/support/tickets` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/support/tickets/new` | PARTIAL | Rendered smoke; complete workflow acceptance pending |
| `/account/support/tickets/:ticketId` | PARTIAL | Rendered smoke; complete workflow acceptance pending |

---

## Historical performance coverage (superseded status)

# Route optimization coverage — current

**99/99 routes optimized through direct or shared frontend changes.** The former 66 blocked routes have all been reviewed and optimized without requiring backend changes. **33 routes** were in the previous optimized category; **66 routes** are the requested source-analysis follow-up. Backend availability is recorded separately.

The previous build had 198 desktop/mobile route checks. **No new browser or route-level tests were run for this follow-up, for any of the 99 routes.** Previous browser results do not verify the new changes. Current validation is client/server TypeScript, production build, static import/asset checks and packaging policy. Some improvements are shared CSS/media changes rather than unique edits on every route. Backend features, 501 responses and capability flags remain unchanged.

| Route | Verification category | Frontend optimization basis | Existing backend limitation |
| --- | --- | --- | --- |
| `/activate-legacy` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Legacy claiming backend is not mounted; production fallback returns 501. |
| `/account/legacy-claim` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Legacy claiming backend is not mounted; production fallback returns 501. |
| `/admin/legacy-claims` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/team/profile` | Previously browser-tested; further source/build changes | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | No new backend availability claim; see first-pass limitations. |
| `/team/career` | 66-route follow-up; source/build analysis | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/tournaments` | 66-route follow-up; source/build analysis | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/tournaments/:tournamentId/recap` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/tournaments/:tournamentId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/leaderboard` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/regulations` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/contact` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/privacy` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/terms` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/support` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/organizations` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/organizations/:organizationSlug` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/records` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/records/:recordId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/teams` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/teams/compare` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/teams/:teamSlug/share-card` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/teams/:teamSlug` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/matches` | 66-route follow-up; source/build analysis | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/matches/:matchId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/search` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/following` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Follow backend is not mounted; production fallback returns 501. |
| `/archive` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Production public context marks competition/organization data unavailable; only unavailable state is live. |
| `/403` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/500` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/maintenance` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/offline` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `*` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/teams/:teamSlug/wrapped/:year` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/login` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/register` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/forgot-password` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/reset-password` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/verify-email` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Verification/resend backend is not mounted in the original captain contract. |
| `/unauthorized` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/session-expired` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/account-locked` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/too-many-attempts` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/forbidden` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/admin/login` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/team` | Previously browser-tested; further source/build changes | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | No new backend availability claim; see first-pass limitations. |
| `/team/tournaments` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/tournaments/:tournamentId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/history` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/team/comparison` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/roster` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/team/messages` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/notifications` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/roster-requests` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/roster-requests/:requestId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/disputes` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/disputes/new` | 66-route follow-up; source/build analysis | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/disputes/:disputeId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/sharecards` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/badges` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/badges/:badgeId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/invitations` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/settings/managers` | 66-route follow-up; source/build analysis | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/verification` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/organization/:organizationSlug` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Original public.teams provider gates this route; required competition/account service is not connected. |
| `/team/settings` | Previously browser-tested; further source/build changes | Existing lazy page retained; shared CSS, upload thumbnails and workspace dependencies reduced. | No new backend availability claim; see first-pass limitations. |
| `/admin` | 66-route follow-up; source/build analysis | Capability gate retained; shared shell/CSS reduced; admin dependencies remain deferred. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/tournaments` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/tournaments/new` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/tournaments/:tournamentId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/tournaments/:tournamentId/lifecycle` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/check-ins/missed` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/teams` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/teams/:teamId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/organizations` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/results` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/results/:resultId/correct` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/messages` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/blacklist` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/roster-requests` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/roster-requests/:requestId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/disputes` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/disputes/:disputeId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/players/:playerId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/verifications` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/verifications/:verificationId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/support` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/audit` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/users` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/admin/settings` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | adminWorkspace=false; original production backend has no admin contract. |
| `/account` | Previously browser-tested; further source/build changes | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | No new backend availability claim; see first-pass limitations. |
| `/account/profile` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/account/security` | Previously browser-tested; further source/build changes | Dedicated page entry; shared CSS/media delivery reduction. | No new backend availability claim; see first-pass limitations. |
| `/account/notifications` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |
| `/account/sessions` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |
| `/account/player/claim/:playerId` | 66-route follow-up; source/build analysis | Shared initial CSS reduced; existing lazy boundary retained; image delivery optimized where used. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |
| `/account/support/tickets` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |
| `/account/support/tickets/new` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |
| `/account/support/tickets/:ticketId` | 66-route follow-up; source/build analysis | Dedicated page entry; shared CSS/media delivery reduction. | Required account endpoint is not mounted; production fallback returns 501 (revoke-other-sessions remains supported). |

## 2026-10-02 continuation evidence

Broad suite completed: 77 passed, 19 failed, 32 skipped. Home calendar target/keyboard/200% text matrix passed after narrow-panel fix. This does not complete Home acceptance. Production catalog read recovered, but release schema/config compatibility remains UNVERIFIED. No route promotions. All 19 originally failing cases subsequently passed focused reruns; this is not a new full-suite pass. Logout/component regressions: 26 passed. See `../quality/phase2-browser-failures.json`.
