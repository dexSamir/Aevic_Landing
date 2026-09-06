import type { PublicPlatformSnapshot } from '../types/domain';
import { ApiError } from './apiError';

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const fail = (): never => { throw new ApiError({ status: 200, kind: 'server', code: 'INVALID_SNAPSHOT' }); };

export function validatePublicSnapshot(value: unknown): PublicPlatformSnapshot {
  if (!record(value)) return fail();
  const keys = ['tournaments', 'teams', 'organizations', 'leaderboard', 'leaderboardTeams', 'playerPerformances', 'teamComparisonRecords', 'teamAchievements'] as const;
  if (!keys.every((key) => Array.isArray(value[key]))) return fail();
  const teams = value.teams as unknown[];
  const tournaments = value.tournaments as unknown[];
  if (!teams.every((team) => record(team) && text(team.id) && text(team.slug) && text(team.name) && Number.isInteger(team.rosterSize) && Number(team.rosterSize) >= 0)) return fail();
  if (new Set(teams.map((team) => (team as Record<string, unknown>).id)).size !== teams.length) return fail();
  if (!tournaments.every((item) => record(item) && text(item.id) && text(item.name) && text(item.status) && ['startsAt', 'endsAt', 'registrationOpensAt', 'registrationDeadline', 'checkInOpensAt', 'checkInClosesAt'].every((key) => text(item[key]) && Number.isFinite(Date.parse(item[key]))) && ['maxSlots', 'usedSlots', 'days', 'roundsPerDay', 'prizePool'].every((key) => finite(item[key]) && item[key] >= 0) && record(item.mapRotation) && Array.isArray(item.mapRotation.maps))) return fail();
  if (!(value.leaderboard as unknown[]).every((row) => record(row) && text(row.teamId) && text(row.tournamentId) && ['placement', 'finishes', 'totalPoints'].every((key) => finite(row[key])))) return fail();
  if (!(value.leaderboardTeams as unknown[]).every((item) => typeof item === 'string')) return fail();
  return value as unknown as PublicPlatformSnapshot;
}
