import { ArrowRight, CalendarDays, CirclePlus, Crown, Crosshair, Flag, Grid2X2, History, Info, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { officialAssets } from '../../assets/official';
import type { PublicTeamProfile, PublicTeamSummary, Team, Tournament } from '../../types/domain';
import { services } from '../../services';
import { TeamLogo } from '../common/primitives';
import { BrandJoinCta } from '../common/BrandJoinCta';
import { SocialLinkList, VerificationCrest } from './ProfileElements';
import { PublicTeamFeatures } from './PublicTeamFeatures';
import { ShareProfileAction } from './PublicTeamExperience';

const sections = [
  { id: 'overview', label: 'Karyera xülasəsi', icon: CirclePlus },
  { id: 'form', label: 'Son 5 matç', icon: History },
  { id: 'roster', label: 'Aktiv heyət', icon: Users },
  { id: 'matches', label: 'Son matçlar', icon: Grid2X2 },
  { id: 'performance', label: 'Xəritə statistikası', icon: ShieldCheck },
];
const metrics = [['matches', 'Matç'], ['finishes', 'Kill'], ['wwcd', 'WWCD'], ['championships', 'Çempionluq'], ['podiums', 'Podium']] as const;

/** Public presentation of the existing profile contract, including catalog-only profiles. */
export function PublicTeamDetail({ team, profile }: { team: Team | PublicTeamSummary; profile?: PublicTeamProfile }) {
  const [live, setLive] = useState<Tournament>();
  const [active, setActive] = useState('overview');
  const fullTeam = profile?.team;
  const roster = [...(fullTeam?.roster ?? [])].sort((a, b) => ({ captain: 0, starter: 1, substitute: 2 }[a.role] - { captain: 0, starter: 1, substitute: 2 }[b.role]));
  const captain = roster.find(player => player.role === 'captain');
  const matches = [...(profile?.recentMatches ?? [])].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
  const form = [...(profile?.form ?? [])].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 5);
  const best = [...matches].sort((a, b) => a.placement - b.placement || b.finishes - a.finishes)[0];
  const maps = profile?.mapSpecialization.metrics ?? [];
  const liveTournamentId = profile?.upcomingMatch?.status === 'live' ? profile.upcomingMatch.tournamentId : undefined;
  useEffect(() => {
    let cancelled = false;
    setLive(undefined);
    if (liveTournamentId) void services.tournaments.get(liveTournamentId).then(tournament => { if (!cancelled) setLive(tournament); }).catch(() => { /* An unavailable live detail does not block the public profile. */ });
    return () => { cancelled = true; };
  }, [liveTournamentId]);
  const founded = fullTeam?.foundedAt ? new Date(fullTeam.foundedAt).getFullYear() : undefined;
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-100px 0px -50% 0px', threshold: 0 });
    sections.forEach(({ id }) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, [team.id]);
  return <><article className="public-team-detail">
    <header className="public-team-hero">
      <div className="public-team-width public-team-hero__grid">
        <div className="public-team-hero__copy">
          {live && <Link className="public-team-live" to={`/tournaments/${live.id}`}><i aria-hidden="true" />Canlı: {live.name}<ArrowRight size={17} /></Link>}
          <span className="public-team-eyebrow">// PUBG MOBILE</span>
          <h1>{team.name}</h1>
          <div className="public-team-tagline">{team.tag && <strong>{team.tag}</strong>}{captain && <span>Kapitan ləqəbi: <b>{captain.ign}</b></span>}</div>
          {fullTeam?.description && <p className="public-team-bio">{fullTeam.description}</p>}
          <div className="public-team-meta">{team.country && <span><Flag size={18} />{team.country}</span>}{founded && Number.isFinite(founded) && <span><CalendarDays size={18} />{founded}</span>}{team.verificationLevel && <VerificationCrest level={team.verificationLevel} showLabel />}</div>
        </div>
        <div className="public-team-brand"><TeamLogo name={team.name} src={team.logoUrl} size="xl" /><div className="public-team-social"><ShareProfileAction teamName={team.name} /><SocialLinkList links={fullTeam?.socialLinks} ownerName={team.name} compact /></div></div>
      </div>
    </header>
    <div className="public-team-width public-team-content">
      <div className="public-team-overview">
        <nav className="public-team-index" aria-label="Komanda profilinin bölmələri"><span>KOMANDA DOSYESİ</span>{sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}><Icon size={19} /><span>{label}</span></a>)}</nav>
        <div className="public-team-overview__main">
          <section id="overview" className="public-team-section"><h2>Karyera xülasəsi</h2>{profile?.career ? <dl className="public-team-stats">{metrics.map(([key, label]) => <div key={key}><dd>{profile.career?.metrics.find(metric => metric.key === key)?.value ?? '—'}</dd><dt>{label}</dt></div>)}</dl> : <p className="public-team-empty">Karyera ilk dərc edilmiş rəsmi nəticədən başlayır.</p>}</section>
          <section id="form" className="public-team-section"><h2>Son 5 matç</h2><p className="public-team-form-caption">YENİ → KÖHNƏ</p>{form.length ? <div className="public-team-form">{form.map(result => <div key={result.matchId} className={result.wwcd ? 'is-wwcd' : ''} tabIndex={0} aria-label={`${result.map}, ${result.wwcd ? 'WWCD' : `${result.placement}-ci yer`}, ${result.finishes} kill`}><span aria-hidden="true">{result.wwcd ? <>WW<br />CD</> : result.placement}</span></div>)}</div> : <p className="public-team-empty">Hələ dərc edilmiş matç nəticəsi yoxdur.</p>}</section>
        </div>
      </div>
      <section id="roster" className="public-team-section"><h2>Aktiv heyət</h2>{roster.length ? <div className="public-team-roster">{roster.map(player => <article key={player.id}><div className="public-team-player-portrait" aria-hidden="true"><span>{player.ign.slice(0, 2).toUpperCase()}</span><Crosshair /></div>{player.role === 'captain' && <Crown className="public-team-captain" size={20} aria-label="Kapitan" />}<div className="public-team-player-copy">{player.role === 'captain' ? <Crown size={20} /> : <CirclePlus size={18} />}<div><h3>{player.ign}</h3><p>{player.role === 'captain' ? 'Kapitan' : player.role === 'starter' ? 'Əsas heyət' : 'Əvəzedici'}</p></div></div></article>)}</div> : <p className="public-team-empty">İctimai heyət məlumatı hələ dərc edilməyib.</p>}</section>
      <section id="matches" className="public-team-section"><h2>Son matçlar</h2>{matches.length ? <table className="public-team-matches"><caption className="sr-only">Dərc edilmiş komanda nəticələri</caption><thead><tr><th scope="col">Turnir</th><th scope="col">Tarix</th><th scope="col">#</th><th scope="col">Kill</th><th scope="col">Xal</th><th scope="col"><span className="sr-only">Nailiyyət</span></th></tr></thead><tbody>{matches.slice(0, 5).map(match => <tr key={match.id}><th scope="row"><Link to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }}>{match.map} · {match.stageLabel}<small>{match.tournamentName}</small></Link></th><td><time dateTime={match.playedAt}>{new Date(match.playedAt).toLocaleDateString('az-AZ')}</time></td><td>#{match.placement}</td><td>{match.finishes}</td><td>{match.points}</td><td>{match.id === best?.id && <span className="public-team-best"><Trophy size={20} /><span>Ən yaxşı nəticə</span></span>}</td></tr>)}</tbody></table> : <p className="public-team-empty">Bu komanda üçün təsdiqlənmiş raund nəticəsi yayımlandıqda burada görünəcək.</p>}</section>
      <section id="performance" className="public-team-section"><h2>Xəritə statistikası</h2>{maps.length ? <><div className="public-team-maps">{maps.map(map => { const imageIndex = ['erangel', 'miramar', 'rondo'].indexOf(map.map.toLowerCase()); return <article key={map.map}><h3>{map.map}</h3><div className="public-team-map-body">{imageIndex >= 0 && <img src={officialAssets.mapsSmall[imageIndex]} alt={`${map.map} xəritəsi`} loading="lazy" width="100" height="130" />}<div><span>{map.matches} matç</span><div className="public-team-map-average"><small>Orta yer</small><strong>#{map.averagePlacement.toFixed(1)}</strong><meter min="1" max="16" value={Math.min(16, Math.max(1, map.averagePlacement))} aria-label={`${map.map} orta yer`} /></div><small>Win rate</small><b>{map.matches ? Math.round(map.wwcd / map.matches * 100) : 0}%</b></div></div></article>; })}</div>{maps.some(map => map.matches < (profile?.mapSpecialization.minimumSampleSize ?? 3)) && <p className="public-team-note"><Info size={17} />{profile?.mapSpecialization.minimumSampleSize ?? 3}-dən az matç oynanılan xəritələrdə statistika məhdud məlumatlara əsaslanır.</p>}</> : <p className="public-team-empty">Xəritə statistikası dərc edilmiş matçlardan sonra görünəcək.</p>}</section>
      <PublicTeamFeatures team={team} profile={profile} />
    </div>
  </article><BrandJoinCta /></>;
}
