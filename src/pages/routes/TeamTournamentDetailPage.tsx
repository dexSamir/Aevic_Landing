import { CalendarDays, Check, ChevronRight, ExternalLink, Gamepad2, ShieldCheck, Star, Users } from 'lucide-react';
import { mapArtwork } from '../../assets/maps';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmDialog, EmptyState, PageHeader, StatusBadge } from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../../services/PlatformDataContext';
import { invalidateQuery, updateCachedQuery } from '../../services/queryCache';
import type { TeamPlatformSnapshot, RoomCredentials } from '../../types/domain';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';
import { placementPointGroups, scoreMatch } from '../../utils/scoring';
import { commandMatch, configuredStages, eventTime, participationLabels, stageLabels, scoringRuleLabel } from '../../features/tournament-command/model';
import { MatchClock } from '../../features/tournament-command/MatchClock';
import { RoomPanel } from '../../features/tournament-command/RoomPanel';
import { OfficialResults } from '../../features/tournament-command/OfficialResults';
import '../../styles/tournament-command.css';

export function TeamTournamentDetailPage() {
  const data = useTeamPlatformData();
  const { byTournamentId, all } = useTeamCompetitionContexts();
  const { tournamentId } = useParams();
  const context = tournamentId ? byTournamentId.get(tournamentId) : undefined;
  if (!context) return <><PageHeader eyebrow="Turnir Mərkəzi" title="Turnir tapılmadı" /><EmptyState title="Etibarsız turnir seçimi" body="Komandanın bu turnirdə iştirak qeydi yoxdur." action={<Link className="button button--secondary" to="/team/tournaments">Turnirlərimə qayıt</Link>} /></>;
  return <CommandCenter key={`${data.accountId}:${data.currentTeam.id}:${tournamentId}`} data={data} context={context} all={all} />;
}

