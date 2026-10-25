import { RosterTeamCard } from '../../components/common/RosterTeamCard';
import { Seo } from '../../components/common/Seo';
import '../../styles/tournament-detail.css';
import {
ArrowRight,
Skull,
Star,
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
SectionHeading
} from '../../components/common/primitives';
import { TournamentJoinAction } from '../../components/competition/TournamentJoinAction';
import { TournamentResults } from '../../components/competition/TournamentResults';
import { services } from '../../services';
import { usePublicPlatformData } from '../../services/PublicPlatformDataContext';
import { queryPolicy,usePlatformQuery } from '../../services/queryCache';
import '../../styles/public-pages.css';
import { scoreMatch, placementPointGroups } from '../../utils/scoring';
import { tournamentMatches } from '../../utils/tournamentMatches';
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
  const rounds = tournamentMatches(tournament.id, matchesQuery.data?.schedule ?? [], history);
  const example = scoreMatch(tournament.pointFormula, 1, 8);
  const placements = placementPointGroups(tournament.pointFormula, tournament.maxSlots);
  const statusLabel = open ? 'AÇIQDIR' : phase === 'upcoming' ? 'TEZLİKLƏ' : phase === 'live' ? 'CANLI' : phase === 'completed' ? 'TAMAMLANIB' : phase === 'cancelled' ? 'LƏĞV EDİLİB' : 'BAĞLIDIR';
  return <article className="tournament-destination"><Seo title={tournament.name} description={tournament.description} canonicalPath={`/tournaments/${tournament.id}`} publicEntity />
    <header className="tournament-detail-hero">
      <div className="tournament-detail-width tournament-detail-hero__stage">
        <div className="tournament-detail-hero__copy"><span className="tournament-detail-eyebrow">// AEVIC REYTİNQ TURNİRİ</span><h1>{tournament.name}</h1><p>{tournament.description}</p><div className="tournament-detail-meta"><span><CalendarDays size={20} />{formatDate(tournament.startsAt)}{formatDate(tournament.startsAt) !== formatDate(tournament.endsAt) && <> – {formatDate(tournament.endsAt)}</>}</span><span><MapPin size={20} />PUBG MOBILE</span><span><Users size={20} />Squad (4 nəfər)</span></div></div>
        <aside className="tournament-registration" aria-label="Qeydiyyat pəncərəsi"><header><h2><span>//</span> QEYDİYYAT PƏNCƏRƏSİ</h2><span className={open ? 'is-open' : ''}>{statusLabel}</span></header><Countdown key={`${tournament.id}:${phase}`} target={phase === 'upcoming' ? tournament.registrationOpensAt : tournament.registrationDeadline} /><p>{open ? 'Qeydiyyat mövcud komandaların iştirakına təsir etmir — matç vaxtları artıq təsdiqlənib.' : phase === 'upcoming' ? 'Qeydiyyat pəncərəsi açıldıqda uyğun komandalar qoşula bilər.' : 'Qeydiyyat başa çatıb. Turnirin cədvəlini və dərc edilmiş nəticələrini izləyin.'}</p><TournamentJoinAction tournament={tournament} currentTime={now} joinLabel="İştirak et" />{phase === 'completed' && <Link className="tournament-detail-link" to={`/tournaments/${tournament.id}/recap`}>Final icmalı<ArrowRight size={17} /></Link>}</aside>
      </div>
    </header>
    <nav className="tournament-detail-tabs" aria-label={`${tournament.shortName} bölmələri`}><div className="tournament-detail-width">{[['overview','Ümumi baxış'],['participants','Komandalar'],['matches','Matçlar'],['results','Sıralama'],['rules','Qaydalar']].map(([id,label]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={() => setActiveSection(id)}>{label}</a>)}</div></nav>
    <div className="tournament-detail-width tournament-detail-body">
      <section id="overview"><SectionHeading title="Turnir formatı" description="Turnir haqqında əsas məlumatlar" /><dl className="tournament-detail-format">
        <div><dt><Users aria-hidden="true" />Turnir ID</dt><dd>{tournament.shortName}<small>{tournament.id}</small></dd></div>
        <div><dt><CircleDollarSign aria-hidden="true" />Turnir həcmi</dt><dd><em>{tournament.maxSlots}</em> komanda<small>Squad (4 nəfər)</small></dd></div>
        <div><dt><MapIcon aria-hidden="true" />Turnir formatı</dt><dd>{tournament.roundsPerDay} raund × {tournament.days} gün<small>{matchesQuery.loading ? 'Cədvəl yüklənir…' : matchesQuery.error ? 'Matç sayı əlçatan deyil' : `Ümumi ${rounds.length} matç`}</small></dd></div>
        <div><dt><Trophy aria-hidden="true" />Mükafat fondu</dt><dd>{tournament.prizePool.toLocaleString('az-AZ')} {tournament.prizeCurrency}<small>Ümumi mükafat fondu</small></dd></div>
      </dl></section>
      <section id="matches" className="tournament-detail-schedule competition-round-program"><SectionHeading title="Xəritə və matç cədvəli" action={<Link className="tournament-detail-link" to="/matches">Matç Mərkəzində aç<ArrowRight size={17} /></Link>} />{matchesQuery.loading ? <LoadingSkeleton variant="map-cards" rows={4} /> : matchesQuery.error && !matchesQuery.data ? <EmptyState title="Raund proqramı yüklənmədi" body="Matç mərkəzindən yenidən yoxlayın." /> : <ol aria-label="Matç cədvəli" tabIndex={0}>{rounds.map((match,index) => {
        const assetIndex = officialRotation.indexOf(match.map as typeof officialRotation[number]);
        const status = match.status === 'completed' ? 'TAMAMLANIB' : match.status === 'live' ? 'CANLI' : 'PLANLANIB';
        return <li key={match.id}><Link to={`/tournaments/${tournament.id}?match=${encodeURIComponent(match.id)}#results`}><span className="sr-only">{`Matç ${index + 1}, ${match.map} nəticələrinə keç. `}</span>{assetIndex >= 0 && <img src={officialAssets.maps[assetIndex]} srcSet={officialAssets.mapSrcSets[assetIndex]} sizes="(max-width: 600px) 80vw, (max-width: 1100px) 45vw, 23vw" width="1600" height="900" loading="lazy" alt="" />}<span className="tournament-map-status">{status}</span><span className="tournament-map-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="tournament-map-copy"><h3>{match.map}</h3><time dateTime={match.date}><CalendarDays size={17} />{formatEventDate(match.date, { withTime: true })}</time><p><Swords size={17} />Matç {index + 1}{match.day !== undefined && ` · ${match.day}. gün`}{match.round !== undefined && ` · ${match.round}. raund`}</p></div></Link></li>;
      })}</ol>}{!matchesQuery.loading && !matchesQuery.error && rounds.length === 0 && <EmptyState title="Matç cədvəli hələ dərc edilməyib" body="Təsdiqlənmiş matçlar burada görünəcək." />}</section>
      <section id="participants"><SectionHeading title="İştirakçı komandalar" description={`Turnirdə iştirak edən komandalar (${participants.length})`} action={participants.length > 10 ? <button className="tournament-detail-link" onClick={() => setShowAllTeams(value => !value)}>{showAllTeams ? 'Daha az göstər' : 'Hamısına bax'}<ArrowRight size={17} /></button> : undefined} />{participantsQuery.loading ? <LoadingSkeleton variant="participants" rows={10} /> : participantsQuery.error && !participantsQuery.data ? <EmptyState title="İştirakçılar yüklənmədi" body="Təsdiqlənmiş iştirakçı servisi cavab vermir." /> : participants.length ? <ul className="tournament-detail-teams">{participants.slice(0,showAllTeams ? undefined : 10).map(participant => { const result = standings.find(row => row.teamId === participant.team.id); const starters = participant.roster.filter(player => player.role !== 'substitute').length; return <li key={participant.team.id}><RosterTeamCard href={`/teams/${participant.team.slug}`} name={participant.team.name} logoUrl={participant.team.logoUrl} roster={participant.roster}><h3>{participant.team.name}</h3><div><span><Users size={15} />{starters}/4</span>{result && <span>{result.wwcd} <small>WWCD</small></span>}</div></RosterTeamCard></li>; })}</ul> : <EmptyState title="İştirakçılar hələ təsdiqlənməyib" body="Təsdiqlənmiş komandalar burada görünəcək." />}</section>
      <TournamentResults key={tournament.id} standings={standings} teamNames={leaderboardTeams} teams={teams} matches={rounds} loading={resultsQuery.loading} error={Boolean(resultsQuery.error && !resultsQuery.data)} retry={resultsQuery.refetch} retryAfterSeconds={resultsQuery.retryAfterSeconds} scheduleLoading={matchesQuery.loading} scheduleError={Boolean(matchesQuery.error)} retrySchedule={matchesQuery.refetch} tournamentName={tournament.name} tournamentId={tournament.id} publishedAt={tournament.resultsPublishedAt || history.map(match => match.publishedAt).filter(Boolean).sort().reverse()[0]} />
      <section id="scoring"><SectionHeading title="Xal formulu" description="Hər matçda yerlərə görə verilən xallar" /><div className="tournament-scoring-cards"><article><h3><Star size={20} aria-hidden="true" />Yerləşmə xalları</h3><dl className="tournament-detail-scoring">{placements.map(item => <div key={item.first} className={item.points === 0 ? 'is-zero' : undefined}><dt>#{item.first}{item.last !== item.first && `–${item.last}`}</dt><dd>{item.points}<small>xal</small></dd></div>)}</dl></article><article><h3><Skull size={20} aria-hidden="true" />Kill xalları</h3><p>Hər kill üçün <strong>{tournament.pointFormula.finishPointValue} xal</strong></p><div className="tournament-scoring-example"><h4>Nümunə</h4><p>#1 yer <strong>{example.placementPoints} xal</strong></p><p>8 kill <strong>{example.finishPoints} xal</strong></p><p>Ümumi <strong>{example.totalPoints} xal</strong></p></div><p className="tournament-scoring-note">Yer xalı + kill xalı − cərimə = ümumi xal.</p><p className="tournament-scoring-note">WWCD — birinci yer sayı.{tournament.pointFormula.wwcdBonus !== 0 && ` Hər qələbəyə ${tournament.pointFormula.wwcdBonus} bonus xal yer xalına daxildir.`}</p></article></div><details className="tournament-detail-tiebreak"><summary>Bərabərlik meyarları</summary><ol>{tournament.pointFormula.tieBreakRules.map(rule => <li key={rule}>{rule}</li>)}</ol></details></section>
      <section id="rules"><SectionHeading title="Əsas qaydalar" description="Turnirlə bağlı vacib məqamlar" /><div className="tournament-detail-rules"><ol>{tournament.rules.slice(0,4).map((rule,index) => <li key={rule}><span>{String(index+1).padStart(2,'0')}</span>{rule}</li>)}</ol><Link className="button button--secondary" to="/regulations">Tam qaydaları oxu<ArrowRight size={17} /></Link></div>{tournament.rules.length > 4 && <details className="tournament-detail-tiebreak"><summary>Digər turnir qaydaları</summary><ol>{tournament.rules.slice(4).map(rule => <li key={rule}>{rule}</li>)}</ol></details>}</section>
    </div>
  </article>;
}
