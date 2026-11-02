import { useEffect, useState } from 'react';
import type { MatchScheduleItem } from '../../types/domain';
import { matchClock } from './model';

export function MatchClock({ match }: { match: MatchScheduleItem }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [match.id]);
  return <p className="command-clock" aria-live="off" aria-label="Matçın başlama vəziyyəti">{matchClock(match, now)}</p>;
}
