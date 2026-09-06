import type { RegistrationPlayerDraft } from '../types/domain';

export function normalizePubgId(value: string) {
  return value.replace(/[\s\-_.]+/g, '');
}

export function duplicatePubgIds(players: RegistrationPlayerDraft[]) {
  const counts = players.reduce<Record<string, number>>((result, player) => {
    if (player.uid) result[player.uid] = (result[player.uid] ?? 0) + 1;
    return result;
  }, {});
  return new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([uid]) => uid));
}
