import { AdminLayout, AuthLayout, ProtectedRoute, PublicLayout, RouteError, TeamLayout } from '../layouts/layouts';
import { HomePage } from '../pages/HomePage';
import { AdminPlatformProvider, PublicPlatformProvider, TeamPlatformProvider } from '../services/PlatformDataContext';
import { AevicHydrationFallback } from '../components/common/AevicHydrationFallback';
import { loadRouteStyles } from './routeStyles';
import { routePath } from './routeManifest';
import { applyRouteCapabilities } from './capabilityRoutes';

async function loadLifecyclePages() {
  await loadRouteStyles('/reset-password');
  return import('../pages/AuthLifecyclePages');
}

// Shared route tree: the browser and build-time Home renderer use identical components.
export const routes = applyRouteCapabilities([
  {
    id: 'root',
    HydrateFallback: AevicHydrationFallback,
    children: [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: routePath('home'), element: <HomePage /> },
      { path: routePath('tournaments'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).TournamentsPage }) },
      { path: routePath('tournaments_tournamentId_recap'), lazy: async () => ({ Component: (await import('../pages/PublicArchivePages')).TournamentRecapPage }) },
      { path: routePath('tournaments_tournamentId'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).TournamentDetailPage }) },
      { path: routePath('leaderboard'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).LeaderboardPage }) },
      { path: routePath('regulations'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).RegulationsPage }) },
      { path: routePath('contact'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).ContactPage }) },
      { path: routePath('privacy'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).PrivacyPage }) },
      { path: routePath('terms'), lazy: async () => ({ Component: (await import('../pages/PublicPages')).TermsPage }) },
      { path: routePath('support'), lazy: async () => ({ Component: (await import('../pages/SupportPages')).SupportCenterPage }) },
      { path: routePath('organizations'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).OrganizationsDirectoryPage }) },
      { path: routePath('organizations_organizationSlug'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).OrganizationProfilePage }) },
      { path: routePath('records'), lazy: async () => ({ Component: (await import('../pages/PublicArchivePages')).RecordsCenterPage }) },
      { path: routePath('records_recordId'), lazy: async () => ({ Component: (await import('../pages/PublicArchivePages')).RecordDetailPage }) },
      { path: routePath('teams'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).TeamsDirectoryPage }) },
      { path: routePath('teams_compare'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).PublicTeamComparisonPage }) },
      { path: routePath('teams_teamSlug_share_card'), lazy: async () => ({ Component: (await import('../pages/ProfileCardPage')).TeamProfileCardPage }) },
      { path: routePath('teams_teamSlug'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).PublicTeamProfileRoute }) },
      { path: routePath('matches'), lazy: async () => ({ Component: (await import('../pages/SpectatorPages')).MatchCenterPage }) },
      { path: routePath('matches_matchId'), lazy: async () => ({ Component: (await import('../pages/PublicIdentityPages')).LegacyMatchRedirect }) },
      { path: routePath('search'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).SearchResultsPage }) },
      { path: routePath('following'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).FollowingPage }) },
      { path: routePath('archive'), lazy: async () => ({ Component: (await import('../pages/PublicIdentityPages')).SeasonArchivePage }) },
      { path: routePath('403'), lazy: async () => { const { SystemStatePage } = await import('../pages/SystemPages'); return { Component: () => <SystemStatePage state="forbidden" /> }; } },
      { path: routePath('500'), lazy: async () => { const { SystemStatePage } = await import('../pages/SystemPages'); return { Component: () => <SystemStatePage state="server-error" /> }; } },
      { path: routePath('maintenance'), lazy: async () => { const { SystemStatePage } = await import('../pages/SystemPages'); return { Component: () => <SystemStatePage state="maintenance" /> }; } },
      { path: routePath('offline'), lazy: async () => { const { SystemStatePage } = await import('../pages/SystemPages'); return { Component: () => <SystemStatePage state="offline" /> }; } },
      { path: routePath('not_found'), lazy: async () => { const { SystemStatePage } = await import('../pages/SystemPages'); return { Component: () => <SystemStatePage state="not-found" /> }; } },
    ],
  },
  {
    path: routePath('teams_teamSlug_wrapped_year'),
    errorElement: <RouteError />,
    lazy: async () => ({ Component: (await import('../pages/WrappedPage')).WrappedPage }),
  },
  {
    element: <AuthLayout />,
    children: [
      { path: routePath('login'), lazy: async () => ({ Component: (await import('../pages/AuthPages')).LoginPage }) },
      { path: routePath('register'), lazy: async () => ({ Component: (await import('../pages/AuthPages')).RegisterPage }) },
      { path: routePath('forgot_password'), lazy: async () => ({ Component: (await import('../pages/AuthPages')).ForgotPasswordPage }) },
      { path: routePath('reset_password'), lazy: async () => ({ Component: (await loadLifecyclePages()).ResetPasswordPage }) },
      { path: routePath('verify_email'), lazy: async () => ({ Component: (await loadLifecyclePages()).VerifyEmailPage }) },
      { path: routePath('unauthorized'), lazy: async () => { const { AccessStatePage } = await loadLifecyclePages(); return { Component: () => <AccessStatePage state="unauthorized" /> }; } },
      { path: routePath('session_expired'), lazy: async () => { const { AccessStatePage } = await loadLifecyclePages(); return { Component: () => <AccessStatePage state="session-expired" /> }; } },
      { path: routePath('account_locked'), lazy: async () => { const { AccessStatePage } = await loadLifecyclePages(); return { Component: () => <AccessStatePage state="account-locked" /> }; } },
      { path: routePath('too_many_attempts'), lazy: async () => { const { AccessStatePage } = await loadLifecyclePages(); return { Component: () => <AccessStatePage state="rate-limited" /> }; } },
      { path: routePath('forbidden'), lazy: async () => { const { AccessStatePage } = await loadLifecyclePages(); return { Component: () => <AccessStatePage state="forbidden" /> }; } },
      { path: routePath('admin_login'), lazy: async () => { const { LoginPage } = await import('../pages/AuthPages'); return { Component: () => <LoginPage admin /> }; } },
    ],
  },
  {
    path: routePath('team'),
    lazy: async () => {
      await loadRouteStyles('/team');
      return { Component: () => <ProtectedRoute area="team"><TeamPlatformProvider><TeamLayout /></TeamPlatformProvider></ProtectedRoute> };
    },
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamDashboardPage }) },
      { path: routePath('team_tournaments', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamTournamentsPage }) },
      { path: routePath('team_tournaments_tournamentId', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamTournamentDetailPage }) },
      { path: routePath('team_history', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamHistoryPage }) },
      { path: routePath('team_comparison', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamComparisonPage }) },
      { path: routePath('team_roster', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamRosterPage }) },
      { path: routePath('team_messages', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamMessagesPage }) },
      { path: routePath('team_notifications', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).NotificationCenterPage }) },
      { path: routePath('team_roster_requests', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).RosterRequestsPage }) },
      { path: routePath('team_roster_requests_requestId', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).RosterRequestDetailPage }) },
      { path: routePath('team_disputes', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).DisputesPage }) },
      { path: routePath('team_disputes_new', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).NewDisputePage }) },
      { path: routePath('team_disputes_disputeId', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamOperationsPages')).DisputeDetailPage }) },
      { path: routePath('team_sharecards', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamSharecardsPage }) },
      { path: routePath('team_badges', '/team'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).TeamBadgeCabinetPage }) },
      { path: routePath('team_badges_badgeId', '/team'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).BadgeDetailPage }) },
      { path: routePath('team_invitations', '/team'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).TeamInvitationsPage }) },
      { path: routePath('team_settings_managers', '/team'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).TeamGovernancePage }) },
      { path: routePath('team_verification', '/team'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).VerificationApplicationPage }) },
      { path: routePath('team_organization_organizationSlug', '/team'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).OrganizationWorkspacePage }) },
      { path: routePath('team_settings', '/team'), lazy: async () => ({ Component: (await import('../pages/TeamPages')).TeamSettingsPage }) },
    ],
  },
  {
    path: routePath('admin'),
    lazy: async () => {
      await loadRouteStyles('/admin');
      return { Component: () => <ProtectedRoute area="admin"><AdminPlatformProvider><AdminLayout /></AdminPlatformProvider></ProtectedRoute> };
    },
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminDashboardPage }) },
      { path: routePath('admin_tournaments', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminTournamentsPage }) },
      { path: routePath('admin_tournaments_new', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminTournamentNewPage }) },
      { path: routePath('admin_tournaments_tournamentId', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminTournamentDetailPage }) },
      { path: routePath('admin_tournaments_tournamentId_lifecycle', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).TournamentLifecycleAdminPage }) },
      { path: routePath('admin_check_ins_missed', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminMissedCheckInsPage }) },
      { path: routePath('admin_teams', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminTeamsPage }) },
      { path: routePath('admin_teams_teamId', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminOperationsPages')).AdminTeamDetailPage }) },
      { path: routePath('admin_organizations', '/admin'), lazy: async () => ({ Component: (await import('../pages/ProfilePages')).AdminOrganizationsPage }) },
      { path: routePath('admin_results', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminResultsPage }) },
      { path: routePath('admin_results_resultId_correct', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminResultCorrectionPage }) },
      { path: routePath('admin_messages', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminMessagesPage }) },
      { path: routePath('admin_blacklist', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminBlacklistPage }) },
      { path: routePath('admin_roster_requests', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminOperationsPages')).AdminRosterRequestsPage }) },
      { path: routePath('admin_roster_requests_requestId', '/admin'), lazy: async () => { const { RosterRequestDetailPage } = await import('../pages/TeamOperationsPages'); return { Component: () => <RosterRequestDetailPage admin /> }; } },
      { path: routePath('admin_disputes', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminOperationsPages')).AdminDisputesPage }) },
      { path: routePath('admin_disputes_disputeId', '/admin'), lazy: async () => { const { DisputeDetailPage } = await import('../pages/TeamOperationsPages'); return { Component: () => <DisputeDetailPage admin /> }; } },
      { path: routePath('admin_players_playerId', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminPlayerDetailPage }) },
      { path: routePath('admin_verifications', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminVerificationQueuePage }) },
      { path: routePath('admin_verifications_verificationId', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminVerificationDetailPage }) },
      { path: routePath('admin_support', '/admin'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).AdminSupportQueuePage }) },
      { path: routePath('admin_audit', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminOperationsPages')).AdminAuditPage }) },
      { path: routePath('admin_users', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminOperationsPages')).AdminUsersPage }) },
      { path: routePath('admin_settings', '/admin'), lazy: async () => ({ Component: (await import('../pages/AdminPages')).AdminSettingsPage }) },
    ],
  },
  {
    path: routePath('account'),
    lazy: async () => {
      const [, { AccountLayout }] = await Promise.all([loadRouteStyles('/account'), import('../pages/AccountPages')]);
      return { Component: () => <ProtectedRoute area="team"><AccountLayout /></ProtectedRoute> };
    },
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/AccountPages')).AccountProfilePage }) },
      { path: routePath('account_profile', '/account'), lazy: async () => ({ Component: (await import('../pages/AccountPages')).AccountProfilePage }) },
      { path: routePath('account_security', '/account'), lazy: async () => ({ Component: (await import('../pages/AccountPages')).AccountSecurityPage }) },
      { path: routePath('account_notifications', '/account'), lazy: async () => ({ Component: (await import('../pages/AccountPages')).AccountNotificationsPage }) },
      { path: routePath('account_sessions', '/account'), lazy: async () => ({ Component: (await import('../pages/AccountPages')).AccountSessionsPage }) },
      { path: routePath('account_player_claim_playerId', '/account'), lazy: async () => ({ Component: (await import('../pages/CompletionPages')).PlayerClaimPage }) },
      { path: routePath('account_support_tickets', '/account'), lazy: async () => ({ Component: (await import('../pages/SupportPages')).SupportTicketsPage }) },
      { path: routePath('account_support_tickets_new', '/account'), lazy: async () => ({ Component: (await import('../pages/SupportPages')).NewSupportTicketPage }) },
      { path: routePath('account_support_tickets_ticketId', '/account'), lazy: async () => ({ Component: (await import('../pages/SupportPages')).SupportTicketDetailPage }) },
    ],
  },
    ],
  },
]);