function CommandCenter({ data, context, all }: { data: TeamPlatformSnapshot; context: TeamCompetitionContext; all: TeamCompetitionContext[] }) {
  const { tournament, participation, matches } = context;
  const navigate = useNavigate(), location = useLocation();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [verified, setVerified] = useState<{ roundId: string; status?: RoomCredentials['status'] }>();
  const next = commandMatch(matches, tournament);
  const [selection, setSelection] = useState('');
  const selected = matches.find(m => m.id === selection) ?? next ?? matches[matches.length - 1];
  const terminal = ['completed', 'cancelled'].includes(tournament.status);
  const status = withdrawn ? 'withdrawn' : participation.status;
  const confirmed = status === 'confirmed';
  const manage = !data.workspaceRole || ['OWNER', 'CAPTAIN', 'MANAGER', 'CO_CAPTAIN'].includes(data.workspaceRole);
  const didCheckIn = context.checkIn?.status === 'checked-in';
  const checkOpen = confirmed && !terminal && !didCheckIn && now >= Date.parse(tournament.checkInOpensAt) && now < Date.parse(tournament.checkInClosesAt);
  const eligible = confirmed && didCheckIn && data.currentTeam.approvalStatus === 'approved';
  const rosterReady = data.currentTeam.roster.filter(p => p.role !== 'substitute').length >= 4;
  const canWithdraw = manage && !['ongoing', 'completed', 'cancelled'].includes(tournament.status) && ['pending', 'confirmed', 'waitlisted'].includes(status) && now < Date.parse(tournament.startsAt);
  const roomVerified = eligible && !terminal && selected?.status !== 'completed' && selected && verified?.roundId === selected.id && verified?.status === 'released';
  const nextRoomVerified = eligible && !terminal && next && verified?.roundId === next.id && verified?.status === 'released';
  useEffect(() => {
    const boundaries = [tournament.checkInOpensAt, tournament.checkInClosesAt, tournament.startsAt, participation.rosterLockAt, ...data.teamAnnouncements.map(a => a.expiresAt)].map(v => Date.parse(v ?? '')).filter(t => t > Date.now());
    const nextBoundary = Math.min(...boundaries);
    const timer = Number.isFinite(nextBoundary) ? window.setTimeout(() => setNow(Date.now()), Math.min(nextBoundary - Date.now() + 1, 2_147_483_647)) : undefined;
    const focus = () => setNow(Date.now()); window.addEventListener('focus', focus);
    return () => { clearTimeout(timer); window.removeEventListener('focus', focus); };
  }, [now, tournament.checkInOpensAt, tournament.checkInClosesAt, tournament.startsAt, participation.rosterLockAt, data.teamAnnouncements]);
  useEffect(() => {
    if (!location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'start' });
  }, [location.hash]);
  const example = scoreMatch(tournament.pointFormula, 1, 5);
  const stages = configuredStages(matches);
  const announcements = data.teamAnnouncements.filter(a => a.entityRef?.type === 'tournament' && a.entityRef.id === tournament.id && (!a.expiresAt || Date.parse(a.expiresAt) > now));
  const milestone = (label: string, state: string, detail: string) => ({ label, state, detail });
  const milestones = [
    milestone('İştirak təsdiqi', confirmed ? 'complete' : 'blocked', participationLabels[status]),
    milestone('Heyət yoxlaması', rosterReady ? 'complete' : 'blocked', `${data.currentTeam.roster.length} oyunçu · ${participation.rosterLockAt ? `Heyət kilidi: ${eventTime(participation.rosterLockAt)}` : 'Kilid vaxtı paylaşılmayıb'}`),
    milestone('Check-in', didCheckIn ? 'complete' : checkOpen ? 'current' : terminal || now >= Date.parse(tournament.checkInClosesAt) ? 'blocked' : 'upcoming', didCheckIn ? `Təsdiqlənib · ${eventTime(context.checkIn?.checkedInAt)}` : `${eventTime(tournament.checkInOpensAt)} — ${eventTime(tournament.checkInClosesAt)}`),
    milestone('Otaq açıldı', roomVerified ? 'complete' : !eligible || terminal || selected?.status === 'completed' ? 'blocked' : 'unknown', roomVerified ? 'Server tərəfindən təsdiqlənib' : 'Yalnız otaq yoxlaması ilə təsdiqlənir'),
    milestone('Matç canlı', selected?.status === 'live' && !terminal ? 'current' : selected?.status === 'completed' ? 'complete' : terminal ? 'blocked' : 'upcoming', selected ? `${selected.map} · Raund ${selected.round}` : 'Raund planlaşdırılmayıb'),
    milestone('Nəticə dərc edildi', selected && (selected.publishedAt || context.history.some(h => h.id === selected.id)) ? 'complete' : 'upcoming', selected?.publishedAt ? eventTime(selected.publishedAt) : 'Rəsmi dərc gözlənilir'),
  ];
  const stateLabels: Record<string, string> = { complete: 'Tamamlanıb', current: 'İndi', upcoming: 'Gözlənilir', blocked: 'Bağlıdır', unknown: 'Yoxlanılmayıb' };
  const noMatch = tournament.status === 'cancelled' ? 'Turnir ləğv edilib' : tournament.status === 'completed' ? 'Turnir tamamlanıb' : status === 'withdrawn' ? 'İştirak dayandırılıb' : matches.length ? 'Raundlar bitib · Rəsmi nəticələri yoxlayın' : 'Matç proqramı gözlənilir';
  const lifecycleLabels: Record<string, string> = { draft: 'Qaralama', published: 'Elan edilib', 'registration-open': 'Qeydiyyat açıqdır', 'registration-closed': 'Qeydiyyat bağlanıb', ongoing: 'Davam edir', completed: 'Tamamlanıb', cancelled: 'Ləğv edilib' };
  const action = checkOpen && manage ? <Button onClick={() => setCheckInOpen(true)}>Check-in et</Button> : !rosterReady && manage && !terminal ? <Link className="button button--primary" to="/team/roster">Heyəti yoxla</Link> : confirmed && next && !terminal ? <Link className="button button--primary" to="#room" onClick={() => { setSelection(next.id); setVerified(undefined); }}>{nextRoomVerified ? 'Otaq məlumatlarını aç' : 'Otaq girişini yoxla'}</Link> : <Link className="button button--primary" to={terminal || context.history.length ? '#results' : '#matches'}>{terminal || context.history.length ? 'Nəticələrə bax' : 'Yarış proqramına bax'}</Link>;
  return <div className="tournament-command">
    <header className="command-header">
      <div className="command-breadcrumb"><Link to="/team/tournaments">← Turnirlərim</Link><span>/</span><span>{tournament.name}</span></div>
      <div className="command-title-row"><h1>Turnir mərkəzi</h1><StatusBadge status={confirmed ? 'approved' : status === 'rejected' || status === 'withdrawn' ? 'rejected' : 'warning'}>{participationLabels[status]}</StatusBadge></div>
      <div className="command-header-meta"><p>{tournament.name} · {tournament.shortName} · {lifecycleLabels[tournament.status] ?? tournament.status}</p><Link className="button button--secondary" to={`/tournaments/${tournament.id}`}>Turnirə ümumi baxış <ExternalLink size={14} /></Link></div>
      {all.length > 1 && <label className="command-switcher">Turnir<select aria-label="Turnir" value={tournament.id} onChange={e => navigate(`/team/tournaments/${e.target.value}`)}>{all.map(c => <option key={c.tournament.id} value={c.tournament.id}>{c.tournament.name} · {participationLabels[c.participation.status]}</option>)}</select></label>}
    </header>
    <nav className="command-nav" aria-label="Turnir bölmələri">{[['overview', 'İcmal'], ['matches', 'Matçlar'], ['room', 'Otaq'], ['standings', 'Sıralama'], ['results', 'Nəticələr'], ['rules', 'Qaydalar']].map(([id, label]) => <Link key={id} to={`#${id}`} aria-current={location.hash === `#${id}` ? 'location' : undefined}>{label}</Link>)}</nav>
    <div className="command-dashboard">
    <section id="overview" tabIndex={-1} className="command-next" aria-labelledby="command-next-title">
      <div><span className="command-eyebrow">{next?.status === 'live' && !terminal ? 'CANLI MATÇ' : 'NÖVBƏTİ MATÇ'}</span><h2 id="command-next-title">{status === 'withdrawn' || terminal || !next ? noMatch : !confirmed ? participationLabels[status] : checkOpen && manage ? 'İştirakınızı indi təsdiqləyin' : `${next.map} · Raund ${next.round}`}</h2>
      {next && !terminal && status !== 'withdrawn' && <><p>{stageLabels[next.stage]} · Gün {next.day} · {next.lobby || 'Lobbi paylaşılmayıb'}</p><p>{eventTime(next.startsAt)} · Bakı vaxtı</p></>}</div><div className="command-next-action">{next && !terminal && status !== 'withdrawn' && <><span className="command-muted">Matça qalan vaxt</span><MatchClock match={next} /></>}{action}</div>
    </section>
