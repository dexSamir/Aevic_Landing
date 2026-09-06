import { adminMessages, blacklist, careerSummary, currentTeam, leaderboard, leaderboardTeams, matchHistory, matchSchedule, notifications, organizations, playerPerformances, slots, teamAchievements, teamAnnouncements, teamComparisonRecords, teamLegacyStats, teams, teamTournamentParticipations, tournamentParticipantTeamIds, tournaments } from '../mocks/data';
import type { AccountSession, AdminAuditEvent, AdminUser, NotificationPreferences, ResultDispute, RosterChangeRequest, RoundResult, SupportTicket, Team, UserRole } from '../types/domain';
import type { PlatformServices } from './contracts';
import { validateBrandAssetRequest } from './brandAssetValidation';
import { buildPublishedDemoRecords, buildTournamentRecap, deriveTeamForm, summarizeMapPerformance } from '../utils/competitionAnalytics';
import { deriveWrappedSummary } from '../utils/wrapped';
import { MOCK_COMPETITION_NOW_ISO, mockCompetitionNow } from '../mocks/clock';
import { tournamentAcceptsRegistration } from '../utils/tournamentTime';

const wait = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clone = <T,>(value: T): T => structuredClone(value);
const isAchievement = (value: typeof teamAchievements[number] | undefined): value is typeof teamAchievements[number] => Boolean(value);
const backendRequired = async (): Promise<never> => {
  await wait(80);
  throw new Error('This lifecycle requires the production backend. Mock mode does not simulate authoritative persistence.');
};

let mockRole: UserRole = 'team';
let mockPreferences: NotificationPreferences = {
  channels: { 'in-app': true, email: true, push: false },
  events: { checkIn: true, roomRelease: true, results: true, adminMessages: true, roster: true },
};
let featuredAchievementIds = teamAchievements.filter((achievement) => achievement.featured).sort((a, b) => a.displayOrder - b.displayOrder).map((achievement) => achievement.id);
let mockNotifications = clone(notifications);
let mockSessions: AccountSession[] = [
  { id: 'session-current', device: 'MacBook Air', browser: 'Chrome', location: 'Bakı', lastActiveAt: '2026-08-14T13:20:00+04:00', status: 'current' },
  { id: 'session-phone', device: 'iPhone 15', browser: 'Safari', location: 'Bakı', lastActiveAt: '2026-08-12T20:05:00+04:00', status: 'active' },
];
let mockRosterRequests: RosterChangeRequest[] = [{ id: 'RC-0021', teamId: currentTeam.id, teamName: currentTeam.name, tournamentId: tournaments[0].id, tournamentName: tournaments[0].name, outgoing: { id: 'p5', ign: 'Nox', role: 'substitute' }, incoming: { ign: 'Ares', uid: '51001234999', role: 'substitute' }, reason: 'Ehtiyat oyunçunun yarış cədvəli ilə ziddiyyət yaranıb.', status: 'under-review', submittedAt: '2026-08-13T14:20:00+04:00', updatedAt: '2026-08-14T09:10:00+04:00', adminNote: 'PUBG ID uyğunluğu yoxlanılır.' }];
let mockDisputes: ResultDispute[] = [{ id: 'DSP-0007', teamId: currentTeam.id, teamName: currentTeam.name, tournamentId: 'summer-final-25', tournamentName: 'Summer Final 2025', matchId: 'summer-final-r4', roundLabel: 'Final · R4', issueType: 'kills', description: 'Dərc edilmiş kill sayı kapitan qeydindən bir vahid azdır.', evidenceNames: ['scoreboard-r4.png'], status: 'under-review', submittedAt: '2026-08-13T11:40:00+04:00', deadlineAt: '2026-08-15T23:59:00+04:00' }];
let mockTickets: SupportTicket[] = [{ id: 'SUP-1042', category: 'tournament', subject: 'Check-in statusu barədə sual', description: 'Mobil paneldə check-in vaxtını təsdiqləmək istəyirəm.', status: 'waiting-for-user', createdAt: '2026-08-12T10:20:00+04:00', updatedAt: '2026-08-13T15:05:00+04:00', messages: [{ id: 'msg-1', author: 'support', body: 'Turnir linkini və ekran görüntüsünü göndərin.', createdAt: '2026-08-13T15:05:00+04:00' }] }];
const mockAuditEvents: AdminAuditEvent[] = [
  { id: 'audit-1', action: 'TEAM_APPROVED', entityType: 'team', entityId: currentTeam.id, actorName: 'Samir H.', actorRole: 'super-admin', createdAt: '2026-08-14T10:30:00+04:00', metadata: { source: 'admin-team-detail' } },
  { id: 'audit-2', action: 'ROOM_CREDENTIAL_ACCESSED', entityType: 'round', entityId: 'dc24-r1', actorName: 'Tournament Ops', actorRole: 'tournament-manager', createdAt: '2026-08-14T09:48:00+04:00', metadata: { teamId: currentTeam.id, secretIncluded: false } },
];
const mockAdminUsers: AdminUser[] = [
  { id: 'admin-1', name: 'Samir H.', email: 'admin@example.test', role: 'super-admin', twoFactorEnabled: true, status: 'active', lastActiveAt: '2026-08-14T13:10:00+04:00' },
  { id: 'admin-2', name: 'Result Operator', email: 'results@example.test', role: 'result-operator', twoFactorEnabled: false, status: 'invited' },
];
const registrationReceipts = new Map<string, { registrationId: string; status: 'under-review'; duplicate: boolean; source: 'mock' }>();
const knownRegistrationPlayers = [
  { playerId: playerPerformances[0].playerId, pubgId: '51234567890', ign: playerPerformances[0].ign, previousAppearances: 3, registeredTeamId: 'team-02', tournamentId: tournaments[0].id },
] as const;

