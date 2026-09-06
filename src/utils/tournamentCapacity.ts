import type { TournamentSlot } from '../types/domain';

export interface TournamentCapacity {
  total: number;
  occupied: number;
  available: number;
  reserved: number;
}

export function deriveTournamentCapacity(slots: TournamentSlot[]): TournamentCapacity {
  return slots.reduce<TournamentCapacity>((capacity, slot) => {
    capacity.total += 1;
    capacity[slot.state] += 1;
    return capacity;
  }, { total: 0, occupied: 0, available: 0, reserved: 0 });
}

export function capacityIsCoherent(capacity: TournamentCapacity) {
  return capacity.occupied + capacity.available + capacity.reserved === capacity.total;
}
