# Route handoff status

Authoritative conservative status at safe handoff. COMPLETE requires all intended actions, authorization, states, responsive behavior and persistence verified. PARTIAL means implemented work exists but full sign-off remains. NOT VERIFIED means no sufficient route-level functional sign-off. NOT IMPLEMENTED requires a confirmed absent implementation, not merely missing evidence. No route is asserted wholly absent; no route receives full COMPLETE sign-off at handoff.

Counts: COMPLETE: 0, PARTIAL: 40, NOT IMPLEMENTED: 0, NOT VERIFIED: 59.

| Route | Family | Status |
|---|---|---|
| `/activate-legacy` | AUTH | NOT VERIFIED |
| `/account/legacy-claim` | ACCOUNT | NOT VERIFIED |
| `/admin/legacy-claims` | ADMIN | NOT VERIFIED |
| `/team/profile` | TEAM | PARTIAL |
| `/team/career` | TEAM | PARTIAL |
| `/` | PUBLIC | NOT VERIFIED |
| `/tournaments` | PUBLIC | NOT VERIFIED |
| `/tournaments/:tournamentId/recap` | PUBLIC | PARTIAL |
| `/tournaments/:tournamentId` | PUBLIC | NOT VERIFIED |
| `/leaderboard` | PUBLIC | NOT VERIFIED |
| `/regulations` | PUBLIC | NOT VERIFIED |
| `/contact` | PUBLIC | NOT VERIFIED |
| `/privacy` | PUBLIC | NOT VERIFIED |
| `/terms` | PUBLIC | NOT VERIFIED |
| `/support` | PUBLIC | NOT VERIFIED |
| `/organizations` | PUBLIC | NOT VERIFIED |
| `/organizations/:organizationSlug` | PUBLIC | NOT VERIFIED |
| `/records` | PUBLIC | NOT VERIFIED |
| `/records/:recordId` | PUBLIC | PARTIAL |
| `/teams` | PUBLIC | PARTIAL |
| `/teams/compare` | PUBLIC | PARTIAL |
| `/teams/:teamSlug/share-card` | PUBLIC | PARTIAL |
| `/teams/:teamSlug` | PUBLIC | PARTIAL |
| `/matches` | PUBLIC | NOT VERIFIED |
| `/matches/:matchId` | PUBLIC | NOT VERIFIED |
| `/search` | PUBLIC | NOT VERIFIED |
| `/following` | PUBLIC | NOT VERIFIED |
| `/archive` | PUBLIC | NOT VERIFIED |
| `/403` | SYSTEM | NOT VERIFIED |
| `/500` | SYSTEM | NOT VERIFIED |
| `/maintenance` | SYSTEM | NOT VERIFIED |
| `/offline` | SYSTEM | NOT VERIFIED |
| `*` | SYSTEM | NOT VERIFIED |
| `/teams/:teamSlug/wrapped/:year` | PUBLIC | PARTIAL |
| `/login` | AUTH | NOT VERIFIED |
| `/register` | AUTH | PARTIAL |
| `/forgot-password` | AUTH | NOT VERIFIED |
| `/reset-password` | AUTH | NOT VERIFIED |
| `/verify-email` | AUTH | NOT VERIFIED |
| `/unauthorized` | SYSTEM | NOT VERIFIED |
| `/session-expired` | SYSTEM | NOT VERIFIED |
| `/account-locked` | SYSTEM | NOT VERIFIED |
| `/too-many-attempts` | SYSTEM | NOT VERIFIED |
| `/forbidden` | SYSTEM | NOT VERIFIED |
| `/admin/login` | AUTH | NOT VERIFIED |
| `/team` | TEAM | PARTIAL |
| `/team/tournaments` | TEAM | PARTIAL |
| `/team/tournaments/:tournamentId` | TEAM | PARTIAL |
| `/team/history` | TEAM | PARTIAL |
| `/team/comparison` | TEAM | PARTIAL |
| `/team/roster` | TEAM | PARTIAL |
| `/team/messages` | TEAM | PARTIAL |
| `/team/notifications` | TEAM | PARTIAL |
| `/team/roster-requests` | TEAM | PARTIAL |
| `/team/roster-requests/:requestId` | TEAM | PARTIAL |
| `/team/disputes` | TEAM | PARTIAL |
| `/team/disputes/new` | TEAM | PARTIAL |
| `/team/disputes/:disputeId` | TEAM | PARTIAL |
| `/team/sharecards` | TEAM | PARTIAL |
| `/team/badges` | TEAM | PARTIAL |
| `/team/badges/:badgeId` | TEAM | PARTIAL |
| `/team/invitations` | TEAM | PARTIAL |
| `/team/settings/managers` | TEAM | PARTIAL |
| `/team/verification` | TEAM | PARTIAL |
| `/team/organization/:organizationSlug` | TEAM | PARTIAL |
| `/team/settings` | TEAM | PARTIAL |
| `/admin` | ADMIN | NOT VERIFIED |
| `/admin/tournaments` | ADMIN | NOT VERIFIED |
| `/admin/tournaments/new` | ADMIN | NOT VERIFIED |
| `/admin/tournaments/:tournamentId` | ADMIN | NOT VERIFIED |
| `/admin/tournaments/:tournamentId/lifecycle` | ADMIN | NOT VERIFIED |
| `/admin/check-ins/missed` | ADMIN | NOT VERIFIED |
| `/admin/teams` | ADMIN | NOT VERIFIED |
| `/admin/teams/:teamId` | ADMIN | NOT VERIFIED |
| `/admin/organizations` | ADMIN | NOT VERIFIED |
| `/admin/results` | ADMIN | NOT VERIFIED |
| `/admin/results/:resultId/correct` | ADMIN | NOT VERIFIED |
| `/admin/messages` | ADMIN | PARTIAL |
| `/admin/blacklist` | ADMIN | NOT VERIFIED |
| `/admin/roster-requests` | ADMIN | NOT VERIFIED |
| `/admin/roster-requests/:requestId` | ADMIN | PARTIAL |
| `/admin/disputes` | ADMIN | NOT VERIFIED |
| `/admin/disputes/:disputeId` | ADMIN | PARTIAL |
| `/admin/players/:playerId` | ADMIN | PARTIAL |
| `/admin/verifications` | ADMIN | NOT VERIFIED |
| `/admin/verifications/:verificationId` | ADMIN | PARTIAL |
| `/admin/support` | ADMIN | NOT VERIFIED |
| `/admin/audit` | ADMIN | NOT VERIFIED |
| `/admin/users` | ADMIN | NOT VERIFIED |
| `/admin/settings` | ADMIN | NOT VERIFIED |
| `/account` | ACCOUNT | NOT VERIFIED |
| `/account/profile` | ACCOUNT | PARTIAL |
| `/account/security` | ACCOUNT | NOT VERIFIED |
| `/account/notifications` | ACCOUNT | NOT VERIFIED |
| `/account/sessions` | ACCOUNT | NOT VERIFIED |
| `/account/player/claim/:playerId` | ACCOUNT | PARTIAL |
| `/account/support/tickets` | ACCOUNT | NOT VERIFIED |
| `/account/support/tickets/new` | ACCOUNT | PARTIAL |
| `/account/support/tickets/:ticketId` | ACCOUNT | PARTIAL |
