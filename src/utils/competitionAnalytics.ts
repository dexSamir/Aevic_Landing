import type { MapPerformanceMetric, MapPerformanceSummary, MatchHistoryEntry, PublicTeamSummary, RecordEntry, Team, TeamFormEntry, TeamSpecialization, TeamTournamentResult, Tournament, TournamentRecapData } from '../types/domain';

export const TEAM_SPECIALIZATION_MINIMUM_MATCHES = 8;

export function deriveTeamForm(matches: MatchHistoryEntry[]): TeamFormEntry[] {
  return [...matches]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 10)
    .map((match, index) => ({ matchId: match.id, playedAt: match.playedAt, map: match.map, placement: match.placement, finishes: match.finishes, points: match.points, wwcd: match.wwcd, newest: index === 0 }));
}

/**
 * Derives one public label from multiple published-match signals. A single
 * result can never qualify a team. The highest qualifying normalized score
 * wins, which keeps the output deterministic when several rules qualify.
 */
export function deriveTeamSpecialization(matches: MatchHistoryEntry[], minimumMatches = TEAM_SPECIALIZATION_MINIMUM_MATCHES): TeamSpecialization | undefined {
  if (matches.length < minimumMatches) return undefined;
  const sampleSize = matches.length;
  const topThree = matches.filter((match) => match.placement <= 3).length;
  const wins = matches.filter((match) => match.wwcd).length;
  const averageKills = matches.reduce((sum, match) => sum + match.finishes, 0) / sampleSize;
  const averagePlacement = matches.reduce((sum, match) => sum + match.placement, 0) / sampleSize;
  const deviation = Math.sqrt(matches.reduce((sum, match) => sum + ((match.placement - averagePlacement) ** 2), 0) / sampleSize);
  const topThreeRate = topThree / sampleSize;
  const winRate = wins / sampleSize;
  const candidates: TeamSpecialization[] = [];
  if (topThree >= 4 && topThreeRate >= .45) candidates.push({ type: 'top_three', label: 'Top Three Specialist', score: Number(Math.min(1, (topThreeRate / .65) * .72 + Math.min(topThree / 8, 1) * .28).toFixed(2)), sampleSize, evidence: `${topThree} / ${sampleSize} Top-3 · ${(topThreeRate * 100).toFixed(1)}%`, supportingValue: topThree, supportingTotal: sampleSize });
  if (wins >= 2 && winRate >= .2) candidates.push({ type: 'wwcd', label: 'WWCD Specialist', score: Number(Math.min(1, (winRate / .35) * .76 + Math.min(wins / 5, 1) * .24).toFixed(2)), sampleSize, evidence: `${wins} / ${sampleSize} WWCD · ${(winRate * 100).toFixed(1)}%`, supportingValue: wins, supportingTotal: sampleSize });
  if (averageKills >= 7) candidates.push({ type: 'kill_pressure', label: 'Kill Pressure', score: Number(Math.min(1, averageKills / 10).toFixed(2)), sampleSize, evidence: `${averageKills.toFixed(1)} orta kill`, supportingValue: Number(averageKills.toFixed(1)), supportingTotal: sampleSize });
  if (averagePlacement <= 5 && deviation <= 2.4) candidates.push({ type: 'consistency', label: 'Consistency', score: Number(Math.min(1, ((5 - averagePlacement) / 4) * .45 + ((2.4 - deviation) / 2.4) * .55).toFixed(2)), sampleSize, evidence: `#${averagePlacement.toFixed(1)} orta yer · σ ${deviation.toFixed(1)}`, supportingValue: Number(averagePlacement.toFixed(1)), supportingTotal: sampleSize });
  const baseline = matches.reduce((sum, match) => sum + match.points, 0) / sampleSize;
  const maps = new Map<string, MatchHistoryEntry[]>();
  matches.forEach((match) => maps.set(match.map, [...(maps.get(match.map) ?? []), match]));
  for (const [map, entries] of maps) {
    if (entries.length < 4) continue;
    const average = entries.reduce((sum, match) => sum + match.points, 0) / entries.length;
    const lift = baseline > 0 ? (average - baseline) / baseline : 0;
    if (lift >= .15) candidates.push({ type: 'map', label: `${map} Specialist`, score: Number(Math.min(1, .58 + lift).toFixed(2)), sampleSize, evidence: `${entries.length} matç · +${Math.round(lift * 100)}% xal`, supportingValue: entries.length, supportingTotal: sampleSize, map });
  }
  return candidates.sort((a, b) => b.score - a.score || b.sampleSize - a.sampleSize || a.type.localeCompare(b.type))[0];
}

