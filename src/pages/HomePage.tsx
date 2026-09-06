import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { officialAssets } from '../assets/official';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { Button, EmptyState, StatusBadge, TeamLogoTile } from '../components/common/primitives';
import { MapRotation } from '../components/competition/CompetitionVisuals';
import { TournamentCalendar } from '../components/competition/TournamentCalendar';
import { competitionNow, demoMode, serviceCapabilities, services } from '../services';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';
import type { PublicPlayerProfile, RecordEntry } from '../types/domain';
import { AEVIC_EVENT_TIMEZONE, formatEventTime } from '../utils/calendar';
import { resolveTournamentTemporalPhase } from '../utils/tournamentTime';
import { selectPrimaryCompetition } from '../utils/competitionSelectors';

export function HomePage() {
  const publicQuery = usePlatformQuery({ key: 'snapshot:public', scope: 'public', query: (signal) => services.snapshots.public(signal), staleTime: queryPolicy.publicCompetition });
  const tournaments = publicQuery.data?.tournaments ?? [];
  const teams = publicQuery.data?.teams ?? [];
  const featured = selectPrimaryCompetition(tournaments, competitionNow());
  const featuredPhase = featured ? resolveTournamentTemporalPhase(featured, competitionNow()) : undefined;
  const featuredPublicTeams = teams.slice(0, 5);
  const [featuredRecord, setFeaturedRecord] = useState<RecordEntry>();
  const [publicPlayers, setPublicPlayers] = useState<PublicPlayerProfile[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState('');
  useEffect(() => {
    if (!serviceCapabilities.publicRecords) return;
    services.records.list().then((records) => setFeaturedRecord(records[0])).catch(() => setFeaturedRecord(undefined));
  }, []);
  useEffect(() => {
    if (!serviceCapabilities.publicPlayers) return;
    services.players.list().then(({ items }) => setPublicPlayers(items)).catch(() => setPublicPlayers([]));
  }, []);
  const remaining = featured ? Math.max(0, featured.maxSlots - featured.usedSlots) : 0;
  const startTime = featured ? formatEventTime(featured.startsAt, AEVIC_EVENT_TIMEZONE) : '';
  const checkInTime = featured ? formatEventTime(featured.checkInOpensAt, AEVIC_EVENT_TIMEZONE) : '';
  return <>
    <section className="home-live-hero">
      <MediaBackdrop src={officialAssets.authBackdrop} srcSet={officialAssets.authBackdropSrcSet} sources={officialAssets.authBackdropSources} sizes="(max-width: 768px) 100svh, 100vw" className="home-live-hero__media" priority width={1586} height={992} focalDesktop="50% 50%" focalMobile="35% 46%" />
      <div className="home-live-hero__geometry" aria-hidden="true"><span /><span /><span /></div>
      <div className="container home-live-hero__stage">
        <div className="home-live-hero__cover">
          <div className="home-live-hero__copy">
            <span>AZƏRBAYCAN · PUBG MOBILE · AEVIC</span>
            <h1>Rəqabətin <em>rəsmi səhnəsi.</em></h1>
            <p>Turnirlər, təsdiqlənmiş nəticələr və hər komandanın qurduğu rəqabət irsi.</p>
            <div className="hero-actions"><Link className="button button--primary" to={featured ? `/tournaments/${featured.id}` : '/regulations'}><span>{featured ? featuredPhase === 'completed' ? 'Nəticələrə bax' : featuredPhase === 'live' ? 'Turniri izlə' : 'Turniri aç' : 'Yarış bələdçisini oxu'}</span><ArrowRight size={18} /></Link><Link className="button button--secondary" to="/teams"><span>Komandaları kəşf et</span></Link></div>
          </div>
        </div>
        {!publicQuery.data ? <div className="home-competition-rail home-competition-rail--empty" aria-live="polite"><div><span>YARIŞ VƏZİYYƏTİ</span><h2>{publicQuery.error ? 'Yarış məlumatı yüklənmədi.' : 'Yarış məlumatı yoxlanılır…'}</h2></div>{publicQuery.error?.retryable && <Button variant="secondary" disabled={publicQuery.retryAfterSeconds > 0} onClick={publicQuery.refetch}>{publicQuery.retryAfterSeconds > 0 ? `${publicQuery.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button>}</div> : featured ? <article className="home-competition-rail">
          <div className="home-competition-rail__identity"><header><StatusBadge status={featuredPhase === 'registration-open' ? 'open' : featuredPhase === 'completed' ? 'completed' : featuredPhase === 'live' ? 'live' : 'draft'} />{demoMode && <span className="demo-label">NÜMUNƏ MƏLUMAT</span>}</header><span>{featuredPhase === 'completed' ? 'SON YARIŞ' : featuredPhase === 'live' ? 'CANLI YARIŞ' : 'NÖVBƏTİ YARIŞ'}</span><h2>{featured.name}</h2></div>
          <dl aria-label="Əsas turnir faktları"><div><dt>Başlanğıc</dt><dd>{startTime}</dd></div><div><dt>Komandalar</dt><dd>{featured.usedSlots}/{featured.maxSlots}</dd></div><div><dt>Check-in</dt><dd>{checkInTime}</dd></div><div><dt>Boş yer</dt><dd>{remaining}</dd></div></dl>
          <Link className="home-competition-rail__action" to={`/tournaments/${featured.id}`} aria-label={`${featured.name} turnirini aç`}><span>Turniri aç</span><ArrowRight size={19} /></Link>
        </article> : <div className="home-competition-rail home-competition-rail--empty"><div><span>YARIŞ VƏZİYYƏTİ</span><h2>Hazırda dərc edilmiş turnir yoxdur.</h2></div><Link to="/regulations" aria-label="Yarış qaydalarına bax">Yarış qaydaları <ArrowRight size={18} /></Link></div>}
      </div>
    </section>

    <section className="home-legacy-statement home-legacy-statement--manifesto" data-reveal data-reveal-variant="mask-reveal"><div className="container"><span>YARIŞA ÇIX.</span><strong>ADINI TARİXƏ YAZ.</strong><em>İRSİNİ QUR.</em></div></section>

    {tournaments.length > 0 && <section className="home-calendar-section" data-reveal data-reveal-variant="fade-up"><div className="container"><header className="home-section-intro"><div><span>Yarış təqvimi</span><h2>Gününü seç. Arenanı gör.</h2></div><Link to="/tournaments">Bütün turnirlər <ArrowRight size={16} /></Link></header><TournamentCalendar tournaments={tournaments} compact /></div></section>}


    <section className="home-rotation" data-reveal data-reveal-variant="fade-up"><div className="container"><header className="home-section-intro"><div><span>PUBG MOBILE · XƏRİTƏ SİSTEMİ</span><h2>Yarış formatı</h2></div><p>Dörd raundlu format nümunəsi. Hər yarışın təsdiqlənmiş ardıcıllığı turnir səhifəsində göstərilir.</p></header><MapRotation variant="program" statuses={[]} ariaLabel="Xəritə formatı nümunəsi" /></div></section>

    <section className="home-teams-section" data-reveal data-reveal-variant="fade-up"><div className="container"><header className="home-section-intro"><div><span>Komanda kimliyi</span><h2>Arenadakı adlar</h2><p className="home-identity-explanation"><ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />Kataloqda yalnız təsdiqlənmiş komandalar görünür.</p></div><Link to="/teams">Bütün komandalar <ArrowRight size={16} /></Link></header>{!publicQuery.data ? <p role="status">{publicQuery.error ? 'Komanda kataloqu yüklənmədi. Yarış məlumatı bölməsində yenidən yoxlaya bilərsiniz.' : 'Təsdiqlənmiş komanda kataloqu yüklənir…'}</p> : featuredPublicTeams.length > 0 ? <>{serviceCapabilities.publicPlayers && <p className="home-team-stage__hint">Loqoya fokuslanın və ya toxunun — yalnız ictimai oyunçu adları görünəcək.</p>}<div className="home-team-stage" role="list" aria-label="AEVIC komanda işarələri">{featuredPublicTeams.map((team, index) => { const roster = publicPlayers.filter((player) => player.currentTeam?.id === team.id).map((player) => player.ign); const controlsId = `home-team-roster-${team.id}`; return <div role="listitem" key={team.id}><TeamLogoTile id={team.id} name={team.name} tag={team.tag} logoUrl={team.logoUrl} profileHref={`/teams/${team.slug}`} ordinal={index + 1} roster={roster} selected={serviceCapabilities.publicPlayers && expandedTeamId === team.id} onSelect={serviceCapabilities.publicPlayers ? (id) => setExpandedTeamId((current) => current === id ? '' : id) : undefined} selectLabel={`${team.name} oyunçu adlarını göstər`} controlsId={controlsId} revealVariant={serviceCapabilities.publicPlayers ? 'names-only' : 'default'} /></div>; })}</div></> : <EmptyState title="Komanda kimliyi təsdiqlə başlayır" body="Hazırda ictimai komanda profili yoxdur. Komanda adı, heyət və iştirak uyğunluğu yoxlandıqdan sonra profil kataloqda yer alır." action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations#rule-1'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'İştirak şərtlərinə bax'}</span><ArrowRight size={17} /></Link>} />}</div></section>

    {featuredRecord && <section className="home-record-spotlight" data-reveal data-reveal-variant="scale-in"><div className="container"><div><span>AEVIC REKORDU</span><strong>{featuredRecord.value}<small>{featuredRecord.unit}</small></strong><h2>{featuredRecord.label}</h2><p>{featuredRecord.teamName} · {featuredRecord.map || featuredRecord.tournamentName} · {demoMode ? 'dərc edilmiş nümunə rekordu' : 'rəsmi rekord'}</p></div><Link className="button button--secondary" to="/records"><span>Rekordlar mərkəzi</span><ArrowRight size={17} /></Link></div></section>}

    <section className="home-final-cta" data-reveal data-reveal-variant="fade-up"><div className="container"><div><span>KOMANDANI QUR.</span><strong>RƏQABƏTƏ QOŞUL.</strong><em>İRSİNİ BAŞLAT.</em></div><Link className="button button--primary" to={serviceCapabilities.register ? '/register' : '/regulations'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'Yarışa hazırlaş'}</span><ArrowRight size={18} /></Link></div></section>
  </>;
}
