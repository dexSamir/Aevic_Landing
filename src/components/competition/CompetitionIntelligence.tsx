import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import type { MapPerformanceMetric, MapPerformanceSummary, RankMovementData, TeamFormEntry } from '../../types/domain';
import { Tooltip } from '../common/primitives';

export function TeamFormItem({ item }: { item: TeamFormEntry }) {
  const band = item.wwcd ? 'wwcd' : item.placement <= 3 ? 'top-three' : item.placement <= 10 ? 'top-ten' : 'outside';
  return <article className={`team-form__item team-form__item--${band} ${item.newest ? 'is-newest' : ''}`} tabIndex={0} aria-label={`${item.newest ? 'Ən yeni nəticə. ' : ''}${item.map}, ${item.wwcd ? 'WWCD' : `${item.placement}-ci yer`}, ${item.finishes} kill, ${item.points} xal`}>
    <span aria-hidden="true">{item.wwcd ? <><b>WW</b><b>CD</b></> : item.placement}</span>
  </article>;
}

export function TeamForm({ form }: { form: TeamFormEntry[] }) {
  if (!form.length) return <section className="team-form team-form--empty" aria-labelledby="team-form-title"><header><span id="team-form-title">Son 10 matç</span><small>YENİ <b aria-hidden="true">→</b> KÖHNƏ</small></header><p>Hələ dərc edilmiş matç nəticəsi yoxdur.</p></section>;
  const visibleForm = form.slice(0, 10);
  return <section className="team-form" aria-labelledby="team-form-title"><header><span id="team-form-title">Son 10 matç</span><small>YENİ <b aria-hidden="true">→</b> KÖHNƏ</small></header><div className="team-form__rail" tabIndex={0} aria-label={`${visibleForm.length} nəticə, yenidən köhnəyə doğru; üfüqi sürüşdürün`}>{visibleForm.map((item) => <TeamFormItem item={item} key={item.matchId} />)}</div></section>;
}

export function MapMetric({ label, metric, value }: { label: string; metric?: MapPerformanceMetric; value: (metric: MapPerformanceMetric) => string }) {
  return <div className="map-metric"><span>{label}</span>{metric ? <><strong>{metric.map}</strong><small>{value(metric)}</small></> : <><strong>—</strong><small>Məlumat yoxdur</small></>}</div>;
}

export function MapSpecialization({ summary }: { summary: MapPerformanceSummary }) {
  if (summary.status === 'insufficient-data') return <section className="map-specialization map-specialization--empty" aria-labelledby="map-specialization-title"><header><div><span>Published match intelligence</span><h2 id="map-specialization-title">Map specialization</h2></div><Sparkles size={20} /></header><div><strong>Daha çox matç tələb olunur</strong><p>“Best map” yalnız eyni map-də minimum {summary.minimumSampleSize} rəsmi matçdan sonra, ən yüksək orta xal əsasında hesablanır.</p><ul>{summary.metrics.map((metric) => <li key={metric.map}><span>{metric.map}</span><small>{metric.matches} / {summary.minimumSampleSize} matç</small></li>)}</ul></div></section>;
  return <section className="map-specialization" aria-labelledby="map-specialization-title"><header><div><span>Published match intelligence</span><h2 id="map-specialization-title">Map specialization</h2></div><small>Minimum {summary.minimumSampleSize} matç</small></header><div className="map-specialization__grid"><article><span>Ən yaxşı map · orta xal</span><h3>{summary.bestMap?.map}</h3><dl><div><dt>WWCD</dt><dd>{summary.bestMap?.wwcd}</dd></div><div><dt>Orta yer</dt><dd>{summary.bestMap?.averagePlacement}</dd></div><div><dt>Orta kill</dt><dd>{summary.bestMap?.averageFinishes}</dd></div></dl></article><div><MapMetric label="Ən çox WWCD" metric={summary.mostWwcd} value={(metric) => `${metric.wwcd} WWCD`} /><MapMetric label="Ən yaxşı orta yer" metric={summary.bestAveragePlacement} value={(metric) => `#${metric.averagePlacement}`} /></div></div></section>;
}

export function RankMovement({ movement }: { movement?: RankMovementData }) {
  if (!movement) return null;
  const Icon = movement.kind === 'up' ? ArrowUp : movement.kind === 'down' ? ArrowDown : Minus;
  const label = movement.kind === 'new' ? 'NEW' : movement.kind === 'unchanged' ? '—' : String(movement.delta ?? '');
  return <Tooltip label={movement.previousRank ? `Əvvəlki yer: #${movement.previousRank}` : 'Əvvəlki snapshot-da iştirak etməyib'}><span className={`rank-movement rank-movement--${movement.kind}`} tabIndex={0} aria-label={movement.kind === 'new' ? 'Yeni komanda' : movement.kind === 'unchanged' ? 'Yer dəyişməyib' : `${movement.delta} pillə ${movement.kind === 'up' ? 'yüksəlib' : 'geriləyib'}`}>{movement.kind !== 'new' && <Icon size={13} />}{label}</span></Tooltip>;
}

export function LeaderboardMovementCell({ movement }: { movement?: RankMovementData }) {
  return movement ? <RankMovement movement={movement} /> : <span className="rank-movement-placeholder" aria-label="Əvvəlki leaderboard snapshot-ı yoxdur">—</span>;
}