<section className="command-section command-roadmap" aria-labelledby="command-progress-title"><h2 id="command-progress-title">Turnirin hazırlıq mərhələləri</h2><ol className="command-progress">{milestones.map((m, index) => <li key={m.label} data-state={m.state} aria-current={m.state === 'current' ? 'step' : undefined}><span className="command-step" aria-hidden="true">{m.state === 'complete' ? <Check size={16} /> : index + 1}</span><div><strong>{m.label}</strong><span>{stateLabels[m.state]}</span></div><small>{m.detail}</small></li>)}</ol></section>
    <section id="matches" tabIndex={-1} className="command-section" aria-labelledby="command-matches-title"><header className="command-section-heading"><div><h2 id="command-matches-title"><CalendarDays /> Matç təqvimi</h2></div></header>
      {!stages.length && <p>Yarış proqramı hələ paylaşılmayıb.</p>}
      <details className="command-stage-details"><summary>Mərhələlər və matçlar</summary><ol className="command-stages">{stages.map(({ stage, matches: stageMatches }) => <li key={stage} aria-current={next?.stage === stage ? 'step' : undefined}><strong>{stageLabels[stage]}</strong><span>{eventTime(stageMatches[0].startsAt)}</span><small>{stageMatches.every(m => m.status === 'completed') ? 'Matçlar bitib' : next?.stage === stage ? 'Cari mərhələ' : 'Planlaşdırılıb'} · {stageMatches.length} raund</small></li>)}</ol></details>
      <ol className="command-schedule">{matches.map(match => <li key={match.id} data-next={match.id === next?.id}><span className="command-round-number"><b>{match.round}</b><small>Raund</small></span>{mapArtwork[match.map.toLowerCase()] && <img className="command-map-thumb" src={mapArtwork[match.map.toLowerCase()].src} srcSet={mapArtwork[match.map.toLowerCase()].srcSet} sizes="120px" alt="" loading="lazy" />}<div><strong>{match.map} · R{match.round}</strong><small>{stageLabels[match.stage]} · Gün {match.day} · {match.lobby}</small></div><time dateTime={match.startsAt}>{eventTime(match.startsAt)}</time><span>{terminal && match.status !== 'completed' ? 'Bağlanıb' : match.status === 'live' ? 'CANLI' : match.status === 'completed' ? 'Bitib' : 'Planlaşdırılıb'}</span><Link to="#room" onClick={() => { setSelection(match.id); setVerified(undefined); }} aria-label={`${match.map} · Raund ${match.round} — Raundu aç`}><ChevronRight size={18} /></Link></li>)}</ol>
    </section>
    <section id="room" tabIndex={-1} className="command-section" aria-labelledby="command-room-title"><h2 id="command-room-title"><Gamepad2 /> Matç otağı</h2><label className="command-round-label">Raund<select aria-label="Raund" value={selected?.id ?? ''} disabled={!matches.length} onChange={e => { setVerified(undefined); setSelection(e.target.value); }}>{matches.length ? matches.map(m => <option key={m.id} value={m.id}>Gün {m.day} · Raund {m.round} · {m.map}</option>) : <option value="">Raund yoxdur</option>}</select></label>
      <RoomPanel key={`${selected?.id}:${eligible}:${terminal}:${selected?.status}`} tournamentId={tournament.id} match={selected} eligible={eligible} terminal={terminal} hint={context.room?.roundId === selected?.id ? context.room?.releaseAt : undefined} onVerified={(roundId, state) => setVerified({ roundId, status: state })} />
      <div className="command-team-readiness"><div><Users /><span><strong>Heyət ({data.currentTeam.roster.length})</strong><small>{rosterReady ? 'Heyət hazırdır' : 'Heyəti tamamlayın'}</small></span></div><div><ShieldCheck /><span><strong>Uyğunluq yoxlaması</strong><small>{eligible ? 'Giriş şərtləri təsdiqlənib' : 'İştirak və Check-in tələb olunur'}</small></span></div></div>
      <details className="command-participation"><summary>İştirak məlumatları</summary>      <div className="command-readiness"><StatusBadge status={confirmed ? 'approved' : status === 'rejected' || status === 'withdrawn' ? 'rejected' : 'warning'}>{participationLabels[status]}</StatusBadge><dl><div><dt>Turnir tarixləri · Bakı</dt><dd>{eventTime(tournament.startsAt)} — {eventTime(tournament.endsAt)}</dd></div><div><dt>Qrup / Slot</dt><dd>{participation.groupLabel ?? 'Qrup paylaşılmayıb'} · {participation.slotNumber ? `#${participation.slotNumber}` : 'Slot gözlənilir'}</dd></div><div><dt>Heyət / Check-in</dt><dd>{data.currentTeam.roster.length} oyunçu · {didCheckIn ? 'Check-in tamamlanıb' : 'Check-in tamamlanmayıb'}</dd></div></dl>{!manage && <p>Check-in və iştirak dəyişikliklərini komanda rəhbərliyi idarə edir.</p>}</div>
