import { useState } from 'react';
import type { MatchHistoryEntry } from '../../types/domain';
import { teamAnalytics } from '../../utils/teamAnalytics';
import { competitionNow } from '../../services';
import '../../styles/team-insights.css';

const date = (value: string) => new Date(value).toLocaleDateString('az-AZ', { timeZone: 'Asia/Baku', day: 'numeric', month: 'short' });
const time = (value: string) => new Date(value).toLocaleTimeString('az-AZ', { timeZone: 'Asia/Baku', hour: '2-digit', minute: '2-digit' });
function Trend({ matches, metric, label }: { matches: MatchHistoryEntry[]; metric: 'finishes' | 'points' | 'placement'; label: string }) {
  const [selected, setSelected] = useState<string>();
  const rows = matches.slice(-12), max = Math.max(1, ...rows.map(m => m[metric])), min = Math.min(0, ...rows.map(m => m[metric]));
  const start = Date.parse(rows[0].playedAt), span = Date.parse(rows[rows.length - 1].playedAt) - start;
  const x = (m: MatchHistoryEntry) => span ? 40 + (Date.parse(m.playedAt) - start) / span * 480 : 280;
  const y = (m: MatchHistoryEntry) => metric === 'placement' ? 28 + (m[metric] - 1) / Math.max(1, max - 1) * 132 : 160 - (m[metric] - min) / (max - min) * 132;
  const current = rows.find(m => m.id === selected) ?? rows[rows.length - 1];
  const unit = metric === 'placement' ? 'yer' : metric === 'points' ? 'xal' : 'kill';
  return <article className="insight-chart"><header><h3>{label}</h3><small>Son {rows.length} matç{metric === 'placement' ? ' · aşağı yer nömrəsi daha yaxşıdır' : ''}</small></header>
    <svg viewBox="0 0 560 200" role="group" aria-label={`${label}. X: Bakı tarixi. Y: ${unit}.`}>
      {[0, .5, 1].map(t => <g key={t}><line x1="40" x2="520" y1={28 + t * 132} y2={28 + t * 132} className="chart-grid" /><text x="4" y={32 + t * 132}>{metric === 'placement' ? (1 + t * (max - 1)).toFixed(0) : Math.round(max - t * (max - min))}</text></g>)}
      <polyline points={rows.map(m => `${x(m)},${y(m)}`).join(' ')} fill="none" className="chart-line" />
      {rows.map((m, index) => <g key={m.id} tabIndex={0} role="img" aria-label={`${date(m.playedAt)}, ${time(m.playedAt)}, ${m.map}, ${m.stageLabel}: ${m[metric]} ${unit}`} onFocus={() => setSelected(m.id)} onMouseEnter={() => setSelected(m.id)} onClick={() => setSelected(m.id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : -1;
        if (next >= 0 && next < rows.length) { event.preventDefault(); event.currentTarget.parentElement?.querySelectorAll<SVGGElement>('[tabindex]')[next]?.focus(); }
      }}><circle cx={x(m)} cy={y(m)} r="18" fill="transparent" /><circle cx={x(m)} cy={y(m)} r={current.id === m.id ? 5 : 3} className="chart-point" /><title>{date(m.playedAt)} · {m.map}: {m[metric]} {unit}</title></g>)}
      <text x="40" y="190">{date(rows[0].playedAt)}</text><text x="520" y="190" textAnchor="end">{date(rows[rows.length - 1].playedAt)}</text>
    </svg><p className="chart-detail">{date(current.playedAt)} · {time(current.playedAt)} · {current.map}<strong>{current[metric]} {unit}</strong></p>
  </article>;
}
function MonthlyKills({ data }: { data: ReturnType<typeof teamAnalytics> }) {
  const [selected, setSelected] = useState<string>();
  const max = Math.max(1, ...data.daily.map(day => day.kills));
  const active = data.daily.find(day => day.day === selected) ?? data.daily[data.daily.length - 1];
  return <article className="insight-chart monthly-kills"><header><h3>Bu ay · gündəlik kill</h3><small>{data.month} · Bakı vaxtı</small></header>
    {!data.monthly.length ? <p className="insight-empty">Bu ay üçün dərc edilmiş matç yoxdur.</p> : <>
      <div className="daily-bars" role="group" aria-label="Günlər üzrə kill sayı">{data.daily.map(day => <button type="button" key={day.day} aria-label={`${day.day}: ${day.kills} kill, ${day.matches} dərc edilmiş matç`} onFocus={() => setSelected(day.day)} onMouseEnter={() => setSelected(day.day)} onClick={() => setSelected(day.day)} data-selected={active.day === day.day}><span className="daily-bar-track"><i style={{ height: `${day.kills / max * 100}%` }} /></span><small>{Number(day.day.slice(-2))}</small></button>)}</div>
      <p className="chart-detail">{active.day} · {active.matches} dərc edilmiş matç<strong>{active.kills} kill</strong></p><small>Boş gün: dərc edilmiş matç yoxdur. Gələcək günlər göstərilmir.</small>
    </>}
  </article>;
}
export function TeamAnalytics({ history, unavailable = false, incomplete = false }: { history: MatchHistoryEntry[]; unavailable?: boolean; incomplete?: boolean }) {
  const data = teamAnalytics(history, competitionNow());
  const [metric, setMetric] = useState<'finishes' | 'points'>('finishes');
  if (unavailable) return <section className="team-insights" aria-label="Rəsmi matç analitikası"><h2>Performans</h2><p role="status">Matç tarixçəsi hazırda əlçatan deyil. Analitika hesablana bilmir.</p></section>;
  if (!data.matches.length) return <section className="team-insights"><header><h2>Performans</h2><p>{history.length ? 'Matç məlumatlarında tarix və ya nəticə çatışmır. Analitika hesablana bilmir.' : 'İlk rəsmi matç nəticəsi dərc edildikdə qrafiklər burada görünəcək.'}</p></header></section>;
  const strongest = data.maps.find(m => m.matches >= 3);
  const comparison = data.previousKills === undefined ? 'Əvvəlki ay üçün dərc edilmiş matç yoxdur' : !data.monthly.length ? 'Bu ay hələ nəticə yoxdur' : `Əvvəlki tam ay: ${data.previousKills} kill · fərq ${data.monthlyKills - data.previousKills >= 0 ? '+' : ''}${data.monthlyKills - data.previousKills}`;
  return <section className="team-insights" aria-label="Rəsmi matç analitikası"><header><h2>Performans</h2><p>Dərc edilmiş nəticələr · aylıq göstəricilər Bakı vaxtı ilə</p></header>
    {incomplete && <p className="insight-note">Əvvəlki tarixçə tam deyil. Yalnız sistemdə dərc edilmiş matçlar hesablanır.</p>}
    {data.omitted > 0 && <p role="status">{data.omitted} matçın tarix və ya nəticəsi uyğun deyil; hesablamaya daxil edilməyib.</p>}
    <dl className="insight-metrics"><div><dt>Bu ay · kill</dt><dd>{data.monthly.length ? data.monthlyKills : '—'}</dd><small>{data.month} · {data.monthly.length} dərc edilmiş matç</small><small>{comparison}</small></div><div><dt>Orta kill / matç</dt><dd>{(data.kills / data.matches.length).toFixed(1)}</dd><small>{data.kills} kill · {data.matches.length} rəsmi matç</small></div><div><dt>Ümumi xal</dt><dd>{data.points}</dd><small>{(data.points / data.matches.length).toFixed(1)} orta xal / matç</small></div><div><dt>Qələbə / ilk 3</dt><dd>{data.wins} / {data.topThree}</dd><small>Orta yer: {data.averagePlacement?.toFixed(1)} · aşağı daha yaxşıdır</small></div></dl>
    <MonthlyKills data={data} />
    {data.matches.length >= 4 ? <><div className="insight-toggle" role="group" aria-label="Trend göstəricisi"><button type="button" aria-pressed={metric === 'finishes'} onClick={() => setMetric('finishes')}>Kill</button><button type="button" aria-pressed={metric === 'points'} onClick={() => setMetric('points')}>Xal</button></div><div className="insight-charts"><Trend matches={data.matches} metric={metric} label={metric === 'finishes' ? 'Kill dinamikası' : 'Xal dinamikası'} /><Trend matches={data.matches} metric="placement" label="Yerləşmə dinamikası" /></div></> : <p>Trend üçün ən azı 4 dərc edilmiş matç lazımdır. Mövcud nəticələr aşağıdadır.</p>}
    <article className="insight-chart"><header><h3>Xəritə üzrə orta kill</h3><small>{strongest ? `Ən yüksək orta kill: ${strongest.map} · ən azı 3 matçı olan xəritələr arasında` : 'Müqayisə üçün xəritə üzrə ən azı 3 matç lazımdır'}</small></header><div className="map-bars">{data.maps.map(m => <div key={m.map}><span>{m.map}<small>{m.matches} matç · {m.kills} kill</small></span><meter min={0} max={Math.max(1, ...data.maps.map(x => x.averageKills))} value={m.averageKills} aria-label={`${m.map}: orta ${m.averageKills.toFixed(1)} kill`} /><strong>{m.averageKills.toFixed(1)}</strong></div>)}</div>
      <details className="insight-table"><summary>Xəritə statistikasını göstər</summary><div tabIndex={0} role="region" aria-label="Xəritə statistika cədvəli"><table><caption>Dərc edilmiş bütün matçlar · aşağı yer nömrəsi daha yaxşıdır</caption><thead><tr>{['Xəritə', 'Matç', 'Kill', 'Orta kill', 'Orta yer', 'Orta xal', 'Qələbə', 'İlk 3'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.maps.map(m => <tr key={m.map}><th scope="row">{m.map}</th><td>{m.matches}</td><td>{m.kills}</td><td>{m.averageKills.toFixed(1)}</td><td>{m.averagePlacement.toFixed(1)}</td><td>{m.averagePoints.toFixed(1)}</td><td>{m.wins}</td><td>{m.topThree}</td></tr>)}</tbody></table></div></details>
    </article>
    <details className="insight-table"><summary>Matçların rəqəmlərini göstər</summary><div tabIndex={0} role="region" aria-label="Matç nəticələri cədvəli"><table><caption>Son 12 dərc edilmiş matç · Bakı vaxtı</caption><thead><tr>{['Tarix', 'Turnir / raund', 'Xəritə', 'Yer', 'Kill', 'Xal'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.matches.slice(-12).reverse().map(m => <tr key={m.id}><td>{date(m.playedAt)} · {time(m.playedAt)}</td><td>{m.tournamentName} · {m.stageLabel}</td><td>{m.map}</td><td>{m.placement}</td><td>{m.finishes}</td><td>{m.points}</td></tr>)}</tbody></table></div></details>
  </section>;
}
