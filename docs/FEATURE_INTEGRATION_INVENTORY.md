# Feature integration inventory

Source: the current 99-entry route manifest and router, PlatformServices, API adapter, Hono modules, repository and seven ordered migrations. This is code-trace evidence; it does not certify live staging. Updated during implementation, not a repeat visual audit.

## Shared trace and state requirements

- **PUBLIC**: Public snapshots + profiles/tournaments/results/records/organizations/search/archive/wrapped; anonymous RLS; official published results only. Static legal/support copy remains editorial.
- **TEAM**: Team snapshot + teams/rosterRequests/disputes/notifications/media/rooms; verified session, active membership and per-command role/time checks; caller-JWT RPCs and Storage.
- **ADMIN**: Admin snapshot + tournaments/results/teams/operations/verifications/support/admin; server role and database command checks; audit trail. Subroles do not receive all write permissions.
- **ACCOUNT**: Account/Auth + notifications/support/players.claim; current-user filtering; support review uses separate administrator endpoints. Device inventory, MFA setup and export jobs are unavailable.
- **AUTH**: Supabase Auth via HttpOnly cookies and same-origin BFF; confirmation/recovery token exchange. Real SMTP delivery and refresh journeys require staging.
- **SYSTEM**: Static truthful status/error pages; no dynamic product fixtures or mutations.

All dynamic paths use `src/services/apiAdapter.ts` → `server/routes/{public,workspace,auth,identity,media,legacyClaims}.ts` → `Repository` / caller-JWT RPC → `aevic` RLS. Public data uses anonymous RLS even with login cookies. Auth/admin writes are not authorized by route guards alone. Query boundaries distinguish loading, empty results and failed requests; failures never select fixtures. Mutations invalidate dependent cached reads; user changes clear private caches. Test fixtures live only under tests.

| Data/workflow | Database / authority | Actions and persistence / dependencies | Local evidence / remaining limit |
|---|---|---|---|
| Public tournament/calendar/match graph | tournaments, matches, tournament_registrations, tournament_rosters, team_match_results | Read published schedules/participants/standings; calendar/share are local exports of authoritative input | Hono empty/result tests; browser API boundary; live admin→public propagation pending |
| Team identity and public profile | teams, team_players, players, team_social_links, team_contacts RPC | Update identity/socials, upload/delete branding; refresh public profile, team snapshot, share cards | API/SQL authorization; browser form tests; actual Storage round-trip pending |
| Official career, comparison, records, badges, Wrapped | published team_match_results + matches; achievement_progress; historical tournament_rosters | One score/ranking model; cumulative snapshots reconstructed from current corrected results; no player MVP fiction | Hono official result tests + domain tests; staging journey F pending |
| Entry/check-in/room | command RPC; tournament_registrations/check_ins/match_rooms | Join/review/withdraw/check-in; capacity/locks/time release and private room access | Local SQL original policies; staging journey B pending |
| Roster and governance | team_members/team_invitations/roster_change_requests/membership_history | Invite/accept/reject/cancel, transfer/archive/leave, reviewed roster change; role and roster lock enforcement | Existing SQL policies; two live users and invitation delivery pending |
| Disputes and evidence | disputes/media + private Storage | Create/review; signed evidence access; correction publishes canonical stats | SQL/Hono security + image validation; Storage/RLS with live users pending |
| Support | support_tickets/support_replies | Own list/detail/reply; separate admin list/detail/reply/status; no personal inbox widening for admins | Added server isolation regression; live two-account support thread pending |
| Notifications/announcements | notifications/messages/notification_preferences | Read/mark-read/preferences and real admin announcements; user/team scoped subscriptions + polling | Server identity filters; mail/push delivery workers unsupported |
| Tournament administration | tournaments/matches/edit_tournament + command RPC | Create, edit metadata/schedule before lock, publish information, review entries, room, cancel/archive; official completion follows result publication | New SQL edit/version/audit/lock regression; live journey C pending |
| Official results | team_match_results/result_versions + publication/correction RPC | Enter/publish/correct; atomic publication, unique published placements, version checks; invalidates downstream reads | Existing + new SQL integrity tests; concurrent live clients pending |
| Organization/verification | organizations/organization_teams/organization_members/verification_requests | Real directory/review; ownership and invitation endpoints persist; organization media and featured awards unavailable | Removed fake review control; verification guarded by role and expected status |
| Auth/account | Supabase Auth/profiles/account_requests | Sign up/confirm/login/logout/refresh/recover/reset/update password/profile; deletion is a review request | Hono Auth fixtures only; actual SMTP, cookies and token lifecycle pending |
| Unsupported controls | No invented backing store | Platform-wide settings, bulk approval, timed sanctions, manual check-in override/slot assignment, detailed player administration, per-device inventory, MFA setup/recovery, exports, org binary media | Unavailable controls/501; no local success simulation |

