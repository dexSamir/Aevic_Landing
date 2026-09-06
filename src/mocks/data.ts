import type {
  AdminMessage,
  BlacklistEntry,
  CareerSummaryData,
  MatchHistoryEntry,
  MatchScheduleItem,
  Notification,
  Organization,
  PlayerPerformance,
  Team,
  TeamAchievement,
  TeamAchievementSharecardData,
  TeamAnnouncement,
  TeamComparisonRecord,
  TeamLegacyStats,
  TeamTournamentResult,
  Tournament,
  TournamentSlot,
} from '../types/domain';
import teamBanner from '../assets/official/map-erangel-round-1.jpg';
import organizationBanner from '../assets/official/map-rondo.jpg';

const captain = {
  id: 'usr-captain-01',
  firstName: 'Murad',
  lastName: 'Məmmədov',
  email: 'captain@example.test',
  phone: '+994 50 555 01 07',
  role: 'captain' as const,
  teamId: 'team-01',
};

export const currentTeam: Team = {
  id: 'team-01',
  name: 'Caspian Wolves',
  slug: 'caspian-wolves',
  tag: 'CSW',
  bannerUrl: teamBanner,
  bannerAlt: 'Erangel üzərində Caspian Wolves komandasının döyüş meydanı banneri',
  description: 'Bakıdan çıxan, intizamlı rotasiya və ardıcıl final oyunları ilə tanınan PUBG Mobile heyəti.',
  country: 'Azərbaycan',
  gameKey: 'pubg-mobile',
  organizationId: 'org-caspian',
  organizationRelationship: 'owned',
  verificationLevel: 'verified',
  socialLinks: {
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
    x: 'https://x.com/',
    discord: 'https://discord.com/',
  },
  captain,
  approvalStatus: 'approved',
  registeredAt: '2026-06-18T11:00:00+04:00',
  foundedAt: '2024-09-12T00:00:00+04:00',
  profileComplete: true,
  roster: [
    { id: 'p1', ign: 'Vega', uid: '5100•••701', role: 'captain', joinedAt: '2026-06-18' },
    { id: 'p2', ign: 'Khan', uid: '5100•••719', role: 'starter', joinedAt: '2026-06-18' },
    { id: 'p3', ign: 'Raven', uid: '5100•••744', role: 'starter', joinedAt: '2026-06-18' },
    { id: 'p4', ign: 'Mira', uid: '5100•••752', role: 'starter', joinedAt: '2026-06-18' },
    { id: 'p5', ign: 'Nox', uid: '5100•••781', role: 'substitute', joinedAt: '2026-06-18' },
  ],
};

