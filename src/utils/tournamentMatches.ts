import type { MatchHistoryEntry, MatchScheduleItem } from '../types/domain';

export interface TournamentMatch {
  id: string; map: string; date: string; status: string; day?: number; round?: number;
}

/** History can contain one entry per team. Schedule retains canonical day/round metadata. */
export function tournamentMatches(tournamentId: string, schedule: MatchScheduleItem[], history: MatchHistoryEntry[]): TournamentMatch[] {
  const matches = new Map<string, TournamentMatch>();
  for (const match of history) if (match.tournamentId === tournamentId) {
    matches.set(match.id, { id: match.id, map: match.map, date: match.playedAt, status: 'completed' });
  }
  for (const match of schedule) if (match.tournamentId === tournamentId) {
    matches.set(match.id, { id: match.id, map: match.map, date: match.startsAt, status: matches.has(match.id) ? 'completed' : match.status, day: match.day, round: match.round });
  }
  return [...matches.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || (a.day ?? 0) - (b.day ?? 0) || (a.round ?? 0) - (b.round ?? 0) || a.id.localeCompare(b.id));
}
