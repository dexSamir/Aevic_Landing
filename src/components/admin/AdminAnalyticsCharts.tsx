import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AnalyticsPoint, AdminAnalytics } from '../../types/adminAnalytics';
import { formatEventDate } from '../../utils/calendar';
import { statusLabel } from '../../utils/statusLabels';

type Metric = Exclude<keyof AnalyticsPoint, 'date'>;
const palette = ['var(--color-brand-primary)', 'var(--color-info)', 'var(--color-success)', 'var(--color-identity)', 'var(--team-text-muted)', 'var(--color-text-danger)'];
export function ActivityChart({ points, metrics, label }: { points: AnalyticsPoint[]; metrics: Array<{ key: Metric; label: string }>; label: string }) {
  const id = useId();
  const plotRef=useRef<SVGSVGElement>(null);
  const [width,setWidth]=useState(704);
  useEffect(()=>{const plot=plotRef.current;if(!plot)return;const observer=new ResizeObserver(entries=>{const w=Math.round(entries[0]?.contentRect.width??704);if(w>0)setWidth(w);});observer.observe(plot);return()=>observer.disconnect();},[points]);
  const [selected, setSelected] = useState<number>();
  const [hidden, setHidden] = useState<Metric[]>([]);
  const index = Math.min(selected ?? Math.max(0, points.length - 1), points.length - 1);
  const current = points[index];
  const visible = metrics.filter(m => !hidden.includes(m.key));
  const max = Math.max(1, ...points.flatMap(p => visible.map(m => p[m.key])));
  const yMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const x = (i: number) => 34 + i * (width-62) / Math.max(1, points.length - 1);
  const y = (n: number) => 176 - n * 144 / yMax;
  const date = (s: string) => formatEventDate(s.slice(0,10)+'T12:00:00+04:00',{includeYear:true});
  const total = metrics.reduce((s, m) => s + points.reduce((v, p) => v + p[m.key], 0), 0);
  return <div className="admin-chart">
    <div className="admin-chart__legend">{metrics.map((m, i) => <button type="button" key={m.key} aria-pressed={!hidden.includes(m.key)} onClick={() => setHidden(h => h.includes(m.key) ? h.filter(k => k !== m.key) : h.length < metrics.length - 1 ? [...h, m.key] : h)}><i style={{ background: palette[i] }} />{m.label}</button>)}</div>
    {!total ? <div className="admin-chart__empty"><strong>Bu dövrdə fəaliyyət yoxdur</strong><span>Başqa tarix aralığını seçin.</span></div> : <>
      <svg className="admin-chart__plot" ref={plotRef} viewBox={`0 0 ${width} 210`} role="img" aria-labelledby={id} onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setSelected(Math.round(Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * width - 34) / (width-62))) * (points.length - 1))); }}>
        <title id={id}>{label}. Dəqiq göstəricilər aşağıdakı tarix idarəsində və məlumat cədvəlindədir.</title>
        {[0, 1, 2, 3, 4].map(t => <g key={t}><line x1="34" x2={width-28} y1={y(t * yMax / 4)} y2={y(t * yMax / 4)} stroke="var(--admin-separator)" strokeDasharray="3 5" /><text x="24" y={y(t * yMax / 4) + 4} textAnchor="end">{t * yMax / 4}</text></g>)}
        {visible.map(m => <path key={m.key} d={points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[m.key])}`).join(' ')} fill="none" stroke={palette[metrics.indexOf(m)]} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" />)}
        {current && <><line x1={x(index)} x2={x(index)} y1="25" y2="180" stroke="var(--team-text-muted)" strokeDasharray="3 4" />{visible.map(m => <circle key={m.key} cx={x(index)} cy={y(current[m.key])} r="4" fill={palette[metrics.indexOf(m)]} stroke="var(--team-surface-primary)" strokeWidth="2" />)}</>}
        {points.length > 0 && (width<450?[0,points.length-1]:[0, Math.floor((points.length - 1) / 2), points.length - 1]).filter((v, i, a) => a.indexOf(v) === i).map(i => <text key={i} x={x(i)} y="204" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{date(points[i].date)}</text>)}
      </svg>
      {current && <div className="admin-chart__readout" aria-live="polite"><strong>{date(current.date)}</strong>{visible.map((m, i) => <span key={m.key}><i style={{ background: palette[metrics.indexOf(m)] }} />{m.label}: <b>{current[m.key]}</b></span>)}</div>}
      <div className="admin-chart__controls"><button type="button" aria-label={`${label}: əvvəlki tarix`} disabled={index <= 0} onClick={() => setSelected(index - 1)}><ChevronLeft size={16} /></button><input type="range" aria-label={`${label}: tarix seç`} min={0} max={Math.max(0, points.length - 1)} value={Math.max(0,index)} aria-valuetext={current ? `${date(current.date)}, ${visible.map(m => `${m.label} ${current[m.key]}`).join(', ')}` : undefined} onChange={e => setSelected(Number(e.target.value))} /><button type="button" aria-label={`${label}: növbəti tarix`} disabled={index >= points.length - 1} onClick={() => setSelected(index + 1)}><ChevronRight size={16} /></button></div>
    </>}
    <details className="admin-chart__data"><summary>Məlumat cədvəli · say</summary><div tabIndex={0} role="region" aria-label={`${label} məlumatları`}><table><thead><tr><th>Tarix</th>{metrics.map(m => <th key={m.key}>{m.label}</th>)}</tr></thead><tbody>{points.map(p => <tr key={p.date}><th>{date(p.date)}</th>{metrics.map(m => <td key={m.key}>{p[m.key]}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
export function LifecycleChart({ items }: { items: AdminAnalytics['lifecycle'] }) {
  const [selected, setSelected] = useState<string>();
  const total = items.reduce((s, i) => s + i.count, 0);
  let offset = 0;
  const active = items.find(i => i.status === selected);
  return <div className="admin-lifecycle"><div className="admin-lifecycle__ring"><svg viewBox="0 0 160 160" role="img" aria-label={`${total} turnir, status bölgüsü`}><circle cx="80" cy="80" r="62" fill="none" stroke="var(--admin-separator)" strokeWidth="14" />{items.map((item, i) => { const length = total ? item.count / total * 389.56 : 0; const start = offset; offset += length; return <circle key={item.status} cx="80" cy="80" r="62" fill="none" stroke={palette[i % palette.length]} strokeWidth={selected === item.status ? 18 : 14} strokeDasharray={`${Math.max(0,length - 3)} ${389.56 - Math.max(0,length - 3)}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" opacity={selected && selected !== item.status ? .3 : 1} />; })}</svg><div><strong>{active?.count ?? total}</strong><span>{active ? statusLabel(active.status) : 'Cəmi turnir'}</span></div></div><div className="admin-lifecycle__legend">{items.map((item, i) => <button type="button" key={item.status} aria-pressed={selected === item.status} onClick={() => setSelected(s => s === item.status ? undefined : item.status)} onMouseEnter={() => setSelected(item.status)} onMouseLeave={() => setSelected(undefined)}><i style={{ background: palette[i % palette.length] }} /><span>{statusLabel(item.status)}</span><strong>{item.count}</strong></button>)}{!total && <p>Hələ turnir yaradılmayıb.</p>}</div></div>;
}
