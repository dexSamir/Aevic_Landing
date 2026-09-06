import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Clock3,
  Crown,
  Swords,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { officialAssets } from '../assets/official';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { CompetitionRoundProgram } from '../components/competition/CompetitionVisuals';
import { TournamentCalendar } from '../components/competition/TournamentCalendar';
import { TournamentJoinAction } from '../components/competition/TournamentJoinAction';
import { CalendarAction } from '../components/competition/CalendarAction';
import { LeaderboardMovementCell } from '../components/competition/CompetitionIntelligence';
import { TournamentParticipantField } from '../components/competition/TournamentParticipants';
import { TournamentResults } from '../components/competition/TournamentResults';
import { Breadcrumbs, EntityContextNav } from '../components/common/EntityContextNav';
import {
  Countdown,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  MobileDataList,
  PageHeader,
  ProgressBar,
  SectionHeading,
  StatusBadge,
  TeamLogo,
} from '../components/common/primitives';
import { competitionNow, demoMode, services } from '../services';
import { usePublicPlatformData } from '../services/PlatformDataContext';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';
import type { RankMovementData } from '../types/domain';
import { AEVIC_EVENT_TIMEZONE, datePartsInTimeZone, formatEventDate, formatEventTime } from '../utils/calendar';
import { tournamentById } from '../utils/routes';
import { resolveTournamentTemporalPhase } from '../utils/tournamentTime';
import { selectLeaderboardTournament } from '../utils/competitionSelectors';

const formatDate = (value: string, withTime = false) => formatEventDate(value, { withTime });

export function TournamentsPage() {
  const { tournaments } = usePublicPlatformData();
  return <section className="page-section tournaments-calendar-page"><div className="container">
    <PageHeader eyebrow="Yarış planlaması" title="Turnir təqvimi" description={tournaments.length ? 'Tarixi seçin, turnirin vəziyyətini və iştirak şərtlərini görün.' : 'Turnir elanları və iştirak şərtləri.'} />
    <TournamentCalendar tournaments={tournaments} />
    {tournaments.length > 0 && <><SectionHeading title="Yarış xətti" description="Yaxın və tamamlanmış turnirlərin kompakt cədvəli." />
    <div className="tournament-list">{tournaments.map((tournament) => {
      const remaining = Math.max(0, tournament.maxSlots - tournament.usedSlots);
      const eventDate = new Date(tournament.startsAt);
      const parts = datePartsInTimeZone(eventDate);
      const phase = resolveTournamentTemporalPhase(tournament, competitionNow());
      return <article key={tournament.id} className="tournament-row"><div className="tournament-row__date"><strong>{parts.day}</strong><span>{eventDate.toLocaleDateString('az-AZ', { month: 'short', year: 'numeric', timeZone: AEVIC_EVENT_TIMEZONE })}</span></div><div className="tournament-row__main"><div>{phase === 'registration-open' ? <StatusBadge status="open" /> : phase === 'completed' ? <StatusBadge status="completed" /> : phase === 'live' ? <StatusBadge status="live" /> : <StatusBadge status="draft">Planlaşdırılıb</StatusBadge>}<span>{tournament.days} gün · {tournament.roundsPerDay * tournament.days} raund</span></div><h2>{tournament.name}</h2></div><div className="tournament-row__meta"><span>Başlanğıc<strong>{`${formatEventTime(tournament.startsAt)} AZT`}</strong></span><span>Slot<strong>{remaining} / {tournament.maxSlots}</strong></span><Link to={`/tournaments/${tournament.id}`} aria-label={`${tournament.name} detallarını aç`}><ArrowRight size={19} /></Link></div></article>;
    })}</div></>}
  </div></section>;
}

