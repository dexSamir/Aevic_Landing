import '../../styles/tournament-detail.css';
import {
ArrowRight,
BarChart3,
CalendarDays,
CircleDollarSign,
Map as MapIcon,
MapPin,
Swords,
Trophy,
Users
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { officialAssets,officialRotation } from '../../assets/official';
import {
Countdown,
EmptyState,
LoadingSkeleton,
SectionHeading,
TeamLogo
} from '../../components/common/primitives';
import { TournamentJoinAction } from '../../components/competition/TournamentJoinAction';
import { TournamentResults } from '../../components/competition/TournamentResults';
import { services } from '../../services';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import { queryPolicy,usePlatformQuery } from '../../services/queryCache';
import '../../styles/public-pages.css';
import { formatEventDate } from '../../utils/calendar';
import { tournamentById } from '../../utils/routes';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { useTournamentClock } from '../../utils/useTournamentClock';
import { formatDate } from './PublicPagesShared';
export function TournamentDetailPage() {
  const { tournaments, leaderboardTeams, teams } = usePublicPlatformData();
  const { tournamentId } = useParams();
  const tournament = tournamentById(tournaments, tournamentId);
  const now = useTournamentClock(tournaments);
  const [activeSection, setActiveSection] = useState('overview');
  const [showAllTeams, setShowAllTeams] = useState(false);
  useEffect(() => { setShowAllTeams(false); setActiveSection('overview'); }, [tournamentId]);
  const participantsQuery = usePlatformQuery({ scope:'public', key: `tournament:${tournamentId}:participants`, query: () => services.tournaments.publicParticipants(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const matchesQuery = usePlatformQuery({ scope:'public', key: `tournament:${tournamentId}:matches`, query: async () => {
    const [schedule, history] = await Promise.all([services.publicMatches.schedule(), services.publicMatches.history()]);
    return { schedule: schedule.filter(match => match.tournamentId === tournamentId), history: history.filter(match => match.tournamentId === tournamentId) };
  }, staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const resultsQuery = usePlatformQuery({ scope:'public', key: `tournament:${tournamentId}:standings`, query: () => services.results.leaderboard(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  if (!tournament) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Turnir tapılmadı" body="Bu turnir mövcud deyil və başqa yarışla əvəz edilmədi." action={<Link className="button button--secondary" to="/tournaments">Turnir təqviminə qayıt</Link>} /></div></section>;
  const phase = resolveTournamentTemporalPhase(tournament, now);
  const open = phase === 'registration-open';
  const participants = participantsQuery.data ?? [];
  const standings = (resultsQuery.data ?? []).filter(row => row.tournamentId === tournament.id);
  const history = matchesQuery.data?.history ?? [];
  // Published rounds replace their scheduled entry; schedule times are never invented.
  const rounds = [...(matchesQuery.data?.schedule ?? []).filter(match => !history.some(result => result.id === match.id)).map(match => ({ id: match.id, map: match.map, round: match.round, date: match.startsAt, status: match.status })), ...[...history].sort((a,b) => Date.parse(a.playedAt) - Date.parse(b.playedAt)).map((match, index) => ({ id: match.id, map: match.map, round: index + 1, date: match.playedAt, status: 'completed' }))];
  const placements = Array.from({ length: Math.max(16, tournament.maxSlots, ...tournament.pointFormula.placement.map(item => item.placement)) }, (_, i) => ({ placement: i + 1, points: tournament.pointFormula.placement.find(item => item.placement === i + 1)?.points ?? 0 }));
  const statusLabel = open ? 'AÇIQDIR' : phase === 'upcoming' ? 'TEZLİKLƏ' : phase === 'live' ? 'CANLI' : phase === 'completed' ? 'TAMAMLANIB' : phase === 'cancelled' ? 'LƏĞV EDİLİB' : 'BAĞLIDIR';
  return <article className="tournament-destination">
    <header className="tournament-detail-hero">
      <div className="tournament-detail-width tournament-detail-hero__stage">
        <div className="tournament-detail-hero__copy"><span className="tournament-detail-eyebrow">// AEVIC REYTİNQ TURNİRİ</span><h1>{tournament.name}</h1><p>{tournament.description}</p><div className="tournament-detail-meta"><span><CalendarDays size={20} />{formatDate(tournament.startsAt)}{formatDate(tournament.startsAt) !== formatDate(tournament.endsAt) && <> – {formatDate(tournament.endsAt)}</>}</span><span><MapPin size={20} />PUBG MOBILE</span><span><Users size={20} />Squad (4 nəfər)</span></div></div>
        <aside className="tournament-registration" aria-label="Qeydiyyat pəncərəsi"><header><h2><span>//</span> QEYDİYYAT PƏNCƏRƏSİ</h2><span className={open ? 'is-open' : ''}>{statusLabel}</span></header><Countdown key={`${tournament.id}:${phase}`} target={phase === 'upcoming' ? tournament.registrationOpensAt : tournament.registrationDeadline} /><p>{open ? 'Qeydiyyat mövcud komandaların iştirakına təsir etmir — matç vaxtları artıq təsdiqlənib.' : phase === 'upcoming' ? 'Qeydiyyat pəncərəsi açıldıqda uyğun komandalar qoşula bilər.' : 'Qeydiyyat başa çatıb. Turnirin cədvəlini və dərc edilmiş nəticələrini izləyin.'}</p><TournamentJoinAction tournament={tournament} currentTime={now} joinLabel="İştirak et" />{phase === 'completed' && <Link className="tournament-detail-link" to={`/tournaments/${tournament.id}/recap`}>Final icmalı<ArrowRight size={17} /></Link>}</aside>
      </div>
    </header>
    <nav className="tournament-detail-tabs" aria-label={`${tournament.shortName} bölmələri`}><div className="tournament-detail-width">{[['overview','Ümumi baxış'],['participants','Komandalar'],['matches','Matçlar'],['results','Sıralama'],['rules','Qaydalar']].map(([id,label]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={() => setActiveSection(id)}>{label}</a>)}</div></nav>
    <div className="tournament-detail-width tournament-detail-body">
      <section id="overview"><SectionHeading title="Turnir formatı" description="Turnir haqqında əsas məlumatlar" /><dl className="tournament-detail-format">
        <div><Users /><dt>Turnir ID</dt><dd>{tournament.shortName}</dd><small>{tournament.id}</small></div>
        <div><CircleDollarSign /><dt>Turnir həcmi</dt><dd><em>{tournament.maxSlots}</em> komanda</dd><small>Squad (4 nəfər)</small></div>
        <div><MapIcon /><dt>Turnir formatı</dt><dd>{tournament.roundsPerDay} raund × {tournament.days} gün</dd><small>Ümumi {tournament.roundsPerDay * tournament.days} matç</small></div>
        <div><Trophy /><dt>Mükafat fondu</dt><dd>{tournament.prizePool.toLocaleString('az-AZ')} {tournament.prizeCurrency}</dd><small>Ümumi mükafat fondu</small></div>
      </dl></section>
      <section id="matches" className="tournament-detail-schedule competition-round-program"><SectionHeading title="Xəritə və matç cədvəli" action={<Link className="tournament-detail-link" to="/matches">Matç Mərkəzində aç<ArrowRight size={17} /></Link>} />{matchesQuery.loading ? <LoadingSkeleton variant="table" rows={3} /> : matchesQuery.error && !matchesQuery.data ? <EmptyState title="Raund proqramı yüklənmədi" body="Matç mərkəzindən yenidən yoxlayın." /> : <ol>{officialRotation.map((map,index) => {
        const entries = rounds.filter(round => (round.round - 1) % 4 === index && round.map === map).sort((a,b) => Date.parse(a.date)-Date.parse(b.date));
        const next = entries.find(round => round.status !== 'completed') ?? entries[0];
        const status = !next ? 'TƏSDİQ GÖZLƏYİR' : next.status === 'completed' ? 'TAMAMLANIB' : next.status === 'live' ? 'CANLI' : 'PLANLANIB';
        return <li key={`${map}-${index}`}><Link to={`/tournaments/${tournament.id}#results`} state={{ roundId: next?.id }} aria-label={`Raund ${index + 1}, ${map} nəticələrinə keç`}><img src={officialAssets.maps[index]} srcSet={officialAssets.mapSrcSets[index]} sizes="(max-width: 800px) 45vw, 23vw" width="1600" height="900" loading="lazy" alt="" /><span className="tournament-map-status">{status}</span><span className="tournament-map-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="tournament-map-copy"><h3>{map}</h3>{next ? <time dateTime={next.date}><CalendarDays size={17} />{formatEventDate(next.date, { withTime: true })}</time> : <p>Vaxt təsdiq gözləyir</p>}<p><Swords size={17} />{entries.length} matç</p></div></Link></li>;
      })}</ol>}</section>
      <section id="participants"><SectionHeading title="İştirakçı komandalar" description={`Turnirdə iştirak edən komandalar (${participants.length})`} action={participants.length > 10 ? <button className="tournament-detail-link" onClick={() => setShowAllTeams(value => !value)}>{showAllTeams ? 'Daha az göstər' : 'Hamısına bax'}<ArrowRight size={17} /></button> : undefined} />{participantsQuery.loading ? <LoadingSkeleton variant="table" rows={3} /> : participantsQuery.error && !participantsQuery.data ? <EmptyState title="İştirakçılar yüklənmədi" body="Təsdiqlənmiş iştirakçı servisi cavab vermir." /> : participants.length ? <ul className="tournament-detail-teams">{participants.slice(0,showAllTeams ? undefined : 10).map(participant => { const result = standings.find(row => row.teamId === participant.team.id); const starters = participant.roster.filter(player => player.role !== 'substitute').length; return <li key={participant.team.id}><Link to={`/teams/${participant.team.slug}`}><TeamLogo name={participant.team.name} src={participant.team.logoUrl} size="lg" /><h3>{participant.team.name}</h3><div><span><Users size={15} />{starters}/4</span>{result && <span>{result.wwcd} <small>WWCD</small></span>}</div></Link></li>; })}</ul> : <EmptyState title="İştirakçılar hələ təsdiqlənməyib" body="Təsdiqlənmiş komandalar burada görünəcək." />}</section>
      {resultsQuery.loading ? <section id="results"><LoadingSkeleton variant="table" rows={3} /></section> : resultsQuery.error && !resultsQuery.data ? <section id="results"><EmptyState title="Nəticələr yüklənmədi" body="Rəsmi nəticə servisi hazırda cavab vermir." /></section> : standings.length ? <TournamentResults standings={standings} teamNames={leaderboardTeams} teams={teams} publishedRoundCount={history.length} tournamentName={tournament.name} tournamentId={tournament.id} publishedAt={tournament.resultsPublishedAt} /> : <section id="results"><SectionHeading title="Ümumi sıralama" description="Turnir bitdikdən sonra ümumi sıralama burada dərc ediləcək." action={<Link className="tournament-detail-link" to="/matches">Matç Mərkəzinə keç<ArrowRight size={17} /></Link>} /><EmptyState icon={<BarChart3 size={42} />} title="Ümumi sıralama dərc edilməyib" body="Matçlar başa çatdıqdan sonra yekun sıralama burada görünəcək." action={<Link className="button button--secondary" to="/matches">Matç Mərkəzi<ArrowRight size={17} /></Link>} /></section>}
      <section id="scoring"><SectionHeading title="Xal formulu" description="Hər matçda yerlərə görə verilən xallar" /><dl className="tournament-detail-scoring">{placements.map(item => <div key={item.placement}><dt>#{item.placement}</dt><dd>{item.points}<small>xal</small></dd></div>)}</dl><p className="tournament-scoring-note">Hər kill +{tournament.pointFormula.finishPointValue} · WWCD bonusu +{tournament.pointFormula.wwcdBonus}</p><details className="tournament-detail-tiebreak"><summary>Bərabərlik meyarları</summary><ol>{tournament.pointFormula.tieBreakRules.map(rule => <li key={rule}>{rule}</li>)}</ol></details></section>
      <section id="rules"><SectionHeading title="Əsas qaydalar" description="Turnirlə bağlı vacib məqamlar" /><div className="tournament-detail-rules"><ol>{tournament.rules.slice(0,4).map((rule,index) => <li key={rule}><span>{String(index+1).padStart(2,'0')}</span>{rule}</li>)}</ol><Link className="button button--secondary" to="/regulations">Tam qaydaları oxu<ArrowRight size={17} /></Link></div>{tournament.rules.length > 4 && <details className="tournament-detail-tiebreak"><summary>Digər turnir qaydaları</summary><ol>{tournament.rules.slice(4).map(rule => <li key={rule}>{rule}</li>)}</ol></details>}</section>
    </div>
  </article>;
}
