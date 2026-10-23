import type { ReactNode } from 'react';
import './recent-placement-strip.css';

export interface RecentPlacement {
  id?: string;
  matchId?: string;
  placement?: number | null;
  map?: string;
  playedAt?: string;
  tournamentName?: string;
  finishes?: number;
}
/** A single visual and formatting contract for published, newest-first form. */
export function RecentPlacementStrip({ results, empty = 'Dərc edilmiş nəticə yoxdur.' }: { results: readonly RecentPlacement[]; empty?: ReactNode }) {
  const seen = new Set<string>();
  const rows = results.filter(result => {
    const id = result.matchId ?? result.id;
    if (!Number.isInteger(result.placement) || Number(result.placement) < 1 || (id && seen.has(id))) return false;
    if (id) seen.add(id);
    return true;
  }).sort((a, b) => {
    const first = Date.parse(a.playedAt ?? ''), second = Date.parse(b.playedAt ?? '');
    const firstTime = Number.isFinite(first) ? first : -Infinity;
    const secondTime = Number.isFinite(second) ? second : -Infinity;
    return firstTime === secondTime ? 0 : secondTime > firstTime ? 1 : -1;
  }).slice(0, 5);
  if (!rows.length) return <span className="recent-placement-empty">{empty}</span>;
  return <><ol className="recent-placement-strip" aria-label="Son matçların nəticələri, yeni → köhnə">{rows.map((result, index) => {
    const valid = Number.isInteger(result.placement) && Number(result.placement) > 0;
    const label = [valid ? `${result.placement}-ci yer` : 'Yer məlum deyil', result.map, result.tournamentName, result.playedAt, result.finishes !== undefined ? `${result.finishes} kill` : undefined].filter(Boolean).join(' · ');
    return <li key={result.matchId ?? result.id ?? index} className="recent-placement-tile" data-winner={valid && result.placement === 1 || undefined} tabIndex={0} aria-label={label} data-tooltip={label}><span aria-hidden="true">{result.placement === 1 ? <span className="placement-wwcd"><span>WW</span><span>CD</span></span> : valid ? result.placement : '—'}</span></li>;
  })}</ol><details className="recent-placement-details" onClick={event => event.stopPropagation()}>
    <summary>Matç detalları</summary>
    {rows.map((result, index) => <p key={result.matchId ?? result.id ?? index}>{[`${result.placement}-ci yer`, result.map, result.tournamentName, result.playedAt ? new Date(result.playedAt).toLocaleDateString('az-AZ', {timeZone:'Asia/Baku'}) : undefined, result.finishes !== undefined ? `${result.finishes} kill` : undefined].filter(Boolean).join(' · ')}</p>)}
  </details></>;
}
