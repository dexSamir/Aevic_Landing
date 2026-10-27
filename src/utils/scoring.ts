import type { PointFormula, RoundResult, TeamTournamentResult } from '../types/domain';

/** Canonical scoring for result entry, corrections, and public examples. */
export function scoreMatch(formula: PointFormula, placement: number, kills: number, penalties = 0) {
  const placementPoints = Number(formula.placement.find(row => row.placement === placement)?.points ?? 0)
    + (placement === 1 ? Number(formula.wwcdBonus ?? 0) : 0);
  const finishPoints = kills * Number(formula.finishPointValue);
  return { placementPoints, finishPoints, totalPoints: placementPoints + finishPoints - penalties };
}

/** Combine adjacent placements with identical configured points for a compact rules list. */
export function placementPointGroups(formula: PointFormula, capacity: number) {
  const groups: Array<{ first: number; last: number; points: number }> = [];
  const points = new Map(formula.placement.map(row => [row.placement, row.points]));
  const last = Math.max(capacity, ...points.keys());
  for (let placement = 1; placement <= last; placement++) {
    const value = points.get(placement) ?? 0;
    const previous = groups[groups.length - 1];
    if (previous?.points === value) previous.last = placement;
    else groups.push({ first: placement, last: placement, points: value });
  }
  return groups;
}

/** Only new tournaments opt in. An absent ID means legacy ordering. */
export const INTERNATIONAL_PRESET_ID = 'pubgm-international-v1';
export const internationalFormula: PointFormula = {
  presetId: INTERNATIONAL_PRESET_ID,
  placement: [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0].map((points, index) => ({ placement: index + 1, points })),
  finishPointValue: 1, wwcdBonus: 0, defaultPenalty: 0,
  tieBreakRules: ['WWCD sayı', 'Toplanmış yerləşmə xalları', 'Toplanmış eliminasiya xalları', 'Son müvafiq matçda daha yaxşı yer'],
};

/** Stored published totals remain authoritative, including historical corrections. */
export function rankPublishedResults(results: RoundResult[], formulas: Record<string, PointFormula> = {}, matchOrder: string[] = []): TeamTournamentResult[] {
  const grouped = new Map<string, TeamTournamentResult>();
  const order = new Map(matchOrder.map((id, index) => [id, index]));
  const latest = new Map<string, string>();
  for (const row of results) {
    if (!row.published) continue;
    const current = latest.get(row.tournamentId);
    if (!current || (order.get(row.roundId) ?? -1) > (order.get(current) ?? -1)) latest.set(row.tournamentId, row.roundId);
    const key = row.tournamentId + ':' + row.teamId;
    const value = grouped.get(key) ?? { tournamentId: row.tournamentId, teamId: row.teamId, placement: 0, matches: 0, wwcd: 0, finishes: 0, placementPoints: 0, finishPoints: 0, penalties: 0, totalPoints: 0, bestFinish: 100 };
    value.matches++; value.wwcd += Number(row.placement === 1); value.finishes += row.finishes;
    value.placementPoints += row.placementPoints; value.finishPoints += row.finishPoints;
    value.penalties += row.penalties; value.totalPoints += row.totalPoints;
    value.bestFinish = Math.min(value.bestFinish, row.placement); grouped.set(key, value);
  }
  const lastPlacement = new Map(results.filter(row => row.published && row.roundId === latest.get(row.tournamentId)).map(row => [row.tournamentId + ':' + row.teamId, row.placement]));
  const all = [...grouped.values()];
  return [...new Set(all.map(row => row.tournamentId))].flatMap(id => all.filter(row => row.tournamentId === id).sort((a, b) => {
    const common = b.totalPoints - a.totalPoints || b.wwcd - a.wwcd;
    const tie = formulas[id]?.presetId === INTERNATIONAL_PRESET_ID
      ? b.placementPoints - a.placementPoints || b.finishPoints - a.finishPoints || (lastPlacement.get(id + ':' + a.teamId) ?? 101) - (lastPlacement.get(id + ':' + b.teamId) ?? 101)
      : b.finishes - a.finishes || a.bestFinish - b.bestFinish;
    return common || tie || a.teamId.localeCompare(b.teamId);
  }).map((row, index) => ({ ...row, placement: index + 1 })));
}
