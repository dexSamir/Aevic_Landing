# AEVIC route inventory

This inventory lists actual route-level pages. Lazy routes are code-split. Protected routes still require backend authorization in production; mock access is only a labeled demonstration.

## Public

- `/`, `/tournaments`, `/tournaments/:tournamentId`, `/tournaments/:tournamentId/recap`
- `/teams`, `/teams/compare`, `/teams/:teamSlug`, `/teams/:teamSlug/share-card`, `/teams/:teamSlug/wrapped/:year`
- `/players`, `/players/:playerSlug`, `/organizations`, `/organizations/:organizationSlug`
- `/matches`, `/matches/:matchId`, `/leaderboard`, `/records`, `/archive`
- Legacy `/records/:recordId` links redirect to `/records?record=:recordId#record-detail`; record evidence now opens inline within the Records Center.
- `/search?q=`, `/following`, `/regulations`, `/support`, `/contact`, `/privacy`, `/terms`

## Auth and account

- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/admin/login`
- `/unauthorized`, `/session-expired`, `/account-locked`, `/too-many-attempts`, `/forbidden`
- `/account/profile`, `/account/security`, `/account/notifications`, `/account/sessions`
- `/account/player/claim/:playerId`
- `/account/support/tickets`, `/account/support/tickets/new`, `/account/support/tickets/:ticketId`

## Team / player operations

- `/team`, `/team/tournaments`, `/team/tournaments/:tournamentId`, `/team/history`, `/team/comparison`
- `/team/roster`, `/team/roster-requests`, `/team/roster-requests/:requestId`
- `/team/messages`, `/team/notifications`, `/team/disputes`, `/team/disputes/new`, `/team/disputes/:disputeId`
- `/team/sharecards`, `/team/badges`, `/team/badges/:badgeId`, `/team/invitations`, `/team/settings/managers`, `/team/verification`
- `/team/organization/:organizationSlug`, `/team/settings`

## Admin

- `/admin`, `/admin/tournaments`, `/admin/tournaments/new`, `/admin/tournaments/:tournamentId`, `/admin/tournaments/:tournamentId/lifecycle`
- `/admin/teams`, `/admin/teams/:teamId`, `/admin/organizations`, `/admin/players/:playerId`, `/admin/verifications`, `/admin/verifications/:verificationId`
- `/admin/results`, `/admin/results/:resultId/correct`, `/admin/roster-requests`, `/admin/roster-requests/:requestId`
- `/admin/check-ins/missed`
- `/admin/disputes`, `/admin/disputes/:disputeId`, `/admin/messages`, `/admin/blacklist`, `/admin/support`
- `/admin/audit`, `/admin/users`, `/admin/settings`

## System

- `/403`, `/500`, `/maintenance`, `/offline`, and the catch-all not-found route