</details>
      {checkOpen && manage && <Button onClick={() => setCheckInOpen(true)}>Check-in et</Button>}
    </section>
    <OfficialResults context={context} data={data} />
    {announcements.length > 0 && <section className="command-section" aria-label="Turnir yenilikləri"><h2>Turnir yenilikləri</h2>{announcements.map(a => <article key={a.id}><h3>{a.title}</h3><p>{a.body}</p><small>{eventTime(a.createdAt)}</small>{a.actionHref && <Link className="button button--secondary" to={a.actionHref}>{a.actionLabel ?? 'Ətraflı bax'}</Link>}</article>)}</section>}
    <section id="rules" tabIndex={-1} className="command-section" aria-labelledby="command-rules-title"><h2 id="command-rules-title"><Star /> Xal sistemi</h2><dl className="command-formula">{placementPointGroups(tournament.pointFormula, tournament.maxSlots).map(g => <div key={g.first}><dt>{g.first === g.last ? `#${g.first}` : `#${g.first}–${g.last}`}</dt><dd>{g.points} xal</dd></div>)}</dl><p>Hər eliminasiya: +{tournament.pointFormula.finishPointValue} xal · WWCD bonusu: {tournament.pointFormula.wwcdBonus} · Standart cərimə: {tournament.pointFormula.defaultPenalty}</p><details className="command-scoring-details"><summary>Xallar necə hesablanır?</summary><p>Cərimələr ümumi xaldan çıxılır. Rəsmi nəticələrdə saxlanılmış yekun xallar əsas götürülür.</p><p className="command-muted">Şərti nümunə: 1-ci yer + 5 eliminasiya, cəriməsiz = {example.totalPoints} xal (yer və bonus: {example.placementPoints}, eliminasiya: {example.finishPoints}).</p><h3>Bərabərlik zamanı üstünlük sırası</h3><ol>{tournament.pointFormula.tieBreakRules.map((rule, i) => <li key={i}>{scoringRuleLabel(rule)}</li>)}</ol></details></section><section className="command-section command-rule-links"><h2><ShieldCheck /> Turnir qaydaları</h2><div className="command-links"><Link to="/regulations">Rəsmi qaydalar</Link><Link to="/team/notifications">Ümumi bildirişlər</Link><Link to="/team/disputes">Etirazlarım</Link></div><p className="command-muted">Digər komanda yeniliklərini ümumi bildirişlər bölməsində yoxlayın.</p></section>
    </div>
    {canWithdraw && <section id="withdrawal" tabIndex={-1} className="danger-zone"><div><h2>Turnirdən geri çəkilmək</h2><p>İştirak dayandırılır və komanda bu turnirin matçlarına daxil ola bilmir.</p></div><Button variant="danger" onClick={() => setWithdrawOpen(true)}>Turnirdən çıx</Button></section>}
    <ConfirmDialog open={checkInOpen} title="Check-in-i təsdiqlə" body={`${data.currentTeam.name} komandasının iştirak etməyə hazır olduğunu təsdiqləyirsiniz.`} confirmLabel="Bəli, hazırıq" tone="primary" onClose={() => setCheckInOpen(false)} onConfirm={async () => { const check = await services.teams.checkIn(tournament.id); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, checkIn: check, checkIns: [...(value.checkIns ?? []).filter(c => c.tournamentId !== tournament.id), check] })); setCheckInOpen(false); }} />
    <ConfirmDialog open={withdrawOpen} title="Turnirdən geri çəkilirsiniz?" body={`${data.currentTeam.name} komandası ${tournament.name} turnirindəki iştirakını dayandıracaq. Bu əməliyyat admin panelində görünəcək və avtomatik geri qaytarılmaya bilər.`} confirmLabel="Bəli, geri çəkil" onClose={() => setWithdrawOpen(false)} onConfirm={async () => { await services.teams.withdraw(tournament.id, 'Captain requested'); setWithdrawn(true); setVerified(undefined); setWithdrawOpen(false); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, participations: value.participations.map(p => p.tournamentId === tournament.id ? { ...p, status: 'withdrawn' } : p) })); invalidateQuery('snapshot:team'); }} />
  </div>;
}
