import { Crown } from 'lucide-react';
import { mapArtwork } from '../../assets/maps';
import type { PublicTeamProfile } from '../../types/domain';
import './map-performance.css';

export function MapPerformance({ specialization }: { specialization: PublicTeamProfile['mapSpecialization'] }) {
  const { metrics, minimumSampleSize } = specialization;
  // Only comparable samples earn the performance badge. Ties prefer more matches,
  // then the map name, so changing API order cannot move the featured card.
  const eligible = metrics.filter(map => map.matches >= minimumSampleSize && map.matches > 0);
  const comparison = eligible.length > 1 && eligible.some(map => map.averagePlacement !== eligible[0].averagePlacement);
  const ranked = [...metrics].sort((a, b) => {
    const eligible = (map: typeof a) => map.matches >= minimumSampleSize && map.matches > 0 && Number.isFinite(map.averagePlacement);
    return Number(eligible(b)) - Number(eligible(a))
      || Number(b.matches > 0) - Number(a.matches > 0)
      || (a.matches && b.matches ? a.averagePlacement - b.averagePlacement : 0)
      || b.matches - a.matches || a.map.localeCompare(b.map, 'en');
  });
  return <div className="map-performance-scroll" role="region" aria-label="Xəritə performansı" tabIndex={0}>
    <div className="map-performance">{ranked.map((map, index) => {
      const artwork = mapArtwork[map.map.toLowerCase()];
      const featured = index === 0;
      const comparable = map.matches >= minimumSampleSize && map.matches > 0;
      return <article className={`map-performance-card${featured ? ' map-performance-card--featured' : ''}`} key={map.map} aria-label={`${map.map} statistikası`}>
        {artwork && <img className="map-performance-image" {...artwork} sizes={featured ? '(max-width: 1023px) 100vw, 58vw' : '(max-width: 1023px) 100vw, 40vw'} alt="" loading="lazy" decoding="async" width="1672" height="940" />}
        {featured && comparable && comparison && <span className="map-performance-badge"><Crown size={19} aria-hidden="true" />Ən yaxşı orta yer</span>}
        <div className="map-performance-content">
          <header className="map-performance-identity"><span aria-hidden="true">{String(index + 1).padStart(2, '0')} <i /></span><h3>{map.map}</h3><small>AEVIC ESPORTS</small></header>
          <dl><div className="map-performance-average"><dt>Orta yer</dt><dd>{map.matches ? `#${map.averagePlacement.toFixed(1)}` : '—'}</dd></div><div><dt>Matç sayı</dt><dd>{map.matches}</dd></div><div><dt>Qələbə faizi</dt><dd>{map.matches ? `${Math.round(map.wwcd / map.matches * 100)}%` : '—'}</dd></div></dl>
          {map.matches > 0 && <meter className="sr-only" min={0} max={1} value={map.wwcd / map.matches} aria-label={`${map.map} qələbə faizi`} />}
          {!comparable && <p className="map-performance-sample">Məhdud nümunə · ən azı {minimumSampleSize} matç lazımdır</p>}
        </div>
      </article>;
    })}</div>
  </div>;
}
