import { ChartSnapshot } from './ChartSnapshot';
import { useEffect, useState } from 'react';
import type { MatchHistoryEntry } from '../../types/domain';
import { teamAnalytics } from '../../utils/teamAnalytics';
import { competitionNow } from '../../services';
import '../../styles/team-insights.css';

const date = (value: string) => new Date(value).toLocaleDateString('az-AZ', { timeZone: 'Asia/Baku', day: 'numeric', month: '2-digit' });
const time = (value: string) => new Date(value).toLocaleTimeString('az-AZ', { timeZone: 'Asia/Baku', hour: '2-digit', minute: '2-digit' });
// Keep chart text in readable SVG units instead of shrinking a desktop viewBox.
function useChartWidth(desktopWidth: number) {
  const [node, setNode] = useState<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(desktopWidth);
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.max(1, Math.min(desktopWidth, entry.contentRect.width)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, desktopWidth]);
  return { ref: setNode, width };
}
function Trend({ matches, metric, label }: { matches: MatchHistoryEntry[]; metric: 'finishes' | 'points' | 'placement'; label: string }) {
  const [selected, setSelected] = useState<string>();
  const chart = useChartWidth(560);
  const right = chart.width - 40;
  const rows = matches.slice(-12), max = Math.max(1, ...rows.map(m => m[metric])), min = Math.min(0, ...rows.map(m => m[metric]));
  const start = Date.parse(rows[0].playedAt), span = Date.parse(rows[rows.length - 1].playedAt) - start;
  const x = (m: MatchHistoryEntry) => span ? 40 + (Date.parse(m.playedAt) - start) / span * (right - 40) : (40 + right) / 2;
  const y = (m: MatchHistoryEntry) => metric === 'placement' ? 28 + (m[metric] - 1) / Math.max(1, max - 1) * 132 : 160 - (m[metric] - min) / (max - min) * 132;
  const current = rows.find(m => m.id === selected) ?? rows[rows.length - 1];
  const unit = metric === 'placement' ? 'yer' : metric === 'points' ? 'xal' : 'kill';
  return <ChartSnapshot title={label} subtitle={`Son ${rows.length} matç${metric === 'placement' ? ' · 1-ci yer ən yaxşıdır' : ''}`} filename={`match-${metric}`} className={metric === 'placement' ? 'insight-chart--placement' : ''}>
    <p className="chart-axes"><span className="chart-legend">{unit}</span><span>Tarix</span></p>
    <svg ref={chart.ref} viewBox={`0 0 ${chart.width} 200`} role="group" aria-label={`${label}. X: Bakı tarixi. Y: ${unit}.`}>
      {[0, .5, 1].map(t => <g key={t}><line x1="40" x2={right} y1={28 + t * 132} y2={28 + t * 132} className="chart-grid" /><text x="4" y={32 + t * 132}>{metric === 'placement' ? (1 + t * (max - 1)).toFixed(0) : Math.round(max - t * (max - min))}</text></g>)}
      <polyline points={rows.map(m => `${x(m)},${y(m)}`).join(' ')} fill="none" className="chart-line" />
      {rows.map((m, index) => <g key={m.id} data-tooltip={`${m.tournamentName} · ${m.stageLabel} · ${date(m.playedAt)} ${time(m.playedAt)} · ${m.map}: ${m[metric]} ${unit}`} tabIndex={0} role="img" aria-label={`${date(m.playedAt)}, ${time(m.playedAt)}, ${m.map}, ${m.stageLabel}: ${m[metric]} ${unit}`} onFocus={() => setSelected(m.id)} onMouseEnter={() => setSelected(m.id)} onClick={() => setSelected(m.id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : -1;
        if (next >= 0 && next < rows.length) { event.preventDefault(); event.currentTarget.parentElement?.querySelectorAll<SVGGElement>('[tabindex]')[next]?.focus(); }
      }}><circle cx={x(m)} cy={y(m)} r="18" fill="transparent" /><circle cx={x(m)} cy={y(m)} r={current.id === m.id ? 5 : 3} className="chart-point" /></g>)}
      <text x="40" y="190">{date(rows[0].playedAt)}</text><text x={right} y="190" textAnchor="end">{date(rows[rows.length - 1].playedAt)}</text>
    </svg><label className="chart-selection" data-export-exclude>Matç seçin<select value={current.id} onChange={event => setSelected(event.target.value)}>{rows.map(m => <option key={m.id} value={m.id}>{date(m.playedAt)} · {m.map} · {m.stageLabel}</option>)}</select></label><p className="chart-detail">{date(current.playedAt)} · {time(current.playedAt)} · {current.map}<strong>{label}: {current[metric]} {unit}</strong></p><small>{current.tournamentName} · {current.stageLabel}</small>
  </ChartSnapshot>;
}
function MonthlyKills({ data }: { data: ReturnType<typeof teamAnalytics> }) {
  const chart = useChartWidth(720);
  const right = chart.width - 16;
  const [selected, setSelected] = useState<string>();
  const max = Math.max(1, ...data.daily.map(day => day.kills));
  const active = data.daily.find(day => day.day === selected) ?? data.daily[data.daily.length - 1];
  return <ChartSnapshot title="Günlər üzrə ümumi kill" subtitle={data.month} filename="daily-kills" className="monthly-kills" disabled={!data.monthly.length}>
    <p className="chart-axes"><span className="chart-legend">Kill</span><span>Gün</span></p>
    {!data.monthly.length ? <p className="insight-empty">Bu ay üçün dərc edilmiş matç yoxdur.</p> : <>
      <svg ref={chart.ref} viewBox={`0 0 ${chart.width} 210`} role="group" aria-label={`${data.month}: günlər üzrə ümumi kill sayı`}>
        {[0, .5, 1].map(t => <g key={t}><line x1="40" x2={right} y1={24 + t * 140} y2={24 + t * 140} className="chart-grid" /><text x="4" y={28 + t * 140}>{Math.round(max * (1 - t))}</text></g>)}
        {data.daily.map((day, index) => { const width = (right - 40) / data.daily.length; const x = 40 + index * width; const height = day.kills / max * 140; return <g key={day.day} data-tooltip={`${day.day} · ${day.kills} kill · ${day.matches} matç`} tabIndex={0} role="img" aria-label={`${day.day}: ümumi ${day.kills} kill, ${day.matches} dərc edilmiş matç`} onFocus={() => setSelected(day.day)} onMouseEnter={() => setSelected(day.day)} onClick={() => setSelected(day.day)}>
          <rect x={x} y="24" width={width} height="140" fill="transparent" /><rect x={x + 2} y={164 - height} width={Math.max(1, width - 4)} height={height} className="chart-point" opacity={active.day === day.day ? 1 : .65} rx="2" />
          {(index % Math.ceil(data.daily.length / Math.max(2, Math.floor((right - 40) / 32))) === 0 || index === data.daily.length - 1) && <text x={x + width / 2} y="188" textAnchor="middle">{index + 1}</text>}

        </g>; })}
      </svg>
      <label className="chart-selection" data-export-exclude>Gün seçin<select value={active.day} onChange={event => setSelected(event.target.value)}>{data.daily.map(day => <option key={day.day} value={day.day}>{day.day} · {day.kills} kill · {day.matches} matç</option>)}</select></label>
      <p className="chart-detail">{active.day} · {active.matches} dərc edilmiş matç<strong>Ümumi kill: {active.kills}</strong></p><small>Boş gün: dərc edilmiş matç yoxdur. Gələcək günlər göstərilmir.</small>
    </>}
  </ChartSnapshot>;
}
export function TeamAnalytics({ history, unavailable = false, incomplete = false }: { history: MatchHistoryEntry[]; unavailable?: boolean; incomplete?: boolean }) {
  const data = teamAnalytics(history, competitionNow());
  const [metric, setMetric] = useState<'finishes' | 'points'>('finishes');
  if (unavailable || !data.matches.length) {
    const message = unavailable ? 'Matç tarixçəsi hazırda əlçatan deyil. Analitika hesablana bilmir.' : history.length ? 'Matç məlumatlarında tarix və ya nəticə çatışmır. Analitika hesablana bilmir.' : 'İlk rəsmi matç nəticəsi dərc edildikdə qrafiklər burada görünəcək.';
    return <section className="team-insights" aria-label="Rəsmi matç analitikası"><header><h2>Performans</h2><p role="status">{message}</p></header>
      <div className="insight-charts">{[
        ['Bu ay · gündəlik kill', 'Cari ayın dərc edilmiş matçları və əvvəlki ayla müqayisə.'],
        ['Kill və xal dinamikası', 'Zaman üzrə irəliləyiş üçün ən azı 4 rəsmi matç lazımdır.'],
        ['Yerləşmə dinamikası', 'Rəsmi matçlardakı yerlər əsasında komandanın forması.'],
        ['Xəritə performansı', 'Xəritələr üzrə orta kill, xal və yerləşmə göstəriciləri.'],
      ].map(([title, detail]) => <article className="insight-chart insight-chart--empty" key={title}><header><h3>{title}</h3></header><p className="insight-empty">{unavailable ? 'Məlumat əlçatan deyil' : 'Nəticə gözlənilir'}</p><small>{detail}</small></article>)}</div>
    </section>;
  }
  const strongest = data.maps.find(m => m.matches >= 3);
  const comparison = data.previousKills === undefined ? 'Əvvəlki ay üçün dərc edilmiş matç yoxdur' : !data.monthly.length ? 'Bu ay hələ nəticə yoxdur' : `Əvvəlki tam ay: ${data.previousKills} kill · fərq ${data.monthlyKills - data.previousKills >= 0 ? '+' : ''}${data.monthlyKills - data.previousKills}`;
  return <section className="team-insights" aria-label="Rəsmi matç analitikası"><header><h2>Performans</h2><p>Dərc edilmiş nəticələr · aylıq göstəricilər Bakı vaxtı ilə</p></header>
    {incomplete && <p className="insight-note">Əvvəlki tarixçə tam deyil. Yalnız sistemdə dərc edilmiş matçlar hesablanır.</p>}
    {data.omitted > 0 && <p role="status">{data.omitted} matçın tarix və ya nəticəsi uyğun deyil; hesablamaya daxil edilməyib.</p>}
    <dl className="insight-metrics"><div><dt>Bu ay · kill</dt><dd>{data.monthly.length ? data.monthlyKills : '—'}</dd><small>{data.month} · {data.monthly.length} dərc edilmiş matç</small><small>{comparison}</small></div><div><dt>Orta kill / matç</dt><dd>{(data.kills / data.matches.length).toFixed(1)}</dd><small>{data.kills} kill · {data.matches.length} rəsmi matç</small></div><div><dt>Ümumi xal</dt><dd>{data.points}</dd><small>{(data.points / data.matches.length).toFixed(1)} orta xal / matç</small></div><div><dt>Qələbə / ilk 3</dt><dd>{data.wins} / {data.topThree}</dd><small>Orta yer: {data.averagePlacement?.toFixed(1)} · aşağı daha yaxşıdır</small></div></dl>
    <MonthlyKills data={data} />
    {data.matches.length >= 4 ? <><div className="insight-toggle" role="group" aria-label="Trend göstəricisi"><button type="button" aria-pressed={metric === 'finishes'} onClick={() => setMetric('finishes')}>Kill</button><button type="button" aria-pressed={metric === 'points'} onClick={() => setMetric('points')}>Xal</button></div><div className="insight-charts"><Trend matches={data.matches} metric={metric} label={metric === 'finishes' ? 'Matçlar üzrə kill sayı' : 'Matçlar üzrə ümumi xal'} /><Trend matches={data.matches} metric="placement" label="Matçlar üzrə yerləşmə" /></div></> : <p>Trend üçün ən azı 4 dərc edilmiş matç lazımdır. Mövcud nəticələr aşağıdadır.</p>}
    <ChartSnapshot title="Xəritələr üzrə orta kill / matç" subtitle={strongest ? `Ən yüksək orta kill: ${strongest.map} · ən azı 3 matçı olan xəritələr arasında` : 'Az matç olan xəritələrin ortalamaları daha çox dəyişə bilər'} filename="map-average-kills"><p className="chart-axes"><span>Xəritə</span><span className="chart-legend">Orta kill · 0–{Math.max(...data.maps.map(m => m.averageKills)).toFixed(1)}</span></p><div className="map-bars">{data.maps.map(m => <div key={m.map} tabIndex={0} data-tooltip={`${m.map} · ${m.matches} matç · Orta kill: ${m.averageKills.toFixed(1)}`}><span>{m.map}<small>{m.matches} matç · {m.kills} kill</small></span><span className="map-bar-track" role="meter" aria-valuemin={0} aria-valuemax={Math.max(1, ...data.maps.map(x => x.averageKills))} aria-valuenow={m.averageKills} aria-label={`${m.map}: orta ${m.averageKills.toFixed(1)} kill / matç`}><i style={{ width: `${m.averageKills / Math.max(1, ...data.maps.map(x => x.averageKills)) * 100}%` }} /></span><strong>{m.averageKills.toFixed(1)}</strong></div>)}</div>
      <details data-export-exclude className="insight-table"><summary>Xəritə statistikasını göstər</summary><div tabIndex={0} role="region" aria-label="Xəritə statistika cədvəli"><table><caption>Dərc edilmiş bütün matçlar · aşağı yer nömrəsi daha yaxşıdır</caption><thead><tr>{['Xəritə', 'Matç', 'Kill', 'Orta kill', 'Orta yer', 'Orta xal', 'Qələbə', 'İlk 3'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.maps.map(m => <tr key={m.map}><th scope="row">{m.map}</th><td>{m.matches}</td><td>{m.kills}</td><td>{m.averageKills.toFixed(1)}</td><td>{m.averagePlacement.toFixed(1)}</td><td>{m.averagePoints.toFixed(1)}</td><td>{m.wins}</td><td>{m.topThree}</td></tr>)}</tbody></table></div></details>
    </ChartSnapshot>
    <details className="insight-table"><summary>Matçların rəqəmlərini göstər</summary><div tabIndex={0} role="region" aria-label="Matç nəticələri cədvəli"><table><caption>Son 12 dərc edilmiş matç · Bakı vaxtı</caption><thead><tr>{['Tarix', 'Turnir / raund', 'Xəritə', 'Yer', 'Kill', 'Xal'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.matches.slice(-12).reverse().map(m => <tr key={m.id}><td>{date(m.playedAt)} · {time(m.playedAt)}</td><td>{m.tournamentName} · {m.stageLabel}</td><td>{m.map}</td><td>{m.placement}</td><td>{m.finishes}</td><td>{m.points}</td></tr>)}</tbody></table></div></details>
  </section>;
}
