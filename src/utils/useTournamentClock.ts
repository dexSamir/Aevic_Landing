import { useEffect, useState } from 'react';
import { competitionNow } from '../services';
import type { Tournament } from '../types/domain';

/** Page content changes at lifecycle boundaries, not on every countdown second. */
export function useTournamentClock(tournaments: readonly Tournament[]) {
  const [now, setNow] = useState(competitionNow);
  useEffect(() => {
    const started = Date.now(), reference = competitionNow().getTime();
    const boundaries = tournaments.flatMap(t => [Date.parse(t.registrationOpensAt), Date.parse(t.registrationDeadline) + 1, Date.parse(t.startsAt), Date.parse(t.endsAt) + 1]).filter(Number.isFinite).sort((a, b) => a - b);
    let timer: number | undefined;
    const update = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      const at = reference + Date.now() - started;
      setNow(new Date(at));
      const next = boundaries.find(value => value > at);
      if (next !== undefined) timer = window.setTimeout(update, Math.min(next - at, 2_147_483_647));
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', update); };
  }, [tournaments]);
  return now;
}