export const teamAchievements: TeamAchievement[] = [
  { id: 'ach-first-entry', title: 'First Tournament', description: 'AEVIC turnir xəttində ilk rəsmi iştirak.', icon: 'calendar', state: 'unlocked', category: 'participation', tier: 'bronze', rarity: 'standard', unlockedAt: '2026-06-22T20:00:00+04:00', featured: false, displayOrder: 4 },
  { id: 'ach-fair-play', title: 'Zero-Penalty Season', description: 'Pozuntu və penalty olmadan tamamlanan yarış mövsümü.', icon: 'shield', state: 'unlocked', category: 'special', tier: 'phoenix', rarity: 'elite', unlockedAt: '2026-07-04T23:30:00+04:00', featured: true, displayOrder: 2 },
  { id: 'ach-top-four', title: 'Final Podium', description: 'AEVIC finalında qazanılmış dərc edilmiş podium nəticəsi.', icon: 'medal', state: 'unlocked', category: 'competition', tier: 'gold', rarity: 'rare', unlockedAt: '2026-07-19T22:40:00+04:00', featured: true, displayOrder: 1 },
  { id: 'ach-century', title: '100 Team Kills', description: 'Rəsmi matçlarda 100 ümumi komanda kill həddi.', icon: 'crosshair', state: 'unlocked', category: 'combat', tier: 'silver', rarity: 'uncommon', progress: { current: 100, target: 100, unit: 'kill' }, unlockedAt: '2026-07-28T22:15:00+04:00', featured: true, displayOrder: 3 },
  { id: 'ach-wwcd-five', title: 'Five Crowns', description: 'Beş WWCD nəticəsini AEVIC tarixçəsinə yaz.', icon: 'crown', state: 'progress', category: 'competition', tier: 'gold', rarity: 'rare', progress: { current: 4, target: 5, unit: 'WWCD' }, featured: false, displayOrder: 5 },
  { id: 'ach-regular', title: '10 Tournaments', description: 'On rəsmi AEVIC turnirində iştirak et.', icon: 'flame', state: 'progress', category: 'consistency', tier: 'silver', rarity: 'uncommon', progress: { current: 3, target: 10, unit: 'turnir' }, featured: false, displayOrder: 6 },
  { id: 'ach-champion', title: 'Tournament Champion', description: 'AEVIC çempionluğunu qazan.', icon: 'trophy', state: 'locked', category: 'competition', tier: 'phoenix', rarity: 'elite', featured: false, displayOrder: 7 },
  { id: 'ach-sharpshooter', title: 'Perfect Day', description: 'Bir turnir gününü hər raundda podiumla tamamla.', icon: 'target', state: 'locked', category: 'special', tier: 'phoenix', rarity: 'elite', featured: false, displayOrder: 8 },
  { id: 'ach-legacy', title: 'Hall of Fame Inductee', description: 'AEVIC tarixində qalıcı rəqabət irsi qur.', icon: 'award', state: 'locked', category: 'legacy', tier: 'legacy', rarity: 'mythic', progress: { current: 2, target: 11, unit: 'top placement' }, featured: false, displayOrder: 9 },
];

export const organizations: Organization[] = [
  {
    id: 'org-caspian',
    name: 'Caspian Vanguard',
    slug: 'caspian-vanguard',
    shortName: 'CSV',
    bannerUrl: organizationBanner,
    bannerAlt: 'Caspian Vanguard təşkilatının Rondo sahəsini göstərən geniş banneri',
    description: 'Caspian Vanguard Azərbaycandan çıxan rəqabətçi heyətləri vahid performans, komanda mədəniyyəti və uzunmüddətli esports irsi altında birləşdirir.',
    foundedAt: '2023-02-18T00:00:00+04:00',
    country: 'Azərbaycan',
    website: 'https://example.com/caspian-vanguard',
    socialLinks: {
      instagram: 'https://www.instagram.com/',
      youtube: 'https://www.youtube.com/',
      x: 'https://x.com/',
      linkedin: 'https://www.linkedin.com/',
      discord: 'https://discord.com/',
      twitch: 'https://www.twitch.tv/',
      website: 'https://example.com/caspian-vanguard',
    },
    verificationLevel: 'verified',
    ownedTeams: [{ id: 'org-team-01', organizationId: 'org-caspian', gameKey: 'pubg-mobile', teamId: currentTeam.id, displayName: currentTeam.name, slug: currentTeam.slug!, status: 'active', joinedAt: '2025-01-12T00:00:00+04:00' }],
    featuredAchievements: ['ach-top-four', 'ach-fair-play', 'ach-century'],
    createdAt: '2026-06-01T12:00:00+04:00',
    updatedAt: '2026-08-02T18:30:00+04:00',
  },
];

export const teamLegacyStats: TeamLegacyStats = {
  foundedAt: currentTeam.foundedAt ?? currentTeam.registeredAt,
  tournaments: 3,
  wins: 1,
  topPlacements: 2,
  finishes: 96,
  unlockedAchievements: teamAchievements.filter((achievement) => achievement.state === 'unlocked').length,
};

