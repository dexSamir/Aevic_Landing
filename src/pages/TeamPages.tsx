import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileClock,
  History,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { lazy, Suspense, type FormEvent, type KeyboardEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TeamComparison } from '../components/team/TeamExperience';
import { buildCompetitionAwareness } from '../components/team/CompetitionAwareness';
import { deriveNextAction } from '../components/team/NextActionCard';
import {
  Button,
  ConfirmDialog,
  CopyButton,
  Countdown,
  DataTable,
  EmptyState,
  Input,
  MobileDataList,
  Modal,
  NotificationItem,
  PageHeader,
  SectionHeading,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  TeamLogo,
  Textarea,
  Toast,
} from '../components/common/primitives';
import { services } from '../services';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../services/PlatformDataContext';
import { TeamBannerUploader } from '../components/profile/ProfileElements';
import { deriveTournamentResultBreakdown } from '../utils/resultBreakdown';
import { publicTeamUrl } from '../utils/publicUrl';
import type { RoomCredentials, TeamProfileCardData } from '../types/domain';

const LazyProfileCardGenerator = lazy(async () => ({ default: (await import('../components/profile/ProfileCardGenerator')).ProfileCardGenerator }));
const LazySharecardGenerator = lazy(async () => ({ default: (await import('../components/competition/SharecardGenerator')).SharecardGenerator }));

