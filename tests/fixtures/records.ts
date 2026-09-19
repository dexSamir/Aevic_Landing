import type { Team, MatchHistoryEntry, RecordEntry } from '../../src/types/domain';
export function buildFixtureRecords(team: Team, matches: MatchHistoryEntry[]): RecordEntry[] {
  if (!matches.length) return [];
  const mostKills = [...matches].sort((a, b) => b.finishes - a.finishes || new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())[0];
  const mostPoints = [...matches].sort((a, b) => b.points - a.points || new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())[0];
  const toRecord = (match: MatchHistoryEntry, type: RecordEntry['type'], label: string, value: number, unit: string): RecordEntry => ({
    id: `${type.toLowerCase()}-${match.id}`,
    type,
    label,
    value,
    unit,
    teamId: team.id,
    teamName: team.name,
    teamLogo: team.logoUrl,
    tournamentId: match.tournamentId,
    tournamentName: match.tournamentName,
    matchId: match.id,
    roundLabel: match.stageLabel,
    map: match.map,
    achievedAt: match.playedAt,
    rosterSnapshot: [],
    rosterSnapshotStatus: 'unavailable',
    source: 'backend',
  });
  return [
    toRecord(mostKills, 'MOST_KILLS_ONE_MATCH', 'Bir matçda ən çox kill', mostKills.finishes, 'kill'),
    toRecord(mostPoints, 'BEST_SINGLE_MATCH_POINTS', 'Bir matçda ən yüksək xal', mostPoints.points, 'xal'),
  ];
}