export const achievementSharecardDraft: TeamAchievementSharecardData = {
  teamId: currentTeam.id,
  teamName: currentTeam.name,
  achievementId: teamAchievements[2].id,
  achievementTitle: teamAchievements[2].title,
  unlockedAt: teamAchievements[2].unlockedAt ?? '2026-07-19T22:40:00+04:00',
  legacyStats: {
    tournaments: teamLegacyStats.tournaments,
    wins: teamLegacyStats.wins,
    topPlacements: teamLegacyStats.topPlacements,
    finishes: teamLegacyStats.finishes,
  },
  brandStatement: 'Reputasiya, ranking və irs üçün yarış.',
};

const pointFormula = {
  placement: [
    { placement: 1, points: 15 }, { placement: 2, points: 12 }, { placement: 3, points: 10 },
    { placement: 4, points: 8 }, { placement: 5, points: 6 }, { placement: 6, points: 4 },
    { placement: 7, points: 3 }, { placement: 8, points: 2 }, { placement: 9, points: 1 },
    { placement: 10, points: 1 }, { placement: 11, points: 1 }, { placement: 12, points: 1 },
    { placement: 13, points: 0 }, { placement: 14, points: 0 }, { placement: 15, points: 0 },
    { placement: 16, points: 0 },
  ],
  finishPointValue: 1,
  wwcdBonus: 10,
  defaultPenalty: 0,
  tieBreakRules: ['Most WWCD', 'Most finish points', 'Best final-round placement'],
};

export const tournaments: Tournament[] = [
  {
    id: 'daily-cup-24',
    name: 'AEVIC Daily Cup #24',
    shortName: 'Daily Cup #24',
    description: 'AEVIC gündəlik PUBG Mobile yarışı üçün nümunə turnir.',
    status: 'registration-open',
    startsAt: '2026-08-04T21:00:00+04:00',
    endsAt: '2026-08-04T23:30:00+04:00',
    registrationOpensAt: '2026-08-04T09:00:00+04:00',
    registrationDeadline: '2026-08-04T20:15:00+04:00',
    checkInOpensAt: '2026-08-04T20:15:00+04:00',
    checkInClosesAt: '2026-08-04T20:45:00+04:00',
    maxSlots: 20,
    usedSlots: 6,
    prizePool: 2400,
    prizeCurrency: 'AZN',
    days: 1,
    roundsPerDay: 4,
    mapRotation: { id: 'rotation-a', maps: ['Erangel', 'Miramar', 'Rondo', 'Erangel'] },
    pointFormula,
    prizeDistribution: [
      { place: 'Champion', amount: 1200, currency: 'AZN' },
      { place: '2nd', amount: 700, currency: 'AZN' },
      { place: '3rd', amount: 350, currency: 'AZN' },
      { place: 'MVP', amount: 150, currency: 'AZN' },
    ],
    rules: ['Five registered players per team', 'Check-in is required before the first round', 'Published fair-play policy applies'],
    featured: true,
  },
  {
    id: 'rising-series-26',
    name: 'Rising Squads Series',
    shortName: 'Rising Series',
    description: 'A fictional open qualifier focused on newer competitive rosters.',
    status: 'published',
    startsAt: '2026-09-12T18:00:00+04:00',
    endsAt: '2026-09-13T22:00:00+04:00',
    registrationOpensAt: '2026-08-24T12:00:00+04:00',
    registrationDeadline: '2026-09-08T23:59:00+04:00',
    checkInOpensAt: '2026-09-12T16:30:00+04:00',
    checkInClosesAt: '2026-09-12T17:30:00+04:00',
    maxSlots: 20,
    usedSlots: 0,
    prizePool: 800,
    prizeCurrency: 'AZN',
    days: 2,
    roundsPerDay: 5,
    mapRotation: { id: 'rotation-b', maps: ['Erangel', 'Miramar', 'Rondo', 'Erangel'] },
    pointFormula,
    prizeDistribution: [{ place: 'Champion', amount: 500, currency: 'AZN' }, { place: '2nd', amount: 300, currency: 'AZN' }],
    rules: ['Open qualifier eligibility applies', 'Roster locks at registration deadline'],
  },
  {
    id: 'summer-final-25',
    name: 'Summer Final 2025',
    shortName: 'Summer Final',
    description: 'A fictional historical tournament used to demonstrate results and archive states.',
    status: 'completed',
    resultsPublishedAt: '2025-08-23T23:30:00+04:00',
    disputeDurationMinutes: 60,
    startsAt: '2025-08-20T19:00:00+04:00',
    endsAt: '2025-08-23T23:00:00+04:00',
    registrationOpensAt: '2025-07-20T12:00:00+04:00',
    registrationDeadline: '2025-08-14T23:59:00+04:00',
    checkInOpensAt: '2025-08-20T17:30:00+04:00',
    checkInClosesAt: '2025-08-20T18:30:00+04:00',
    maxSlots: 20,
    usedSlots: 20,
    prizePool: 1800,
    prizeCurrency: 'AZN',
    days: 4,
    roundsPerDay: 4,
    mapRotation: { id: 'rotation-c', maps: ['Erangel', 'Miramar', 'Rondo', 'Erangel'] },
    pointFormula,
    prizeDistribution: [{ place: 'Champion', amount: 1000, currency: 'AZN' }, { place: '2nd', amount: 500, currency: 'AZN' }, { place: '3rd', amount: 300, currency: 'AZN' }],
    rules: ['Archived demonstration data'],
  },
];

