import type {
  AdminMessage,
  BlacklistEntry,
  CheckIn,
  CalendarEventData,
  FollowEntityType,
  FollowMutation,
  FollowState,
  LeaderboardSnapshot,
  Notification,
  NotificationPreferences,
  Organization,
  PublicTeamProfile,
  PublicTeamSummary,
  RankMovementData,
  RecordEntry,
  SocialLinks,
  BrandAssetValidationResult,
  BrandUploadRequest,
  BrandUploadResult,
  KnownPlayerLookup,
  MatchHistoryEntry,
  MatchScheduleItem,
  PlayerEligibilityResult,
  RoomCredentials,
  RoundResult,
  Team,
  TeamMapPerformance,
  TeamSeasonSummary,
  TeamAchievement,
  TeamLegacyStats,
  TeamNameAvailabilityResult,
  TeamRegistrationReceipt,
  TeamRegistrationSubmission,
  TeamTournamentResult,
  Tournament,
  TournamentParticipant,
  TournamentJoinResult,
  TournamentRecapData,
  TournamentSlot,
  User,
  UserRole,
  ArchiveSeason,
  PublicMatchDetail,
  PublicPlayerProfile,
  SearchResults,
  WrappedPeriod,
  WrappedSummary,
  AdminPlatformSnapshot,
  PublicPlatformSnapshot,
  TeamPlatformSnapshot,
  PasswordResetInspection,
  EmailVerificationInspection,
  AccountProfile,
  AccountSession,
  TwoFactorStatus,
  RosterChangeRequest,
  ResultDispute,
  SupportTicket,
  AdminAuditEvent,
  AdminUser,
  AccountExportJob,
  AdminPlayerDetail,
  CursorPage,
  DurableInvitation,
  MembershipHistoryEntry,
  MissedCheckIn,
  OrganizationMember,
  PlayerClaim,
  ResultVersion,
  SupportTicketReply,
  TeamAuthorityMember,
  TeamAuthorityRole,
  VerificationRequest,
  VerificationStatus,
  TwoFactorRecoveryCodes,
  TwoFactorSetup,
} from '../types/domain';

export interface AuthService {
  getSession(): Promise<{ user: User; role: UserRole } | null>;
  login(email: string, password: string, remember?: boolean): Promise<{ user: User; role: UserRole }>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  inspectPasswordReset(token: string): Promise<PasswordResetInspection>;
  resetPassword(token: string, password: string): Promise<void>;
  inspectEmailVerification(token: string): Promise<EmailVerificationInspection>;
  verifyEmail(token: string): Promise<void>;
  resendVerification(email?: string): Promise<void>;
}

export interface AccountService {
  profile(): Promise<AccountProfile>;
  updateProfile(profile: Pick<User, 'firstName' | 'lastName' | 'phone'>): Promise<AccountProfile>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  sessions(): Promise<AccountSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeOtherSessions(): Promise<void>;
  twoFactorStatus(): Promise<TwoFactorStatus>;
  beginTwoFactorSetup(): Promise<TwoFactorSetup>;
  verifyTwoFactorSetup(setupId: string, code: string): Promise<TwoFactorRecoveryCodes>;
  disableTwoFactor(password: string, code: string): Promise<void>;
  regenerateRecoveryCodes(password: string, code: string): Promise<TwoFactorRecoveryCodes>;
  requestDataExport(): Promise<AccountExportJob>;
  dataExportStatus(jobId: string): Promise<AccountExportJob>;
  requestDeletion(): Promise<{ blocked: boolean; reason?: string }>;
}

export interface RegistrationService {
  checkTeamName(name: string, tournamentId?: string): Promise<TeamNameAvailabilityResult>;
  validatePlayer(pubgId: string, tournamentId?: string): Promise<PlayerEligibilityResult>;
  lookupPlayer(pubgId: string): Promise<KnownPlayerLookup | null>;
  submit(request: TeamRegistrationSubmission): Promise<TeamRegistrationReceipt>;
}

export interface TournamentService {
  list(): Promise<Tournament[]>;
  get(id: string): Promise<Tournament | undefined>;
  join(tournamentId: string, teamId: string): Promise<TournamentJoinResult>;
  slots(tournamentId: string): Promise<TournamentSlot[]>;
  publicParticipants(tournamentId: string): Promise<TournamentParticipant[]>;
  recap(tournamentId: string): Promise<TournamentRecapData | undefined>;
  calendarEvent(tournamentId: string): Promise<CalendarEventData | undefined>;
  cancel(tournamentId: string, reason: string, idempotencyKey: string): Promise<Tournament>;
  archive(tournamentId: string, idempotencyKey: string): Promise<Tournament>;
  missedCheckIns(tournamentId?: string, cursor?: string): Promise<CursorPage<MissedCheckIn>>;
}

