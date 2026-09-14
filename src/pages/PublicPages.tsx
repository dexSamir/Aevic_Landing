import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Map as MapIcon,
  MapPin,
  Trophy,
  CalendarDays,
  Crown,
  Swords,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { officialAssets, officialRotation } from '../assets/official';
import { TournamentJoinAction } from '../components/competition/TournamentJoinAction';
import { LeaderboardMovementCell } from '../components/competition/CompetitionIntelligence';
import { TournamentResults } from '../components/competition/TournamentResults';
import {
  Countdown,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  MobileDataList,
  PageHeader,
  SectionHeading,
  TeamLogo,
} from '../components/common/primitives';
import { competitionNow, demoMode, services } from '../services';
import { usePublicPlatformData } from '../services/PlatformDataContext';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';
import type { RankMovementData } from '../types/domain';
import { formatEventDate } from '../utils/calendar';
import { tournamentById } from '../utils/routes';
import { resolveTournamentTemporalPhase } from '../utils/tournamentTime';
import { selectLeaderboardTournament } from '../utils/competitionSelectors';

const formatDate = (value: string, withTime = false) => formatEventDate(value, { withTime });

export { TournamentsPage } from './TournamentsPage';

export function TournamentDetailPage() {
  const { tournaments, leaderboardTeams, teams } = usePublicPlatformData();
  const { tournamentId } = useParams();
  const tournament = tournamentById(tournaments, tournamentId);
  const [now, setNow] = useState(competitionNow);
  const [activeSection, setActiveSection] = useState('overview');
  const [showAllTeams, setShowAllTeams] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNow(competitionNow()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setShowAllTeams(false); setActiveSection('overview'); }, [tournamentId]);
  const participantsQuery = usePlatformQuery({ key: `tournament:${tournamentId}:participants`, query: () => services.tournaments.publicParticipants(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const matchesQuery = usePlatformQuery({ key: `tournament:${tournamentId}:matches`, query: async () => {
    const [schedule, history] = await Promise.all([services.publicMatches.schedule(), services.publicMatches.history()]);
    return { schedule: schedule.filter(match => match.tournamentId === tournamentId), history: history.filter(match => match.tournamentId === tournamentId) };
  }, staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const resultsQuery = usePlatformQuery({ key: `tournament:${tournamentId}:standings`, query: () => services.results.leaderboard(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
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
      <section id="matches" className="tournament-detail-schedule competition-round-program"><SectionHeading title="Xəritə və matç cədvəli" action={<Link className="tournament-detail-link" to="/matches">Matç Mərkəzində aç<ArrowRight size={17} /></Link>} />{matchesQuery.loading ? <LoadingSkeleton rows={3} /> : matchesQuery.error ? <EmptyState title="Raund proqramı yüklənmədi" body="Matç mərkəzindən yenidən yoxlayın." /> : <ol>{officialRotation.map((map,index) => {
        const entries = rounds.filter(round => (round.round - 1) % 4 === index && round.map === map).sort((a,b) => Date.parse(a.date)-Date.parse(b.date));
        const next = entries.find(round => round.status !== 'completed') ?? entries[0];
        const status = !next ? 'TƏSDİQ GÖZLƏYİR' : next.status === 'completed' ? 'TAMAMLANIB' : next.status === 'live' ? 'CANLI' : 'PLANLANIB';
        return <li key={`${map}-${index}`}><Link to={`/tournaments/${tournament.id}#results`} state={{ roundId: next?.id }} aria-label={`Raund ${index + 1}, ${map} nəticələrinə keç`}><img src={officialAssets.maps[index]} srcSet={officialAssets.mapSrcSets[index]} sizes="(max-width: 800px) 45vw, 23vw" width="1600" height="900" loading="lazy" alt="" /><span className="tournament-map-status">{status}</span><span className="tournament-map-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="tournament-map-copy"><h3>{map}</h3>{next ? <time dateTime={next.date}><CalendarDays size={17} />{formatEventDate(next.date, { withTime: true })}</time> : <p>Vaxt təsdiq gözləyir</p>}<p><Swords size={17} />{entries.length} matç</p></div></Link></li>;
      })}</ol>}</section>
      <section id="participants"><SectionHeading title="İştirakçı komandalar" description={`Turnirdə iştirak edən komandalar (${participants.length})`} action={participants.length > 10 ? <button className="tournament-detail-link" onClick={() => setShowAllTeams(value => !value)}>{showAllTeams ? 'Daha az göstər' : 'Hamısına bax'}<ArrowRight size={17} /></button> : undefined} />{participantsQuery.loading ? <LoadingSkeleton rows={3} /> : participantsQuery.error ? <EmptyState title="İştirakçılar yüklənmədi" body="Təsdiqlənmiş iştirakçı servisi cavab vermir." /> : participants.length ? <ul className="tournament-detail-teams">{participants.slice(0,showAllTeams ? undefined : 10).map(participant => { const result = standings.find(row => row.teamId === participant.team.id); const starters = participant.roster.filter(player => player.role !== 'substitute').length; return <li key={participant.team.id}><Link to={`/teams/${participant.team.slug}`}><TeamLogo name={participant.team.name} src={participant.team.logoUrl} size="lg" /><h3>{participant.team.name}</h3><div><span><Users size={15} />{starters}/4</span>{result && <span>{result.wwcd} <small>WWCD</small></span>}</div></Link></li>; })}</ul> : <EmptyState title="İştirakçılar hələ təsdiqlənməyib" body="Təsdiqlənmiş komandalar burada görünəcək." />}</section>
      {resultsQuery.loading ? <section id="results"><LoadingSkeleton rows={3} /></section> : resultsQuery.error ? <section id="results"><EmptyState title="Nəticələr yüklənmədi" body="Rəsmi nəticə servisi hazırda cavab vermir." /></section> : standings.length ? <TournamentResults standings={standings} teamNames={leaderboardTeams} teams={teams} publishedRoundCount={history.length} tournamentName={tournament.name} tournamentId={tournament.id} publishedAt={tournament.resultsPublishedAt} /> : <section id="results"><SectionHeading title="Ümumi sıralama" description="Turnir bitdikdən sonra ümumi sıralama burada dərc ediləcək." action={<Link className="tournament-detail-link" to="/matches">Matç Mərkəzinə keç<ArrowRight size={17} /></Link>} /><EmptyState icon={<BarChart3 size={42} />} title="Ümumi sıralama dərc edilməyib" body="Matçlar başa çatdıqdan sonra yekun sıralama burada görünəcək." action={<Link className="button button--secondary" to="/matches">Matç Mərkəzi<ArrowRight size={17} /></Link>} /></section>}
      <section id="scoring"><SectionHeading title="Xal formulu" description="Hər matçda yerlərə görə verilən xallar" /><dl className="tournament-detail-scoring">{placements.map(item => <div key={item.placement}><dt>#{item.placement}</dt><dd>{item.points}<small>xal</small></dd></div>)}</dl><p className="tournament-scoring-note">Hər kill +{tournament.pointFormula.finishPointValue} · WWCD bonusu +{tournament.pointFormula.wwcdBonus}</p><details className="tournament-detail-tiebreak"><summary>Bərabərlik meyarları</summary><ol>{tournament.pointFormula.tieBreakRules.map(rule => <li key={rule}>{rule}</li>)}</ol></details></section>
      <section id="rules"><SectionHeading title="Əsas qaydalar" description="Turnirlə bağlı vacib məqamlar" /><div className="tournament-detail-rules"><ol>{tournament.rules.slice(0,4).map((rule,index) => <li key={rule}><span>{String(index+1).padStart(2,'0')}</span>{rule}</li>)}</ol><Link className="button button--secondary" to="/regulations">Tam qaydaları oxu<ArrowRight size={17} /></Link></div>{tournament.rules.length > 4 && <details className="tournament-detail-tiebreak"><summary>Digər turnir qaydaları</summary><ol>{tournament.rules.slice(4).map(rule => <li key={rule}>{rule}</li>)}</ol></details>}</section>
    </div>
  </article>;
}

export function LeaderboardPage() {
  const { tournaments, leaderboard: sourceLeaderboard, teams } = usePublicPlatformData();
  const featured = selectLeaderboardTournament(tournaments, sourceLeaderboard, competitionNow());
  const leaderboard = sourceLeaderboard.filter((row) => row.tournamentId === featured?.id).sort((a, b) => a.placement - b.placement || a.teamId.localeCompare(b.teamId));
  const leaderboardTeams = leaderboard.map((row) => teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı dərc edilməyib');
  const [movement, setMovement] = useState<RankMovementData[]>([]);
  useEffect(() => { if (!featured) return; services.results.movement(featured.id).then(setMovement).catch(() => setMovement([])); }, [featured]);
  if (!featured || !leaderboard.length || !leaderboardTeams.length) return <section className="page-section leaderboard-page"><div className="container"><PageHeader title="Liderlik cədvəli" description="Turnir nəticələri dərc edildikdə liderlik sırası burada görünəcək." /><EmptyState title="Sıralama nəticədən başlayır" body="Hazırda dərc edilmiş sıralama yoxdur. Yer, kill və cərimə xallarının yekuna necə təsir etdiyini öyrənin." action={<Link className="button button--secondary" to="/regulations#rule-5">Xal sisteminə bax</Link>} /></div></section>;
  const movementByTeam = new Map(movement.map((item) => [item.teamId, item])); const hasMovement = movement.length > 0;
  const teamDestination = (teamName: string) => teams.find((team) => team.name === teamName);
  const teamIdentity = (teamName: string) => { const team = teamDestination(teamName); const content = <><TeamLogo name={teamName} src={team?.logoUrl} size="sm" /><strong>{teamName}</strong></>; return team ? <Link className="team-cell" to={`/teams/${team.slug}`}>{content}</Link> : <span className="team-cell">{content}</span>; };
  const rows = leaderboard.map((result, index) => [
    <span className={`rank-number ${index === 0 ? 'rank-number--winner' : ''}`}><b>{String(result.placement).padStart(2, '0')}</b></span>,
    teamIdentity(leaderboardTeams[index] ?? 'Komanda adı dərc edilməyib'),
    ...(hasMovement ? [<LeaderboardMovementCell movement={movementByTeam.get(result.teamId)} />] : []), result.matches, result.wwcd, result.placementPoints, result.finishPoints, result.penalties ? `−${result.penalties}` : '—', <strong>{result.totalPoints}</strong>,
  ]);
  const leaderName = leaderboardTeams[0]; const leaderTeam = teamDestination(leaderName);
  return <section className="page-section leaderboard-page"><div className="container"><PageHeader eyebrow={`${featured.shortName} · ${demoMode ? 'Nümunə nəticə' : 'Dərc edilmiş nəticə'}`} title="Liderlik cədvəli" description="WWCD, yer və kill xalları ayrı göstərilir; real vaxt yenilənməsi backend tələb edir." actions={<Link className="button button--secondary" to={`/tournaments/${featured.id}`}><span>Turnir detalı</span></Link>} /><div className="leaderboard-visual"><div className="champion-row"><Crown size={28} /><div><span>Nümunə lider</span>{leaderTeam ? <Link to={`/teams/${leaderTeam.slug}`}><strong>{leaderName}</strong></Link> : <strong>{leaderName}</strong>}<p>{leaderboard[0].matches} matç · {leaderboard[0].wwcd} WWCD · nümunə</p></div><b>{leaderboard[0].totalPoints}<small>XAL</small></b></div></div><DataTable caption={`${featured.shortName} liderlik cədvəli`} headers={['Yer', 'Komanda', ...(hasMovement ? ['Dəyişmə'] : []), 'M', 'WWCD', 'Yer xalı', 'Kill xalı', 'Cərimə', 'Cəmi']} rows={rows} cutAfterRow={featured.qualification?.advancesThroughRank} cutLabel={featured.qualification?.label} /><MobileDataList items={leaderboard.map((result, index) => { const name = leaderboardTeams[index] ?? 'Komanda adı dərc edilməyib'; const team = teamDestination(name); return { title: <><span className="mobile-rank">#{result.placement}</span>{team ? <Link to={`/teams/${team.slug}`}>{name}</Link> : name}{hasMovement && <LeaderboardMovementCell movement={movementByTeam.get(result.teamId)} />}</>, meta: `${result.matches} matç · ${result.wwcd} WWCD`, value: `${result.totalPoints} xal`, details: <span>Yer {result.placementPoints} · Kill {result.finishPoints}{result.penalties ? ` · Cərimə −${result.penalties}` : ''}</span> }; })} /></div></section>;
}

export function RegulationsPage() {
  const sections = [
    ['İştirak şərtləri', 'İştirak uyğunluğu, heyət tələbləri və qadağalar hər turnirin təsdiqlənmiş şərtlərində göstərilməlidir.'],
    ['Heyət və UID', 'Heyət qeydiyyatın son tarixində kilidlənir. Dəyişiklik yalnız göstərilən vaxtdan əvvəl və yoxlanıla bilən sorğu ilə mümkündür.'],
    ['Check-in', 'Check-in açıq olduqda komanda hazır olduğunu təsdiqləyir. Gecikmə ilə bağlı qərar turnirin dərc edilmiş qaydalarından asılıdır.'],
    ['Otaq məlumatları', 'Otaq ID-si və şifrə yalnız uyğun komandalara təyin edilmiş açılış vaxtında göstərilir. İctimai paylaşım qadağandır.'],
    ['Xal sistemi', 'Yer və kill xalları turnir formulu ilə hesablanır; cərimə ayrıca göstərilir və yekun xaldan çıxılır.'],
    ['Ədalətli oyun', 'İcazəsiz proqram, razılaşdırılmış oyun, hesab paylaşımı və nəticəyə təsir edən digər pozuntular yoxlama və qadağa ilə nəticələnə bilər.'],
    ['Etirazlar', 'Nəticə etirazı admin mesajında göstərilən müddətdə raund, komanda və sübut istinadı ilə verilməlidir.'],
  ];
  return <section className="page-section regulations-page"><div className="container regulations-layout"><PageHeader title="Turnir reqlamenti" description="İlkin yarış bələdçisidir, yekun reqlament deyil. Hər turnirin təsdiqlənmiş şərtləri ayrıca dərc olunmalıdır." /><aside><span>AEVIC YARIŞ BƏLƏDÇİSİ</span><strong>İlkin izah</strong><p>Yekun hüquqi və yarış təsdiqi gözlənilir.</p><nav>{sections.map(([title], index) => <a key={title} href={`#rule-${index + 1}`}>{String(index + 1).padStart(2, '0')} {title}</a>)}</nav></aside><article><p className="regulations-disclosure">Bu mətn ilkin məlumat bələdçisidir; dərc olunacaq qaydalar hüquqi və yarış üzrə təsdiq tələb edir.</p>{sections.map(([title, body], index) => <section id={`rule-${index + 1}`} key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{title}</h2><p>{body}</p>{index === 4 && <ul><li>Nümunə: WWCD üçün 10 yerləşmə xalı</li><li>Nümunə: hər kill üçün 1 xal</li><li>Bərabərlik meyarı turnirin təsdiqlənmiş formulunda göstərilməlidir</li></ul>}</div></section>)}</article></div></section>;
}

function InformationPage({ title, description, sections }: { title: string; description: string; sections: [string, string][] }) {
  return <section className="page-section information-page"><div className="container"><PageHeader title={title} description={description} /><div className="information-page__body">{sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div></div></section>;
}

export function PrivacyPage() {
  return <InformationPage title="Məxfilik məlumatı" description="İctimai buraxılışın texniki məlumat sərhədləri. Bu mətn yekun hüquqi məxfilik siyasəti deyil." sections={[
    ["İctimai məlumat", "Sayt təsdiqlənmiş komanda kimliklərini göstərmək üçün serverdən ictimai məlumat oxuyur. İctimai cavabda kapitan əlaqələri, oyunçu UID-ləri və hesab sirləri göstərilmir."],
    ["Hesab xidmətləri", "Hesab girişi, qeydiyyat və şəxsi əməliyyatlar hazırkı ictimai buraxılışda əlçatan deyil. İstehsal mühiti nümunə məlumat adapterindən istifadə etmir."],
    ["Brauzerdə saxlanma", "Brauzer ictimai statik faylları və interfeys seçimlərini lokal saxlaya bilər. Şəxsi səhifələr və API cavabları oflayn keşə yazılmır."],
    ["Hüquqi təsdiq", "Məlumat məsulu, saxlama müddətləri, istifadəçi hüquqları və rəsmi müraciət kanalı buraxılış sahibinin hüquqi təsdiqini tələb edir. Bu xarici təsdiq tamamlanmayıb."]
  ]} />;
}

export function TermsPage() {
  return <InformationPage title="İstifadə şərtləri" description="Platformadan istifadə və yarış iştirakına aid yekun şərtlər hüquqi təsdiq gözləyir." sections={[
    ["Hazırkı əhatə", "Bu buraxılış ictimai yarış bələdçisini və təsdiqlənmiş komanda kataloqunu təqdim edir. Hesab və yarışa qeydiyyat əməliyyatları açılmayıb."],
    ["Turnir qaydaları", "Hər turnirin iştirak, ədalətli oyun, heyət və xal şərtləri ayrıca təsdiqlənərək dərc olunmalıdır. İlkin bələdçi yekun turnir qərarını əvəz etmir."],
    ["Status", "Bu səhifə ilkin məlumat üçündür və yekun hüquqi sənəd hesab edilmir."]
  ]} />;
}

export function ContactPage() {
  return <InformationPage title="Əlaqə" description="Hazırkı ictimai buraxılışın əlaqə və dəstək imkanları." sections={[
    ["Yarış əməliyyatları", "Hesab əsaslı mesaj və dəstək sorğusu xidmətləri hələ açılmayıb. Bu səhifə sorğu göndərmir."],
    ["Komanda dəstəyi", "Komanda təsdiqi, heyət və təşkilat əlaqəsi üzrə əməliyyatlar gələcək hesab xidmətinə aiddir."],
    ["Rəsmi əlaqə", "Təsdiqlənmiş sosial kanallar konfiqurasiya edildikdə səhifənin aşağı hissəsində görünür. Heç bir keçid göstərilmirsə, əlaqə kanalı bu buraxılışda hələ dərc edilməyib."]
  ]} />;
}
