export type ID = string;
export type ISODate = string;

export type UserRole = 'visitor' | 'captain' | 'team' | 'admin';
export type TeamApprovalStatus = 'pending' | 'approved' | 'rejected' | 'banned';
export type TournamentStatus = 'draft' | 'published' | 'registration-open' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'not-joined' | 'pending' | 'confirmed' | 'waitlisted' | 'withdrawn';
export type TeamRegistrationState = 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected';
export type CheckInStatus = 'pending' | 'open' | 'checked-in' | 'missed' | 'withdrawn';
export type RoomReleaseStatus = 'locked' | 'released' | 'expired';
export type NotificationChannel = 'in-app' | 'email' | 'push';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
export type CompetitionEventPriority = 'critical' | 'important' | 'informational';
export type CompetitionEventType = 'admin-message' | 'registration' | 'schedule' | 'check-in' | 'room' | 'match' | 'map-result' | 'tournament-result' | 'placement' | 'dispute' | 'roster' | 'tournament' | 'system';
export type CompetitionEventEntityType = 'tournament' | 'match' | 'round' | 'message' | 'result' | 'dispute' | 'team';
export type TournamentStage = 'qualifier' | 'group' | 'semifinal' | 'final';
export type SharecardPeriod = '7d' | '30d' | '3m' | '6m' | 'all' | 'tournament';
export type AchievementState = 'locked' | 'progress' | 'unlocked';
export type AchievementIcon = 'crown' | 'trophy' | 'shield' | 'flame' | 'crosshair' | 'medal' | 'calendar' | 'target' | 'award';
export type AchievementCategory = 'competition' | 'combat' | 'participation' | 'consistency' | 'seasonal' | 'legacy' | 'special';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'phoenix' | 'legacy';
export type AchievementRarity = 'standard' | 'uncommon' | 'rare' | 'elite' | 'mythic';
export type VerificationLevel = 'registered' | 'approved' | 'verified' | 'legacy';
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'linkedin' | 'discord' | 'twitch' | 'website';
export type OrganizationTeamStatus = 'active' | 'pending' | 'archived';
export type FollowEntityType = 'TEAM' | 'PLAYER';
export type ProfileCardFormat = 'square' | 'portrait' | 'story';
export type WrappedPeriodType = 'year' | 'season';
export type SearchEntityType = 'team' | 'player' | 'tournament' | 'record';
export type AuthTokenState = 'valid' | 'invalid' | 'expired' | 'used' | 'already-verified';
export type AccountSessionStatus = 'current' | 'active' | 'revoked';
export type RosterChangeStatus = 'draft' | 'pending' | 'under-review' | 'approved' | 'rejected';
export type DisputeStatus = 'pending' | 'under-review' | 'resolved' | 'rejected';
export type SupportTicketStatus = 'open' | 'waiting-for-user' | 'under-review' | 'resolved' | 'closed';
export type AdminRoleKey = 'super-admin' | 'tournament-manager' | 'result-operator' | 'support-moderator';

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export interface User {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  teamId?: ID;
}

export interface PasswordResetInspection {
  state: AuthTokenState;
  emailHint?: string;
}

export interface EmailVerificationInspection {
  state: AuthTokenState;
  emailHint?: string;
}

export interface AccountProfile {
  user: User;
  emailVerified: boolean;
  avatarUrl?: string;
  dataExportStatus: 'available' | 'backend-required' | 'processing';
}

export interface AccountSession {
  id: ID;
  device: string;
  location?: string;
  browser?: string;
  lastActiveAt: ISODate;
  status: AccountSessionStatus;
}

export interface TwoFactorStatus {
  enabled: boolean;
  required: boolean;
  setupAvailable: boolean;
  backupCodesRemaining?: number;
}

export interface TwoFactorSetup {
  setupId: ID;
  otpauthUri: string;
  qrSvg: string;
  expiresAt: ISODate;
}

export interface TwoFactorRecoveryCodes {
  codes: string[];
  generatedAt: ISODate;
}

export interface TeamMember {
  id: ID;
  ign: string;
  uid?: string;
  role: 'captain' | 'starter' | 'substitute';
  joinedAt: ISODate;
}

export interface RegistrationPlayerDraft {
  ign: string;
  uid: string;
  role: TeamMember['role'];
}

export interface TeamRegistrationDraft {
  teamName: string;
  tag: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  players: RegistrationPlayerDraft[];
}