export interface TeamService {
  current(): Promise<Team>;
  list(): Promise<Team[]>;
  setApproval(teamId: string, status: Team['approvalStatus'], reason?: string): Promise<Team>;
  checkIn(tournamentId: string): Promise<CheckIn>;
  withdraw(tournamentId: string, reason?: string): Promise<void>;
  updateSocialLinks(teamId: string, socialLinks: SocialLinks): Promise<Team>;
  authority(teamId: string): Promise<TeamAuthorityMember[]>;
  invitations(teamId?: string, cursor?: string): Promise<CursorPage<DurableInvitation>>;
  invite(teamId: string, recipient: string, role: TeamAuthorityRole, idempotencyKey: string): Promise<DurableInvitation>;
  cancelInvitation(teamId: string, invitationId: string): Promise<DurableInvitation>;
  respondToInvitation(invitationId: string, response: 'ACCEPTED' | 'REJECTED', idempotencyKey: string): Promise<DurableInvitation>;
  removeAuthorityMember(teamId: string, memberId: string, reason: string): Promise<void>;
  transferOwnership(teamId: string, memberId: string, confirmation: string, idempotencyKey: string): Promise<TeamAuthorityMember[]>;
  leave(teamId: string, reason?: string): Promise<void>;
  archive(teamId: string, reason: string, confirmation: string, idempotencyKey: string): Promise<Team>;
}

export interface AchievementService {
  listForTeam(teamId: string): Promise<TeamAchievement[]>;
  legacyForTeam(teamId: string): Promise<TeamLegacyStats>;
  featuredForTeam(teamId: string): Promise<TeamAchievement[]>;
  saveFeatured(teamId: string, achievementIds: string[]): Promise<TeamAchievement[]>;
}

export interface OrganizationService {
  list(): Promise<Organization[]>;
  getBySlug(slug: string): Promise<Organization | undefined>;
  linkTeam(organizationId: string, teamId: string, gameKey: string): Promise<Organization>;
  unlinkTeam(organizationId: string, teamId: string): Promise<Organization>;
  updateSocialLinks(organizationId: string, socialLinks: SocialLinks): Promise<Organization>;
  create(request: Pick<Organization, 'name' | 'shortName' | 'description' | 'country'>, idempotencyKey: string): Promise<Organization>;
  members(organizationId: string): Promise<OrganizationMember[]>;
  invitations(organizationId: string, cursor?: string): Promise<CursorPage<DurableInvitation>>;
  inviteMember(organizationId: string, recipient: string, role: OrganizationMember['role'], idempotencyKey: string): Promise<DurableInvitation>;
  inviteTeam(organizationId: string, teamId: string, idempotencyKey: string): Promise<DurableInvitation>;
  respondToInvitation(invitationId: string, response: 'ACCEPTED' | 'REJECTED', idempotencyKey: string): Promise<DurableInvitation>;
  removeTeam(organizationId: string, teamId: string, reason: string): Promise<Organization>;
  transferOwnership(organizationId: string, memberId: string, confirmation: string, idempotencyKey: string): Promise<OrganizationMember[]>;
}

export interface PublicProfileService {
  listTeams(query?: string): Promise<PublicTeamSummary[]>;
  teamBySlug(slug: string): Promise<PublicTeamProfile | undefined>;
  matches(teamId: string): Promise<PublicTeamProfile['recentMatches']>;
  upcomingMatch(teamId: string): Promise<PublicTeamProfile['upcomingMatch']>;
  seasons(teamId: string): Promise<TeamSeasonSummary[]>;
  mapPerformance(teamId: string): Promise<TeamMapPerformance[]>;
  form(teamId: string): Promise<PublicTeamProfile['form']>;
  mapSpecialization(teamId: string): Promise<PublicTeamProfile['mapSpecialization']>;
}

export interface PublicMatchService {
  schedule(): Promise<MatchScheduleItem[]>;
  history(): Promise<MatchHistoryEntry[]>;
  get(id: string): Promise<PublicMatchDetail | undefined>;
  calendarEvent(matchId: string): Promise<CalendarEventData | undefined>;
}

export interface SearchService {
  public(query: string, cursor?: string): Promise<SearchResults>;
}

export interface PlayerProfileService {
  getBySlug(slug: string): Promise<PublicPlayerProfile | undefined>;
  list(query?: string, cursor?: string): Promise<CursorPage<PublicPlayerProfile>>;
  claim(playerId: string, method: PlayerClaim['verificationMethod'], evidence: string[], idempotencyKey: string): Promise<PlayerClaim>;
  invitations(cursor?: string): Promise<CursorPage<DurableInvitation>>;
  membershipHistory(playerId: string): Promise<MembershipHistoryEntry[]>;
}

export interface ArchiveService {
  seasons(): Promise<ArchiveSeason[]>;
}

export interface WrappedService {
  forTeam(teamSlug: string, period: WrappedPeriod): Promise<WrappedSummary | undefined>;
}

export interface PlatformSnapshotService {
  public(signal?: AbortSignal): Promise<PublicPlatformSnapshot>;
  team(signal?: AbortSignal): Promise<TeamPlatformSnapshot>;
  admin(signal?: AbortSignal): Promise<AdminPlatformSnapshot>;
}

export interface FollowService {
  list(): Promise<FollowState[]>;
  status(entityType: FollowEntityType, entityId: string): Promise<FollowState>;
  mutate(mutation: FollowMutation): Promise<FollowState>;
}