export function TeamDashboardPage() {
  const { adminMessages, currentTeam, leaderboard, publicTeams, notifications, teamAnnouncements } = useTeamPlatformData();
  const competitionContexts = useTeamCompetitionContexts();
  const context = competitionContexts.current;
  const [checkedInTournament, setCheckedInTournament] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const awarenessEvents = buildCompetitionAwareness({ notifications, adminMessages, announcements: teamAnnouncements });
  if (!context) return <><header className="team-ops-header"><div><span>KAPİTAN XƏTTİ</span><h1>{currentTeam.name}</h1><p>Aktiv yarış görünmür. Növbəti dərc edilmiş iştirak burada əməliyyat xəttinə çevriləcək.</p></div></header><EmptyState title="Aktiv turnir yoxdur" body="Yeni iştirak təsdiqləndikdə check-in, matç və otaq əməliyyatları burada görünəcək." action={<Link className="button button--secondary" to="/tournaments"><span>Turnir təqviminə bax</span></Link>} /></>;
  const { tournament: activeTournament, participation, matches: tournamentMatches, nextMatch, room } = context;
  const currentCheckIn = context.checkIn ? { ...context.checkIn, status: checkedInTournament === activeTournament.id ? 'checked-in' as const : context.checkIn.status } : undefined;
  const nextAction = deriveNextAction({ team: currentTeam, tournament: activeTournament, nextMatch, announcement: teamAnnouncements[0], checkIn: currentCheckIn, room });
  const checkInLabel = currentCheckIn?.status === 'checked-in' ? 'Tamamlanıb' : currentCheckIn?.status === 'open' ? `${new Date(currentCheckIn.closesAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}-dək açıq` : currentCheckIn ? 'Gözlənilir' : 'Məlumat yoxdur';
  const roomLabel = room?.status === 'released' ? 'Məlumatlar hazırdır' : room?.status === 'locked' ? `${new Date(room.releaseAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}-də açılır` : 'Məlumat yoxdur';
  const identityMeta = [
    new Date(activeTournament.startsAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' }),
    participation.groupLabel,
    participation.slotNumber ? `Slot #${String(participation.slotNumber).padStart(2, '0')}` : undefined,
  ].filter(Boolean).join(' · ');
  const latestChange = awarenessEvents[0];
  const recentResult = context.history[0];
  const orderedStandings = leaderboard
    .map((row) => ({ ...row, teamName: publicTeams?.find((team) => team.id === row.teamId)?.name ?? (row.teamId === currentTeam.id ? currentTeam.name : 'Komanda adı yoxdur') }))
    .filter((row) => row.tournamentId === activeTournament.id)
    .sort((left, right) => left.placement - right.placement);
  const currentStandingIndex = orderedStandings.findIndex((row) => row.teamId === currentTeam.id);
  const standingsStart = Math.max(0, Math.min(currentStandingIndex - 2, Math.max(0, orderedStandings.length - 5)));
  const standingsPreview = currentStandingIndex >= 0 ? orderedStandings.slice(standingsStart, standingsStart + 5) : [];
  const currentStanding = currentStandingIndex >= 0 ? orderedStandings[currentStandingIndex] : undefined;
  const roomHref = `/team/tournaments/${activeTournament.id}#room`;
  const actionControl = nextAction.kind === 'check-in'
    ? <Button onClick={() => setConfirmOpen(true)} icon={<CheckCircle2 size={17} />}>{nextAction.actionLabel}</Button>
    : nextAction.href && nextAction.actionLabel ? <Link className="button button--primary" to={nextAction.href}><span>{nextAction.actionLabel}</span><ArrowRight size={17} /></Link> : null;
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const statSlides = [
    { key: 'room', href: room?.status === 'released' ? roomHref : `/team/tournaments/${activeTournament.id}`, icon: <KeyRound size={22} aria-hidden="true" />, eyebrow: 'Otaq', value: room?.status === 'released' ? 'Hazırdır' : room?.status === 'locked' ? 'Bağlıdır' : 'Gözlənilir', meta: roomLabel, tone: room?.status === 'released' ? 'gold' : 'ink' },
    { key: 'match', href: `/team/tournaments/${activeTournament.id}`, icon: <Swords size={22} aria-hidden="true" />, eyebrow: 'Növbəti matç', value: nextMatch ? nextMatch.map : 'Plan yoxdur', meta: nextMatch ? `R${nextMatch.round} · ${new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : '—', tone: 'purple' },
    { key: 'standing', href: `/tournaments/${activeTournament.id}#results`, icon: <Trophy size={22} aria-hidden="true" />, eyebrow: 'Cari sıra', value: currentStanding ? `#${currentStanding.placement}` : '—', meta: currentStanding ? `${currentStanding.totalPoints} xal` : 'Nəticə yoxdur', tone: 'ink' },
    { key: 'roster', href: '/team/roster', icon: <Users size={22} aria-hidden="true" />, eyebrow: 'Heyət', value: String(currentTeam.roster.length), meta: 'oyunçu qeydiyyatda', tone: 'ink' },
    { key: 'inbox', href: '/team/notifications', icon: <Bell size={22} aria-hidden="true" />, eyebrow: 'Bildirişlər', value: String(unreadCount), meta: unreadCount ? 'oxunmamış' : 'hamısı oxunub', tone: unreadCount ? 'gold' : 'ink' },
  ] as const;
  return <>{toast && <Toast title="Check-in tamamlandı" body={`Komandanız ${activeTournament.name} üçün hazır kimi qeyd edildi.`} onClose={() => setToast(false)} />}
    <div className="team-ops-overview">
      <header className="team-ops-header"><div><span>KAPİTAN XƏTTİ</span><h1>{currentTeam.name}</h1><p>{activeTournament.name} üçün cari əməliyyat vəziyyəti.</p></div><Link to={`/team/tournaments/${activeTournament.id}`}><span>AKTİV TURNİR</span><strong>{activeTournament.shortName || activeTournament.name}</strong><ArrowRight size={16} /></Link></header>
      <ul className="team-stat-slider" aria-label="Ən vacib komanda göstəriciləri">{statSlides.map((slide) => <li key={slide.key}><Link to={slide.href} className={`team-stat-slider__card team-stat-slider__card--${slide.tone}`}>{slide.icon}<span className="team-stat-slider__eyebrow">{slide.eyebrow}</span><strong>{slide.value}</strong><small>{slide.meta}</small></Link></li>)}</ul>
      <section className={`team-now team-now--${nextAction.kind}`} aria-labelledby="team-now-title">
        <div className="team-now__action"><span>{nextAction.eyebrow}</span><h2 id="team-now-title">{nextAction.title}</h2><p>{nextAction.body}</p>{nextAction.startsAt && <time dateTime={nextAction.startsAt}>{new Date(nextAction.startsAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>}{actionControl}</div>
        <dl className="team-now__quickline">
          <div><dt>SONRA</dt><dd>{nextMatch ? <><strong>{nextMatch.map} · R{nextMatch.round}</strong><time dateTime={nextMatch.startsAt}>{new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time></> : <strong>Plan yoxdur</strong>}</dd></div>
          <div><dt>DƏYİŞƏN</dt><dd>{latestChange ? <><strong>{latestChange.title}</strong><time dateTime={latestChange.occurredAt}>{new Date(latestChange.occurredAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></> : <strong>Yeni dəyişiklik yoxdur</strong>}</dd></div>
        </dl>
      </section>

      <section className="team-competition-anchor" aria-labelledby="team-competition-anchor-title"><header><div><span>AKTİV YARIŞ</span><h2 id="team-competition-anchor-title">{activeTournament.name}</h2><p>{identityMeta}</p></div><StatusBadge status={participation.status === 'confirmed' ? 'approved' : 'warning'}>{participation.status === 'confirmed' ? 'İştirak təsdiqlənib' : 'Yoxlanılır'}</StatusBadge></header><dl><div><dt>Check-in</dt><dd>{checkInLabel}</dd></div><div><dt>Otaq</dt><dd>{roomLabel}</dd></div><div><dt>Növbəti raund</dt><dd>{nextMatch ? `${nextMatch.map} · R${nextMatch.round} · ${new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : 'Plan yoxdur'}</dd></div></dl><Link to={`/team/tournaments/${activeTournament.id}`}>Tam əməliyyat xəttini aç <ArrowRight size={16} /></Link></section>

      <div className="team-ops-columns">
        <section className="team-run-sheet" aria-labelledby="team-run-sheet-title"><header><div><span>NÖVBƏTİ</span><h2 id="team-run-sheet-title">Raund proqramı</h2></div><small>Bakı vaxtı</small></header><ol>{tournamentMatches.slice(0, 4).map((match) => <li key={match.id} className={match.id === nextMatch?.id ? 'is-next' : undefined}><span>R{String(match.round).padStart(2, '0')}</span><div><strong>{match.map}</strong><small>{match.lobby} · {match.stage === 'final' ? 'Final' : 'Qrup mərhələsi'}</small></div><time dateTime={match.startsAt}>{new Date(match.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time></li>)}</ol></section>
        <section className="team-change-ledger" aria-labelledby="team-change-ledger-title"><header><div><span>DƏYİŞƏN</span><h2 id="team-change-ledger-title">Son yeniliklər</h2></div><Link to="/team/notifications">Hamısı <ArrowRight size={15} /></Link></header>{awarenessEvents.length ? <ol>{awarenessEvents.slice(0, 3).map((event) => <li key={event.id} data-priority={event.priority}><div><span>{event.priority === 'critical' ? 'TƏCİLİ' : event.priority === 'important' ? 'VACİB' : 'MƏLUMAT'}</span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}</time></div><strong>{event.title}</strong>{event.actionTarget && <Link to={event.actionTarget} aria-label={`${event.title}: aç`}><ArrowRight size={16} /></Link>}</li>)}</ol> : <p>Yeni əməliyyat dəyişikliyi yoxdur.</p>}</section>
      </div>

      <div className="team-overview-intelligence">
        <section className="team-standing-preview" aria-labelledby="team-standing-preview-title"><header><div><span>CARİ SIRA</span><h2 id="team-standing-preview-title">Turnir cədvəli</h2></div>{currentStanding && <p><strong>#{currentStanding.placement}</strong> · {currentStanding.totalPoints} xal</p>}</header>{standingsPreview.length ? <div className="team-standing-preview__table" role="table" aria-label={`${activeTournament.name} cari komanda ətrafında beş sətirlik nəticə`}><div role="row" className="team-standing-preview__head"><span role="columnheader">Yer</span><span role="columnheader">Komanda</span><span role="columnheader">Kill</span><span role="columnheader">Xal</span></div>{standingsPreview.map((row) => <div role="row" className={row.teamName === currentTeam.name || row.teamId === currentTeam.id ? 'is-current' : undefined} key={`${row.teamId}-${row.placement}`}><span role="cell">#{row.placement}</span><strong role="cell">{row.teamName}</strong><span role="cell">{row.finishes}</span><b role="cell">{row.totalPoints}</b></div>)}</div> : <p className="team-standing-preview__empty">Komandanız üçün dərc edilmiş cari sıralama yoxdur.</p>}<Link to={`/tournaments/${activeTournament.id}#results`}>Tam rəsmi nəticələr <ArrowRight size={16} /></Link></section>
        <section className={`team-room-status ${room?.status === 'released' ? 'is-ready' : ''}`} aria-labelledby="team-room-status-title"><header><span><KeyRound size={18} aria-hidden="true" /> OTAQ STATUSU</span><StatusBadge status={room?.status === 'released' ? 'released' : room?.status === 'locked' ? 'locked' : 'warning'}>{room?.status === 'released' ? 'Hazırdır' : room?.status === 'locked' ? 'Bağlıdır' : 'Gözlənilir'}</StatusBadge></header><h2 id="team-room-status-title">{room?.status === 'released' ? 'Otaq məlumatları yayımlandı' : room?.status === 'locked' ? 'Otaq məlumatları hələ bağlıdır' : 'Buraxılış vaxtı paylaşılmayıb'}</h2><p>{room?.status === 'released' ? 'ID və şifrə yalnız uyğun komanda hesabında, turnirin otaq panelində görünür.' : room?.releaseAt ? `${new Date(room.releaseAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}-də uyğun komanda üçün açılacaq.` : 'Turnir admini otaq buraxılışını dərc etdikdə burada görünəcək.'}</p>{room?.status === 'released' ? <Link className="button button--secondary" to={roomHref}><span>Otaq məlumatlarını aç</span><ArrowRight size={16} /></Link> : <Link to={`/team/tournaments/${activeTournament.id}`}>Turnir əməliyyatlarına bax <ArrowRight size={16} /></Link>}</section>
      </div>

      <section className="team-readiness-ledger" aria-labelledby="team-readiness-ledger-title"><header><div><span>HAZIRLIQ</span><h2 id="team-readiness-ledger-title">Start xətti</h2>{recentResult && <p>Son nəticə · {recentResult.map} · <strong>{recentResult.points} xal</strong></p>}</div><nav aria-label="Komanda əməliyyat keçidləri"><Link to="/team/roster">Heyəti idarə et <ArrowRight size={15} aria-hidden="true" /></Link><Link to="/team/history">Nəticə tarixçəsi <ArrowRight size={15} aria-hidden="true" /></Link><Link to="/team/messages">Kapitan mesajları <ArrowRight size={15} aria-hidden="true" /></Link></nav></header><ul><li data-state={participation.status === 'confirmed' ? 'ready' : 'pending'}><ShieldCheck size={18} aria-hidden="true" /><span>İştirak</span><strong>{participation.status === 'confirmed' ? 'Təsdiqlənib' : 'Yoxlanılır'}</strong></li><li data-state={currentTeam.roster.length >= 4 ? 'ready' : 'pending'}><Users size={18} aria-hidden="true" /><span>Turnir heyəti</span><strong>{currentTeam.roster.length} oyunçu</strong></li><li data-state={currentCheckIn?.status === 'checked-in' ? 'ready' : 'pending'}><CheckCircle2 size={18} aria-hidden="true" /><span>Check-in</span><strong>{checkInLabel}</strong></li><li data-state={room?.status === 'released' ? 'ready' : 'pending'}><KeyRound size={18} aria-hidden="true" /><span>Otaq</span><strong>{roomLabel}</strong></li><li className="is-next"><Swords size={18} aria-hidden="true" /><span>Növbəti əməliyyat</span><strong>{nextAction.title}</strong></li></ul></section>
    </div>
    <ConfirmDialog open={confirmOpen} title="Check-in-i təsdiqlə" body={`${currentTeam.name} komandasının ${activeTournament.name} üçün iştirak etməyə hazır olduğunu təsdiqləyirsiniz. Bu status admin panelində dərhal görünəcək.`} confirmLabel="Bəli, hazırıq" tone="primary" onClose={() => setConfirmOpen(false)} onConfirm={async () => { await services.teams.checkIn(activeTournament.id); setCheckedInTournament(activeTournament.id); setConfirmOpen(false); setToast(true); }} />
  </>;
}

export function TeamTournamentsPage() {
  const { current, all } = useTeamCompetitionContexts();
  if (!all.length) return <><PageHeader eyebrow="Yarış qeydiyyatları" title="Turnirlərim" description="Komandanın aktiv və tamamlanmış turnirləri." /><EmptyState title="Turnir qeydiyyatı yoxdur" body="Komanda bir turnirə qoşulduqda əməliyyat xətti burada görünəcək." action={<Link className="button button--secondary" to="/tournaments"><span>Turnirləri kəşf et</span></Link>} /></>;
  const completed = all.filter((context) => context.lifecycle === 'completed');
  return <><PageHeader eyebrow="Yarış iştirakları" title="Turnirlərim" description="Cari qeydiyyat, slot, check-in və arxiv bir yarış xəttində." /><div className="team-tournament-list">{current && <article className="team-tournament-active"><div><StatusBadge status={current.participation.status === 'confirmed' ? 'approved' : 'warning'}>{current.participation.status === 'confirmed' ? 'İştirak təsdiqlənib' : 'İştirak yoxlanılır'}</StatusBadge><span>Cari yarış</span></div><h2>{current.tournament.name}</h2><div className="entry-facts"><span>Slot<strong>{current.participation.slotNumber ? `#${String(current.participation.slotNumber).padStart(2, '0')}` : 'Məlumat yoxdur'}</strong></span><span>Check-in<strong>{current.checkIn ? new Date(current.checkIn.opensAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Məlumat yoxdur'}</strong></span><span>İlk matç<strong>{current.firstMatch ? `${current.firstMatch.map} · ${new Date(current.firstMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : 'Plan yoxdur'}</strong></span><span>Otaq<strong>{current.room?.status === 'released' ? 'Hazırdır' : current.room?.status === 'locked' ? 'Bağlıdır' : 'Məlumat yoxdur'}</strong></span></div><Link className="button button--primary" to={`/team/tournaments/${current.tournament.id}`}><span>Turnir əməliyyatlarını aç</span><ArrowRight size={17} /></Link></article>}{completed.map((context) => { const points = context.history.reduce((total, match) => total + match.points, 0); const wwcd = context.history.filter((match) => match.wwcd).length; return <article className="team-tournament-history" key={context.tournament.id}><span>Tamamlanıb · {new Date(context.tournament.endsAt).getFullYear()}</span><h2>{context.tournament.name}</h2><div><strong>{context.participation.resultPlacement ? `#${String(context.participation.resultPlacement).padStart(2, '0')}` : '—'}</strong><span>Yekun yer</span><strong>{context.history.length ? points : '—'}</strong><span>Dərc edilmiş xal</span><strong>{context.history.length ? wwcd : '—'}</strong><span>WWCD</span></div><Link to="/team/history">Raund tarixçəsi <ArrowRight size={16} /></Link></article>; })}</div></>;
}

export function TeamTournamentDetailPage() {
  const { currentTeam } = useTeamPlatformData();
  const { byTournamentId } = useTeamCompetitionContexts();
  const { tournamentId } = useParams();
  const context = tournamentId ? byTournamentId.get(tournamentId) : undefined;
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [room, setRoom] = useState<RoomCredentials>();
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRoom(undefined); setRevealed(false); setRoomError(''); }, [tournamentId]);
  useEffect(() => {
    if (window.location.hash !== '#room') return;
    const frame = window.requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>('.tournament-operations-console .credential-panel');
      panel?.setAttribute('id', 'room');
      panel?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tournamentId]);
  const loadRoom = async () => { if (!context?.room?.roundId && !context?.firstMatch?.id) { setRoomError('Otaq raundu haqqında məlumat yoxdur.'); return; } setRoomLoading(true); setRoomError(''); try { setRoom(await services.rooms.getForEligibleTeam(context.tournament.id, context.room?.roundId ?? context.firstMatch!.id)); } catch { setRoomError('Otaq məlumatı açılmadı. Uyğunluğu və açılma vaxtını yoxlayın.'); } finally { setRoomLoading(false); } };
  if (!context) return <><PageHeader eyebrow="Turnir əməliyyatları" title="Turnir tapılmadı" /><EmptyState title="Etibarsız turnir seçimi" body="Komandanın bu turnirdə iştirak qeydi yoxdur." action={<Link className="button button--secondary" to="/team/tournaments"><span>Turnirlərimə qayıt</span></Link>} /></>;
  const { tournament: activeTournament, participation, matches: tournamentMatches } = context;
  const roomAvailability = room ?? context.room;
  const roomReleaseAt = roomAvailability?.releaseAt;
  const roomMatch = tournamentMatches.find((match) => match.id === roomAvailability?.roundId) ?? context.firstMatch;
  const participationMeta = [participation.groupLabel, participation.slotNumber ? `Slot #${String(participation.slotNumber).padStart(2, '0')}` : undefined, `${tournamentMatches.length} raund`].filter(Boolean).join(' · ');
  const uniqueMaps = [...new Set(tournamentMatches.map((match) => match.map))];
  return <><PageHeader eyebrow="Turnir əməliyyatları" title={activeTournament.name} description="Bu günün iştirak, vaxt və otaq xətti." actions={<><Link className="button button--secondary" to={`/tournaments/${activeTournament.id}`}><span>Public turnir</span></Link>{tournamentMatches[0] && <Link className="button button--secondary" to={`/tournaments/${activeTournament.id}#matches`} state={{ roundId: tournamentMatches[0].id }}><span>İlk raund</span><ArrowRight size={16} /></Link>}</>} />
    <section className="tournament-operation-identity" aria-label="Turnir iştirak məlumatı"><div><span>İŞTİRAK</span><h2>{withdrawn ? 'İştirak dayandırılıb' : participation.status === 'confirmed' ? 'Komandanız təsdiqlənib' : 'İştirak yoxlanılır'}</h2><p>{participationMeta}</p></div><StatusBadge status={withdrawn ? 'rejected' : participation.status === 'confirmed' ? 'approved' : 'warning'}>{withdrawn ? 'Geri çəkilib' : participation.status === 'confirmed' ? 'Qeydiyyat tamamdır' : 'Yoxlanılır'}</StatusBadge><dl><div><dt>Check-in</dt><dd>{context.checkIn ? `${new Date(context.checkIn.opensAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })} — ${new Date(context.checkIn.closesAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}` : 'Məlumat yoxdur'}</dd></div><div><dt>İlk xəritə</dt><dd>{context.firstMatch?.map ?? 'Məlumat yoxdur'}</dd></div></dl></section>
    <section className="operational-timeline" aria-labelledby="operational-timeline-title"><header><span>YARIŞ PROQRAMI</span><h2 id="operational-timeline-title">Əməliyyat vaxt xətti</h2><small>Vaxtlar Bakı vaxtı ilə</small></header><ol>{context.checkIn && <li className={context.checkIn.status === 'checked-in' ? 'is-complete' : ''}><span><Check size={16} /></span><time dateTime={context.checkIn.opensAt}>{new Date(context.checkIn.opensAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>Check-in</strong><small>Komanda hazırlığının təsdiqi</small></div></li>}{roomReleaseAt && <li><span><KeyRound size={16} /></span><time dateTime={roomReleaseAt}>{new Date(roomReleaseAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>Otaq məlumatları</strong><small>Uyğun komandalar üçün açılır</small></div></li>}{tournamentMatches.map((match) => <li key={match.id}><span>R{match.round}</span><time dateTime={match.startsAt}>{new Date(match.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</time><div><strong>{match.map}</strong><small>{match.lobby} · {match.stage === 'final' ? 'Final' : 'Qrup mərhələsi'}</small></div><StatusBadge status={match.status === 'live' ? 'open' : match.status === 'completed' ? 'approved' : 'warning'}>{match.status === 'live' ? 'Canlı' : match.status === 'completed' ? 'Bitib' : 'Planlanıb'}</StatusBadge></li>)}</ol></section>
    <div className="tournament-operations-console"><section className={`credential-panel ${roomAvailability?.status === 'released' ? 'credential-panel--released' : ''}`}><div className="credential-panel__lock"><KeyRound size={24} /><StatusBadge status={roomAvailability?.status === 'released' ? 'released' : 'locked'}>{roomAvailability?.status === 'released' ? 'Otaq hazırdır' : roomAvailability ? 'Bağlıdır' : 'Məlumat yoxdur'}</StatusBadge></div><div><span className="credential-panel__eyebrow">OTAQ GİRİŞİ</span><h2>{roomAvailability?.status === 'released' ? `Raund ${String(roomMatch?.round ?? '').padStart(2, '0')} məlumatları` : roomReleaseAt ? `${new Date(roomReleaseAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}-də açılacaq` : 'Otaq vaxtı paylaşılmayıb'}</h2><p>Yalnız bu turnir üçün uyğun komanda hesabında görünür.</p></div>{roomError && <p className="field__error" role="alert">{roomError}</p>}{roomAvailability && !room && <Button loading={roomLoading} onClick={() => void loadRoom()}>Otaq statusunu yoxla</Button>}{roomAvailability?.status === 'locked' && <div className="credential-panel__release"><span>Açılmağa qalan vaxt</span><Countdown target={roomAvailability.releaseAt} compact /></div>}{room?.status === 'released' && <><div className="credential-placeholder"><span>Otaq ID-si<strong>{room.roomId ?? 'Məlumat yoxdur'}</strong></span>{room.roomId && <CopyButton value={room.roomId} />}</div><div className="credential-placeholder"><span>Şifrə<strong>{room.password ? revealed ? room.password : '••••••••' : 'Məlumat yoxdur'}</strong></span>{room.password && <div><Button variant="ghost" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Gizlət' : 'Göstər'}</Button><CopyButton value={room.password} /></div>}</div><small>Bu məlumatları yalnız komanda heyəti ilə paylaşın.</small></>}</section><section className="tournament-briefing"><SectionHeading title="Kapitan qeydləri" /><div><CheckCircle2 size={18} /><span><strong>Heyət vəziyyəti</strong><small>{currentTeam.roster.length} oyunçu qeydiyyatdadır</small></span></div><div><Clock3 size={18} /><span><strong>İlk raund</strong><small>{context.firstMatch ? new Date(context.firstMatch.startsAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Məlumat yoxdur'}</small></span></div><div><Swords size={18} /><span><strong>{tournamentMatches.length} raund · {uniqueMaps.length} xəritə</strong><small>{uniqueMaps.length ? uniqueMaps.join(', ') : 'Raund proqramı yoxdur'}</small></span></div></section></div>
    <section className="danger-zone"><AlertTriangle size={21} /><div><h2>Turnirdən geri çəkilmək</h2><p>İştirak dayandırılır və komanda bu turnirin matçlarına daxil ola bilmir.</p></div><Button variant="danger" disabled={withdrawn} onClick={() => setWithdrawOpen(true)}>{withdrawn ? 'Geri çəkilib' : 'Turnirdən çıx'}</Button></section><ConfirmDialog open={withdrawOpen} title="Turnirdən geri çəkilirsiniz?" body={`${currentTeam.name} komandası ${activeTournament.name} turnirindəki ${participation.slotNumber ? `#${String(participation.slotNumber).padStart(2, '0')} slotunu` : 'iştirakını'} dayandıracaq. Bu əməliyyat admin panelində görünəcək və avtomatik geri qaytarılmaya bilər.`} confirmLabel="Bəli, geri çəkil" onClose={() => setWithdrawOpen(false)} onConfirm={async () => { await services.teams.withdraw(activeTournament.id, 'Captain requested'); setWithdrawn(true); setWithdrawOpen(false); }} /></>;
}

export function TeamHistoryPage() {
  const { matchHistory } = useTeamPlatformData();
  const { all } = useTeamCompetitionContexts();
  const [mapFilter, setMapFilter] = useState('all');
  const published = [...matchHistory].sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime());
  const rounds = published.filter((round) => mapFilter === 'all' || round.map.toLowerCase() === mapFilter);
  const latestTournamentId = published[0]?.tournamentId;
  const latestContext = latestTournamentId ? all.find((context) => context.tournament.id === latestTournamentId) : undefined;
  const latestRounds = latestTournamentId ? published.filter((round) => round.tournamentId === latestTournamentId) : [];
  const bestPlacement = published.length ? Math.min(...published.map((round) => round.placement)) : undefined;
  const wwcd = published.filter((round) => round.wwcd).length;
  const finishes = published.reduce((total, round) => total + round.finishes, 0);
  const latestPoints = latestRounds.reduce((total, round) => total + round.points, 0);
  return <><PageHeader eyebrow="Dərc edilmiş nəticələr" title="Komanda tarixçəsi" description="Raund səviyyəli nəticələr və xəritə filtrləri. Yalnız mövcud mənbə məlumatları göstərilir." actions={latestTournamentId ? <Link className="button button--secondary" to={`/tournaments/${latestTournamentId}`}><span>Son turnir</span><ArrowRight size={16} /></Link> : undefined} /><Tabs active={mapFilter} onChange={setMapFilter} items={[{ id: 'all', label: 'Bütün xəritələr' }, { id: 'erangel', label: 'Erangel' }, { id: 'miramar', label: 'Miramar' }, { id: 'rondo', label: 'Rondo' }]} /><section className="history-summary"><div><span>İştiraklar</span><strong>{new Set(published.map((round) => round.tournamentId)).size}</strong></div><div><span>Ən yaxşı raund yeri</span><strong>{bestPlacement ? `#${String(bestPlacement).padStart(2, '0')}` : '—'}</strong></div><div><span>WWCD</span><strong>{wwcd}</strong></div><div><span>Ümumi kill</span><strong>{finishes}</strong></div><div><span>Dərc edilmiş raundlar</span><strong>{published.length}</strong></div></section>{latestContext && <section className="history-tournament"><div><span>Son tamamlanan</span><h2>{latestContext.tournament.name}</h2><p>{latestRounds.length} dərc edilmiş raund · {latestRounds.filter((round) => round.wwcd).length} WWCD · {latestPoints} xal</p></div><div className="history-placement"><strong>{latestContext.participation.resultPlacement ? String(latestContext.participation.resultPlacement).padStart(2, '0') : '—'}</strong><span>Yekun yer</span></div></section>}<SectionHeading title="Raundlar üzrə" description="Hər dərc edilmiş raund turnirin nəticə bölməsində yoxlanır." />{rounds.length ? <><DataTable headers={['Turnir', 'Mərhələ / Raund', 'Xəritə', 'Yer', 'Kill', 'WWCD', 'Cəmi']} rows={rounds.map((row) => [row.tournamentName, <Link to={`/tournaments/${row.tournamentId}#results`} state={{ roundId: row.id }}>{row.stageLabel}</Link>, row.map, `#${row.placement}`, row.finishes, row.wwcd ? 'Bəli' : '—', <strong>{row.points}</strong>])} /><MobileDataList items={rounds.map((row) => ({ title: <Link to={`/tournaments/${row.tournamentId}#results`} state={{ roundId: row.id }}>{row.map}</Link>, meta: `${row.tournamentName} · ${row.stageLabel}`, value: `${row.points} xal`, details: `Yer #${row.placement} · ${row.finishes} kill` }))} /></> : <EmptyState icon={<History size={24} />} title="Bu xəritə üzrə nəticə yoxdur" body="Dərc edilmiş nəticələri göstərmək üçün başqa xəritə filtrini seçin." />}</>;
}

export function TeamComparisonPage() {
  const { teamComparisonRecords } = useTeamPlatformData();
  return <><PageHeader eyebrow="Karyera müqayisəsi" title="Komandaları müqayisə et" description="Eyni dərc edilmiş nümunə məlumatlardakı göstəriciləri yan-yana yoxlayın. Məlumat olmayan sahələr “—” ilə işarələnir." /><TeamComparison records={teamComparisonRecords} /></>;
}

export function TeamRosterPage() {
  const { currentTeam } = useTeamPlatformData();
  const context = useTeamCompetitionContexts().current;
  const activeTournament = context?.tournament;
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState(currentTeam.roster[4] ?? currentTeam.roster[0]);
  const [incomingIgn, setIncomingIgn] = useState('');
  const [incomingUid, setIncomingUid] = useState('');
  const [reason, setReason] = useState('');
  const [savingRequest, setSavingRequest] = useState(false);
  if (!activeTournament || !selected) return <><PageHeader eyebrow="Heyət nəzarəti" title="Heyət" description="Turnir heyəti və dəyişiklik sorğuları." /><EmptyState title={!activeTournament ? 'Aktiv turnir yoxdur' : 'Heyət boşdur'} body={!activeTournament ? 'Yeni turnir dərc edildikdə heyət dəyişiklikləri burada idarə olunacaq.' : 'Komandaya oyunçu əlavə edildikdən sonra dəyişiklik sorğusu yarada bilərsiniz.'} /></>;
  const submitRequest = async () => {
    if (!incomingIgn.trim() || reason.trim().length < 10) return;
    setSavingRequest(true);
    try {
      await services.rosterRequests.submit({ teamId: currentTeam.id, teamName: currentTeam.name, tournamentId: activeTournament.id, tournamentName: activeTournament.name, outgoing: { id: selected.id, ign: selected.ign, role: selected.role }, incoming: { ign: incomingIgn.trim(), uid: incomingUid.trim(), role: selected.role }, reason: reason.trim() });
      setSubmitted(true); setReplaceOpen(false); setIncomingIgn(''); setIncomingUid(''); setReason('');
    } finally { setSavingRequest(false); }
  };
  const rosterLockAt = context.participation.rosterLockAt ?? activeTournament.registrationDeadline;
  return <><PageHeader eyebrow="Heyət nəzarəti" title="Heyət" description="Dəyişiklik müddəti, oyunçu rolu və yoxlanılan əvəzləmə sorğuları." actions={<><Link className="button button--ghost" to="/team/roster-requests"><span>Sorğular</span></Link><Button icon={<UserRoundPlus size={18} />} onClick={() => setReplaceOpen(true)}>Oyunçunu dəyiş</Button></>} /><div className="roster-lock-banner"><FileClock size={21} /><div><strong>Heyət {new Date(rosterLockAt).toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}-dək dəyişdirilə bilər.</strong><p>Müddətdən sonra dəyişiklik yalnız admin yoxlaması ilə mümkündür.</p></div><Countdown target={rosterLockAt} compact /></div>{submitted && <Toast title="Heyət dəyişikliyi göndərildi" body="Sorğu yoxlama statusu ilə admin növbəsinə əlavə edildi." />}<div className="roster-management">{currentTeam.roster.map((player, index) => <article key={player.id}><span className="roster-number">{String(index + 1).padStart(2, '0')}</span><TeamLogo name={player.ign} /><div><strong>{player.ign}</strong><span>{player.role} · UID {player.uid ?? 'əlavə edilməyib'}</span></div><StatusBadge status={player.role === 'substitute' ? 'warning' : 'approved'}>{player.role}</StatusBadge><Button variant="ghost" icon={<Pencil size={16} />} onClick={() => { setSelected(player); setReplaceOpen(true); }}>Dəyiş</Button></article>)}</div><EmptyState title="Dəyişiklik tarixçəsi əlçatan deyil" body="Tarixçə production audit xidməti qoşulduqda burada göstəriləcək." /><Modal open={replaceOpen} title={`${selected.ign} üçün əvəzləmə`} onClose={() => setReplaceOpen(false)} footer={<><Button variant="ghost" onClick={() => setReplaceOpen(false)}>Ləğv et</Button><Button loading={savingRequest} disabled={!incomingIgn.trim() || reason.trim().length < 10} onClick={() => void submitRequest()}>Yoxlamaya göndər</Button></>}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); void submitRequest(); }}><div className="replacement-pair"><div><span>Çıxan oyunçu</span><strong>{selected.ign}</strong><small>{selected.role}</small></div><RefreshCcw size={20} /><div><span>Yeni oyunçu</span><strong>{incomingIgn || 'Oyunçu adı'}</strong><small>yoxlanılır</small></div></div><Input label="Yeni oyunçu IGN" placeholder="ExampleIGN" value={incomingIgn} onChange={(event) => setIncomingIgn(event.target.value)} required /><Input label="PUBG UID" placeholder="5100•••000" value={incomingUid} onChange={(event) => setIncomingUid(event.target.value)} hint="UID uyğunluğunu production backend təsdiqləməlidir." /><Select label="Heyət rolu" defaultValue={selected.role} disabled><option value="starter">Əsas oyunçu</option><option value="substitute">Ehtiyat oyunçu</option></Select><Textarea label="Dəyişiklik səbəbi" placeholder="Ən azı 10 simvolluq faktiki izah" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} required /></form></Modal></>;
}

export function TeamMessagesPage() {
  const { adminMessages } = useTeamPlatformData();
  const [filter, setFilter] = useState('all');
  return <><PageHeader eyebrow="Rəsmi elanlar" title="Mesajlar" description="Bu bölmə admin-komanda elanları üçündür; söhbət funksiyası deyil." /><Tabs active={filter} onChange={setFilter} items={[{ id: 'all', label: 'Hamısı', count: adminMessages.length }, { id: 'unread', label: 'Oxunmamış', count: adminMessages.filter((item) => !item.read).length }, { id: 'important', label: 'Vacib' }]} /><div className="inbox-layout"><div className="inbox-list">{adminMessages.filter((item) => filter === 'all' || (filter === 'unread' && !item.read) || (filter === 'important' && item.severity === 'critical')).map((message) => <NotificationItem key={message.id} item={message} />)}</div><aside><Bell size={22} /><h2>Bildiriş kanalları</h2><p>Tətbiqdaxili bildiriş aktivdir. Email və push çatdırılması provayder inteqrasiyasından sonra işləyəcək.</p><Link to="/team/settings">Tərcihlər <ArrowRight size={16} /></Link></aside></div></>;
}

export function TeamSharecardsPage() {
  const { currentTeam, leaderboard, publicTeams: teams = [], matchHistory, careerSummary } = useTeamPlatformData();
  const { all } = useTeamCompetitionContexts();
  const [studioMode, setStudioMode] = useState<'identity' | 'result' | 'leaderboard'>('identity');
  const latestPublishedMatch = [...matchHistory].sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime())[0];
  const resultContext = latestPublishedMatch ? all.find((context) => context.tournament.id === latestPublishedMatch.tournamentId && context.participation.resultPlacement) : undefined;
  const resultTournament = resultContext?.tournament;
  const publishedRounds = matchHistory.filter((match) => match.tournamentId === resultTournament?.id);
  const result = resultTournament && resultContext?.participation.resultPlacement ? deriveTournamentResultBreakdown({ tournamentId: resultTournament.id, teamId: currentTeam.id, placement: resultContext.participation.resultPlacement, matches: publishedRounds, formula: resultTournament.pointFormula }) : undefined;
  const provenance = result?.stage && result.occurredAt ? { tournamentId: result.tournamentId, occurredAt: result.occurredAt, stageLabel: result.stage === 'final' ? 'Final sıralaması' : result.stage, sourceLabel: 'Dərc edilmiş nəticə' } : null;
  const standings = leaderboard.filter((row) => row.tournamentId === resultTournament?.id).sort((a, b) => a.placement - b.placement).map((row) => ({ tournamentId: row.tournamentId, teamId: row.teamId, rank: row.placement, team: teams.find((team) => team.id === row.teamId)?.name ?? 'Komanda adı yoxdur', wwcd: row.wwcd, placementPoints: row.placementPoints, killPoints: row.finishPoints, totalPoints: row.totalPoints }));
  const metric = (key: string) => careerSummary.metrics.find((item) => item.key === key)?.value;
  const identityData: TeamProfileCardData = { teamId: currentTeam.id, teamName: currentTeam.name, teamLogo: currentTeam.logoUrl, teamBanner: currentTeam.bannerUrl, teamTag: currentTeam.tag, country: currentTeam.country, profileUrl: publicTeamUrl(currentTeam.slug ?? currentTeam.id), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), podiums: metric('podiums'), roster: currentTeam.roster.map(({ ign, role }) => ({ ign, role })), sourceLabel: 'Published public roster and career stats' };
  const assetTypes = [
    { id: 'identity' as const, label: 'Komanda kimliyi', description: 'Daimi profil aktivi', icon: ShieldCheck },
    { id: 'result' as const, label: 'Turnir nəticəsi', description: 'Dərc edilmiş yekun', icon: Trophy },
    { id: 'leaderboard' as const, label: 'Liderlik cədvəli', description: 'Turnir sıralaması', icon: Swords },
  ];
  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? assetTypes.length - 1 : delta ? (index + delta + assetTypes.length) % assetTypes.length : -1;
    if (next < 0) return;
    const group = event.currentTarget.parentElement;
    event.preventDefault(); setStudioMode(assetTypes[next].id);
    window.requestAnimationFrame(() => group?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus());
  };
  return <><PageHeader className="share-studio-header" eyebrow="Paylaşım studiyası" title="Paylaşım növünü seçin" description="Komanda kimliyi, nəticə və liderlik şablonları." /><div className="asset-type-selector" role="radiogroup" aria-label="Aktiv növü">{assetTypes.map(({ id, label, description, icon: Icon }, index) => <button key={id} type="button" role="radio" aria-checked={studioMode === id} tabIndex={studioMode === id ? 0 : -1} onKeyDown={(event) => selectFromKeyboard(event, index)} onClick={() => setStudioMode(id)}><Icon size={19} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span><Check size={17} aria-hidden="true" /></button>)}</div><div id="share-studio-panel" className="share-studio-panel" aria-live="polite"><Suspense fallback={<div className="route-loading">Kart hazırlanır…</div>}>{studioMode === 'identity' ? <LazyProfileCardGenerator data={identityData} /> : <LazySharecardGenerator key={studioMode} initialFamily={studioMode} showFamilySelector={false} teamName={currentTeam.name} teamLogo={currentTeam.logoUrl} tournamentId={resultTournament?.id ?? ''} tournamentName={resultTournament?.name ?? ''} result={result} standings={standings} provenance={provenance} />}</Suspense></div></>;
}

type TeamSettingsSection = 'profile' | 'social' | 'notifications' | 'access';

export function TeamSettingsPage() {
  const { currentTeam } = useTeamPlatformData();
  const [section, setSection] = useState<TeamSettingsSection>('profile');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preferences, setPreferences] = useState({ checkIn: true, room: true, results: true, roster: true });
  const sections: Array<{ id: TeamSettingsSection; label: string; description: string }> = [
    { id: 'profile', label: 'Komanda profili', description: 'İctimai kimlik və media' },
    { id: 'social', label: 'Sosial linklər', description: 'Public platform keçidləri' },
    { id: 'notifications', label: 'Bildirişlər', description: 'Turnir və nəticə hadisələri' },
    { id: 'access', label: 'Giriş və səlahiyyətlər', description: 'Menecerlər və hesab təhlükəsizliyi' },
  ];
  const togglePreference = (key: keyof typeof preferences) => { setPreferences((value) => ({ ...value, [key]: !value[key] })); setDirty(true); };
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(true); setDirty(false); };
  return <>
    <PageHeader eyebrow="Komanda ayarları" title="Parametrlər" description="Komandanın ictimai profili, sosial keçidləri, bildirişləri və giriş səlahiyyətləri bir iş sahəsində." />
    {saved && <Toast title="Dəyişikliklər yoxlanıldı" body="Nümunə rejimində forma vəziyyəti yalnız bu sessiyada saxlanır; production yazılışı backend tələb edir." onClose={() => setSaved(false)} />}
    <div className="settings-workspace">
      <nav className="settings-subnav" aria-label="Komanda parametrləri">
        {sections.map((item) => <button key={item.id} type="button" className={section === item.id ? 'is-active' : ''} aria-current={section === item.id ? 'page' : undefined} onClick={() => setSection(item.id)}><span>{item.label}</span><small>{item.description}</small><ArrowRight size={16} /></button>)}
      </nav>
      <form className="settings-panel" onSubmit={submit} onChange={() => setDirty(true)}>
        {section === 'profile' && <>
          <header><div><span>İctimai kimlik</span><h2>Komanda profili</h2><p>Logo, banner və public komandalar kataloqunda görünən əsas məlumatlar.</p></div><TeamLogo name={currentTeam.name} src={currentTeam.logoUrl} size="lg" /></header>
          <div className="settings-section">
            <div className="form-grid"><Input label="Komanda adı" defaultValue={currentTeam.name} /><Input label="Komanda teqi" defaultValue={currentTeam.tag} optional /></div>
            <div className="form-grid"><Input label="Ölkə" defaultValue={currentTeam.country} /><Input label="Oyun" defaultValue="PUBG Mobile" disabled hint="Aktiv heyətin oyun domeni dəyişdirilə bilməz." /></div>
            <Textarea label="Komanda haqqında" defaultValue={currentTeam.description} rows={4} />
            <div className="locked-field"><LockKeyhole size={17} /><span>Turnir deadline-ı qüvvədə olduqda ad və teq dəyişiklikləri server tərəfindən kilidlənir.</span></div>
          </div>
          <div className="settings-section"><SectionHeading title="Banner" description="Public profil üçün 16:5 banner; seçilən fayl əvvəlcə lokal preview kimi yoxlanılır." /><TeamBannerUploader team={currentTeam} /></div>
        </>}
        {section === 'social' && <>
          <header><div><span>Public keçidlər</span><h2>Sosial linklər</h2><p>Yalnız təhlükəsiz və doldurulmuş URL-lər public profildə göstərilir.</p></div></header>
          <div className="settings-section settings-social-grid"><Input label="Instagram" type="url" defaultValue={currentTeam.socialLinks?.instagram} optional /><Input label="YouTube" type="url" defaultValue={currentTeam.socialLinks?.youtube} optional /><Input label="X" type="url" defaultValue={currentTeam.socialLinks?.x} optional /><Input label="Discord" type="url" defaultValue={currentTeam.socialLinks?.discord} optional /></div>
        </>}
        {section === 'notifications' && <>
          <header><div><span>Hadisə seçimləri</span><h2>Bildirişlər</h2><p>In-app hadisələri seçin. Email və push çatdırılması ayrıca provider inteqrasiyası tələb edir.</p></div></header>
          <div className="settings-section settings-switches">
            <Switch label="Qeydiyyat və check-in yenilikləri" description="Pəncərə açıldıqda və bağlanmağa yaxın xəbər ver." checked={preferences.checkIn} onChange={() => togglePreference('checkIn')} />
            <Switch label="Otaq məlumatları açıldıqda" description="Uyğun komanda üçün room release hadisəsini göstər." checked={preferences.room} onChange={() => togglePreference('room')} />
            <Switch label="Nəticə dərc edildikdə" description="Raund və turnir nəticəsi yayımlandıqda xəbər ver." checked={preferences.results} onChange={() => togglePreference('results')} />
            <Switch label="Heyət sorğuları" description="Əvəzləmə və roster statusu dəyişəndə xəbər ver." checked={preferences.roster} onChange={() => togglePreference('roster')} />
          </div>
        </>}
        {section === 'access' && <>
          <header><div><span>İcazələr</span><h2>Giriş və səlahiyyətlər</h2><p>Komanda rolu ilə şəxsi hesab təhlükəsizliyi ayrı idarə olunur.</p></div></header>
          <div className="settings-menu-rows">
            <Link to="/team/settings/managers"><Users size={20} /><span><strong>Menecerlər və rollar</strong><small>Komanda daxilində idarəetmə səlahiyyətlərinə baxın.</small></span><ArrowRight size={18} /></Link>
            <Link to="/team/roster"><UserRoundPlus size={20} /><span><strong>Heyət üzvləri</strong><small>Oyunçu tərkibi və dəyişiklik sorğuları ayrıca heyət bölməsindədir.</small></span><ArrowRight size={18} /></Link>
            <Link to="/account/security"><ShieldCheck size={20} /><span><strong>Hesab təhlükəsizliyi</strong><small>Şifrə, 2FA və bərpa seçimləri şəxsi hesab ayarlarındadır.</small></span><ArrowRight size={18} /></Link>
          </div>
        </>}
        {section !== 'access' && <footer className="settings-savebar"><span>{dirty ? 'Saxlanılmamış dəyişikliklər var' : 'Bütün dəyişikliklər saxlanılıb'}</span><Button type="submit" disabled={!dirty} icon={<Settings size={17} />}>Dəyişiklikləri saxla</Button></footer>}
      </form>
    </div>
  </>;
}
