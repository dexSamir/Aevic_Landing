import { AnonymousPlayer } from './AnonymousPlayer';
import { MapPerformance } from './MapPerformance';
import { RecentPlacementStrip } from '../common/RecentPlacementStrip';
import { publicImageSrcSet, restoreOriginalUpload } from '../../utils/mediaUrl';
import { PublicTeamIdentity } from './PublicTeamIdentity';
import { ArrowRight, CalendarDays, CirclePlus, Crown, Flag, Grid2X2, History, Info, ShieldCheck, Trophy, Users } from 'lucide-react';
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
const metrics = [['matches', 'Matç'], ['finishes', 'Kill'], ['wwcd', 'Matç qələbəsi'], ['championships', 'Çempionluq'], ['podiums', 'İlk 3 yer']] as const;

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
    <PublicTeamIdentity team={team} details={fullTeam} live={live} />
    <div className="public-team-width public-team-content">{team.legacyHistoryIncomplete&&<p role="status" className="public-team-note">Komanda mövcud qeydiyyat məlumatları ilə göstərilir. Tam yarış tarixçəsi əlçatan deyil; boş nəticələr əvvəlki fəaliyyətin yoxluğu demək deyil.</p>}
      <div className="public-team-overview">
        <nav className="public-team-index" aria-label="Komanda profilinin bölmələri"><span>KOMANDA DOSYESİ</span>{sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}><Icon size={19} /><span>{label}</span></a>)}</nav>
        <div className="public-team-overview__main">
          <section id="overview" className="public-team-section"><h2>Karyera xülasəsi</h2>{profile?.career ? <dl className="public-team-stats">{metrics.map(([key, label]) => <div key={key}><dd>{profile.career?.metrics.find(metric => metric.key === key)?.value ?? '—'}</dd><dt>{label}</dt></div>)}</dl> : <p className="public-team-empty">Karyera göstəriciləri üçün təsdiqlənmiş yarış tarixçəsi hələ əlçatan deyil.</p>}</section>
          <section id="form" className="public-team-section"><h2>Son 5 matç</h2><p className="public-team-form-caption">YENİ → KÖHNƏ</p>{form.length ? <RecentPlacementStrip results={form} /> : <p className="public-team-empty">{profile?.historyAvailable === false ? 'Matç nəticələrinin formatı hələ dəstəklənmir.' : 'Komandanın mövcud nəticələr sahəsində matç yoxdur.'}</p>}</section>
        </div>
      </div>
      <section id="roster" className="public-team-section"><h2>Aktiv heyət</h2>{roster.length ? <div className="public-team-roster">{roster.map(player => <article key={player.id} data-captain={player.role === 'captain'}><div className="public-team-player-portrait" aria-hidden="true"><AnonymousPlayer />{player.photoUrl && <img src={player.photoUrl} srcSet={publicImageSrcSet(player.photoUrl, [160, 320, 640])} sizes="(max-width: 768px) 45vw, 240px" decoding="async" alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { if (!restoreOriginalUpload(event.currentTarget)) event.currentTarget.hidden = true; }} />}</div>{player.role === 'captain' && <Crown className="public-team-captain" size={20} aria-label="Kapitan" />}<div className="public-team-player-copy">{player.role === 'captain' ? <Crown size={20} /> : <CirclePlus size={18} />}<div><h3>{player.ign}</h3><p>{player.role === 'captain' ? 'Kapitan' : player.role === 'starter' ? 'Əsas heyət' : 'Əvəzedici'}</p></div></div></article>)}</div> : <p className="public-team-empty">İctimai heyət məlumatı hələ dərc edilməyib.</p>}</section>
      <section id="matches" className="public-team-section"><h2>Son matçlar</h2>{matches.length ? <ol className="public-match-history" aria-label="Dərc edilmiş komanda nəticələri">{matches.slice(0, 5).map(match => <li key={match.id}><Link className={match.placement === 1 ? 'is-winner' : ''} to={`/tournaments/${match.tournamentId}#results`} state={{ roundId: match.id }}><span className="public-match-placement" aria-label={`${match.placement}-ci yer`}>{match.placement}</span><div className="public-match-identity"><strong>{match.map}</strong><span>{match.tournamentName}</span><small>{match.stageLabel}</small></div><time dateTime={match.playedAt}>{new Date(match.playedAt).toLocaleDateString('az-AZ')}</time><dl><div><dt>Kill</dt><dd>{match.finishes}</dd></div><div><dt>Xal</dt><dd>{match.points}</dd></div></dl>{match.id === best?.id && <Trophy className="public-match-award" size={18} aria-label="Ən yaxşı nəticə" />}</Link></li>)}</ol> : <p className="public-team-empty">{profile?.historyAvailable === false ? 'Matç nəticələrinin formatı hələ dəstəklənmir.' : 'Komandanın mövcud nəticələr sahəsində matç yoxdur. Digər tarixçə mənbələri hələ əlçatan deyil.'}</p>}</section>
      <section id="performance" className="public-team-section"><h2>Xəritə statistikası</h2><p className="map-performance-headline">Hər xəritə, <em>fərqli</em> performans.</p><p className="public-team-note">Orta yer — aşağı göstərici daha yaxşıdır. Qələbə faizi birinci yerlərin payıdır.</p>{maps.length ? <MapPerformance specialization={profile!.mapSpecialization} /> : <p className="public-team-empty">Xəritə statistikası dərc edilmiş matçlardan sonra görünəcək.</p>}</section>
      <PublicTeamFeatures team={team} profile={profile} />
    </div>
  </article><BrandJoinCta /></>;
}
