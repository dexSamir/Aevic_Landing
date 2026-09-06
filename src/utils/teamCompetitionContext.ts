import type {
  CheckIn,
  MatchHistoryEntry,
  MatchScheduleItem,
  RoomCredentials,
  TeamPlatformSnapshot,
  TeamTournamentParticipation,
  Tournament,
} from '../types/domain';
import { selectCurrentRound } from './competitionSelectors';

export interface TeamCompetitionContext {
  tournament: Tournament;
  participation: TeamTournamentParticipation;
  checkIn?: CheckIn;
  room?: Pick<RoomCredentials, 'roundId' | 'status' | 'releaseAt'>;
  matches: MatchScheduleItem[];
  history: MatchHistoryEntry[];
  nextMatch?: MatchScheduleItem;
  firstMatch?: MatchScheduleItem;
  lifecycle: 'current' | 'upcoming' | 'completed' | 'withdrawn';
}

export interface TeamCompetitionContexts {
  current?: TeamCompetitionContext;
  all: TeamCompetitionContext[];
  byTournamentId: ReadonlyMap<string, TeamCompetitionContext>;
}

const time = (value?: string) => value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;

function lifecycleFor(tournament: Tournament, participation: TeamTournamentParticipation, now: Date): TeamCompetitionContext['lifecycle'] {
  if (participation.status === 'withdrawn') return 'withdrawn';
  if (tournament.status === 'completed' || tournament.status === 'cancelled' || time(tournament.endsAt) < now.getTime()) return 'completed';
  if (time(tournament.registrationOpensAt) > now.getTime() && tournament.status === 'published') return 'upcoming';
  return 'current';
}

function currentScore(context: TeamCompetitionContext, now: Date) {
  if (context.lifecycle !== 'current') return Number.POSITIVE_INFINITY;
  if (context.checkIn?.status === 'open') return 0;
  if (context.room?.status === 'released') return 1;
  if (context.nextMatch?.status === 'live') return 2;
  if (context.nextMatch) return 3 + Math.max(0, time(context.nextMatch.startsAt) - now.getTime()) / 1e13;
  if (context.tournament.status === 'ongoing') return 4;
  if (context.participation.status === 'confirmed') return 5 + Math.max(0, time(context.tournament.startsAt) - now.getTime()) / 1e13;
  return 6 + Math.max(0, time(context.tournament.startsAt) - now.getTime()) / 1e13;
}

export function deriveTeamCompetitionContexts(
  snapshot: Pick<TeamPlatformSnapshot, 'currentTeam' | 'participations' | 'tournaments' | 'checkIn' | 'currentRoom' | 'matchSchedule' | 'matchHistory'>,
  now: Date,
): TeamCompetitionContexts {
  const tournaments = new Map(snapshot.tournaments.map((tournament) => [tournament.id, tournament]));
  const all = snapshot.participations
    .filter((participation) => participation.teamId === snapshot.currentTeam.id)
    .flatMap((participation) => {
      const tournament = tournaments.get(participation.tournamentId);
      if (!tournament) return [];
      const matches = snapshot.matchSchedule
        .filter((match) => match.tournamentId === tournament.id)
        .sort((left, right) => time(left.startsAt) - time(right.startsAt));
      const history = snapshot.matchHistory
        .filter((match) => match.tournamentId === tournament.id)
        .sort((left, right) => time(right.playedAt) - time(left.playedAt));
      const sourceCheckIn = snapshot.checkIn?.tournamentId === tournament.id && snapshot.checkIn.teamId === snapshot.currentTeam.id ? snapshot.checkIn : undefined;
      const checkIn = sourceCheckIn ? { ...sourceCheckIn, status: sourceCheckIn.status === 'checked-in' ? 'checked-in' as const : now.getTime() < time(sourceCheckIn.opensAt) ? 'pending' as const : now.getTime() > time(sourceCheckIn.closesAt) ? 'missed' as const : sourceCheckIn.status } : undefined;
      const sourceRoom = snapshot.currentRoom && matches.some((match) => match.id === snapshot.currentRoom?.roundId) ? snapshot.currentRoom : undefined;
      const room = sourceRoom ? { ...sourceRoom, status: now.getTime() < time(sourceRoom.releaseAt) ? 'locked' as const : sourceRoom.status } : undefined;
      const nextMatch = selectCurrentRound(matches, tournament, now);
      return [{ tournament, participation, checkIn, room, matches, history, nextMatch, firstMatch: matches[0], lifecycle: lifecycleFor(tournament, participation, now) } satisfies TeamCompetitionContext];
    })
    .sort((left, right) => {
      const scoreDelta = currentScore(left, now) - currentScore(right, now);
      if (Number.isFinite(scoreDelta) && scoreDelta) return scoreDelta;
      if (left.lifecycle === 'completed' && right.lifecycle === 'completed') return time(right.tournament.endsAt) - time(left.tournament.endsAt);
      return time(left.tournament.startsAt) - time(right.tournament.startsAt) || left.tournament.id.localeCompare(right.tournament.id);
    });
  return {
    current: all.find((context) => context.lifecycle === 'current'),
    all,
    byTournamentId: new Map(all.map((context) => [context.tournament.id, context])),
  };
}