export interface TeamNameAvailabilityResult {
  available: boolean;
  normalizedName: string;
  scope: 'platform' | 'tournament';
  source: 'backend' | 'mock';
  reason?: string;
}

export interface PlayerEligibilityResult {
  eligible: boolean;
  pubgId: string;
  tournamentId?: ID;
  source: 'backend' | 'mock';
  reason?: 'registered-to-another-team' | 'invalid-format';
}

export interface KnownPlayerLookup {
  playerId: ID;
  pubgId: string;
  ign: string;
  previousAppearances: number;
  avatarUrl?: string;
  source: 'backend' | 'mock';
}

export interface TeamRegistrationSubmission {
  draft: TeamRegistrationDraft;
  password: string;
  idempotencyKey: string;
}

export interface TeamRegistrationReceipt {
  registrationId: ID;
  status: Extract<TeamRegistrationState, 'submitted' | 'under-review'>;
  duplicate: boolean;
  source: 'backend' | 'mock';
}

export interface Team {
  id: ID;
  name: string;
  slug?: string;
  tag?: string;
  logoUrl?: string;
  bannerUrl?: string;
  bannerAlt?: string;
  description?: string;
  country?: string;
  gameKey?: string;
  organizationId?: ID;
  organizationRelationship?: 'independent' | 'owned' | 'invitation-pending' | 'archived';
  socialLinks?: SocialLinks;
  verificationLevel?: VerificationLevel;
  captain: User;
  roster: TeamMember[];
  approvalStatus: TeamApprovalStatus;
  rejectionReason?: string;
  registeredAt: ISODate;
  foundedAt?: ISODate;
  profileComplete: boolean;
}

export interface TeamAchievement {
  id: ID;
  title: string;
  description: string;
  icon: AchievementIcon;
  state: AchievementState;
  category: AchievementCategory;
  tier: AchievementTier;
  rarity: AchievementRarity;
  progress?: { current: number; target: number; unit: string };
  unlockedAt?: ISODate;
  featured: boolean;
  displayOrder: number;
}

export interface OrganizationSocialLinks extends SocialLinks {
  linkedin?: string;
}

