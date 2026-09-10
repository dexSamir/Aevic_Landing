import type { NextAction, TeamPlatformSnapshot } from '../types/domain';
import type { TeamCompetitionContext } from './teamCompetitionContext';
import { buildCompetitionAwareness } from '../components/team/CompetitionAwareness';
import { deriveNextAction } from '../components/team/NextActionCard';

export const bakuTime = (date: string) => new Date(date).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' });
export const overviewDate = (date: string) => new Date(date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', timeZone: 'Asia/Baku' });

/** Overview is a projection of published domain data, never a second demo dataset. */
export function buildTeamOverview(data: TeamPlatformSnapshot, context?: TeamCompetitionContext) {
  const team = data.currentTeam;
  const tournamentHref = context ? `/team/tournaments/${context.tournament.id}` : undefined;
  const ordered = data.leaderboard.filter(row => row.tournamentId === context?.tournament.id).sort((a, b) => a.placement - b.placement);
  const currentIndex = ordered.findIndex(row => row.teamId === team.id);
  const start = Math.max(0, Math.min(currentIndex - 2, ordered.length - 5));
  const standings = currentIndex < 0 ? [] : ordered.slice(start, start + 5).map(row => ({
    placement: row.placement,
    name: data.publicTeams?.find(candidate => candidate.id === row.teamId)?.name ?? (row.teamId === team.id ? team.name : 'Komanda adı yoxdur'),
    points: row.totalPoints,
    current: row.teamId === team.id,
  }));
  const derived = deriveNextAction({ team, tournament: context?.tournament, nextMatch: context?.nextMatch, checkIn: context?.checkIn, room: context?.room, announcement: context ? data.teamAnnouncements[0] : undefined });
  const nextAction: NextAction = !context && derived.kind === 'ready'
    ? { kind: 'ready', eyebrow: 'NÖVBƏTİ ADDIM', title: 'AKTİV TURNİR YOXDUR', body: 'Yeni yarışa qoşulun. İştirak təsdiqləndikdə əməliyyat xətti burada görünəcək.', href: '/tournaments', actionLabel: 'Turnirləri kəşf et' }
    : derived;
  return {
    team, context, tournamentHref, nextAction,
    currentStanding: standings.find(row => row.current), standings,
    resultsHref: context ? `/tournaments/${context.tournament.id}#results` : undefined,
    rounds: context?.matches ?? [],
    recentMatches: [...data.matchHistory].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 5),
    updates: buildCompetitionAwareness({ notifications: data.notifications, adminMessages: data.adminMessages, announcements: data.teamAnnouncements }).slice(0, 3),
    activeRosterCount: team.roster.filter(player => player.role !== 'substitute').length,
  };
}
export type TeamOverviewViewModel = ReturnType<typeof buildTeamOverview>;