const syntheticRoom = {
  roundId: 'dc24-r1',
  status: 'locked' as const,
  releaseAt: '2026-08-04T20:52:00+04:00',
};

const releasedRoomAvailability = { ...syntheticRoom, status: 'released' as const };
const releasedSyntheticRoom = { ...releasedRoomAvailability, roomId: '1234567', password: 'AEVIC24' };

function teamSnapshotScenario() {
  const scenario = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('scenario');
  const checkIn = { tournamentId: tournaments[0].id, teamId: currentTeam.id, status: scenario === 'room-ready' ? 'checked-in' as const : scenario === 'check-in-open' ? 'open' as const : 'pending' as const, opensAt: '2026-08-04T20:15:00+04:00', closesAt: '2026-08-04T20:45:00+04:00', checkedInAt: scenario === 'room-ready' ? '2026-08-04T20:36:00+04:00' : undefined };
  const base = { currentTeam, publicTeams: publicTeamSummaries(), participations: teamTournamentParticipations, checkIn, currentRoom: scenario === 'room-ready' ? releasedRoomAvailability : syntheticRoom, tournaments, leaderboard, leaderboardTeams, matchHistory, matchSchedule, notifications, adminMessages, teamAnnouncements, teamAchievements, teamLegacyStats, careerSummary, teamComparisonRecords };
  if (scenario === 'no-active-tournament') return { ...base, participations: [], tournaments: [], matchSchedule: [], checkIn: undefined, currentRoom: undefined };
  if (scenario === 'no-updates') return { ...base, notifications: [], adminMessages: [], teamAnnouncements: [] };
  if (scenario === 'one-critical') return { ...base, notifications: [], teamAnnouncements: [], adminMessages: adminMessages.slice(0, 1) };
  return base;
}

const publicTeamSummaries = () => teams.filter((team) => team.approvalStatus === 'approved' && team.slug).map((team) => ({ id: team.id, slug: team.slug!, name: team.name, tag: team.tag, logoUrl: team.logoUrl, country: team.country, verificationLevel: team.verificationLevel, rosterSize: team.roster.length, gameKey: team.gameKey }));
const publicPlayerRecords = () => teams.filter((team) => team.approvalStatus === 'approved' && team.slug).flatMap((team) => team.roster.map((member) => ({ team, member })));
const publishedRecords = () => buildPublishedDemoRecords(currentTeam, matchHistory);