## Every route

Each route below inherits the data trace, permissions, loading/error/empty behavior and persistence/dependencies of its family above. UI entry names are taken from the router; shared components may make additional contract calls. No route is classified as live verified.

| Route | Family | UI entry |
|---|---|---|
| `/team/profile` | TEAM | Protected lazy workspace |
| `/team/career` | TEAM | Protected lazy workspace |
| `/` | PUBLIC | HomePage |
| `/tournaments` | PUBLIC | TournamentsPage |
| `/tournaments/:tournamentId/recap` | PUBLIC | TournamentRecapPage |
| `/tournaments/:tournamentId` | PUBLIC | TournamentDetailPage |
| `/leaderboard` | PUBLIC | LeaderboardPage |
| `/regulations` | PUBLIC | RegulationsPage |
| `/contact` | PUBLIC | ContactPage |
| `/privacy` | PUBLIC | PrivacyPage |
| `/terms` | PUBLIC | TermsPage |
| `/support` | PUBLIC | SupportCenterPage |
| `/organizations` | PUBLIC | OrganizationsDirectoryPage |
| `/organizations/:organizationSlug` | PUBLIC | OrganizationProfilePage |
| `/records` | PUBLIC | RecordsCenterPage |
| `/records/:recordId` | PUBLIC | RecordDetailPage |
| `/teams` | PUBLIC | TeamsDirectoryPage |
| `/teams/compare` | PUBLIC | PublicTeamComparisonPage |
| `/teams/:teamSlug/share-card` | PUBLIC | TeamProfileCardPage |
| `/teams/:teamSlug` | PUBLIC | PublicTeamProfileRoute |
| `/matches` | PUBLIC | MatchCenterPage |
| `/matches/:matchId` | PUBLIC | LegacyMatchRedirect |
| `/search` | PUBLIC | SearchResultsPage |
| `/following` | PUBLIC | FollowingPage |
| `/archive` | PUBLIC | SeasonArchivePage |
| `/403` | SYSTEM | SystemStatePage |
| `/500` | SYSTEM | SystemStatePage |
| `/maintenance` | SYSTEM | SystemStatePage |
| `/offline` | SYSTEM | SystemStatePage |
| `*` | SYSTEM | SystemStatePage |
| `/teams/:teamSlug/wrapped/:year` | PUBLIC | WrappedPage |
| `/login` | AUTH | LoginPage |
| `/register` | AUTH | RegisterPage |
| `/forgot-password` | AUTH | ForgotPasswordPage |
| `/reset-password` | AUTH | ResetPasswordPage |
| `/verify-email` | AUTH | VerifyEmailPage |
| `/unauthorized` | SYSTEM | SystemStatePage |
| `/session-expired` | SYSTEM | SystemStatePage |
| `/account-locked` | SYSTEM | SystemStatePage |
| `/too-many-attempts` | SYSTEM | SystemStatePage |
| `/forbidden` | SYSTEM | SystemStatePage |
| `/admin/login` | AUTH | AccessStatePage |
| `/team` | TEAM | Protected lazy workspace |
| `/team/tournaments` | TEAM | Protected lazy workspace |
| `/team/tournaments/:tournamentId` | TEAM | Protected lazy workspace |
| `/team/history` | TEAM | Protected lazy workspace |
| `/team/comparison` | TEAM | Protected lazy workspace |
| `/team/roster` | TEAM | Protected lazy workspace |
| `/team/messages` | TEAM | Protected lazy workspace |
| `/team/notifications` | TEAM | Protected lazy workspace |
| `/team/roster-requests` | TEAM | Protected lazy workspace |
| `/team/roster-requests/:requestId` | TEAM | Protected lazy workspace |
| `/team/disputes` | TEAM | Protected lazy workspace |
| `/team/disputes/new` | TEAM | Protected lazy workspace |
| `/team/disputes/:disputeId` | TEAM | Protected lazy workspace |
| `/team/sharecards` | TEAM | Protected lazy workspace |
| `/team/badges` | TEAM | Protected lazy workspace |
| `/team/badges/:badgeId` | TEAM | Protected lazy workspace |
| `/team/invitations` | TEAM | Protected lazy workspace |
| `/team/settings/managers` | TEAM | Protected lazy workspace |
| `/team/verification` | TEAM | Protected lazy workspace |
| `/team/organization/:organizationSlug` | TEAM | Protected lazy workspace |
| `/team/settings` | TEAM | Protected lazy workspace |
| `/admin` | ADMIN | AdminDashboardPage |
| `/admin/tournaments` | ADMIN | Protected lazy workspace |
| `/admin/tournaments/new` | ADMIN | Protected lazy workspace |
| `/admin/tournaments/:tournamentId` | ADMIN | Protected lazy workspace |
| `/admin/tournaments/:tournamentId/lifecycle` | ADMIN | Protected lazy workspace |
| `/admin/check-ins/missed` | ADMIN | Protected lazy workspace |
| `/admin/teams` | ADMIN | Protected lazy workspace |
| `/admin/teams/:teamId` | ADMIN | Protected lazy workspace |
| `/admin/organizations` | ADMIN | Protected lazy workspace |
| `/admin/results` | ADMIN | Protected lazy workspace |
| `/admin/results/:resultId/correct` | ADMIN | Protected lazy workspace |
| `/admin/messages` | ADMIN | Protected lazy workspace |
| `/admin/blacklist` | ADMIN | Protected lazy workspace |
| `/admin/roster-requests` | ADMIN | Protected lazy workspace |
| `/admin/roster-requests/:requestId` | ADMIN | Protected lazy workspace |
| `/admin/disputes` | ADMIN | Protected lazy workspace |
| `/admin/disputes/:disputeId` | ADMIN | Protected lazy workspace |
| `/admin/players/:playerId` | ADMIN | Protected lazy workspace |
| `/admin/verifications` | ADMIN | Protected lazy workspace |
| `/admin/verifications/:verificationId` | ADMIN | Protected lazy workspace |
| `/admin/support` | ADMIN | Protected lazy workspace |
| `/admin/audit` | ADMIN | Protected lazy workspace |
| `/admin/users` | ADMIN | Protected lazy workspace |
| `/admin/settings` | ADMIN | Protected lazy workspace |
| `/account` | ACCOUNT | AccountProfilePage |
| `/account/profile` | ACCOUNT | Protected lazy workspace |
| `/account/security` | ACCOUNT | Protected lazy workspace |
| `/account/notifications` | ACCOUNT | Protected lazy workspace |
| `/account/sessions` | ACCOUNT | Protected lazy workspace |
| `/account/player/claim/:playerId` | ACCOUNT | Protected lazy workspace |
| `/account/support/tickets` | ACCOUNT | Protected lazy workspace |
| `/account/support/tickets/new` | ACCOUNT | Protected lazy workspace |
| `/account/support/tickets/:ticketId` | ACCOUNT | Protected lazy workspace |

