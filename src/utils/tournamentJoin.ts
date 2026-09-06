import type { Team, Tournament, TournamentCalendarParticipation, TournamentJoinFailureCode } from '../types/domain';
import { tournamentAcceptsRegistration } from './tournamentTime.js';

export type TournamentJoinViewState =
  | 'checking'
  | 'login'
  | 'create-team'
  | 'join'
  | 'registering'
  | 'registered'
  | 'approved'
  | 'pending'
  | 'full'
  | 'closed'
  | 'ineligible'
  | 'roster-incomplete'
  | 'error';

export function hasTournamentRoster(team: Team) {
  return team.roster.filter((member) => member.role !== 'substitute').length >= 4;
}

export function resolveTournamentJoinState(options: {
  checking?: boolean;
  authenticated: boolean;
  team?: Team;
  tournament: Tournament;
  participation?: TournamentCalendarParticipation | 'pending';
  registering?: boolean;
  failureCode?: TournamentJoinFailureCode;
  now?: string | number | Date;
}): TournamentJoinViewState {
  if (options.checking) return 'checking';
  if (options.failureCode === 'UNKNOWN') return 'error';
  if (!options.authenticated) return 'login';
  if (!options.team) return 'create-team';
  if (options.registering) return 'registering';
  if (options.participation === 'approved') return 'approved';
  if (options.participation === 'pending') return 'pending';
  if (options.participation === 'registered') return 'registered';
  if (options.failureCode === 'ROSTER_INCOMPLETE') return 'roster-incomplete';
  if (options.failureCode === 'FULL') return 'full';
  if (options.failureCode === 'REGISTRATION_CLOSED') return 'closed';
  if (options.failureCode) return 'error';
  if (options.team.approvalStatus !== 'approved') return 'ineligible';
  if (!options.team.profileComplete || !hasTournamentRoster(options.team)) return 'roster-incomplete';
  if (!tournamentAcceptsRegistration(options.tournament, options.now ?? Date.now())) return 'closed';
  if (options.tournament.usedSlots >= options.tournament.maxSlots) return 'full';
  return 'join';
}