export const teamTournamentParticipations = [
  {
    id: 'registration-dc24-team-01',
    tournamentId: 'daily-cup-24',
    teamId: currentTeam.id,
    status: 'confirmed' as const,
    createdAt: '2026-07-29T18:00:00+04:00',
    groupLabel: 'A qrupu',
    slotNumber: 2,
    rosterLockAt: '2026-08-04T20:15:00+04:00',
  },
  {
    id: 'registration-summer-final-team-01',
    tournamentId: 'summer-final-25',
    teamId: currentTeam.id,
    status: 'confirmed' as const,
    createdAt: '2025-08-01T12:00:00+04:00',
    groupLabel: 'Final lobbisi',
    slotNumber: 4,
    rosterLockAt: '2025-08-14T23:59:00+04:00',
    resultPlacement: 4,
  },
];

export const teams: Team[] = [
  currentTeam,
  { ...currentTeam, id: 'team-02', name: 'North Flame', slug: 'north-flame', tag: 'NFL', description: 'Fictional pending demo roster.', organizationId: undefined, organizationRelationship: 'independent', bannerUrl: undefined, socialLinks: {}, verificationLevel: 'registered', approvalStatus: 'pending', registeredAt: '2026-08-01T10:22:00+04:00' },
  { ...currentTeam, id: 'team-03', name: 'Baku Sentinels', slug: 'baku-sentinels', tag: 'BKS', description: 'Bakıdan olan fictional demo heyəti; public spectator axınını göstərmək üçün istifadə olunur.', organizationId: undefined, organizationRelationship: 'independent', bannerUrl: undefined, socialLinks: { instagram: 'https://www.instagram.com/' }, verificationLevel: 'approved', approvalStatus: 'approved', registeredAt: '2026-07-27T09:12:00+04:00', roster: [
    { id: 'bks-1', ign: 'ZEYRO', role: 'captain', joinedAt: '2026-07-01' },
    { id: 'bks-2', ign: 'KIRA', role: 'starter', joinedAt: '2026-07-01' },
    { id: 'bks-3', ign: 'RAZE', role: 'starter', joinedAt: '2026-07-01' },
    { id: 'bks-4', ign: 'SOVA', role: 'starter', joinedAt: '2026-07-01' },
    { id: 'bks-5', ign: 'KOR', role: 'substitute', joinedAt: '2026-07-01' },
  ] },
  { ...currentTeam, id: 'team-04', name: 'Silent Orbit International', slug: 'silent-orbit-international', tag: 'SOI', approvalStatus: 'rejected', rejectionReason: 'Player UID evidence is incomplete.', registeredAt: '2026-07-29T17:40:00+04:00' },
  { ...currentTeam, id: 'team-05', name: 'Crimson Steppe', slug: 'crimson-steppe', tag: 'CRS', approvalStatus: 'banned', registeredAt: '2026-05-09T14:20:00+04:00' },
  ...[
    { id: 'team-06', name: 'Atlas Five', slug: 'atlas-five', tag: 'AT5', roster: ['ARES', 'LYNX', 'MARS', 'ECHO', 'ION'] },
    { id: 'team-07', name: 'Iron Nomads', slug: 'iron-nomads', tag: 'INM', roster: ['TURAN', 'ARSLAN', 'BORAN', 'QAYA', 'OD'] },
    { id: 'team-08', name: 'Kura Esports', slug: 'kura-esports', tag: 'KUR', roster: ['AXEL', 'NOVA', 'REX', 'PIXEL', 'ZEN'] },
    { id: 'team-09', name: 'Nova District', slug: 'nova-district', tag: 'NVD', roster: ['VEIL', 'ORBIT', 'NEX', 'RUNE', 'VALE'] },
  ].map((fixture, teamIndex): Team => ({
    ...currentTeam,
    id: fixture.id,
    name: fixture.name,
    slug: fixture.slug,
    tag: fixture.tag,
    description: `${fixture.name} üçün fictional public competition fixture-i.`,
    bannerUrl: undefined,
    bannerAlt: undefined,
    organizationId: undefined,
    organizationRelationship: 'independent',
    socialLinks: {},
    verificationLevel: 'approved',
    approvalStatus: 'approved',
    registeredAt: `2026-07-${String(20 + teamIndex).padStart(2, '0')}T12:00:00+04:00`,
    roster: fixture.roster.map((ign, playerIndex) => ({
      id: `${fixture.id}-p${playerIndex + 1}`,
      ign,
      role: playerIndex === 0 ? 'captain' : playerIndex === 4 ? 'substitute' : 'starter',
      joinedAt: '2026-07-01',
    })),
  })),
];

