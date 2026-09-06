import type { MatchHistoryEntry, MatchScheduleItem, Tournament, TeamTournamentResult } from '../types/domain';
import { resolveTournamentTemporalPhase } from './tournamentTime';

const at = (value: string) => Date.parse(value);
const chronological = (a: Tournament, b: Tournament) => at(a.startsAt) - at(b.startsAt) || a.id.localeCompare(b.id);
const publicCompetition = (t: Tournament) => t.status !== 'draft' && t.status !== 'cancelled' && Number.isFinite(at(t.startsAt)) && Number.isFinite(at(t.endsAt));

export function selectActiveTournament(tournaments: readonly Tournament[], now: Date) {
  const rank = (t: Tournament) => {
    const phase = resolveTournamentTemporalPhase(t, now);
    if (phase === 'live') return 0;
    if (now.getTime() >= at(t.checkInOpensAt) && now.getTime() <= at(t.checkInClosesAt)) return 1;
    if (phase === 'registration-open') return 2;
    return 3;
  };
  return tournaments.filter((t) => publicCompetition(t) && (['live', 'registration-open'].includes(resolveTournamentTemporalPhase(t, now)) || (at(t.checkInOpensAt) <= now.getTime() && now.getTime() <= at(t.checkInClosesAt) && now.getTime() < at(t.endsAt) && t.status !== 'completed')))
    .sort((a, b) => rank(a) - rank(b) || chronological(a, b))[0];
}

export function selectNextTournament(tournaments: readonly Tournament[], now: Date) {
  return tournaments.filter((t) => publicCompetition(t) && t.status !== 'completed' && at(t.startsAt) > now.getTime()).sort(chronological)[0];
}

export function selectLatestCompletedTournament(tournaments: readonly Tournament[], now: Date) {
  return tournaments.filter((t) => publicCompetition(t) && resolveTournamentTemporalPhase(t, now) === 'completed')
    .sort((a, b) => at(b.endsAt) - at(a.endsAt) || a.id.localeCompare(b.id))[0];
}

export function selectPrimaryCompetition(tournaments: readonly Tournament[], now: Date) {
  return selectActiveTournament(tournaments, now) ?? selectNextTournament(tournaments, now) ?? selectLatestCompletedTournament(tournaments, now);
}

export function selectAdminOperationalTournament(tournaments: readonly Tournament[], now: Date) {
  return selectActiveTournament(tournaments, now) ?? selectNextTournament(tournaments, now);
}

export function selectCurrentRound(matches: readonly MatchScheduleItem[], tournament: Tournament, now: Date) {
  if (['draft', 'cancelled', 'completed'].includes(resolveTournamentTemporalPhase(tournament, now))) return undefined;
  return matches.filter((m) => m.tournamentId === tournament.id && m.status !== 'completed' &&
    (at(m.startsAt) >= now.getTime() || (m.status === 'live' && at(m.startsAt) <= now.getTime())))
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || at(a.startsAt) - at(b.startsAt) || a.id.localeCompare(b.id))[0];
}

export function selectLatestPublishedMatch(matches: readonly MatchHistoryEntry[]) {
  return matches.filter((m) => Number.isFinite(at(m.playedAt))).sort((a, b) => at(b.playedAt) - at(a.playedAt) || a.id.localeCompare(b.id))[0];
}

export function selectLeaderboardTournament(tournaments: readonly Tournament[], rows: readonly TeamTournamentResult[], now: Date) {
  const ids = new Set(rows.map((row) => row.tournamentId));
  return selectPrimaryCompetition(tournaments.filter((t) => ids.has(t.id)), now);
}

export function selectDisputeDeadline(match: Pick<MatchHistoryEntry, 'publishedAt' | 'disputeDeadlineAt'>, tournament: Pick<Tournament, 'disputeDurationMinutes'>) {
  if (match.disputeDeadlineAt && Number.isFinite(at(match.disputeDeadlineAt))) return match.disputeDeadlineAt;
  if (!match.publishedAt || !Number.isFinite(at(match.publishedAt)) || !Number.isFinite(tournament.disputeDurationMinutes) || tournament.disputeDurationMinutes! <= 0) return undefined;
  return new Date(at(match.publishedAt) + tournament.disputeDurationMinutes! * 60_000).toISOString();
}
