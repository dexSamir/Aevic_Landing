import type { MatchHistoryEntry } from '../types/domain';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit', day: '2-digit' });
export const bakuDay = (date: string | Date) => dayFormatter.format(new Date(date));
const sum = (rows: MatchHistoryEntry[], metric: 'finishes' | 'points') => rows.reduce((total, row) => total + row[metric], 0);

/** Input is the service's published match history, never schedule or draft results. */
export function teamAnalytics(history: MatchHistoryEntry[], now = new Date()) {
  const matches = history.filter(m => Number.isFinite(Date.parse(m.playedAt)) && Date.parse(m.playedAt) <= now.getTime() && Number.isFinite(m.finishes) && m.finishes >= 0 && Number.isFinite(m.points) && Number.isFinite(m.placement) && m.placement > 0).sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt) || a.id.localeCompare(b.id));
  const today = bakuDay(now), month = today.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
  const monthly = matches.filter(m => bakuDay(m.playedAt).startsWith(month));
  const previous = matches.filter(m => bakuDay(m.playedAt).startsWith(previousMonth));
  const daily = Array.from({ length: Number(today.slice(-2)) }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, '0')}`;
    const rows = monthly.filter(m => bakuDay(m.playedAt) === day);
    return { day, kills: sum(rows, 'finishes'), matches: rows.length };
  });
  const maps = [...new Set(matches.map(m => m.map))].map(map => {
    const rows = matches.filter(m => m.map === map);
    return { map, matches: rows.length, kills: sum(rows, 'finishes'), points: sum(rows, 'points'), averageKills: sum(rows, 'finishes') / rows.length, averagePoints: sum(rows, 'points') / rows.length, averagePlacement: rows.reduce((s, m) => s + m.placement, 0) / rows.length, wins: rows.filter(m => m.placement === 1).length, topThree: rows.filter(m => m.placement <= 3).length };
  }).sort((a, b) => b.averageKills - a.averageKills || a.map.localeCompare(b.map));
  return { matches, monthly, previous, daily, maps, month, previousMonth, kills: sum(matches, 'finishes'), points: sum(matches, 'points'), monthlyKills: sum(monthly, 'finishes'), previousKills: previous.length ? sum(previous, 'finishes') : undefined, wins: matches.filter(m => m.placement === 1).length, topThree: matches.filter(m => m.placement <= 3).length, averagePlacement: matches.length ? matches.reduce((s, m) => s + m.placement, 0) / matches.length : undefined, omitted: history.length - matches.length };
}
