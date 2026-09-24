# Current source/component inventory

260 source modules, 176 TSX modules and 272 named function component declarations. Includes local helpers and duplicate names in different modules. All route families were source-reviewed; this follow-up ran no browser tests. Route implementation modules are isolated for loading, while compatibility barrels keep existing imports available. Assets and CSS have separate coverage in the main report.

| Module | Named components | Review basis |
| --- | --- | --- |
| `src/pages/AccountPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AdminCompetitionForms.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AdminCompletionPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AdminOperationsPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AdminPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AuthLifecyclePages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/AuthPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/CompletionPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/HomePage.tsx` | HomePage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/InformationPages.tsx` | RegulationsPage, InformationPage, PrivacyPage, TermsPage, ContactPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/LegacyClaimPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/NewDisputePage.tsx` | NewDisputePage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/PlayerClaimPage.tsx` | PlayerClaimPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/ProfileCardPage.tsx` | TeamProfileCardPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/ProfilePages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/PublicArchivePages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/PublicDiscoveryPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/PublicIdentityPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/PublicPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/SpectatorPages.tsx` | MatchCard, UpcomingRow, CompletedRow, MatchCenterPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/SupportPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/SystemPages.tsx` | SystemStatePage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamCareerPage.tsx` | TeamCareerPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamCompletionPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamManagementPage.tsx` | TeamGovernancePage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamOperationsPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamPages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamProfilePage.tsx` | TeamProfilePage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TeamSettingsPage.tsx` | TeamSettingsPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/TournamentsPage.tsx` | Occupancy, RegistrationCountdown, TournamentsPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/WorkspaceProfilePages.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/WrappedPage.tsx` | WrappedShareStudio, WrappedPage | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/support-pages.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/system-pages.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/pages/routes/AccessStatePage.tsx` | AccessStatePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountLayout.tsx` | AccountLayout | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountNotificationsPage.tsx` | AccountNotificationsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountProfilePage.tsx` | AccountProfilePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountSecurityPage.tsx` | AccountSecurityPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AccountSessionsPage.tsx` | AccountSessionsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminAuditPage.tsx` | AdminAuditPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminBlacklistPage.tsx` | AdminBlacklistPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminCompletionPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminDashboardPage.tsx` | AdminDashboardPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminDisputesPage.tsx` | AdminDisputesPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminLegacyClaimsPage.tsx` | AdminLegacyClaimsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminMessagesPage.tsx` | AdminMessagesPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminMissedCheckInsPage.tsx` | AdminMissedCheckInsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminOrganizationsPage.tsx` | AdminOrganizationsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminPlayerDetailPage.tsx` | AdminPlayerDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminResultCorrectionPage.tsx` | AdminResultCorrectionPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminResultsPage.tsx` | AdminResultsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminRosterRequestsPage.tsx` | AdminRosterRequestsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminSettingsPage.tsx` | AdminSettingsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminSupportQueuePage.tsx` | AdminSupportQueuePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminTeamDetailPage.tsx` | AdminTeamDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminTeamsPage.tsx` | AdminTeamsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminTournamentDetailPage.tsx` | AdminTournamentDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminTournamentNewPage.tsx` | AdminTournamentNewPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminTournamentsPage.tsx` | AdminTournamentsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminUsersPage.tsx` | AdminUsersPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminVerificationDetailPage.tsx` | AdminVerificationDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AdminVerificationQueuePage.tsx` | AdminVerificationQueuePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/AuthLifecyclePagesShared.tsx` | AuthBlockedState | Isolated page/helper module; source and build validation |
| `src/pages/routes/AuthPagesShared.tsx` | AuthHeader, AuthAvailabilityNotice | Isolated page/helper module; source and build validation |
| `src/pages/routes/BadgeDetailPage.tsx` | BadgeDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/DisputeDetailPage.tsx` | DisputeDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/DisputesPage.tsx` | DisputesPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/FollowingPage.tsx` | FollowingPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/ForgotPasswordPage.tsx` | ForgotPasswordPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/LeaderboardPage.tsx` | LeaderboardPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/LegacyActivationPage.tsx` | LegacyActivationPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/LegacyClaimPage.tsx` | LegacyClaimPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/LegacyMatchRedirect.tsx` | LegacyMatchRedirect | Isolated page/helper module; source and build validation |
| `src/pages/routes/LoginPage.tsx` | LoginPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/NewSupportTicketPage.tsx` | NewSupportTicketPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/NotificationCenterPage.tsx` | NotificationCenterPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/OrganizationProfilePage.tsx` | OrganizationProfilePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/OrganizationWorkspacePage.tsx` | OrganizationWorkspacePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/OrganizationsDirectoryPage.tsx` | OrganizationsDirectoryPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/ProfilePagesShared.tsx` | PublicTeamSummaryPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/PublicArchivePagesShared.tsx` | RecordFeatured, RecordInlineDetail, ShareRecap | Isolated page/helper module; source and build validation |
| `src/pages/routes/PublicPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/PublicTeamComparisonPage.tsx` | PublicTeamComparisonPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/PublicTeamProfileRoute.tsx` | PublicTeamProfileRoute | Isolated page/helper module; source and build validation |
| `src/pages/routes/RecordCard.tsx` | RecordCard | Isolated page/helper module; source and build validation |
| `src/pages/routes/RecordDetailPage.tsx` | RecordDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/RecordsCenterPage.tsx` | RecordsCenterPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/RegisterPage.tsx` | RegisterPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/ResetPasswordPage.tsx` | ResetPasswordPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/ResultEntryForm.tsx` | ResultEntryForm | Isolated page/helper module; source and build validation |
| `src/pages/routes/RosterRequestDetailPage.tsx` | RosterRequestDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/RosterRequestsPage.tsx` | RosterRequestsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/SearchResultsPage.tsx` | SearchResultsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/SeasonArchivePage.tsx` | SeasonArchivePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/SupportCenterPage.tsx` | SupportCenterPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/SupportPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/SupportTicketDetailPage.tsx` | SupportTicketDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/SupportTicketsPage.tsx` | SupportTicketsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamBadgeCabinetPage.tsx` | TeamBadgeCabinetPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamComparisonPage.tsx` | TeamComparisonPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamCompletionPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamHistoryPage.tsx` | TeamHistoryPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamInvitationsPage.tsx` | TeamInvitationsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamMessagesPage.tsx` | TeamMessagesPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamOperationsPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamPagesShared.tsx` | — | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamProfilePage.tsx` | TeamProfilePage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamRosterPage.tsx` | TeamRosterPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamSharecardsPage.tsx` | TeamSharecardsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamTournamentDetailPage.tsx` | TeamTournamentDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamTournamentsPage.tsx` | TeamTournamentsPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TeamsDirectoryPage.tsx` | TeamsDirectoryPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentCreateForm.tsx` | TournamentCreateForm | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentDetailPage.tsx` | TournamentDetailPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentEditForm.tsx` | TournamentEditForm | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentLifecycleAdminPage.tsx` | TournamentLifecycleAdminPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentOperations.tsx` | TournamentOperations | Isolated page/helper module; source and build validation |
| `src/pages/routes/TournamentRecapPage.tsx` | TournamentRecapPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/VerificationApplicationPage.tsx` | VerificationApplicationPage | Isolated page/helper module; source and build validation |
| `src/pages/routes/VerifyEmailPage.tsx` | VerifyEmailPage | Isolated page/helper module; source and build validation |
| `src/components/auth/AuthRecoveryShell.tsx` | AuthRecoveryShell | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/auth/RegistrationElements.tsx` | RegistrationStepper, RosterProgress, RegistrationPreviewRoster, RegistrationTeamPreview, TeamAvailabilityStatus, PlayerLookupResult, SmartReview, RegistrationStatusPanel, RegistrationSectionTitle, ReviewSection, ReviewRow | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/auth/TeamLogoEditor.tsx` | TeamLogoEditor | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/brand/BrandMark.tsx` | BrandEmblem, BrandMark, PhoenixVisual | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/AevicHydrationFallback.tsx` | AevicHydrationFallback | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/BrandJoinCta.tsx` | BrandJoinCta | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/CapabilityUnavailable.tsx` | CapabilityUnavailable | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/EntityContextNav.tsx` | Breadcrumbs, EntityContextNav | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/FileUpload.tsx` | FileUpload | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/LoadingSkeleton.tsx` | Shape, LoadingSkeleton, RouteSkeleton, RefreshIndicator | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/MediaBackdrop.tsx` | MediaBackdrop | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/Motion.tsx` | PageTransition, RouteTransitionOutlet | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/Seo.tsx` | Seo, RouteSeo | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/StatCardStrip.tsx` | StatCardStrip | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/TeamIdentity.tsx` | TeamMark, TeamLogo, TeamRosterReveal, TeamLogoTile | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/loading-skeleton.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/primitives.tsx` | Button, IconButton, Input, PasswordInput, PhoneInput, Select, Switch, Textarea, Checkbox, Radio, StatusBadge, ProgressBar, Countdown, CopyButton, PageHeader, SectionHeading, EmptyState, Toast, Tooltip, Tabs, Pagination, DataTable, MobileDataList, NotificationItem, Modal, ConfirmDialog, Drawer | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/common/stat-card-strip.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/CalendarAction.tsx` | CalendarAction | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/CompetitionFeature.tsx` | CompetitionFeature | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/CompetitionIntelligence.tsx` | TeamFormItem, TeamForm, MapMetric, MapSpecialization, RankMovement, LeaderboardMovementCell | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/CompetitionVisuals.tsx` | OfficialMapImage, MapRotation, CompetitionRoundProgram, TournamentCountdown, SlotProgress, MapRotationPreview, DailyTournamentCard, TeamStatsVisual | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/PlacementScoring.tsx` | PlacementScoring | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/SharecardGenerator.tsx` | PosterFrame, PosterBrandline, TournamentResultPoster, LeaderboardPoster, SharecardGenerator | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/TournamentCalendar.tsx` | StatusIcon, TournamentCalendar | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/TournamentJoinAction.tsx` | TournamentJoinAction | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/TournamentParticipants.tsx` | RosterLine, TournamentParticipantField | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/TournamentResults.tsx` | TournamentResults | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/competition-feature.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/competition-schedule.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/competition/placement-scoring.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/DirectoryTeamCard.tsx` | DirectoryTeamCard | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/ProfileCardGenerator.tsx` | FormatSelector, ProfileCardGenerator | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/ProfileElements.tsx` | VerificationCrest, OrganizationBanner, OrganizationIdentity, TeamOrganizationLink, BrandBannerUploader, TeamBannerUploader, OrganizationBannerUploader | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/PublicTeamDetail.tsx` | PublicTeamDetail | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/PublicTeamExperience.tsx` | FollowTeamEntry, ShareProfileAction, PublicRoster, UpcomingMatchCard, RecentMatchList, PerformanceTrend, ComparisonLink, ProfileCardLink | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/PublicTeamFeatures.tsx` | PublicTeamFeatures | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/PublicTeamIdentity.tsx` | PublicTeamIdentity | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/public-roster.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/profile/public-team-identity.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/pwa/PwaExperience.tsx` | InstallAevic, OfflineNotice, PwaUpdateNotice | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/search/GlobalSearch.tsx` | GlobalSearch | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/social/SocialLinks.tsx` | SocialGlyph, SocialIconButton, SocialLinks, PlatformFooterSocials | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/Achievements.tsx` | BadgeArtworkPlaceholder, AchievementProgress, AchievementMedal, AchievementGrid, TeamLegacyProfile | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/BadgeCabinet.tsx` | FeaturedBadgeCabinet, BadgeDetails, BadgeCollectionDrawer, BadgeReorderList, BadgeCabinetEditor | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/CompetitionAwareness.tsx` | EventAction, CompetitionAwareness | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/NextActionCard.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/TeamCareerNav.tsx` | CareerNav, TeamWrappedEntry | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/TeamExperience.tsx` | CareerSummary, PerformanceSummary, TeamComparison, SchedulePreviewLink | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/TeamMediaPreview.tsx` | TeamMediaPreview | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/components/team/TeamOverview.tsx` | SectionTitle, NextActionCommand, OperationalRail, OperationsCanvas, RecentForm, TeamOverview | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/AuthLayout.tsx` | AuthLayout | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/PublicFooter.tsx` | PublicFooter | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/WorkspaceLayouts.tsx` | ProductTopbar, TeamIdentityBlock, TeamLayout, AdminLayout | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/WorkspaceNav.tsx` | SidebarNav | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/layouts.tsx` | PublicNavLinks, PublicAuthActions, PublicHeader, PublicLayout, RouteError, ProtectedRoute | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/layouts/workspace-nav.css` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/AdminRoute.tsx` | Component | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/TeamRoute.tsx` | Component | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/capabilityRoutes.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/preloadCriticalFonts.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/prerenderHome.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/publicNavigation.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/registerPwa.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/routeManifest.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/router.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/startApplication.tsx` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/app/workspaceStyles.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/PlatformDataContext.tsx` | QueryBoundary, PublicPlatformProvider, TeamPlatformProvider, AdminPlatformProvider, TeamRealtime | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/apiAdapter.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/apiError.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/brandAssetValidation.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/capabilities.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/contracts.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/index.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/queryCache.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/queryRetry.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/realtime.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/requestJson.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/services/snapshotValidation.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/adminOperations.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/calendar.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/competitionAnalytics.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/competitionSelectors.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/fileValidation.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/lifecycle.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/mediaUrl.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/outboundUrl.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/prepareBrandImage.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/productLexicon.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/publicUrl.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/registration.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/registrationDraft.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/resultBreakdown.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/routeMetadata.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/routes.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/teamCompetitionContext.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/teamIdentityCard.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/teamOverview.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/tournamentCapacity.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/tournamentJoin.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/tournamentTime.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/useTournamentClock.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/wrapped.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `src/utils/wrappedSharecard.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/app.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/config.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/db.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/errors.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/types.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/auth/session.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/crypto.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/database-ca.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/email.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/limit.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/media.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/postgres.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/reset-email.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/service.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/captain/store.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/routes/auth.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/captain.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/identity.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/legacyClaims.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/media.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/production.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/public.ts` | — | Isolated page/helper module; source and build validation |
| `server/routes/workspace.ts` | — | Isolated page/helper module; source and build validation |
| `server/services/data.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/services/identity.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/services/productionTeams.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/services/records.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `server/validation/input.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `netlify/functions/api-not-found.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `netlify/functions/api.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `netlify/functions/public-context.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `netlify/functions/_shared/http.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
| `netlify/functions/_shared/publicContext.ts` | — | Reviewed shared dependency; unchanged or optimized as detailed in report |