export const tournamentParticipantTeamIds: Record<string, string[]> = {
  'daily-cup-24': ['team-03', 'team-01', 'team-06', 'team-07', 'team-08', 'team-09'],
  'rising-series-26': [],
  'summer-final-25': ['team-01', 'team-03', 'team-06', 'team-07'],
};

const leaderboardNames = ['Baku Sentinels', 'Caspian Wolves', 'North Flame', 'Atlas Five', 'Iron Nomads', 'Silent Orbit International', 'Kura Esports', 'Nova District'];
export const leaderboard: TeamTournamentResult[] = leaderboardNames.map((name, index) => ({
  tournamentId: 'summer-final-25',
  teamId: teams.find((team) => team.name === name)!.id,
  placement: index + 1,
  matches: 12,
  wwcd: Math.max(0, 3 - Math.floor(index / 2)),
  finishes: 62 - index * 5,
  placementPoints: 48 - index * 4,
  finishPoints: 62 - index * 5,
  penalties: index === 5 ? 2 : 0,
  totalPoints: 110 - index * 9 - (index === 5 ? 2 : 0),
  bestFinish: Math.min(8, index + 1),
}));

export const leaderboardTeams = leaderboardNames;

export const playerPerformances: PlayerPerformance[] = [
  { playerId: 'mvp-1', ign: 'ZEYRO', matches: 12, finishes: 31, averagePlacement: 4.8, mvp: true },
  { playerId: 'mvp-2', ign: 'VEGA', matches: 12, finishes: 27, averagePlacement: 5.2 },
  { playerId: 'mvp-3', ign: 'KIRA', matches: 12, finishes: 24, averagePlacement: 5.9 },
];