## Classification

- **A — implemented and locally exercised:** API-only bootstrap, empty/error behavior, caller authorization, competition rules, official-result projections, query invalidation and representative forms. See integration report for actual test results.
- **B — backend available without a complete UI:** organization creation/member/team invitation APIs and some player claim administration lack a full management surface. These are not claimed as completed user journeys.
- **C — controls without persistence corrected:** fake admin organization review/settings, default mock auth bypass, local media-success branches; support reply/status now integrated. Unsupported controls are disabled or unavailable.
- **D — contract-only capabilities:** device inventory, MFA setup/recovery, exports, public player directory and detailed player admin remain unavailable; no fabricated payloads.
- **E — static dynamic state corrected:** application fixture imports removed; comparison, organization and admin capacity/publication placeholders replaced by database projections. Editorial content and map configuration remain static.
- **F — staging required:** journeys A–G, actual email/Storage/Realtime, two separate users and role-specific browser sessions. No safely identified staging credentials were used.
- **G — unsupported:** see table above and BACKEND_SETUP.md.

## Legacy claiming addition (2026-09-20)

| Route | Data/actions | Backend and permission | States / dependencies |
|---|---|---|---|
| `/activate-legacy` | New Auth activation request; login/recovery links | legacyClaims.activate → Hono → Supabase Auth; origin/rate limits; no legacy lookup | Preserved failed input, neutral JSON receipt, no delivery/ownership assertion; existing verification flow |
| `/account/legacy-claim` | Own receipts, legacy number, code redemption, preserved roster completion | list/request/consume/roster/completeRoster → caller-JWT legacy_claim RPC; confirmed user and OWNER checks | Loading/empty/error/retry; persistent requests; success invalidates team/public data; no invented IDs |
| `/admin/legacy-claims` | Holdings, pending requests, verified contact, review/revoke/reissue | holdings/queue/review → RPC; support-moderator/super-admin; versioned evidence review | Loading/empty/error/retry; one-time code display; private tables and audit; claim updates normal admin/public/team projections |

Local evidence: planner and PostgreSQL isolation/concurrency, Hono/API contracts, component and focused desktop/mobile HTTP-fixture tests. Live Auth, SMTP and all-seven reconciliation remain unverified. Whole-career exports are unavailable until external legacy history is reconciled; new published results remain authoritative.
