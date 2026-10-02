# Canonical data ownership — current mounted platform

Verified from `server/app.ts`, the platform repository and mutation handlers on 2026-10-01. The normalized compatibility test app is not the production router. No schema migration or production write was performed in this pass.

| Concept | Authoritative source / rule |
| --- | --- |
| Team ID, name, logo, tier | `public.teams.id`, `team_name`, `logo_url`, `tier`; retain original numeric IDs |
| Team public profile extensions | `aevic_platform.team_details` (description, tag, banner, country, social links) |
| Team status / competition approval | `public.teams.status`; competition eligibility still requires the appropriate approval |
| Directory visibility | `pending` or `approved`, excluding `team_details.archived_at`; no account/claim join. Rejected/banned teams remain excluded from guest discovery |
| Workspace/admin inspection | Existing actor-scoped exceptions allow a captain to inspect their team and administrators to moderate hidden teams; never infer public eligibility from this view |
| Roster display identity | Original `public.teams.playerN_ign` / photo columns |
| Player UID and roster role | `aevic_platform.player_details`; a roster-slot display ID is not an independent authenticated player account |
| Captain/account ownership | `aevic_platform.team_authority`; ownership/selected workspace revalidated server-side |
| Account identity | `aevic_platform.accounts`; original accounts reference original credentials, standalone accounts use private credential storage |
| Signed session identity | Original signed cookie contract plus private platform session revocation/MFA state; never a public team lookup |
| Organization | Existing `aevic.organizations` |
| Organization membership | `aevic_platform.organization_teams`; invitations require acceptance/current authority |
| Tournament / schedule / room | Existing `aevic.tournaments`, `aevic.matches`, `aevic.match_rooms`; room access remains protected |
| Tournament registration / roster lock | `aevic_platform.tournament_registrations`; eligibility is separate from directory visibility |
| Check-in | `aevic_platform.check_ins` |
| Match results | `aevic_platform.team_match_results`; public reads require publication and public tournament/match state |
| Standing | Published results and immutable `aevic_platform.leaderboard_snapshots`; no invented legacy totals |
| Badge progress | Derived from published match history; definitions in `server/services/identity.ts` |
| Featured badges | `aevic_platform.featured_achievements` |
| Notifications | `aevic_platform.notifications` with account/workspace recipient scoping |
| Announcement read state | `aevic_platform.message_reads` scoped to account; announcements in platform messages |
| Disputes | `aevic_platform.disputes`; private evidence remains protected |
| Verification | `aevic_platform.verification_requests`; approval status is not a verification badge |
| Moderation | `aevic_platform.sanctions` and explicit team status; timed expiry handling remains active |
| Audit | `aevic_platform.audit_events`; security events are separate from operational request logs |

## Directory defect and regression boundary

All seven originals were `pending` in the read-only production inspection. The former query was `approved OR current team OR administrator`; it returned zero for a guest and could return only team 16 to its signed-in captain. No account join or frontend search removed the other six: they were filtered out in `PlatformRepository.readTeams` before serialization.

The corrected public predicate includes pending identities without granting competition approval. No IDs, passwords, logos, rosters, statuses or account mappings were changed. An isolated database regression includes an unclaimed pending identity, approved, rejected, banned and archived identities, owner inspection and guest private-read rejection. The legacy Data API reader applies the same status allowlist.

Public endpoints serialize explicit public projections. Public identity existence never proves ownership. Sitemap generation constructs a guest repository even when requested with an administrator cookie. Future writes must use the authoritative handlers above; do not introduce parallel writes to normalized UUID-team tables for these concepts.

## Compatibility boundary

`createApp` mounts the platform middleware/handlers first when a database URL exists, followed by original captain routes and public reads. The legacy Data API router is selected only without the platform database connection. `server/routes/workspace.ts` is retained for isolated normalized-contract tests and is not mounted by the production app. Its 501 handlers are not evidence that the current platform implementation lacks those actions.