export const teamAnnouncements: TeamAnnouncement[] = [
  {
    id: 'announcement-match-day',
    eventId: 'evt-dc24-round-program-published',
    kind: 'schedule',
    title: 'Raund proqramı təsdiqləndi',
    body: 'Daily Cup #24 üçün Erangel, Miramar, Rondo və Erangel ardıcıllığı dərc edildi. Bu, fictional demo elanıdır.',
    createdAt: '2026-08-02T18:00:00+04:00',
    expiresAt: '2026-08-04T21:00:00+04:00',
    dismissible: true,
    actionLabel: 'Turnir əməliyyatları',
    actionHref: '/team/tournaments/daily-cup-24',
    entityRef: { type: 'tournament', id: 'daily-cup-24' },
  },
];

export const matchSchedule: MatchScheduleItem[] = [
  { id: 'dc24-r1', tournamentId: 'daily-cup-24', stage: 'final', day: 1, lobby: 'Group A', round: 1, map: 'Erangel', startsAt: '2026-08-04T21:00:00+04:00', status: 'upcoming' },
  { id: 'dc24-r2', tournamentId: 'daily-cup-24', stage: 'final', day: 1, lobby: 'Group A', round: 2, map: 'Miramar', startsAt: '2026-08-04T21:40:00+04:00', status: 'scheduled' },
  { id: 'dc24-r3', tournamentId: 'daily-cup-24', stage: 'final', day: 1, lobby: 'Group A', round: 3, map: 'Rondo', startsAt: '2026-08-04T22:20:00+04:00', status: 'scheduled' },
  { id: 'dc24-r4', tournamentId: 'daily-cup-24', stage: 'final', day: 1, lobby: 'Group A', round: 4, map: 'Erangel', startsAt: '2026-08-04T23:00:00+04:00', status: 'scheduled' },
];

export const matchHistory: MatchHistoryEntry[] = [
  { id: 'summer-final-r4', tournamentId: 'summer-final-25', tournamentName: 'Summer Final 2025', playedAt: '2025-08-23T22:20:00+04:00', stage: 'final', stageLabel: 'Final · R4', map: 'Erangel', placement: 2, finishes: 8, placementPoints: 6, killPoints: 8, points: 14, wwcd: false },
  { id: 'summer-final-r3', tournamentId: 'summer-final-25', tournamentName: 'Summer Final 2025', playedAt: '2025-08-23T21:40:00+04:00', stage: 'final', stageLabel: 'Final · R3', map: 'Rondo', placement: 6, finishes: 5, placementPoints: 2, killPoints: 5, points: 7, wwcd: false },
  { id: 'summer-final-r2', tournamentId: 'summer-final-25', tournamentName: 'Summer Final 2025', playedAt: '2025-08-23T21:00:00+04:00', stage: 'final', stageLabel: 'Final · R2', map: 'Miramar', placement: 1, finishes: 11, placementPoints: 10, killPoints: 11, points: 21, wwcd: true },
  { id: 'summer-final-r1', tournamentId: 'summer-final-25', tournamentName: 'Summer Final 2025', playedAt: '2025-08-23T20:20:00+04:00', stage: 'final', stageLabel: 'Final · R1', map: 'Erangel', placement: 8, finishes: 3, placementPoints: 1, killPoints: 3, points: 4, wwcd: false },
];

export const careerSummary: CareerSummaryData = {
  teamId: currentTeam.id,
  scopeLabel: 'AEVIC demo career record',
  metrics: [
    { key: 'matches', label: 'Matç', value: leaderboard[1].matches, description: 'Nəticəsi dərc edilmiş raundlar' },
    { key: 'finishes', label: 'Kill', value: teamLegacyStats.finishes, description: 'Dərc edilmiş ümumi team kills' },
    { key: 'wwcd', label: 'WWCD', value: leaderboard[1].wwcd, description: 'Summer Final 2025 nümunə nəticəsi' },
    { key: 'championships', label: 'Çempionluq', value: teamLegacyStats.wins, description: 'Komanda irsi qeydində' },
    { key: 'podiums', label: 'Podium', value: teamLegacyStats.topPlacements, description: 'Top nəticə qeydləri' },
  ],
};