export interface OrganizationTeam {
  id: ID;
  organizationId: ID;
  gameKey: string;
  teamId: ID;
  displayName: string;
  slug: string;
  status: OrganizationTeamStatus;
  joinedAt: ISODate;
}

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  shortName: string;
  logoUrl?: string;
  bannerUrl?: string;
  bannerAlt?: string;
  description: string;
  foundedAt: ISODate;
  country: string;
  website?: string;
  socialLinks: OrganizationSocialLinks;
  verificationLevel: VerificationLevel;
  ownedTeams: OrganizationTeam[];
  featuredAchievements: ID[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PublicTeamProfile {
  team: Team;
  organization?: Organization;
  achievements: TeamAchievement[];
  featuredAchievementIds: ID[];
  legacy: TeamLegacyStats;
  recentResults: TeamTournamentResult[];
  career?: CareerSummaryData;
  recentMatches: MatchHistoryEntry[];
  upcomingMatch?: MatchScheduleItem;
  form: TeamFormEntry[];
  mapSpecialization: MapPerformanceSummary;
  /** Backend may return the same computed contract used by the frontend fallback. */
  specialization?: TeamSpecialization;
}

export interface PublicTeamSummary {
  id: ID;
  slug: string;
  name: string;
  tag?: string;
  logoUrl?: string;
  country?: string;
  verificationLevel?: VerificationLevel;
  rosterSize: number;
  gameKey?: string;
}

export interface TournamentParticipant {
  team: PublicTeamSummary;
  roster: Array<Pick<TeamMember, 'id' | 'ign' | 'role'>>;
  registrationStatus: 'confirmed';
}

export interface PublicPlayerProfile {
  id: ID;
  slug: string;
  ign: string;
  currentTeam?: Pick<PublicTeamSummary, 'id' | 'slug' | 'name' | 'logoUrl'>;
  joinedAt?: ISODate;
  achievements: TeamAchievement[];
  career?: CareerSummaryData;
  tournamentHistory: Array<{ tournamentId: ID; tournamentName: string; placement?: number }>;
}

export interface PublicMatchTeamResult {
  teamId: ID;
  teamName: string;
  teamSlug?: string;
  placement: number;
  finishes: number;
  placementPoints: number;
  totalPoints: number;
  wwcd: boolean;
}

export interface PublicMatchDetail {
  match: MatchScheduleItem | MatchHistoryEntry;
  tournament: Pick<Tournament, 'id' | 'name' | 'shortName'>;
  published: boolean;
  teamResults: PublicMatchTeamResult[];
}

export interface SearchResultItem {
  id: ID;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchResults {
  query: string;
  groups: Partial<Record<SearchEntityType, SearchResultItem[]>>;
}

export interface ArchiveSeason {
  id: ID;
  year: number;
  label: string;
  tournaments: Array<Pick<Tournament, 'id' | 'name' | 'shortName' | 'startsAt' | 'endsAt' | 'status'>>;
}

export interface RosterSnapshot {
  id: ID;
  teamId: ID;
  tournamentId?: ID;
  matchId?: ID;
  capturedAt: ISODate;
  members: Array<Pick<TeamMember, 'id' | 'ign' | 'role'>>;
}

export interface WrappedPeriod {
  type: WrappedPeriodType;
  year?: number;
  seasonId?: ID;
  label: string;
  startDate: ISODate;
  endDate: ISODate;
}

export interface WrappedMapStat {
  map: string;
  matches: number;
  wwcd: number;
  averagePlacement: number;
  averagePoints: number;
}

export interface WrappedSummary {
  entity: { type: 'team'; id: ID; slug: string; name: string; logoUrl?: string };
  period: WrappedPeriod;
  matches: number;
  kills: number;
  wwcd: number;
  podiums: number;
  championships?: number;
  mvp?: number;
  bestMap?: WrappedMapStat;
  biggestKillGame?: { matchId: ID; kills: number; map: string; tournamentName: string; playedAt: ISODate };
  records: RecordEntry[];
  achievements: TeamAchievement[];
  minimumMatches: number;
  available: boolean;
}

export interface NextAction {
  kind: 'blocking' | 'registration' | 'roster' | 'check-in' | 'room' | 'match' | 'announcement' | 'ready';
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
  startsAt?: ISODate;
}

export interface PublicPlatformSnapshot {
  tournaments: Tournament[];
  teams: PublicTeamSummary[];
  organizations: Organization[];
  leaderboard: TeamTournamentResult[];
  leaderboardTeams: string[];
  playerPerformances: PlayerPerformance[];
  teamComparisonRecords: TeamComparisonRecord[];
  teamAchievements: TeamAchievement[];
}

export interface TeamPlatformSnapshot {
  publicTeams?: PublicTeamSummary[];
  currentTeam: Team;
  participations: TeamTournamentParticipation[];
  checkIn?: CheckIn;
  currentRoom?: Pick<RoomCredentials, 'roundId' | 'status' | 'releaseAt'>;
  tournaments: Tournament[];
  leaderboard: TeamTournamentResult[];
  leaderboardTeams: string[];
  matchHistory: MatchHistoryEntry[];
  matchSchedule: MatchScheduleItem[];
  notifications: Notification[];
  adminMessages: AdminMessage[];
  teamAnnouncements: TeamAnnouncement[];
  teamAchievements: TeamAchievement[];
  teamLegacyStats: TeamLegacyStats;
  careerSummary: CareerSummaryData;
  teamComparisonRecords: TeamComparisonRecord[];
}

export interface AdminPlatformSnapshot {
  checkIns?: CheckIn[];
  publishedRoundIds?: Record<ID, ID[]>;
  matchSchedule?: MatchScheduleItem[];
  currentTeam: Team;
  tournaments: Tournament[];
  teams: Team[];
  slots: TournamentSlot[];
  adminMessages: AdminMessage[];
  blacklist: BlacklistEntry[];
  organizations: Organization[];
  teamAchievements: TeamAchievement[];
}

export interface FollowState {
  entityType: FollowEntityType;
  entityId: ID;
  following: boolean;
  source: 'backend';
}

export interface FollowMutation {
  entityType: FollowEntityType;
  entityId: ID;
  following: boolean;
}

export interface BrandUploadRequest {
  ownerType: 'team' | 'organization';
  ownerId: ID;
  assetType: 'logo' | 'banner';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface BrandAssetValidationResult {
  ok: boolean;
  reason?: string;
  warning?: string;
  renderMode?: 'cover' | 'contain';
}

export interface BrandUploadResult {
  previewUrl: string;
  status: 'mock-preview' | 'uploaded';
}

export interface TeamLegacyStats {
  foundedAt: ISODate;
  tournaments: number;
  wins: number;
  topPlacements: number;
  finishes: number;
  unlockedAchievements: number;
}

export interface TeamAchievementSharecardData {
  teamId: ID;
  teamName: string;
  achievementId: ID;
  achievementTitle: string;
  unlockedAt: ISODate;
  legacyStats: Pick<TeamLegacyStats, 'tournaments' | 'wins' | 'topPlacements' | 'finishes'>;
  brandStatement: string;
}

export interface MapRotation {
  id: ID;
  maps: string[];
}

export interface PlacementPoint {
  placement: number;
  points: number;
}

export interface PointFormula {
  placement: PlacementPoint[];
  finishPointValue: number;
  wwcdBonus: number;
  defaultPenalty: number;
  tieBreakRules: string[];
}

export interface PrizeDistribution {
  place: string;
  amount: number;
  currency: string;
}

export interface MatchRound {
  id: ID;
  stage: TournamentStage;
  day: number;
  round: number;
  map: string;
  startsAt: ISODate;
  roomReleaseAt: ISODate;
}

export interface MatchScheduleItem {
  id: ID;
  tournamentId: ID;
  stage: TournamentStage;
  day: number;
  lobby: string;
  round: number;
  map: string;
  startsAt: ISODate;
  status: 'completed' | 'live' | 'upcoming' | 'scheduled';
}

export interface MatchHistoryEntry {
  id: ID;
  publishedAt?: ISODate;
  disputeDeadlineAt?: ISODate;
  tournamentId: ID;
  tournamentName: string;
  playedAt: ISODate;
  stage: TournamentStage;
  stageLabel: string;
  map: string;
  placement: number;
  finishes: number;
  placementPoints?: number;
  killPoints?: number;
  points: number;
  wwcd: boolean;
}

export interface TeamFormEntry {
  matchId: ID;
  playedAt: ISODate;
  map: string;
  placement: number;
  finishes: number;
  points: number;
  wwcd: boolean;
  newest: boolean;
}

export type TeamSpecializationType = 'wwcd' | 'top_three' | 'kill_pressure' | 'consistency' | 'map';

export interface TeamSpecialization {
  type: TeamSpecializationType;
  label: string;
  score: number;
  sampleSize: number;
  evidence: string;
  supportingValue: number;
  supportingTotal: number;
  map?: string;
}

export interface MapPerformanceMetric {
  map: string;
  matches: number;
  wwcd: number;
  averagePlacement: number;
  averageFinishes: number;
  averagePoints: number;
}

export interface MapPerformanceSummary {
  teamId: ID;
  minimumSampleSize: number;
  status: 'ready' | 'insufficient-data';
  bestMap?: MapPerformanceMetric;
  mostWwcd?: MapPerformanceMetric;
  bestAveragePlacement?: MapPerformanceMetric;
  metrics: MapPerformanceMetric[];
}

export type CareerMetricKey = 'matches' | 'finishes' | 'wwcd' | 'championships' | 'podiums' | 'mvps';

export interface CareerMetric {
  key: CareerMetricKey;
  label: string;
  value: number;
  description: string;
}

export interface CareerSummaryData {
  teamId: ID;
  scopeLabel: string;
  metrics: CareerMetric[];
}

export interface TeamSeasonSummary {
  teamId: ID;
  seasonId: ID;
  seasonName: string;
  matches: number;
  finishes: number;
  wwcd: number;
  points: number;
  placement?: number;
}

export interface TeamMapPerformance {
  teamId: ID;
  map: string;
  matches: number;
  averagePlacement?: number;
  averageFinishes?: number;
  winRate?: number;
}

export interface TeamComparisonRecord {
  teamId: ID;
  teamName: string;
  matches: number;
  finishes: number;
  wwcd: number;
  averagePlacement?: number;
  averagePoints?: number;
  championships?: number;
  podiums?: number;
  mvps?: number;
}

export type RankMovementKind = 'up' | 'down' | 'unchanged' | 'new';

export interface RankMovementData {
  teamId: ID;
  currentRank: number;
  previousRank?: number;
  delta?: number;
  kind: RankMovementKind;
  previousSnapshotId?: ID;
}

export interface LeaderboardSnapshot {
  id: ID;
  tournamentId: ID;
  publishedAt: ISODate;
  standings: Array<{ teamId: ID; rank: number; totalPoints: number }>;
}

export type RecordType = 'MOST_KILLS_ONE_MATCH' | 'MOST_WWCD_ONE_TOURNAMENT' | 'MOST_CHAMPIONSHIPS' | 'HIGHEST_TOURNAMENT_POINTS' | 'MOST_KILLS_ONE_TOURNAMENT' | 'BEST_SINGLE_MATCH_POINTS' | 'MOST_PODIUM_FINISHES';

export interface RecordRosterSnapshot {
  playerId: ID;
  ign: string;
  role: TeamMember['role'];
}

export interface RecordEntry {
  id: ID;
  type: RecordType;
  label: string;
  value: number;
  unit: string;
  teamId: ID;
  teamName: string;
  teamLogo?: string;
  tournamentId: ID;
  tournamentName: string;
  matchId?: ID;
  roundLabel?: string;
  map?: string;
  achievedAt: ISODate;
  rosterSnapshot: RecordRosterSnapshot[];
  rosterSnapshotStatus: 'available' | 'unavailable';
  source: 'backend' | 'published-demo';
}

export interface TournamentRecapData {
  tournament: Tournament;
  coverage: 'complete' | 'partial';
  publishedAt: ISODate;
  champion?: PublicTeamSummary;
  standings: Array<{ rank: number; teamId: ID; teamName: string; points: number; wwcd: number; finishes: number }>;
  totalMatches: number;
  totalKills: number;
  totalWwcd: number;
  mostWwcd?: { teamId: ID; teamName: string; value: number };
  topKillTeam?: { teamId: ID; teamName: string; value: number };
  topKillPlayer?: { playerId: ID; ign: string; value: number };
  mvp?: { playerId: ID; ign: string; reason: string };
}

export interface CalendarEventData {
  id: ID;
  title: string;
  description: string;
  startsAt: ISODate;
  endsAt?: ISODate;
  timezone: string;
  location?: string;
  publicUrl: string;
}

export interface TeamProfileCardData {
  teamId: ID;
  teamName: string;
  teamLogo?: string;
  teamBanner?: string;
  teamTag?: string;
  organizationName?: string;
  country?: string;
  profileUrl: string;
  matches?: number;
  finishes?: number;
  wwcd?: number;
  championships?: number;
  podiums?: number;
  roster: Array<Pick<TeamMember, 'ign' | 'role'>>;
  year?: number;
  sourceLabel?: string;
}

export interface TeamAnnouncement {
  id: ID;
  eventId?: ID;
  kind: 'info' | 'important' | 'schedule' | 'warning';
  title: string;
  body: string;
  createdAt: ISODate;
  expiresAt?: ISODate;
  dismissible: boolean;
  actionLabel?: string;
  actionHref?: string;
  entityRef?: { type: CompetitionEventEntityType; id: ID };
}

export interface Tournament {
  id: ID;
  disputeDurationMinutes?: number;
  resultsPublishedAt?: ISODate;
  name: string;
  shortName: string;
  description: string;
  status: TournamentStatus;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationOpensAt: ISODate;
  registrationDeadline: ISODate;
  checkInOpensAt: ISODate;
  checkInClosesAt: ISODate;
  maxSlots: number;
  usedSlots: number;
  prizePool: number;
  prizeCurrency: string;
  days: number;
  roundsPerDay: number;
  mapRotation: MapRotation;
  pointFormula: PointFormula;
  prizeDistribution: PrizeDistribution[];
  rules: string[];
  featured?: boolean;
  qualification?: {
    advancesThroughRank: number;
    label: string;
    belowCutLabel?: string;
  };
}

export type TournamentCalendarStatus = 'registration-open' | 'registration-closed' | 'live' | 'completed';
export type TournamentCalendarParticipation = 'not-registered' | 'registered' | 'approved' | 'rejected';

export type TournamentJoinFailureCode =
  | 'ALREADY_REGISTERED'
  | 'FULL'
  | 'REGISTRATION_CLOSED'
  | 'INELIGIBLE'
  | 'ROSTER_INCOMPLETE'
  | 'PLAYER_CONFLICT'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface TournamentJoinResult {
  ok: boolean;
  status?: Extract<TournamentCalendarParticipation, 'registered' | 'approved'> | 'pending';
  reasonCode?: TournamentJoinFailureCode;
  reason?: string;
  duplicate?: boolean;
}

export interface TournamentCalendarEvent {
  id: ID;
  tournamentId: ID;
  title: string;
  startsAt: ISODate;
  status: TournamentCalendarStatus;
  registrationStatus: TournamentStatus;
  teamParticipation?: TournamentCalendarParticipation;
}

export interface TournamentRegistration {
  id: ID;
  tournamentId: ID;
  teamId: ID;
  status: RegistrationStatus;
  createdAt: ISODate;
}

export interface TeamTournamentParticipation extends TournamentRegistration {
  groupLabel?: string;
  slotNumber?: number;
  rosterLockAt?: ISODate;
  resultPlacement?: number;
}

export interface TournamentSlot {
  number: number;
  tournamentId: ID;
  teamId?: ID;
  state: 'available' | 'occupied' | 'reserved';
}

export interface CheckIn {
  tournamentId: ID;
  teamId: ID;
  status: CheckInStatus;
  opensAt: ISODate;
  closesAt: ISODate;
  checkedInAt?: ISODate;
}

export interface RoomCredentials {
  roundId: ID;
  status: RoomReleaseStatus;
  releaseAt: ISODate;
  roomId?: string;
  password?: string;
}

export interface RoundResult {
  id: ID;
  tournamentId: ID;
  roundId: ID;
  teamId: ID;
  placement: number;
  finishes: number;
  placementPoints: number;
  finishPoints: number;
  penalties: number;
  totalPoints: number;
  notes?: string;
  published: boolean;
}

export interface MatchResultBreakdown {
  matchId: ID;
  round: number;
  map: string;
  placement: number;
  placementPoints: number;
  kills: number;
  killPoints: number;
  totalPoints: number;
  isWWCD: boolean;
}

export interface TournamentResultBreakdown {
  tournamentId: ID;
  teamId: ID;
  stage?: TournamentStage;
  occurredAt?: ISODate;
  placement: number;
  matches: number;
  wwcd: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  penalties: number;
  totalPoints: number;
  maps: MatchResultBreakdown[];
}

export interface TeamTournamentResult {
  tournamentId: ID;
  teamId: ID;
  placement: number;
  matches: number;
  wwcd: number;
  finishes: number;
  placementPoints: number;
  finishPoints: number;
  penalties: number;
  totalPoints: number;
  bestFinish: number;
}

export interface PlayerPerformance {
  playerId: ID;
  ign: string;
  matches: number;
  finishes: number;
  averagePlacement: number;
  mvp?: boolean;
}

export interface Notification {
  id: ID;
  eventId?: ID;
  title: string;
  body: string;
  severity: NotificationSeverity;
  eventType?: CompetitionEventType;
  priority?: CompetitionEventPriority;
  entityRef?: { type: CompetitionEventEntityType; id: ID };
  createdAt: ISODate;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
}

export interface AdminMessage extends Notification {
  audience: 'all' | 'selected' | 'team';
  scheduledAt?: ISODate;
}

export interface BlacklistEntry {
  id: ID;
  teamId: ID;
  teamName: string;
  reason: string;
  startsAt: ISODate;
  expiresAt?: ISODate;
  permanent: boolean;
  active: boolean;
}

export interface RosterChange {
  id: ID;
  teamId: ID;
  outgoingPlayerId: ID;
  replacement: Pick<TeamMember, 'ign' | 'uid' | 'role'>;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  requestedAt: ISODate;
}

export interface RosterChangeRequest {
  id: ID;
  teamId: ID;
  teamName: string;
  tournamentId?: ID;
  tournamentName?: string;
  outgoing: Pick<TeamMember, 'id' | 'ign' | 'role'>;
  incoming: Pick<TeamMember, 'ign' | 'uid' | 'role'>;
  reason: string;
  status: RosterChangeStatus;
  submittedAt: ISODate;
  updatedAt: ISODate;
  adminNote?: string;
}

export interface ResultDispute {
  id: ID;
  teamId: ID;
  teamName: string;
  tournamentId: ID;
  tournamentName: string;
  matchId: ID;
  roundLabel: string;
  issueType: 'placement' | 'kills' | 'penalty' | 'missing-result' | 'other';
  description: string;
  evidenceNames: string[];
  status: DisputeStatus;
  submittedAt: ISODate;
  deadlineAt: ISODate;
  adminNote?: string;
  resolvedAt?: ISODate;
}

export interface SupportTicket {
  id: ID;
  category: 'account' | 'registration' | 'roster' | 'tournament' | 'results' | 'technical' | 'other';
  subject: string;
  description: string;
  status: SupportTicketStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: Array<{ id: ID; author: 'user' | 'support'; body: string; createdAt: ISODate }>;
}

export interface AdminAuditEvent {
  id: ID;
  action: string;
  entityType: string;
  entityId: ID;
  actorName: string;
  actorRole: AdminRoleKey;
  createdAt: ISODate;
  metadata: Record<string, string | number | boolean>;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  role: AdminRoleKey;
  twoFactorEnabled: boolean;
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: ISODate;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
  hasMore: boolean;
}

export type TeamAuthorityRole = 'OWNER' | 'CAPTAIN' | 'MANAGER' | 'CO_CAPTAIN' | 'PLAYER' | 'SUBSTITUTE';
export type OrganizationAuthorityRole = 'OWNER' | 'MANAGER' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type VerificationStatus = 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type VerificationEntityType = 'TEAM' | 'ORGANIZATION' | 'PLAYER';

export interface TeamAuthorityMember {
  id: ID;
  userId: ID;
  displayName: string;
  role: TeamAuthorityRole;
  joinedAt: ISODate;
  permissions: string[];
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface DurableInvitation {
  id: ID;
  type: 'TEAM_MEMBER' | 'TEAM_MANAGER' | 'ORGANIZATION_MEMBER' | 'ORGANIZATION_TEAM';
  entityId: ID;
  entityName: string;
  recipientLabel: string;
  role?: TeamAuthorityRole | OrganizationAuthorityRole;
  status: InvitationStatus;
  createdAt: ISODate;
  expiresAt: ISODate;
  respondedAt?: ISODate;
  tournamentImplications?: string;
}

export interface MembershipHistoryEntry {
  id: ID;
  userId: ID;
  entityId: ID;
  entityName: string;
  role: TeamAuthorityRole | OrganizationAuthorityRole;
  joinedAt: ISODate;
  leftAt?: ISODate;
  snapshotLabel?: string;
}

export interface VerificationRequest {
  id: ID;
  entityType: VerificationEntityType;
  entityId: ID;
  entityName: string;
  representativeName: string;
  officialSocials: SocialLinks;
  evidenceNames: string[];
  notes?: string;
  status: VerificationStatus;
  safeReason?: string;
  submittedAt?: ISODate;
  reviewedAt?: ISODate;
  reviewedBy?: ID;
}

export interface PlayerClaim {
  id: ID;
  playerId: ID;
  claimantUserId: ID;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationMethod: 'ACCOUNT_MATCH' | 'PUBG_IDENTITY' | 'ADMIN_REVIEW';
  createdAt: ISODate;
  reviewedAt?: ISODate;
  safeReason?: string;
}

export interface ResultVersion {
  id: ID;
  resultId: ID;
  version: number;
  createdAt: ISODate;
  createdBy: ID;
  reason: string;
  dataSnapshot: RoundResult;
}

export interface MissedCheckIn {
  id: ID;
  tournamentId: ID;
  tournamentName: string;
  teamId: ID;
  teamName: string;
  missedAt: ISODate;
  consequence: string;
  appealAllowed: boolean;
  appealDeadline?: ISODate;
}

export interface AdminPlayerDetail extends PublicPlayerProfile {
  linkedAccount?: { userId: ID; emailHint: string; status: 'ACTIVE' | 'SUSPENDED' };
  membershipHistory: MembershipHistoryEntry[];
  tournamentHistory: Array<{ tournamentId: ID; tournamentName: string; playedAt: ISODate; rosterSnapshotId: ID }>;
  eligibilityConflicts: Array<{ id: ID; reason: string; createdAt: ISODate; resolvedAt?: ISODate }>;
  sanctions: Array<{ id: ID; type: 'BAN' | 'SUSPENSION'; reason: string; startsAt: ISODate; endsAt?: ISODate }>;
  verification: VerificationRequest;
  adminNotes?: Array<{ id: ID; body: string; createdAt: ISODate; createdBy: ID }>;
}

export interface OrganizationMember {
  id: ID;
  userId: ID;
  displayName: string;
  role: OrganizationAuthorityRole;
  joinedAt: ISODate;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SupportTicketReply {
  body: string;
  status?: SupportTicketStatus;
}

export interface AccountExportJob {
  id: ID;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';
  requestedAt: ISODate;
  completedAt?: ISODate;
  expiresAt?: ISODate;
  downloadUrl?: string;
  requestId?: string;
}

export interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  events: Record<string, boolean>;
}
