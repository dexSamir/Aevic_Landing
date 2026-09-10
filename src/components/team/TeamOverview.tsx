import { ArrowRight, CheckCircle2, Clock3, ExternalLink, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeamPlatformData, useTeamCompetitionContexts } from '../../services/PlatformDataContext';
import { bakuTime, buildTeamOverview, overviewDate, type TeamOverviewViewModel } from '../../utils/teamOverview';
import '../../styles/team-overview.css';

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <header className="overview-section-title"><h2>{children}</h2>{action}</header>;
}
function NextActionCommand({ vm }: { vm: TeamOverviewViewModel }) {
  const action = vm.nextAction;
  return <section className="overview-next-action" aria-labelledby="overview-next-action-title" data-action={action.kind}>
    <div className="overview-next-action-copy">
      <span className="overview-eyebrow">NÖVBƏTİ ADDIM <span> / {action.eyebrow}</span></span>
      <h2 id="overview-next-action-title">{action.title}</h2>
      <p>{action.body}</p>
      {action.href && action.actionLabel && <Link className="overview-primary-action" to={action.href}>{action.actionLabel}<ArrowRight size={18} aria-hidden="true" /></Link>}
    </div>
    {action.startsAt && <div className="overview-command-time"><span>BAKI VAXTI</span><time dateTime={action.startsAt}>{bakuTime(action.startsAt)}</time><small>{overviewDate(action.startsAt)}</small></div>}
  </section>;
}
function OperationalRail({ vm }: { vm: TeamOverviewViewModel }) {
  const context = vm.context;
  if (!context || !vm.tournamentHref) return null;
  const checkIn = context.checkIn;
  const checkInStatus = checkIn?.status === 'checked-in' ? 'Təsdiqlənib' : checkIn?.status === 'open' ? 'Açıqdır · check-in tələb olunur' : checkIn?.status === 'missed' ? 'Pəncərə bağlanıb' : checkIn ? 'Gözlənilir' : 'Məlumat yoxdur';
  const rosterReady = vm.activeRosterCount >= 4;
  const items = [
    { key: 'match', label: 'NÖVBƏTİ MATÇ', value: context.nextMatch ? bakuTime(context.nextMatch.startsAt) : '—', detail: context.nextMatch ? `${context.nextMatch.map} · R${context.nextMatch.round}` : 'Matç planlanmayıb', href: vm.tournamentHref, icon: Clock3, ready: false },
    { key: 'check-in', label: 'CHECK-IN', value: checkIn ? bakuTime(checkIn.status === 'open' ? checkIn.closesAt : checkIn.opensAt) : '—', detail: checkInStatus, href: vm.tournamentHref, icon: CheckCircle2, ready: checkIn?.status === 'checked-in' },
    { key: 'room', label: 'OTAQ', value: context.room ? bakuTime(context.room.releaseAt) : '—', detail: context.room?.status === 'released' ? 'Otaq hazırdır' : context.room ? 'Bağlıdır' : 'Buraxılış vaxtı yoxdur', href: `${vm.tournamentHref}#room`, icon: KeyRound, ready: context.room?.status === 'released' },
    { key: 'roster', label: 'ƏSAS HEYƏT', value: `${vm.activeRosterCount}/4`, detail: rosterReady ? `${vm.team.roster.length} oyunçu · əsas heyət tamamdır` : `${4 - vm.activeRosterCount} əsas oyunçu çatışmır`, href: '/team/roster', icon: Users, ready: rosterReady },
  ];
  return <section className="overview-status-grid" aria-label="Əməliyyat vəziyyəti">{items.map(({ key, label, value, detail, href, icon: Icon, ready }) => (
    <Link key={key} className={`overview-status overview-status--${key}`} to={href}>
      <span>{label}</span><strong>{value}</strong><p><Icon size={12} aria-hidden="true" className={ready ? 'is-ready' : undefined} />{detail}</p>
    </Link>
  ))}</section>;
}
function OperationsCanvas({ vm }: { vm: TeamOverviewViewModel }) {
  if (!vm.context || !vm.tournamentHref) return null;
  return <section className="overview-operations" aria-label="Raund proqramı və cari sıra">
    <section className="overview-rounds">
      <header><h2>ROUND PROQRAMI</h2><span>Bakı vaxtı</span></header>
      {vm.rounds.length ? <ol>{vm.rounds.map(round => <li key={round.id} className={round.id === vm.context?.nextMatch?.id ? 'is-current' : undefined}>
        <span>R{String(round.round).padStart(2, '0')}</span><div><strong>{round.map}</strong><small>{round.lobby} · {round.stage === 'final' ? 'Final' : 'Qrup mərhələsi'}</small></div><time dateTime={round.startsAt}>{bakuTime(round.startsAt)}</time>
      </li>)}</ol> : <p className="overview-empty">Raund proqramı hələ dərc edilməyib.</p>}
      <Link className="overview-section-link" to={vm.tournamentHref}>Tam turnir əməliyyatları <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
    <section className="overview-standings">
      <h2>CARİ SIRA</h2>
      {vm.currentStanding ? <>
        <div className="overview-standing-summary"><strong>#{vm.currentStanding.placement}</strong><span>{vm.currentStanding.points} xal<small>{vm.context.tournament.shortName || vm.context.tournament.name}</small></span></div>
        <table aria-label="Komandanın cari turnir sıralaması"><thead><tr><th scope="col">#</th><th scope="col">Komanda</th><th scope="col">Xal</th></tr></thead><tbody>{vm.standings.map(row => <tr key={row.placement} className={row.current ? 'is-current' : undefined}><td>{row.placement}</td><td>{row.name}</td><td>{row.points}</td></tr>)}</tbody></table>
      </> : <div className="overview-standing-empty"><span aria-hidden="true">—</span><p>Komandanız üçün cari sıralama dərc edilməyib.</p><small>Rəsmi nəticələr yayımlandıqda burada görünəcək.</small></div>}
      {vm.resultsHref && <Link className="overview-section-link" to={vm.resultsHref}>Tam rəsmi nəticələr <ArrowRight size={16} aria-hidden="true" /></Link>}
    </section>
  </section>;
}
function RecentForm({ vm }: { vm: TeamOverviewViewModel }) {
  return <section className="overview-recent" aria-labelledby="overview-recent-title">
    <header><h2 id="overview-recent-title">{vm.recentMatches.length ? `SON ${vm.recentMatches.length} MATÇ` : 'SON MATÇLAR'}</h2><p>YENİ → KÖHNƏ</p></header>
    {vm.recentMatches.length ? <ol aria-label="Son matçların nəticələri">{vm.recentMatches.map(match => <li key={match.id} aria-label={match.placement === 1 ? 'WWCD, birinci yer' : `${match.placement}-ci yer`} className={match.placement === 1 ? 'is-highlighted' : undefined}>{match.placement === 1 ? <span className="overview-placement-wwcd">WW<br />CD</span> : match.placement}</li>)}</ol> : <p className="overview-empty">Dərc edilmiş matç tarixçəsi yoxdur.</p>}
    <Link className="overview-section-link" to="/team/history">Nəticə tarixçəsi <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
export function TeamOverview() {
  const data = useTeamPlatformData();
  // Refresh temporal selectors while the captain leaves the console open.
  const [, setTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTick(value => value + 1), 30_000); return () => clearInterval(timer); }, []);
  const context = useTeamCompetitionContexts().current;
  const vm = buildTeamOverview(data, context);
  const verified = vm.team.approvalStatus === 'approved';
  const contextLine = context ? [context.tournament.name, context.participation.groupLabel, context.participation.slotNumber ? `Slot #${context.participation.slotNumber}` : undefined].filter(Boolean).join(' · ') : 'Aktiv yarış iştirakı yoxdur.';
  return <div className="team-overview">
    <header className="overview-identity">
      <div><span className="overview-eyebrow">KAPİTAN XƏTTİ</span><h1 aria-label={vm.team.name}>{vm.team.name}{verified && <ShieldCheck aria-label="Təsdiqlənmiş komanda" />}</h1><p>{contextLine}</p></div>
      <nav aria-label="Komanda kontekst keçidləri"><Link to={`/teams/${encodeURIComponent(vm.team.slug ?? vm.team.id)}`}>İctimai profili aç <ExternalLink size={14} aria-hidden="true" /></Link>{context && vm.tournamentHref && <Link to={vm.tournamentHref}>{context.tournament.shortName || context.tournament.name}<ArrowRight size={14} aria-hidden="true" /></Link>}</nav>
    </header>
    <NextActionCommand vm={vm} />
    <OperationalRail vm={vm} />
    <OperationsCanvas vm={vm} />
    <RecentForm vm={vm} />
    <section className="overview-updates">
      <SectionTitle action={<Link to="/team/notifications">Hamısını göstər <ArrowRight size={16} aria-hidden="true" /></Link>}>SON YENİLİKLƏR</SectionTitle>
      {vm.updates.length ? <ol>{vm.updates.map(event => <li key={event.id} data-priority={event.priority}>
        <strong>{event.title}</strong><time dateTime={event.occurredAt}>{overviewDate(event.occurredAt)} · {bakuTime(event.occurredAt)}</time><p>{event.body}</p>
        {event.actionTarget && <Link to={event.actionTarget} aria-label={`${event.title}: ${event.actionLabel || 'Aç'}`}><ArrowRight size={16} aria-hidden="true" /></Link>}
      </li>)}</ol> : <p className="overview-empty">Yeni əməliyyat yeniliyi yoxdur.</p>}
    </section>
  </div>;
}