export const teamComparisonRecords: TeamComparisonRecord[] = leaderboard.slice(0, 4).map((result, index) => ({
  teamId: result.teamId,
  teamName: leaderboardNames[index],
  matches: result.matches,
  finishes: result.finishes,
  wwcd: result.wwcd,
  averagePoints: Number((result.totalPoints / result.matches).toFixed(1)),
  championships: index === 1 ? teamLegacyStats.wins : undefined,
  podiums: index === 1 ? teamLegacyStats.topPlacements : undefined,
}));

export const notifications: Notification[] = [
  { id: 'n1', eventId: 'evt-dc24-checkin-opens', eventType: 'check-in', priority: 'important', entityRef: { type: 'tournament', id: 'daily-cup-24' }, title: 'Check-in bu gün açılır', body: 'Daily Cup #24 check-in pəncərəsi 20:15-də açılır.', severity: 'warning', createdAt: '2026-08-04T09:20:00+04:00', read: false, actionLabel: 'Check-in məlumatını aç', actionHref: '/team/tournaments/daily-cup-24' },
  { id: 'n2', eventId: 'evt-team-01-approved', eventType: 'registration', priority: 'informational', entityRef: { type: 'team', id: currentTeam.id }, title: 'Komanda təsdiqləndi', body: 'Caspian Wolves açıq turnirlər üçün qeydiyyatdan keçə bilər.', severity: 'success', createdAt: '2026-07-29T18:00:00+04:00', read: true },
  { id: 'n3', eventId: 'evt-dc24-roster-lock', eventType: 'roster', priority: 'informational', entityRef: { type: 'tournament', id: 'daily-cup-24' }, title: 'Heyət kilidi yaxınlaşır', body: 'Heyət dəyişiklikləri turnir qeydiyyatı ilə birlikdə bağlanır.', severity: 'info', createdAt: '2026-07-28T12:00:00+04:00', read: false, actionLabel: 'Heyətə bax', actionHref: '/team/roster' },
];

export const adminMessages: AdminMessage[] = [
  { id: 'm1', eventId: 'evt-dc24-captain-briefing', eventType: 'admin-message', priority: 'critical', entityRef: { type: 'message', id: 'm1' }, title: 'Matç günü brifinqi', body: 'Kapitanlar birinci raunddan 30 dəqiqə əvvəl rəsmi əlaqə kanalında hazır olmalıdır.', severity: 'critical', createdAt: '2026-08-02T18:00:00+04:00', read: false, audience: 'all' },
  { id: 'm2', eventId: 'evt-dc24-roster-approved', eventType: 'roster', priority: 'informational', entityRef: { type: 'message', id: 'm2' }, title: 'Heyət yoxlaması tamamlandı', body: 'Təqdim edilmiş heyət Daily Cup #24 üçün uyğundur.', severity: 'success', createdAt: '2026-07-31T13:40:00+04:00', read: true, audience: 'team' },
];

export const blacklist: BlacklistEntry[] = [
  { id: 'ban-1', teamId: 'team-05', teamName: 'Crimson Steppe', reason: 'Repeated fair-play policy violation (fictional demonstration).', startsAt: '2026-06-01', permanent: true, active: true },
  { id: 'ban-2', teamId: 'team-08', teamName: 'Old Guard', reason: 'Expired registration abuse suspension (fictional demonstration).', startsAt: '2025-06-01', expiresAt: '2025-12-01', permanent: false, active: false },
];

export const slots: TournamentSlot[] = Array.from({ length: tournaments[0].maxSlots }, (_, index) => ({
  number: index + 1,
  tournamentId: 'daily-cup-24',
  teamId: tournamentParticipantTeamIds['daily-cup-24'][index],
  state: index < tournaments[0].usedSlots ? 'occupied' : 'available',
}));
