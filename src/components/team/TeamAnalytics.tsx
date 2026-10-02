import { useState } from 'react';
import type { MatchHistoryEntry } from '../../types/domain';
import { teamAnalytics } from '../../utils/teamAnalytics';
import { competitionNow } from '../../services';
import '../../styles/team-insights.css';
const date = (value:string) => new Date(value).toLocaleDateString('az-AZ',{timeZone:'Asia/Baku',day:'numeric',month:'short'});
function Trend({matches,metric,label}:{matches:MatchHistoryEntry[];metric:'finishes'|'points'|'placement';label:string}) {
 const [selected,setSelected]=useState<string>();
 const rows=matches.slice(-12), max=Math.max(1,...rows.map(m=>m[metric]));
 const start=Date.parse(rows[0].playedAt),span=Math.max(1,Date.parse(rows[rows.length-1].playedAt)-start);
 const x=(m:MatchHistoryEntry)=>36+(Date.parse(m.playedAt)-start)/span*488;
 const y=(m:MatchHistoryEntry)=>metric==='placement'?28+(m[metric]-1)/Math.max(1,max-1)*132:160-m[metric]/max*132;
 const current=rows.find(m=>m.id===selected)??rows[rows.length-1];
 return <article className="insight-chart"><header><h3>{label}</h3><small>Son {rows.length} matç{metric==='placement'?' · yuxarı daha yaxşıdır':''}</small></header>
  <svg viewBox="0 0 560 200" role="group" aria-label={label}>
   {[0,.5,1].map(t=><g key={t}><line x1="36" x2="524" y1={28+t*132} y2={28+t*132} className="chart-grid"/><text x="4" y={32+t*132}>{metric==='placement'?(1+t*(max-1)).toFixed(0):Math.round(max*(1-t))}</text></g>)}
   <polyline points={rows.map(m=>`${x(m)},${y(m)}`).join(' ')} fill="none" className="chart-line"/>
   {rows.map(m=><g key={m.id} tabIndex={0} role="img" aria-label={`${date(m.playedAt)}, ${m.map}: ${m[metric]}`} onFocus={()=>setSelected(m.id)} onMouseEnter={()=>setSelected(m.id)} onClick={()=>setSelected(m.id)}><circle cx={x(m)} cy={y(m)} r="16" fill="transparent"/><circle cx={x(m)} cy={y(m)} r={current.id===m.id?5:3} className="chart-point"/><title>{date(m.playedAt)} · {m.map}: {m[metric]}</title></g>)}
   <text x="36" y="190">{date(rows[0].playedAt)}</text><text x="524" y="190" textAnchor="end">{date(rows[rows.length-1].playedAt)}</text>
  </svg><p className="chart-detail">{date(current.playedAt)} · {current.map} <strong>{current[metric]} {metric==='placement'?'yer':metric==='points'?'xal':'kill'}</strong></p>
 </article>;
}
export function TeamAnalytics({history}:{history:MatchHistoryEntry[]}) {
 const data=teamAnalytics(history,competitionNow());
 const [metric,setMetric]=useState<'finishes'|'points'>('finishes');
 if(!data.matches.length)return <section className="team-insights"><header><h2>Performans</h2><p>İlk rəsmi matç nəticəsi dərc edildikdə qrafiklər burada görünəcək.</p></header></section>;
 const eligible=data.maps.filter(m=>m.matches>=3), strongest=eligible[0];
 return <section className="team-insights" aria-label="Rəsmi matç analitikası"><header><h2>Performans</h2><p>Dərc edilmiş nəticələr · aylıq göstəricilər Bakı vaxtı ilə</p></header>
  <dl className="insight-metrics"><div><dt>Bu ay · kill</dt><dd>{data.monthlyKills}</dd><small>{data.month} · {data.monthly.length} matç</small></div><div><dt>Orta kill / matç</dt><dd>{(data.kills/data.matches.length).toFixed(1)}</dd><small>{data.matches.length} rəsmi matç</small></div><div><dt>Orta yer</dt><dd>{data.averagePlacement?.toFixed(1)}</dd><small>Aşağı rəqəm daha yaxşıdır</small></div><div><dt>Qələbə / ilk 3</dt><dd>{data.wins} / {data.topThree}</dd><small>{Math.round(data.wins/data.matches.length*100)}% qələbə</small></div></dl>
  {data.matches.length>=4?<><div className="insight-toggle" aria-label="Trend göstəricisi"><button aria-pressed={metric==='finishes'} onClick={()=>setMetric('finishes')}>Kill</button><button aria-pressed={metric==='points'} onClick={()=>setMetric('points')}>Xal</button></div><div className="insight-charts"><Trend matches={data.matches} metric={metric} label={metric==='finishes'?'Kill dinamikası':'Xal dinamikası'}/><Trend matches={data.matches} metric="placement" label="Yerləşmə dinamikası"/></div></>:<p>Trend üçün ən azı 4 dərc edilmiş matç lazımdır. Mövcud nəticələr aşağıdadır.</p>}
  <article className="insight-chart"><header><h3>Xəritə üzrə orta kill</h3><small>{strongest?`Ən yüksək: ${strongest.map} · ən azı 3 matç`:'Etibarlı müqayisə üçün xəritə üzrə ən azı 3 matç lazımdır'}</small></header><div className="map-bars">{data.maps.map(m=><div key={m.map}><span>{m.map}<small>{m.matches} matç · {m.kills} kill</small></span><meter min={0} max={Math.max(1,...data.maps.map(x=>x.averageKills))} value={m.averageKills} aria-label={`${m.map}: orta ${m.averageKills.toFixed(1)} kill`}/><strong>{m.averageKills.toFixed(1)}</strong></div>)}</div></article>
  <details className="insight-table"><summary>Matçların rəqəmlərini göstər</summary><div><table><caption>Son 12 dərc edilmiş matç</caption><thead><tr><th>Tarix</th><th>Xəritə</th><th>Yer</th><th>Kill</th><th>Xal</th></tr></thead><tbody>{data.matches.slice(-12).reverse().map(m=><tr key={m.id}><td>{date(m.playedAt)}</td><td>{m.map}</td><td>{m.placement}</td><td>{m.finishes}</td><td>{m.points}</td></tr>)}</tbody></table></div></details>
 </section>;
}
