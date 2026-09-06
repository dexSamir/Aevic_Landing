import { ArrowRight, History, Trophy } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EmptyState, LoadingSkeleton, PageHeader } from '../components/common/primitives';
import { Seo } from '../components/common/Seo';
import { services } from '../services';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';

export function LegacyMatchRedirect() {
  const { matchId = '' } = useParams();
  const query = usePlatformQuery({ key: `match:${matchId}`, query: () => services.publicMatches.get(matchId), staleTime: queryPolicy.publicCompetition, retry: 0 });
  if (query.loading) return <section className="page-section"><div className="container"><LoadingSkeleton rows={6} /></div></section>;
  if (query.error) return <section className="page-section"><div className="container"><EmptyState title="Matç yüklənmədi" body="Public nəticə servisi hazırda cavab vermir." /></div></section>;
  const detail = query.data;
  if (!detail) return <Navigate replace to="/matches" />;
  const target = detail.published ? 'results' : 'matches';
  return <Navigate replace to={`/tournaments/${detail.tournament.id}#${target}`} state={{ roundId: detail.match.id, redirectedFrom: `/matches/${matchId}` }} />;
}

export function SeasonArchivePage() {
  const query = usePlatformQuery({ key: 'archive', query: () => services.archive.seasons(), staleTime: queryPolicy.historical, retry: 0 });
  return <section className="archive-page page-section"><Seo title="AEVIC Season Archive" description="İl və turnir üzrə AEVIC çempionları, nəticələri və recap arxivi." /><div className="container"><PageHeader eyebrow="Competition legacy" title="Mövsüm arxivi" description="İl və turnir üzrə yarış tarixçəsinə keçid. Arxiv mövcud public turnir səhifələrini təkrarlamır." />{query.loading ? <LoadingSkeleton rows={7} /> : query.error ? <EmptyState title="Arxiv yüklənmədi" body="Public archive servisi hazırda cavab vermir." /> : !query.data?.length ? <EmptyState title="Yarışın yekunu burada qalır" body="Hazırda mövsüm arxivi boşdur. Dərc edilən turnirlər tarix və nəticə mənbəyi ilə burada toplanacaq." action={<Link className="button button--secondary" to="/tournaments">Turnir elanlarına bax</Link>} /> : <div className="archive-years">{query.data.map((season) => <section key={season.id}><header><span>{season.year}</span><h2>{season.label}</h2></header><div>{season.tournaments.map((tournament) => <article key={tournament.id}><span className="archive-tournament__icon">{tournament.status === 'completed' ? <Trophy size={20} /> : <History size={20} />}</span><div><span>{new Date(tournament.startsAt).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}</span><h3>{tournament.name}</h3><p>{tournament.status === 'completed' ? 'Tamamlanmış turnir · recap və nəticələr mövcud olduqda bağlıdır' : 'Aktiv yarış xətti'}</p></div><div><Link to={`/tournaments/${tournament.id}`}>Turnir <ArrowRight size={16} /></Link>{tournament.status === 'completed' && <Link to={`/tournaments/${tournament.id}/recap`}>Recap <ArrowRight size={16} /></Link>}</div></article>)}</div></section>)}</div>}</div></section>;
}
