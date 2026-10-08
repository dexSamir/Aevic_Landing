import { RosterTeamCard } from '../components/common/RosterTeamCard';
import { BrandJoinCta } from '../components/common/BrandJoinCta';
import { ArrowRight, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { homeArtwork } from '../assets/home';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { Button, EmptyState, LoadingSkeleton, StatusBadge } from '../components/common/primitives';
import { MapRotation } from '../components/competition/CompetitionVisuals';
import { competitionNow, serviceCapabilities, services } from '../services';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';
import { AEVIC_EVENT_TIMEZONE, formatEventTime } from '../utils/calendar';
import { resolveTournamentTemporalPhase } from '../utils/tournamentTime';
import { selectPrimaryCompetition } from '../utils/competitionSelectors';

const HomeCompetitionProgram = lazy(() => import('../components/competition/HomeCompetitionProgram'));
function ProgramSkeleton() {
  return <><div className="home-program-placeholder"><LoadingSkeleton variant="media" /></div><LoadingSkeleton variant="table" rows={5} /></>;
}

export function HomePage() {
  const publicQuery = usePlatformQuery({ key: 'snapshot:public', scope: 'public', query: (signal) => services.snapshots.public(signal), staleTime: queryPolicy.publicCompetition });
  const tournaments = publicQuery.data?.tournaments ?? [];
  const teams = publicQuery.data?.teams ?? [];
  const featured = selectPrimaryCompetition(tournaments, competitionNow());
  const featuredPhase = featured ? resolveTournamentTemporalPhase(featured, competitionNow()) : undefined;
  const featuredPublicTeams = teams.map((team) => {
    const results = publicQuery.data?.leaderboard.filter((result) => result.teamId === team.id) ?? [];
    return { ...team, points: results.reduce((sum, result) => sum + result.totalPoints, 0), resultCount: new Set(results.map((result) => result.tournamentId)).size };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const teamRail = useRef<HTMLDivElement>(null);
  const moveTeams = (direction: number) => { const rail = teamRail.current; if (rail) rail.scrollBy({ left: direction * rail.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); };
  const daysUntil = featured ? Math.max(0, Math.ceil((Date.parse(featured.startsAt) - new Date(competitionNow()).getTime()) / 86_400_000)) : 0;
  const startTime = featured ? formatEventTime(featured.startsAt, AEVIC_EVENT_TIMEZONE) : '';
  return <>
    <section className="home-live-hero">
      <MediaBackdrop {...homeArtwork.hero} sizes="100vw" className="home-live-hero__media" priority focalDesktop="55% 48%" focalMobile="63% 45%" />
      <div className="container home-live-hero__stage">
        <div className="home-live-hero__cover">
          <div className="home-live-hero__copy">
            <span>AZƏRBAYCAN · PUBG MOBILE · AEVIC</span>
            <h1>Rəqabətin <em>yeni səhnəsi.</em></h1>
            <p>Turnirlər, komandalar, oyunçular və daha böyük bir e-sport ekosistemi.</p>
            <div className="hero-actions"><Link className="button button--primary" to="/tournaments"><span>Turnirləri kəşf et</span><ArrowRight size={18} /></Link><Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/teams'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'Komandaları kəşf et'}</span></Link></div>
          </div>
        </div>
        <div className="home-competition-slot">{publicQuery.loading ? <LoadingSkeleton variant="rail"/> : !publicQuery.data ? <div className="home-competition-rail home-competition-rail--empty" aria-live="polite"><div><span>YARIŞ VƏZİYYƏTİ</span><h2>{publicQuery.error ? (publicQuery.error.code==='SERVER_NOT_CONFIGURED'?'Platform xidməti hələ konfiqurasiya edilməyib.':'Yarış məlumatı yüklənmədi.') : 'Yarış məlumatı yoxlanılır…'}</h2></div>{publicQuery.error?.retryable && <Button variant="secondary" disabled={publicQuery.retryAfterSeconds > 0} onClick={publicQuery.refetch}>{publicQuery.retryAfterSeconds > 0 ? `${publicQuery.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button>}</div> : featured ? <article className="home-competition-rail">
          <div className="home-competition-rail__identity"><header><StatusBadge status={featuredPhase === 'registration-open' ? 'open' : featuredPhase === 'completed' ? 'completed' : featuredPhase === 'live' ? 'live' : 'draft'} /></header><span>{featuredPhase === 'completed' ? 'SON YARIŞ' : featuredPhase === 'live' ? 'CANLI YARIŞ' : 'NÖVBƏTİ YARIŞ'}</span><h2>{featured.name}</h2></div>
          <dl aria-label="Əsas turnir faktları"><div><dt>Başlama</dt><dd>{startTime}</dd></div><div><dt>Komanda limiti</dt><dd>{featured.usedSlots}/{featured.maxSlots}</dd></div><div><dt>Format</dt><dd>{featured.days * featured.roundsPerDay} raund</dd></div><div><dt>Qalan gün</dt><dd>{daysUntil}</dd></div></dl>
          <Link className="home-competition-rail__action" to={`/tournaments/${featured.id}`} aria-label={`Turnirə bax: ${featured.name}`}><span>Turnirə bax</span><ArrowRight size={19} /></Link>
        </article> : <div className="home-competition-rail home-competition-rail--empty"><div><span>YARIŞ VƏZİYYƏTİ</span><h2>Hazırda dərc edilmiş turnir yoxdur.</h2></div><Link to="/regulations" aria-label="Yarış qaydaları: bax">Yarış qaydaları <ArrowRight size={18} /></Link></div>}</div>
      </div>
    </section>



    <section className="home-calendar-section" ><div className="container"><header className="home-section-intro" data-reveal data-reveal-variant="fade-up"><div><span>TURNİR TƏQVİMİ</span><h2>Yaxın turnirlər.</h2><p>Rəqabət heç zaman dayanmır.</p></div><Link to="/tournaments">Bütün turnirlər <ArrowRight size={16} /></Link></header><div className="home-competition-program">{publicQuery.loading ? <ProgramSkeleton /> : !featured ? <div className="home-program-empty"><EmptyState title={publicQuery.error ? "Turnir təqvimi yüklənmədi" : "Hazırda dərc edilmiş turnir yoxdur"} body={publicQuery.error ? "Yarış məlumatı bölməsində yenidən yoxlaya bilərsiniz." : "Növbəti yarışın proqramı dərc edildikdə burada görünəcək."} /></div> : <Suspense fallback={<ProgramSkeleton />}><HomeCompetitionProgram featured={featured} tournaments={tournaments} /></Suspense>}</div></div></section>


    <section className="home-rotation" ><div className="container"><header className="home-section-intro" data-reveal data-reveal-variant="fade-up"><div><span>XƏRİTƏLƏR</span><h2>Hər xəritə,<br />yeni hekayə.</h2></div><p>Dörd raund, bir məqsəd. Rəqabətin xəritəsi hər yarışda yenidən yazılır.</p></header><MapRotation variant="program" statuses={[]} ariaLabel="Xəritə formatı nümunəsi" /></div></section>

    <section className="home-teams-section" ><div className="container"><header className="home-section-intro" data-reveal data-reveal-variant="fade-up"><div><span>TOP KOMANDALAR</span><h2>Səhnədəki güclər.</h2></div><Link to="/teams">Bütün komandalar <ArrowRight size={16} /></Link></header>{publicQuery.loading ? <div className="home-team-placeholder"><LoadingSkeleton variant="team-rail" rows={5}/></div> : !publicQuery.data ? <p role="status">{publicQuery.error ? 'Komanda kataloqu yüklənmədi. Yarış məlumatı bölməsində yenidən yoxlaya bilərsiniz.' : 'Təsdiqlənmiş komanda kataloqu yüklənir…'}</p> : featuredPublicTeams.length > 0 ? <><div className="home-team-controls"><button type="button" aria-label="Əvvəlki komandalar" onClick={() => moveTeams(-1)}><ChevronLeft size={17} /></button><button type="button" aria-label="Növbəti komandalar" onClick={() => moveTeams(1)}><ChevronRight size={17} /></button></div><div ref={teamRail} tabIndex={0} className="home-team-stage" role="list" aria-label="AEVIC komanda işarələri">{featuredPublicTeams.map((team, index) => <div role="listitem" key={team.id}>
          <RosterTeamCard name={team.name} logoUrl={team.logoUrl} roster={team.roster} className={`home-ranked-team ${index === 0 && team.resultCount ? 'home-ranked-team--leader' : ''}`} href={`/teams/${team.slug}`} context={<>
            <span className="home-ranked-team__rank">{team.resultCount ? `#${index + 1}` : '—'}</span>
            {index === 0 && team.resultCount > 0 && <Crown className="home-ranked-team__crown" size={15} aria-hidden="true" />}
            </>}>
            <strong>{team.name}</strong>
            <span>{team.resultCount ? `${team.points} xal` : 'Nəticə gözlənilir'}</span>
            <small>{team.resultCount ? `${team.resultCount} turnir · dərc edilmiş nəticələr` : `${team.rosterSize} oyunçu`}</small>
          </RosterTeamCard>
        </div>)}</div></> : <EmptyState title="Komandanızla səhnəyə çıxın" body="Hazırda ictimai komanda profili yoxdur. Komandanızı yaradın və PUBG Mobile icmasına qoşulun." action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations#rule-1'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'İştirak şərtlərinə bax'}</span><ArrowRight size={17} /></Link>} />}</div></section>


    <BrandJoinCta />
  </>;
}