export function TournamentDetailPage() {
  const { tournaments, leaderboardTeams, teams } = usePublicPlatformData();
  const { tournamentId } = useParams();
  const tournament = tournamentById(tournaments, tournamentId);
  const participantsQuery = usePlatformQuery({ key: `tournament:${tournamentId}:participants`, query: () => services.tournaments.publicParticipants(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const matchesQuery = usePlatformQuery({ key: `tournament:${tournamentId}:matches`, query: async () => {
    const [schedule, history] = await Promise.all([services.publicMatches.schedule(), services.publicMatches.history()]);
    return { schedule: schedule.filter((match) => match.tournamentId === tournamentId), history: history.filter((match) => match.tournamentId === tournamentId) };
  }, staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  const resultsQuery = usePlatformQuery({ key: `tournament:${tournamentId}:standings`, query: () => services.results.leaderboard(tournamentId ?? ''), staleTime: queryPolicy.publicCompetition, enabled: Boolean(tournament), retry: 0 });
  if (!tournament) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Turnir tapılmadı" body="Bu turnir mövcud deyil və başqa yarışla əvəz edilmədi." action={<Link className="button button--secondary" to="/tournaments"><span>Turnir təqviminə qayıt</span></Link>} /></div></section>;
  const remaining = Math.max(0, tournament.maxSlots - tournament.usedSlots);
  const tournamentPhase = resolveTournamentTemporalPhase(tournament, competitionNow());
  const tournamentMatches = [...(matchesQuery.data?.schedule ?? []), ...(matchesQuery.data?.history ?? [])].sort((left, right) => new Date('playedAt' in left ? left.playedAt : left.startsAt).getTime() - new Date('playedAt' in right ? right.playedAt : right.startsAt).getTime());
  const roundProgram = tournamentMatches.map((match, index) => ({ id: match.id, map: match.map, round: 'round' in match ? match.round : index + 1, startsAt: 'playedAt' in match ? match.playedAt : match.startsAt, status: 'playedAt' in match ? 'completed' as const : match.status, stageLabel: 'stageLabel' in match ? match.stageLabel : `${match.stage === 'final' ? 'Final' : 'Qrup mərhələsi'} · Raund ${match.round}` }));
  const placementSequence = Array.from({ length: tournament.maxSlots }, (_, index) => ({ placement: index + 1, points: tournament.pointFormula.placement.find((item) => item.placement === index + 1)?.points ?? 0 }));
  const calendarEvent = { id: `tournament-${tournament.id}`, title: tournament.name, description: `${tournament.shortName} · ${tournament.days} gün · ${tournament.roundsPerDay * tournament.days} raund`, startsAt: tournament.startsAt, endsAt: tournament.endsAt, timezone: 'Asia/Baku', location: 'AEVIC Esports', publicUrl: new URL(`/tournaments/${tournament.id}`, window.location.origin).toString() };
  return <article className="tournament-destination">
    <section className="tournament-detail-hero" data-reveal data-reveal-variant="fade">
      <MediaBackdrop src={officialAssets.maps[0]} srcSet={officialAssets.mapSrcSets[0]} sizes="100vw" className="tournament-detail-hero__media" width={1600} height={900} focalDesktop="57% 48%" focalMobile="60% 48%" priority />
      <div className="container tournament-detail-hero__stage">
        <Breadcrumbs items={[{ label: 'Turnirlər', to: '/tournaments' }, { label: tournament.shortName }]} />
        <div className="tournament-detail-hero__identity">
          <div className="tournament-detail-hero__copy"><div><StatusBadge status={tournamentPhase === 'registration-open' ? 'open' : tournamentPhase === 'live' ? 'live' : tournamentPhase === 'completed' ? 'completed' : 'draft'} />{demoMode && <span className="demo-label">NÜMUNƏ MƏLUMAT</span>}</div><span>AEVIC RƏSMİ YARIŞ XƏTTİ</span><h1>{tournament.name}</h1><p>{tournament.description}</p></div>
          <dl className="tournament-hero-ledger"><div><dt>Turnir ID</dt><dd>{tournament.id}</dd></div><div><dt>Yarış həcmi</dt><dd>{tournament.maxSlots} komanda</dd></div><div><dt>Proqram</dt><dd>{tournament.days * tournament.roundsPerDay} raund · {tournament.days} gün</dd></div></dl>
        </div>
        <div className="tournament-detail-hero__actions">{tournamentPhase !== 'completed' && <TournamentJoinAction tournament={tournament} />}{tournamentPhase === 'completed' && <Link className="button button--primary" to={`/tournaments/${tournament.id}/recap`}><span>Final icmalı</span></Link>}<CalendarAction event={calendarEvent} /></div>
        <div className="tournament-context-wrap"><EntityContextNav label={`${tournament.shortName} bölmələri`} back={{ label: 'Turnirlər', to: '/tournaments' }} items={[{ label: 'İcmal', href: '#overview', current: true }, { label: 'Komandalar', href: '#participants' }, { label: 'Nəticələr', href: '#results' }, { label: 'Matçlar', href: '#matches' }, { label: 'Xal sistemi', href: '#scoring' }, { label: 'Qaydalar', href: '#rules' }]} action={tournamentPhase === 'completed' ? <Link to={`/tournaments/${tournament.id}/recap`}>Final icmalı <ArrowRight size={16} /></Link> : undefined} /></div>
      </div>
    </section>

    <section id="overview" className="page-section tournament-destination__body">
      <div className="container">
        <div className="tournament-format-block">
          <div><SectionHeading title="Yarış formatı" description="Tarix, check-in və rəqabət strukturu bir baxışda." /><div className="format-ledger"><div><CalendarDays size={19} /><span>Tarix<strong>{formatDate(tournament.startsAt)} — {formatDate(tournament.endsAt)}</strong></span></div><div><Clock3 size={19} /><span>Check-in<strong>{formatDate(tournament.checkInOpensAt, true)}</strong></span></div><div><Crown size={19} /><span>Prestij<strong>AEVIC reytinq turniri</strong></span></div><div><Users size={19} /><span>Komanda limiti<strong>{tournament.maxSlots} komanda</strong></span></div></div></div>
          <aside><span>QEYDİYYAT PƏNCƏRƏSİ</span><Countdown target={tournament.registrationDeadline} /><ProgressBar value={tournament.usedSlots} max={tournament.maxSlots} label="Dolu slotlar" /><strong>{remaining ? `${remaining} boş slot` : 'Bütün slotlar doludur'}</strong></aside>
        </div>
        {matchesQuery.loading ? <section id="matches"><LoadingSkeleton rows={3} /></section> : matchesQuery.error ? <section id="matches"><EmptyState title="Raund proqramı yüklənmədi" body="Matç servisi hazırda cavab vermir. Matç mərkəzindən yenidən yoxlayın." /></section> : roundProgram.length ? <CompetitionRoundProgram rounds={roundProgram} tournamentId={tournament.id} /> : <section id="matches"><EmptyState title="Raund cədvəli təsdiq gözləyir" body="Bu turnirin xəritə və başlama vaxtları hələ dərc edilməyib. İştirak şərtlərini indidən nəzərdən keçirin." action={<Link className="text-link" to="/regulations">Yarış qaydaları</Link>} /></section>}

        {participantsQuery.loading ? <section id="participants" className="tournament-data-state"><LoadingSkeleton rows={4} /></section> : participantsQuery.error ? <section id="participants"><EmptyState title="İştirakçılar yüklənmədi" body="Təsdiqlənmiş iştirakçı servisi cavab vermir. Public kataloq iştirak kimi əvəz edilmir." /></section> : <TournamentParticipantField participants={participantsQuery.data ?? []} />}

        {resultsQuery.loading ? <section id="results"><LoadingSkeleton rows={5} /></section> : resultsQuery.error ? <section id="results"><EmptyState title="Nəticələr yüklənmədi" body="Rəsmi standings servisi hazırda cavab vermir. Qismən raund məlumatından sıralama yaradılmır." /></section> : <TournamentResults standings={resultsQuery.data ?? []} teamNames={leaderboardTeams} teams={teams} publishedRoundCount={matchesQuery.data?.history.length ?? 0} tournamentName={tournament.name} tournamentId={tournament.id} publishedAt={tournament.resultsPublishedAt} />}

        <section id="scoring" className="tournament-scoring"><div className="tournament-scoring__intro"><SectionHeading title="Xal formulu" description={`WWCD bonusu +${tournament.pointFormula.wwcdBonus} · hər kill +${tournament.pointFormula.finishPointValue}`} /><p>Yer xalları bir davamlı ardıcıllıqda #1-dən turnirin {tournament.maxSlots}-ci yerinə qədər göstərilir.</p><dl><div><dt>WWCD</dt><dd>+{tournament.pointFormula.wwcdBonus}</dd></div><div><dt>Kill</dt><dd>+{tournament.pointFormula.finishPointValue}</dd></div></dl></div><ol className="tournament-scoring__sequence" aria-label={`#1-dən #${tournament.maxSlots}-ə qədər yer xalları`}>{placementSequence.map((item) => <li key={item.placement}><span>#{item.placement}</span><strong>{item.points}</strong><small>xal</small></li>)}</ol><div className="tournament-scoring__tiebreak"><span>TIE-BREAK ARDICILLIĞI</span><ol>{tournament.pointFormula.tieBreakRules.map((rule) => <li key={rule}>{rule}</li>)}</ol></div></section>
        <section id="rules" className="tournament-rules"><SectionHeading title="Əsas qaydalar" description="Qoşulma zamanı uyğunluq server tərəfindən yenidən təsdiqlənir." /><ol className="regulation-list">{tournament.rules.slice(0, 3).map((rule, index) => <li key={rule}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></li>)}</ol>{tournament.rules.length > 3 && <details><summary>Tam qaydaları göstər</summary><ol className="regulation-list">{tournament.rules.slice(3).map((rule, index) => <li key={rule}><span>{String(index + 4).padStart(2, '0')}</span><p>{rule}</p></li>)}</ol></details>}</section>
      </div>
    </section>
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
