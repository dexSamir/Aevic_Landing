import type { AdminPlatformSnapshot, Tournament } from '../types/domain';
import { deriveTournamentCapacity } from './tournamentCapacity';

export function selectAdminOperations(snapshot: AdminPlatformSnapshot, tournament: Tournament) {
  const slots = snapshot.slots.filter((slot) => slot.tournamentId === tournament.id);
  const capacity = deriveTournamentCapacity(slots);
  const registeredTeamIds = new Set(slots.filter((slot) => slot.state === 'occupied' && slot.teamId).map((slot) => slot.teamId!));
  const approvalCounts = { pending: 0, approved: 0, rejected: 0, banned: 0 };
  snapshot.teams.forEach((team) => { approvalCounts[team.approvalStatus] += 1; });
  const checkIns = snapshot.checkIns?.filter((item) => item.tournamentId === tournament.id);
  const publishedRounds = snapshot.publishedRoundIds?.[tournament.id];
  return { capacity, slots, approvalCounts, registeredTeams: registeredTeamIds.size,
    approvedTeams: snapshot.teams.filter((team) => registeredTeamIds.has(team.id) && team.approvalStatus === 'approved').length,
    checkedIn: checkIns?.filter((item) => item.status === 'checked-in').length,
    missingCheckIns: checkIns?.filter((item) => item.status === 'missed').length,
    resultProgress: publishedRounds ? { published: new Set(publishedRounds).size, expected: tournament.days * tournament.roundsPerDay } : undefined,
  };
}
