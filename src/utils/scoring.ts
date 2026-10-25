import type { PointFormula } from '../types/domain';

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