export function summarizeMapPerformance(teamId: string, matches: MatchHistoryEntry[], minimumSampleSize = 3): MapPerformanceSummary {
  const grouped = new Map<string, MatchHistoryEntry[]>();
  matches.forEach((match) => grouped.set(match.map, [...(grouped.get(match.map) ?? []), match]));
  const metrics: MapPerformanceMetric[] = [...grouped.entries()].map(([map, entries]) => ({
    map,
    matches: entries.length,
    wwcd: entries.filter((entry) => entry.wwcd).length,
    averagePlacement: Number((entries.reduce((sum, entry) => sum + entry.placement, 0) / entries.length).toFixed(1)),
    averageFinishes: Number((entries.reduce((sum, entry) => sum + entry.finishes, 0) / entries.length).toFixed(1)),
    averagePoints: Number((entries.reduce((sum, entry) => sum + entry.points, 0) / entries.length).toFixed(1)),
  })).sort((a, b) => b.matches - a.matches || a.map.localeCompare(b.map));
  const eligible = metrics.filter((metric) => metric.matches >= minimumSampleSize);
  if (!eligible.length) return { teamId, minimumSampleSize, status: 'insufficient-data', metrics };
  // No official composite score exists. "Best map" is therefore the eligible map
  // with the highest average published match points; ties use sample size, then name.
  const bestMap = [...eligible].sort((a, b) => b.averagePoints - a.averagePoints || b.matches - a.matches || a.map.localeCompare(b.map))[0];
  const mostWwcd = [...eligible].sort((a, b) => b.wwcd - a.wwcd || b.matches - a.matches || a.map.localeCompare(b.map))[0];
  const bestAveragePlacement = [...eligible].sort((a, b) => a.averagePlacement - b.averagePlacement || b.matches - a.matches || a.map.localeCompare(b.map))[0];
  return { teamId, minimumSampleSize, status: 'ready', bestMap, mostWwcd, bestAveragePlacement, metrics };
}

export function buildPublishedDemoRecords(team: Team, matches: MatchHistoryEntry[]): RecordEntry[] {
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
    source: 'published-demo',
  });
  return [
    toRecord(mostKills, 'MOST_KILLS_ONE_MATCH', 'Bir matçda ən çox kill', mostKills.finishes, 'kill'),
    toRecord(mostPoints, 'BEST_SINGLE_MATCH_POINTS', 'Bir matçda ən yüksək xal', mostPoints.points, 'xal'),
  ];
}

export function buildTournamentRecap(tournament: Tournament, matches: MatchHistoryEntry[], standings: TeamTournamentResult[], teams: PublicTeamSummary[]): TournamentRecapData | undefined {
  if (tournament.status !== 'completed') return undefined;
  const tournamentMatches = matches.filter((match) => match.tournamentId === tournament.id);
  const tournamentStandings = standings.filter((result) => result.tournamentId === tournament.id);
  const namedStandings = tournamentStandings.map((result) => ({ rank: result.placement, teamId: result.teamId, teamName: teams.find((team) => team.id === result.teamId)?.name ?? result.teamId, points: result.totalPoints, wwcd: result.wwcd, finishes: result.finishes })).sort((a, b) => a.rank - b.rank);
  const championStanding = namedStandings.find((standing) => standing.rank === 1);
  const champion = championStanding ? teams.find((team) => team.id === championStanding.teamId) : undefined;
  const mostWwcd = [...namedStandings].sort((a, b) => b.wwcd - a.wwcd)[0];
  const topKillTeam = [...namedStandings].sort((a, b) => b.finishes - a.finishes)[0];
  return {
    tournament,
    coverage: tournamentMatches.length && namedStandings.length ? 'complete' : 'partial',
    publishedAt: tournament.endsAt,
    champion,
    standings: namedStandings,
    totalMatches: tournamentMatches.length,
    totalKills: tournamentMatches.reduce((sum, match) => sum + match.finishes, 0),
    totalWwcd: tournamentMatches.filter((match) => match.wwcd).length,
    mostWwcd: mostWwcd ? { teamId: mostWwcd.teamId, teamName: mostWwcd.teamName, value: mostWwcd.wwcd } : undefined,
    topKillTeam: topKillTeam ? { teamId: topKillTeam.teamId, teamName: topKillTeam.teamName, value: topKillTeam.finishes } : undefined,
  };
}
