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
  const label = matchClock(match, now);
  return <p data-timing={/^\d/.test(label) ? 'countdown' : 'status'} className="command-clock" aria-live="off" aria-label="Matçın başlama vəziyyəti">{label}</p>;
}
