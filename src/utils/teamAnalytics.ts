import type { MatchHistoryEntry } from '../types/domain';
const bakuDay = (date: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
export function teamAnalytics(history: MatchHistoryEntry[], now = new Date()) {
  const matches = history.filter(m => Number.isFinite(Date.parse(m.playedAt)) && Number.isFinite(m.finishes) && Number.isFinite(m.points) && Number.isFinite(m.placement) && m.placement > 0).sort((a,b) => Date.parse(a.playedAt)-Date.parse(b.playedAt));
  const month = bakuDay(now).slice(0,7);
  const monthly = matches.filter(m => bakuDay(m.playedAt).startsWith(month));
  const maps = [...new Set(matches.map(m=>m.map))].map(map=>{
    const rows=matches.filter(m=>m.map===map);
    return {map,matches:rows.length,kills:rows.reduce((s,m)=>s+m.finishes,0),averageKills:rows.reduce((s,m)=>s+m.finishes,0)/rows.length,averagePlacement:rows.reduce((s,m)=>s+m.placement,0)/rows.length};
  }).sort((a,b)=>b.averageKills-a.averageKills);
  return {matches,monthly,maps,month,kills:matches.reduce((s,m)=>s+m.finishes,0),monthlyKills:monthly.reduce((s,m)=>s+m.finishes,0),wins:matches.filter(m=>m.placement===1).length,topThree:matches.filter(m=>m.placement<=3).length,averagePlacement:matches.length?matches.reduce((s,m)=>s+m.placement,0)/matches.length:undefined};
}
