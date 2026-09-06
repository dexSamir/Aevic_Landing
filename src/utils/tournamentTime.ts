import type { Tournament } from '../types/domain';

export type TournamentTemporalPhase = 'draft' | 'upcoming' | 'registration-open' | 'registration-closed' | 'live' | 'completed' | 'cancelled';

export function resolveTournamentTemporalPhase(tournament: Tournament, now: string | number | Date): TournamentTemporalPhase {
  if (tournament.status === 'cancelled') return 'cancelled';
  if (tournament.status === 'draft') return 'draft';
  if (tournament.status === 'completed') return 'completed';
  const at = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  const registrationOpens = Date.parse(tournament.registrationOpensAt);
  const registrationCloses = Date.parse(tournament.registrationDeadline);
  const starts = Date.parse(tournament.startsAt);
  const ends = Date.parse(tournament.endsAt);
  if (![at, registrationOpens, registrationCloses, starts, ends].every(Number.isFinite)) return 'registration-closed';
  if (at > ends) return 'completed';
  if (at >= starts) return 'live';
  if (at < registrationOpens) return 'upcoming';
  if (at <= registrationCloses && tournament.status === 'registration-open') return 'registration-open';
  return 'registration-closed';
}

export function tournamentAcceptsRegistration(tournament: Tournament, now: string | number | Date) {
  return resolveTournamentTemporalPhase(tournament, now) === 'registration-open';
}
