import type {
  MatchHistoryEntry,
  RecordEntry,
  Team,
  TeamAchievement,
  WrappedMapStat,
  WrappedPeriod,
  WrappedSummary,
} from '../types/domain';

export const WRAPPED_MINIMUM_MATCHES = 3;
export const WRAPPED_MAP_MINIMUM_MATCHES = 3;

function inPeriod(date: string, period: WrappedPeriod) {
  const value = new Date(date).getTime();
  return value >= new Date(period.startDate).getTime() && value <= new Date(period.endDate).getTime();
}

function round(value: number) {
  return Number(value.toFixed(1));
}

export function deriveWrappedSummary(input: {
  team: Team;
  period: WrappedPeriod;
  matches: MatchHistoryEntry[];
  achievements?: TeamAchievement[];
  records?: RecordEntry[];
}): WrappedSummary {
  const matches = input.matches.filter((match) => inPeriod(match.playedAt, input.period));
  const achievements = (input.achievements ?? []).filter((achievement) => achievement.unlockedAt && inPeriod(achievement.unlockedAt, input.period));
  const records = (input.records ?? []).filter((record) => inPeriod(record.achievedAt, input.period));
  const mapGroups = new Map<string, MatchHistoryEntry[]>();

  matches.forEach((match) => mapGroups.set(match.map, [...(mapGroups.get(match.map) ?? []), match]));
  const mapStats: WrappedMapStat[] = [...mapGroups.entries()].map(([map, entries]) => ({
    map,
    matches: entries.length,
    wwcd: entries.filter((entry) => entry.wwcd).length,
    averagePlacement: round(entries.reduce((sum, entry) => sum + entry.placement, 0) / entries.length),
    averagePoints: round(entries.reduce((sum, entry) => sum + entry.points, 0) / entries.length),
  }));
  const supportedMaps = mapStats.filter((stat) => stat.matches >= WRAPPED_MAP_MINIMUM_MATCHES);
  const bestMap = supportedMaps.sort((a, b) => b.averagePoints - a.averagePoints || a.averagePlacement - b.averagePlacement)[0];
  const biggestMatch = [...matches].sort((a, b) => b.finishes - a.finishes || b.points - a.points)[0];

  return {
    entity: {
      type: 'team',
      id: input.team.id,
      slug: input.team.slug ?? input.team.id,
      name: input.team.name,
      logoUrl: input.team.logoUrl,
    },
    period: input.period,
    matches: matches.length,
    kills: matches.reduce((sum, match) => sum + match.finishes, 0),
    wwcd: matches.filter((match) => match.wwcd).length,
    podiums: matches.filter((match) => match.placement <= 3).length,
    bestMap,
    biggestKillGame: biggestMatch ? {
      matchId: biggestMatch.id,
      kills: biggestMatch.finishes,
      map: biggestMatch.map,
      tournamentName: biggestMatch.tournamentName,
      playedAt: biggestMatch.playedAt,
    } : undefined,
    records,
    achievements,
    minimumMatches: WRAPPED_MINIMUM_MATCHES,
    available: matches.length >= WRAPPED_MINIMUM_MATCHES,
  };
}

export function yearPeriod(year: number): WrappedPeriod {
  return {
    type: 'year',
    year,
    label: String(year),
    startDate: `${year}-01-01T00:00:00.000+04:00`,
    endDate: `${year}-12-31T23:59:59.999+04:00`,
  };
}
