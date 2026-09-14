import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/common/primitives';
import { useTeamPlatformData } from '../services/PlatformDataContext';
import { competitionNow } from '../services';
import { CareerNav, TeamWrappedEntry } from '../components/team/TeamCareerNav';

export function TeamCareerPage() {
  const { careerSummary, matchHistory } = useTeamPlatformData();
  return <><PageHeader eyebrow="// RƏSMİ YARIŞ ARXİVİ" title="Karyera" description="Yalnız dərc edilmiş matç və turnir nəticələri. Göstəricilər komanda tərəfindən dəyişdirilə bilməz." /><CareerNav />
    <dl className="team-stat-ledger">{careerSummary.metrics.map(metric => <div key={metric.key}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
    <section className="career-map-section" id="maps"><header className="overview-section-title"><h2>XƏRİTƏ STATİSTİKASI</h2><Link to="/team/history">Matç tarixçəsi <ArrowRight size={17} /></Link></header><div className="career-map-ledger">{['Erangel', 'Miramar', 'Rondo'].map(map => { const matches = matchHistory.filter(match => match.map.toLowerCase() === map.toLowerCase()); const wins = matches.filter(match => match.wwcd).length; return <article key={map}><h3>{map}</h3><dl><div><dt>Matç</dt><dd>{matches.length}</dd></div><div><dt>Orta yer</dt><dd>{matches.length ? (matches.reduce((sum, match) => sum + match.placement, 0) / matches.length).toFixed(1) : '—'}</dd></div><div><dt>Orta kill</dt><dd>{matches.length ? (matches.reduce((sum, match) => sum + match.finishes, 0) / matches.length).toFixed(1) : '—'}</dd></div><div><dt>WWCD</dt><dd>{wins}</dd></div><div><dt>Win rate</dt><dd>{matches.length ? `${Math.round(wins / matches.length * 100)}%` : '—'}</dd></div></dl>{matches.length < 3 && <p>Etibarlı müqayisə üçün ən azı 3 dərc edilmiş matç tələb olunur.</p>}</article>; })}</div></section>
    <TeamWrappedEntry year={competitionNow().getFullYear()} />
    <div className="career-secondary"><Link to="/team/badges">Qazanılmış nişanlar <ArrowRight size={16} /></Link></div>
  </>;
}