export interface RecordsService {
  list(): Promise<RecordEntry[]>;
  get(id: string): Promise<RecordEntry | undefined>;
  history(id: string): Promise<RecordEntry[]>;
}

export interface MediaService {
  validateBrandAsset(request: BrandUploadRequest): Promise<BrandAssetValidationResult>;
  uploadBrandAsset(request: BrandUploadRequest): Promise<BrandUploadResult>;
}

export interface RoomService {
  getForEligibleTeam(tournamentId: string, roundId: string): Promise<RoomCredentials>;
}

export interface ResultService {
  leaderboard(tournamentId: string): Promise<TeamTournamentResult[]>;
  snapshots(tournamentId: string): Promise<LeaderboardSnapshot[]>;
  movement(tournamentId: string): Promise<RankMovementData[]>;
  saveRound(result: RoundResult): Promise<RoundResult>;
  versions(resultId: string): Promise<ResultVersion[]>;
  correct(resultId: string, result: RoundResult, reason: string, expectedVersion: number, idempotencyKey: string): Promise<ResultVersion>;
}

export interface NotificationService {
  inbox(): Promise<Notification[]>;
  messages(): Promise<AdminMessage[]>;
  preferences(): Promise<NotificationPreferences>;
  updatePreferences(value: NotificationPreferences): Promise<NotificationPreferences>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  page(cursor?: string): Promise<CursorPage<Notification>>;
}

export interface RosterRequestService {
  list(teamId?: string): Promise<RosterChangeRequest[]>;
  get(id: string): Promise<RosterChangeRequest | undefined>;
  submit(request: Omit<RosterChangeRequest, 'id' | 'status' | 'submittedAt' | 'updatedAt'>): Promise<RosterChangeRequest>;
  review(id: string, status: Extract<RosterChangeRequest['status'], 'approved' | 'rejected'>, note?: string): Promise<RosterChangeRequest>;
}

export interface DisputeService {
  list(teamId?: string): Promise<ResultDispute[]>;
  get(id: string): Promise<ResultDispute | undefined>;
  submit(request: Omit<ResultDispute, 'id' | 'status' | 'submittedAt'>): Promise<ResultDispute>;
  review(id: string, status: Extract<ResultDispute['status'], 'resolved' | 'rejected'>, note?: string): Promise<ResultDispute>;
}

export interface SupportService {
  listTickets(): Promise<SupportTicket[]>;
  getTicket(id: string): Promise<SupportTicket | undefined>;
  createTicket(request: Pick<SupportTicket, 'category' | 'subject' | 'description'>): Promise<SupportTicket>;
  page(cursor?: string, status?: SupportTicket['status']): Promise<CursorPage<SupportTicket>>;
  reply(ticketId: string, reply: SupportTicketReply): Promise<SupportTicket>;
  changeStatus(ticketId: string, status: SupportTicket['status'], reason?: string): Promise<SupportTicket>;
  adminPage(cursor?: string, status?: SupportTicket['status']): Promise<CursorPage<SupportTicket>>;
}

export interface OperationsService {
  audit(cursor?: string): Promise<AdminAuditEvent[]>;
  adminUsers(): Promise<AdminUser[]>;
  player(playerId: string): Promise<AdminPlayerDetail | undefined>;
}

export interface VerificationService {
  forEntity(entityType: VerificationRequest['entityType'], entityId: string): Promise<VerificationRequest | undefined>;
  get(id: string): Promise<VerificationRequest | undefined>;
  apply(request: Omit<VerificationRequest, 'id' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedBy'>, idempotencyKey: string): Promise<VerificationRequest>;
  page(status?: VerificationStatus, cursor?: string): Promise<CursorPage<VerificationRequest>>;
  review(id: string, status: Extract<VerificationStatus, 'APPROVED' | 'REJECTED' | 'REVOKED'>, reason: string, expectedStatus: VerificationStatus): Promise<VerificationRequest>;
}

export interface AdminService {
  blacklist(): Promise<BlacklistEntry[]>;
  ban(teamId: string, reason: string, expiresAt?: string): Promise<void>;
  sendMessage(message: Pick<AdminMessage, 'title' | 'body' | 'severity' | 'audience'>): Promise<void>;
}

export interface PlatformServices {
  snapshots: PlatformSnapshotService;
  auth: AuthService;
  account: AccountService;
  registration: RegistrationService;
  tournaments: TournamentService;
  teams: TeamService;
  achievements: AchievementService;
  organizations: OrganizationService;
  profiles: PublicProfileService;
  publicMatches: PublicMatchService;
  search: SearchService;
  players: PlayerProfileService;
  archive: ArchiveService;
  wrapped: WrappedService;
  follows?: FollowService;
  records: RecordsService;
  media: MediaService;
  rooms: RoomService;
  results: ResultService;
  notifications: NotificationService;
  rosterRequests: RosterRequestService;
  disputes: DisputeService;
  support: SupportService;
  operations: OperationsService;
  verifications: VerificationService;
  admin: AdminService;
}