export const mockServices: PlatformServices = {
  snapshots: {
    async public() { await wait(40); return clone({ tournaments, teams: publicTeamSummaries(), organizations, leaderboard, leaderboardTeams, playerPerformances, teamComparisonRecords, teamAchievements }); },
    async team() { await wait(40); return clone(teamSnapshotScenario()); },
    async admin() { await wait(40); return clone({ currentTeam, tournaments, teams, slots, adminMessages, blacklist, organizations, teamAchievements }); },
  },
  auth: {
    async getSession() {
      await wait(40);
      if (mockRole === 'visitor') return null;
      return { user: currentTeam.captain, role: mockRole };
    },
    async login(email) {
      await wait();
      mockRole = email.toLowerCase().includes('admin') ? 'admin' : 'team';
      return { user: { ...currentTeam.captain, email, role: mockRole }, role: mockRole };
    },
    async logout() { await wait(80); mockRole = 'visitor'; },
    async requestPasswordReset() { await wait(); },
    async inspectPasswordReset(token) { await wait(80); return { state: token === 'expired' ? 'expired' : token === 'used' ? 'used' : token === 'invalid' || !token ? 'invalid' : 'valid', emailHint: 'ca•••••@example.test' }; },
    async resetPassword(token) { await wait(); if (['expired', 'used', 'invalid', ''].includes(token)) throw new Error('Invalid reset token.'); },
    async inspectEmailVerification(token) { await wait(80); return { state: token === 'expired' ? 'expired' : token === 'verified' ? 'already-verified' : token === 'invalid' || !token ? 'invalid' : 'valid', emailHint: 'ca•••••@example.test' }; },
    async verifyEmail(token) { await wait(); if (['expired', 'invalid', ''].includes(token)) throw new Error('Invalid verification token.'); },
    async resendVerification() { await wait(); },
  },
  account: {
    async profile() { await wait(50); return clone({ user: currentTeam.captain, emailVerified: true, dataExportStatus: 'backend-required' as const }); },
    async updateProfile(profile) { await wait(); currentTeam.captain = { ...currentTeam.captain, ...profile }; return clone({ user: currentTeam.captain, emailVerified: true, dataExportStatus: 'backend-required' as const }); },
    async changePassword() { await wait(); },
    async sessions() { await wait(50); return clone(mockSessions); },
    async revokeSession(sessionId) { await wait(); mockSessions = mockSessions.filter((session) => session.id !== sessionId || session.status === 'current'); },
    async revokeOtherSessions() { await wait(); mockSessions = mockSessions.filter((session) => session.status === 'current'); },
    async twoFactorStatus() { await wait(40); return { enabled: false, required: false, setupAvailable: false }; },
    async beginTwoFactorSetup() { return backendRequired(); },
    async verifyTwoFactorSetup() { return backendRequired(); },
    async disableTwoFactor() { return backendRequired(); },
    async regenerateRecoveryCodes() { return backendRequired(); },
    async requestDataExport() { return backendRequired(); },
    async dataExportStatus() { return backendRequired(); },
    async requestDeletion() { await wait(); return { blocked: true, reason: 'Komanda sahibliyini əvvəlcə transfer etməlisiniz.' }; },
  },
  registration: {
    async checkTeamName(name, tournamentId) {
      await wait(260);
      const normalizedName = name.trim().replace(/\s+/g, ' ');
      const taken = teams.some((team) => team.name.localeCompare(normalizedName, 'az', { sensitivity: 'base' }) === 0);
      return { available: !taken, normalizedName, scope: tournamentId ? 'tournament' : 'platform', source: 'mock', reason: taken ? 'Bu komanda adı artıq istifadə olunur.' : undefined };
    },
    async validatePlayer(pubgId, tournamentId) {
      await wait(220);
      if (!/^\d{8,15}$/.test(pubgId)) return { eligible: false, pubgId, tournamentId, source: 'mock', reason: 'invalid-format' };
      const conflict = knownRegistrationPlayers.find((player) => player.pubgId === pubgId && (!tournamentId || player.tournamentId === tournamentId));
      return { eligible: !conflict, pubgId, tournamentId, source: 'mock', reason: conflict ? 'registered-to-another-team' : undefined };
    },
    async lookupPlayer(pubgId) {
      await wait(180);
      const player = knownRegistrationPlayers.find((item) => item.pubgId === pubgId);
      return player ? { playerId: player.playerId, pubgId: player.pubgId, ign: player.ign, previousAppearances: player.previousAppearances, source: 'mock' } : null;
    },
    async submit(request) {
      await wait(420);
      const previous = registrationReceipts.get(request.idempotencyKey);
      if (previous) return clone({ ...previous, duplicate: true });
      const receipt = { registrationId: `mock-registration-${registrationReceipts.size + 1}`, status: 'under-review' as const, duplicate: false, source: 'mock' as const };
      registrationReceipts.set(request.idempotencyKey, receipt);
      return clone(receipt);
    },
  },
  tournaments: {
    async list() { await wait(60); return clone(tournaments); },
    async get(id) { await wait(60); return clone(tournaments.find((item) => item.id === id)); },
    async join(tournamentId, teamId) {
      await wait();
      const tournament = tournaments.find((item) => item.id === tournamentId);
      const team = teams.find((item) => item.id === teamId);
      if (!team) return { ok: false, reasonCode: 'UNAUTHORIZED', reason: 'Team was not found.' };
      const existing = slots.find((slot) => slot.tournamentId === tournamentId && slot.teamId === teamId);
      if (existing) return { ok: true, status: 'registered', duplicate: true };
      if (team.approvalStatus !== 'approved') return { ok: false, reasonCode: 'INELIGIBLE', reason: 'Team approval is required.' };
      if (!team.profileComplete || team.roster.filter((member) => member.role !== 'substitute').length < 4) return { ok: false, reasonCode: 'ROSTER_INCOMPLETE', reason: 'The active roster is incomplete.' };
      if (!tournament || !tournamentAcceptsRegistration(tournament, MOCK_COMPETITION_NOW_ISO)) return { ok: false, reasonCode: 'REGISTRATION_CLOSED', reason: 'Registration is not open.' };
      const availableSlot = slots.find((slot) => slot.tournamentId === tournamentId && slot.state === 'available');
      if (tournament.usedSlots >= tournament.maxSlots || !availableSlot) return { ok: false, reasonCode: 'FULL', reason: 'No tournament slots remain.' };
      availableSlot.teamId = teamId;
      availableSlot.state = 'occupied';
      tournament.usedSlots += 1;
      return { ok: true, status: 'registered', duplicate: false };
    },
    async slots(tournamentId) { await wait(80); return clone(slots.filter((slot) => slot.tournamentId === tournamentId)); },
    async publicParticipants(tournamentId) {
      await wait(60);
      const confirmedIds = new Set(tournamentParticipantTeamIds[tournamentId] ?? []);
      return clone(teams.filter((team) => confirmedIds.has(team.id) && team.approvalStatus === 'approved' && team.slug).map((team) => ({
        team: { id: team.id, slug: team.slug!, name: team.name, tag: team.tag, logoUrl: team.logoUrl, country: team.country, verificationLevel: team.verificationLevel, rosterSize: team.roster.length, gameKey: team.gameKey },
        roster: team.roster.map(({ id, ign, role }) => ({ id, ign, role })),
        registrationStatus: 'confirmed' as const,
      })));
    },
    async recap(tournamentId) {
      await wait(70);
      const tournament = tournaments.find((item) => item.id === tournamentId);
      return clone(tournament ? buildTournamentRecap(tournament, matchHistory, leaderboard, publicTeamSummaries()) : undefined);
    },
    async calendarEvent(tournamentId) {
      await wait(40);
      const tournament = tournaments.find((item) => item.id === tournamentId);
      if (!tournament) return undefined;
      return clone({ id: `tournament-${tournament.id}`, title: tournament.name, description: `${tournament.shortName} · ${tournament.days} gün · ${tournament.roundsPerDay * tournament.days} raund`, startsAt: tournament.startsAt, endsAt: tournament.endsAt, timezone: 'Asia/Baku', location: 'AEVIC Esports', publicUrl: new URL(`/tournaments/${tournament.id}`, window.location.origin).toString() });
    },
    async cancel() { return backendRequired(); },
    async archive() { return backendRequired(); },
    async missedCheckIns() { await wait(40); return { items: [], hasMore: false, total: 0 }; },
  },
  teams: {
    async current() { await wait(50); return clone(currentTeam); },
    async list() { await wait(80); return clone(teams); },
    async setApproval(teamId, status, reason) {
      await wait();
      const index = teams.findIndex((team) => team.id === teamId);
      if (index < 0) throw new Error('Team was not found.');
      teams[index] = { ...teams[index], approvalStatus: status, rejectionReason: reason };
      return clone(teams[index]);
    },
    async checkIn(tournamentId) {
      await wait();
      const tournament = tournaments.find((item) => item.id === tournamentId);
      const now = mockCompetitionNow();
      if (!tournament || now.getTime() < Date.parse(tournament.checkInOpensAt) || now.getTime() > Date.parse(tournament.checkInClosesAt)) throw new Error('Check-in window is closed.');
      return { tournamentId, teamId: currentTeam.id, status: 'checked-in', opensAt: tournament.checkInOpensAt, closesAt: tournament.checkInClosesAt, checkedInAt: now.toISOString() };
    },
    async withdraw() { await wait(); },
    async updateSocialLinks(teamId, socialLinks) {
      await wait();
      const team = teams.find((item) => item.id === teamId);
      if (!team) throw new Error('Team was not found.');
      team.socialLinks = clone(socialLinks);
      return clone(team);
    },
    async authority() { await wait(40); return [{ id: 'authority-owner', userId: currentTeam.captain.id, displayName: `${currentTeam.captain.firstName} ${currentTeam.captain.lastName}`, role: 'OWNER', joinedAt: currentTeam.registeredAt, permissions: ['team.manage', 'roster.manage', 'tournament.register'], status: 'ACTIVE' }]; },
    async invitations() { await wait(40); return { items: [], hasMore: false, total: 0 }; },
    async invite() { return backendRequired(); },
    async cancelInvitation() { return backendRequired(); },
    async respondToInvitation() { return backendRequired(); },
    async removeAuthorityMember() { return backendRequired(); },
    async transferOwnership() { return backendRequired(); },
    async leave() { return backendRequired(); },
    async archive() { return backendRequired(); },
  },
  achievements: {
    async listForTeam() { await wait(50); return clone(teamAchievements); },
    async legacyForTeam() { await wait(50); return clone(teamLegacyStats); },
    async featuredForTeam() { await wait(50); return clone(featuredAchievementIds.map((id) => teamAchievements.find((achievement) => achievement.id === id)).filter(isAchievement)); },
    async saveFeatured(_teamId, achievementIds) {
      await wait();
      if (achievementIds.length > 3) throw new Error('A maximum of three badges can be featured.');
      if (achievementIds.some((id) => !teamAchievements.some((achievement) => achievement.id === id && achievement.state === 'unlocked'))) throw new Error('Only unlocked badges can be featured.');
      featuredAchievementIds = [...achievementIds];
      return clone(featuredAchievementIds.map((id) => teamAchievements.find((achievement) => achievement.id === id)).filter(isAchievement));
    },
  },
  organizations: {
    async list() { await wait(70); return clone(organizations); },
    async getBySlug(slug) { await wait(60); return clone(organizations.find((organization) => organization.slug === slug)); },
    async linkTeam(organizationId, teamId, gameKey) {
      await wait();
      const organization = organizations.find((item) => item.id === organizationId);
      const team = teams.find((item) => item.id === teamId);
      if (!organization || !team) throw new Error('Organization or team was not found.');
      if (!organization.ownedTeams.some((item) => item.teamId === teamId)) organization.ownedTeams.push({ id: `org-team-${teamId}`, organizationId, teamId, gameKey, displayName: team.name, slug: team.slug ?? team.id, status: 'active', joinedAt: mockCompetitionNow().toISOString() });
      team.organizationId = organizationId; team.organizationRelationship = 'owned';
      return clone(organization);
    },
    async unlinkTeam(organizationId, teamId) {
      await wait();
      const organization = organizations.find((item) => item.id === organizationId);
      if (!organization) throw new Error('Organization was not found.');
      organization.ownedTeams = organization.ownedTeams.filter((item) => item.teamId !== teamId);
      const team = teams.find((item) => item.id === teamId);
      if (team) { team.organizationId = undefined; team.organizationRelationship = 'archived'; }
      return clone(organization);
    },
    async updateSocialLinks(organizationId, socialLinks) {
      await wait();
      const organization = organizations.find((item) => item.id === organizationId);
      if (!organization) throw new Error('Organization was not found.');
      organization.socialLinks = clone(socialLinks);
      return clone(organization);
    },
    async create() { return backendRequired(); },
    async members() { await wait(40); return []; },
    async invitations() { await wait(40); return { items: [], hasMore: false, total: 0 }; },
    async inviteMember() { return backendRequired(); },
    async inviteTeam() { return backendRequired(); },
    async respondToInvitation() { return backendRequired(); },
    async removeTeam() { return backendRequired(); },
    async transferOwnership() { return backendRequired(); },
  },
  profiles: {
    async listTeams(query = '') {
      await wait(60);
      const normalized = query.trim().toLocaleLowerCase('az');
      return clone(publicTeamSummaries().filter((team) => !normalized || team.name.toLocaleLowerCase('az').includes(normalized)));
    },
    async teamBySlug(slug) {
      await wait(60);
      const team = teams.find((item) => item.slug === slug && item.approvalStatus === 'approved');
      if (!team) return undefined;
      const organization = organizations.find((item) => item.id === team.organizationId);
      const isCurrent = team.id === currentTeam.id;
      const resultIndex = team.name === 'Baku Sentinels' ? 0 : team.name === currentTeam.name ? 1 : -1;
      const recentMatches = isCurrent ? matchHistory : [];
      return clone({ team, organization, achievements: isCurrent ? teamAchievements : [], featuredAchievementIds: isCurrent ? featuredAchievementIds : [], legacy: isCurrent ? teamLegacyStats : { foundedAt: team.foundedAt ?? team.registeredAt, tournaments: 0, wins: 0, topPlacements: 0, finishes: 0, unlockedAchievements: 0 }, recentResults: resultIndex >= 0 ? [leaderboard[resultIndex]] : [], career: isCurrent ? careerSummary : undefined, recentMatches: recentMatches.slice(0, 5), upcomingMatch: isCurrent ? matchSchedule[0] : undefined, form: deriveTeamForm(recentMatches), mapSpecialization: summarizeMapPerformance(team.id, recentMatches) });
    },
    async matches(teamId) { await wait(50); return clone(teamId === currentTeam.id ? matchHistory : []); },
    async upcomingMatch(teamId) { await wait(50); return clone(teamId === currentTeam.id ? matchSchedule[0] : undefined); },
    async seasons() { await wait(40); return []; },
    async mapPerformance() { await wait(40); return []; },
    async form(teamId) { await wait(40); return clone(teamId === currentTeam.id ? deriveTeamForm(matchHistory) : []); },
    async mapSpecialization(teamId) { await wait(40); return clone(summarizeMapPerformance(teamId, teamId === currentTeam.id ? matchHistory : [])); },
  },
  publicMatches: {
    async schedule() { await wait(60); return clone(matchSchedule); },
    async history() { await wait(60); return clone(matchHistory); },
    async get(id) {
      await wait(50);
      const published = matchHistory.find((item) => item.id === id);
      const scheduled = matchSchedule.find((item) => item.id === id);
      const match = published ?? scheduled;
      if (!match) return undefined;
      const tournament = tournaments.find((item) => item.id === match.tournamentId);
      if (!tournament) return undefined;
      return clone({
        match,
        tournament: { id: tournament.id, name: tournament.name, shortName: tournament.shortName },
        published: Boolean(published),
        teamResults: published ? [{
          teamId: currentTeam.id,
          teamName: currentTeam.name,
          teamSlug: currentTeam.slug,
          placement: published.placement,
          finishes: published.finishes,
          placementPoints: Math.max(0, published.points - published.finishes),
          totalPoints: published.points,
          wwcd: published.wwcd,
        }] : [],
      });
    },
    async calendarEvent(matchId) {
      await wait(40);
      const match = matchSchedule.find((item) => item.id === matchId);
      if (!match) return undefined;
      const tournament = tournaments.find((item) => item.id === match.tournamentId);
      return clone({ id: `match-${match.id}`, title: `${tournament?.shortName ?? 'AEVIC'} — ${match.map} R${match.round}`, description: `${tournament?.name ?? 'AEVIC tournament'} · ${match.lobby} · ${match.stage}`, startsAt: match.startsAt, timezone: 'Asia/Baku', location: `${match.lobby} · ${match.map}`, publicUrl: new URL('/matches', window.location.origin).toString() });
    },
  },
  search: {
    async public(query) {
      await wait(70);
      const normalized = query.trim().toLocaleLowerCase('az');
      if (!normalized) return { query, groups: {} };
      const teamResults = publicTeamSummaries().filter((team) => team.name.toLocaleLowerCase('az').includes(normalized)).map((team) => ({ id: team.id, type: 'team' as const, title: team.name, subtitle: `${team.country ?? 'AEVIC'} · PUBG Mobile`, href: `/teams/${team.slug}` }));
      const tournamentResults = tournaments.filter((tournament) => tournament.name.toLocaleLowerCase('az').includes(normalized)).map((tournament) => ({ id: tournament.id, type: 'tournament' as const, title: tournament.name, subtitle: tournament.shortName, href: `/tournaments/${tournament.id}` }));
      const recordResults = publishedRecords().filter((record) => `${record.label} ${record.teamName}`.toLocaleLowerCase('az').includes(normalized)).map((record) => ({ id: record.id, type: 'record' as const, title: record.label, subtitle: `${record.teamName} · ${record.value} ${record.unit}`, href: `/records/${record.id}` }));
      return clone({ query, groups: { team: teamResults, tournament: tournamentResults, record: recordResults } });
    },
  },
  players: {
    async getBySlug(slug) {
      await wait(60);
      const record = publicPlayerRecords().find(({ member }) => member.ign.toLocaleLowerCase('az') === slug.toLocaleLowerCase('az'));
      if (!record) return undefined;
      const { team, member: player } = record;
      const tournamentHistory = Object.entries(tournamentParticipantTeamIds).filter(([, teamIds]) => teamIds.includes(team.id)).map(([tournamentId]) => {
        const tournament = tournaments.find((item) => item.id === tournamentId);
        return tournament ? { tournamentId, tournamentName: tournament.name } : undefined;
      }).filter((item): item is { tournamentId: string; tournamentName: string } => Boolean(item));
      return clone({
        id: player.id,
        slug: player.ign.toLocaleLowerCase('az'),
        ign: player.ign,
        currentTeam: { id: team.id, slug: team.slug!, name: team.name, logoUrl: team.logoUrl },
        joinedAt: player.joinedAt,
        achievements: [],
        tournamentHistory,
      });
    },
    async list(query = '') {
      await wait(50);
      const normalized = query.trim().toLocaleLowerCase('az');
      const items = publicPlayerRecords().filter(({ member }) => !normalized || member.ign.toLocaleLowerCase('az').includes(normalized)).map(({ team, member }) => ({ id: member.id, slug: member.ign.toLocaleLowerCase('az'), ign: member.ign, currentTeam: { id: team.id, slug: team.slug!, name: team.name, logoUrl: team.logoUrl }, joinedAt: member.joinedAt, achievements: [], tournamentHistory: [] }));
      return clone({ items, hasMore: false, total: items.length });
    },
    async claim() { return backendRequired(); },
    async invitations() { await wait(40); return { items: [], hasMore: false, total: 0 }; },
    async membershipHistory() { await wait(40); return []; },
  },
  archive: {
    async seasons() {
      await wait(60);
      const byYear = new Map<number, typeof tournaments>();
      tournaments.forEach((tournament) => {
        const year = new Date(tournament.startsAt).getFullYear();
        byYear.set(year, [...(byYear.get(year) ?? []), tournament]);
      });
      return clone([...byYear.entries()].sort(([a], [b]) => b - a).map(([year, entries]) => ({
        id: `year-${year}`,
        year,
        label: `${year} mövsümü`,
        tournaments: entries.map(({ id, name, shortName, startsAt, endsAt, status }) => ({ id, name, shortName, startsAt, endsAt, status })),
      })));
    },
  },
  wrapped: {
    async forTeam(teamSlug, period) {
      await wait(80);
      const team = teams.find((item) => item.slug === teamSlug && item.approvalStatus === 'approved');
      if (!team) return undefined;
      const isCurrent = team.id === currentTeam.id;
      return clone(deriveWrappedSummary({
        team,
        period,
        matches: isCurrent ? matchHistory : [],
        achievements: isCurrent ? teamAchievements : [],
        records: isCurrent ? publishedRecords() : [],
      }));
    },
  },
  records: {
    async list() { await wait(70); return clone(publishedRecords()); },
    async get(id) { await wait(50); return clone(publishedRecords().find((record) => record.id === id)); },
    async history() { await wait(50); return []; },
  },
  media: {
    async validateBrandAsset(request) {
      await wait(40);
      return validateBrandAssetRequest(request);
    },
    async uploadBrandAsset(request) {
      const validation = await this.validateBrandAsset(request);
      if (!validation.ok) throw new Error(validation.reason);
      return { previewUrl: '', status: 'mock-preview' };
    },
  },
  rooms: {
    async getForEligibleTeam() { await wait(80); return clone(new URLSearchParams(window.location.search).get('scenario') === 'room-ready' ? releasedSyntheticRoom : syntheticRoom); },
  },
  results: {
    async leaderboard(tournamentId) { await wait(70); return clone(leaderboard.filter((result) => result.tournamentId === tournamentId)); },
    async snapshots() { await wait(40); return []; },
    async movement() { await wait(40); return []; },
    async saveRound(result: RoundResult) { await wait(); return clone(result); },
    async versions() { await wait(40); return []; },
    async correct() { return backendRequired(); },
  },
  notifications: {
    async inbox() { await wait(50); return clone(mockNotifications); },
    async messages() { await wait(50); return clone(adminMessages); },
    async preferences() { await wait(50); return clone(mockPreferences); },
    async updatePreferences(value) { await wait(); mockPreferences = clone(value); return clone(mockPreferences); },
    async markRead(id) { await wait(40); mockNotifications = mockNotifications.map((item) => item.id === id ? { ...item, read: true } : item); },
    async markAllRead() { await wait(40); mockNotifications = mockNotifications.map((item) => ({ ...item, read: true })); },
    async page() { await wait(40); return clone({ items: mockNotifications, hasMore: false, total: mockNotifications.length }); },
  },
  rosterRequests: {
    async list(teamId) { await wait(50); return clone(mockRosterRequests.filter((item) => !teamId || item.teamId === teamId)); },
    async get(id) { await wait(40); return clone(mockRosterRequests.find((item) => item.id === id)); },
    async submit(request) { await wait(); const now = mockCompetitionNow().toISOString(); const item: RosterChangeRequest = { ...request, id: `RC-${String(mockRosterRequests.length + 22).padStart(4, '0')}`, status: 'pending', submittedAt: now, updatedAt: now }; mockRosterRequests.unshift(item); return clone(item); },
    async review(id, status, note) { await wait(); const item = mockRosterRequests.find((request) => request.id === id); if (!item) throw new Error('Roster request was not found.'); Object.assign(item, { status, adminNote: note, updatedAt: mockCompetitionNow().toISOString() }); return clone(item); },
  },
  disputes: {
    async list(teamId) { await wait(50); return clone(mockDisputes.filter((item) => !teamId || item.teamId === teamId)); },
    async get(id) { await wait(40); return clone(mockDisputes.find((item) => item.id === id)); },
    async submit(request) { await wait(); const item: ResultDispute = { ...request, id: `DSP-${String(mockDisputes.length + 8).padStart(4, '0')}`, status: 'pending', submittedAt: mockCompetitionNow().toISOString() }; mockDisputes.unshift(item); return clone(item); },
    async review(id, status, note) { await wait(); const item = mockDisputes.find((dispute) => dispute.id === id); if (!item) throw new Error('Dispute was not found.'); Object.assign(item, { status, adminNote: note, resolvedAt: mockCompetitionNow().toISOString() }); return clone(item); },
  },
  support: {
    async listTickets() { await wait(50); return clone(mockTickets); },
    async getTicket(id) { await wait(40); return clone(mockTickets.find((ticket) => ticket.id === id)); },
    async createTicket(request) { await wait(); const now = mockCompetitionNow().toISOString(); const item: SupportTicket = { ...request, id: `SUP-${1043 + mockTickets.length}`, status: 'open', createdAt: now, updatedAt: now, messages: [] }; mockTickets.unshift(item); return clone(item); },
    async page() { await wait(40); return clone({ items: mockTickets, hasMore: false, total: mockTickets.length }); },
    async reply() { return backendRequired(); },
    async changeStatus() { return backendRequired(); },
    async adminPage() { await wait(40); return clone({ items: mockTickets, hasMore: false, total: mockTickets.length }); },
  },
  operations: {
    async audit() { await wait(50); return clone(mockAuditEvents); },
    async adminUsers() { await wait(50); return clone(mockAdminUsers); },
    async player() { await wait(40); return undefined; },
  },
  verifications: {
    async forEntity() { await wait(40); return undefined; },
    async get() { await wait(40); return undefined; },
    async apply() { return backendRequired(); },
    async page() { await wait(40); return { items: [], hasMore: false, total: 0 }; },
    async review() { return backendRequired(); },
  },
  admin: {
    async blacklist() { await wait(70); return clone(blacklist); },
    async ban() { await wait(); },
    async sendMessage() { await wait(); },
  },
};

export const isMockAdapter = true;
