import type { MatchHistoryEntry, PointFormula, TournamentResultBreakdown } from '../types/domain';

export function deriveTournamentResultBreakdown(options: {
  tournamentId: string;
  teamId: string;
  placement: number;
  matches: MatchHistoryEntry[];
  formula: PointFormula;
  penalties?: number;
}): TournamentResultBreakdown {
  const { tournamentId, teamId, placement, formula } = options;
  const penalties = Math.max(0, options.penalties ?? 0);
  const orderedMatches = [...options.matches]
    .filter((match) => match.tournamentId === tournamentId)
    .sort((left, right) => new Date(left.playedAt).getTime() - new Date(right.playedAt).getTime());
  const maps = orderedMatches
    .map((match, index) => {
      const killPoints = match.killPoints ?? match.finishes * formula.finishPointValue;
      const placementPoints = match.placementPoints ?? formula.placement.find((entry) => entry.placement === match.placement)?.points ?? Math.max(0, match.points - killPoints);
      return {
        matchId: match.id,
        round: index + 1,
        map: match.map,
        placement: match.placement,
        placementPoints,
        kills: match.finishes,
        killPoints,
        totalPoints: placementPoints + killPoints,
        isWWCD: match.placement === 1 || match.wwcd,
      };
    });
  const placementPoints = maps.reduce((sum, map) => sum + map.placementPoints, 0);
  const killPoints = maps.reduce((sum, map) => sum + map.killPoints, 0);
  return {
    tournamentId,
    teamId,
    stage: orderedMatches[0]?.stage,
    occurredAt: orderedMatches[orderedMatches.length - 1]?.playedAt,
    placement,
    matches: maps.length,
    wwcd: maps.filter((map) => map.isWWCD).length,
    kills: maps.reduce((sum, map) => sum + map.kills, 0),
    placementPoints,
    killPoints,
    penalties,
    totalPoints: placementPoints + killPoints - penalties,
    maps,
  };
}
