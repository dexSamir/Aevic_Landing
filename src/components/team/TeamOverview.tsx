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
  const update = vm.updates[0];
  const items = [
    { key: 'room', label: 'OTAQ STATUSU', value: context.room?.status === 'released' ? 'Hazırdır' : context.room ? 'Bağlıdır' : 'Gözlənilir', detail: context.room ? `${bakuTime(context.room.releaseAt)} · uyğun komandalara açılır` : 'Buraxılış vaxtı yoxdur', href: `${vm.tournamentHref}#room`, icon: KeyRound, ready: context.room?.status === 'released' },
    { key: 'match', label: 'NÖVBƏTİ MATÇ', value: context.nextMatch ? bakuTime(context.nextMatch.startsAt) : '—', detail: context.nextMatch ? `${overviewDate(context.nextMatch.startsAt)} · Raund ${context.nextMatch.round}` : 'Matç planlanmayıb', href: vm.tournamentHref, icon: Clock3, ready: false },
    { key: 'update', label: 'SON VACİB YENİLİK', value: update?.title ?? 'Yeni hadisə yoxdur', detail: update ? `${overviewDate(update.occurredAt)} · ${bakuTime(update.occurredAt)}` : 'Əməliyyat xətti yenidir', href: update?.actionTarget ?? '/team/notifications', icon: CheckCircle2, ready: false },
    { key: 'map', label: 'NÖVBƏTİ XƏRİTƏ', value: context.nextMatch?.map ?? '—', detail: context.nextMatch?.lobby ?? 'Lobbi paylaşılmayıb', href: vm.tournamentHref, icon: Users, ready: false },
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
      <header><h2>CARİ TURNİR · RAUND PROQRAMI</h2><span>Bakı vaxtı</span></header><div className="overview-competition-ready"><span>CHECK-IN</span><strong>{vm.context.checkIn?.status === 'checked-in' ? 'Təsdiqlənib' : vm.context.checkIn?.status === 'open' ? 'Açıqdır · iştirakınızı təsdiqləyin' : vm.context.checkIn?.status === 'missed' ? 'Müddət bitib' : 'Gözlənilir'}</strong></div>
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
    {vm.recentMatches.length ? <ol aria-label="Son matçların nəticələri">{vm.recentMatches.map(match => <li key={match.id} aria-label={match.wwcd ? 'WWCD, birinci yer' : `${match.placement}-ci yer`} className={match.wwcd ? 'is-highlighted' : undefined}>{match.wwcd ? <span className="overview-placement-wwcd">WWCD</span> : match.placement}</li>)}</ol> : <p className="overview-empty">Dərc edilmiş matç tarixçəsi yoxdur.</p>}
    <Link className="overview-section-link" to="/team/history">Nəticə tarixçəsi <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
export function TeamOverview() {
  const data = useTeamPlatformData();
  // Refresh temporal selectors while the captain leaves the console open.
  const [, setTick] = useState(0);
  useEffect(() => {
    // Original-team snapshots have no temporal competition state to refresh.
    if (data.unavailable?.competition) return;
    const tick = () => { if (!document.hidden) setTick(value => value + 1); };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [data.dataSource]);
  const context = useTeamCompetitionContexts().current;
  const vm = buildTeamOverview(data, context);
  const verified = vm.team.approvalStatus === 'approved';
  const contextLine = data.unavailable?.competition ? `Tier: ${vm.team.tier??'—'} · Status: ${vm.team.sourceStatus??'—'} · Yarış və otaq məlumatları hələ əlçatan deyil.` : context ? [context.tournament.name, context.participation.groupLabel, context.participation.slotNumber ? `Slot #${context.participation.slotNumber}` : undefined].filter(Boolean).join(' · ') : 'Aktiv yarış iştirakı yoxdur.';
  return <div className="team-overview">
    <header className="overview-identity">
      <div><span className="overview-eyebrow">// KAPİTAN XƏTTİ</span><h1 aria-label={vm.team.name}>{vm.team.name}{verified && <ShieldCheck aria-label="Təsdiqlənmiş komanda" />}</h1><p>{contextLine}</p></div>
      <nav aria-label="Komanda kontekst keçidləri"><Link to={`/teams/${encodeURIComponent(vm.team.slug ?? vm.team.id)}`}>İctimai profili aç <ExternalLink size={14} aria-hidden="true" /></Link>{context && vm.tournamentHref && <Link className="overview-current-tournament" to={vm.tournamentHref}><span>AKTİV TURNİR</span>{context.tournament.shortName || context.tournament.name}<ArrowRight size={14} aria-hidden="true" /></Link>}</nav>
    </header>
    {vm.team.rejectionReason && <p role="status" className="overview-empty">{vm.team.rejectionReason}</p>}
    <NextActionCommand vm={vm} />
    <OperationalRail vm={vm} />
    <dl className="team-stat-ledger" aria-label="Rəsmi komanda statistikası">{([['matches', 'Matç'], ['wwcd', 'WWCD'], ['championships', 'Çempionluq'], ['podiums', 'Podium']] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data.careerSummary.metrics.find(metric => metric.key === key)?.value ?? '—'}</dd></div>)}<div><dt>Heyət hazırlığı</dt><dd><Link className="overview-status--roster" to="/team/roster">{vm.activeRosterCount}/4 <Users size={17} /></Link></dd></div></dl>
    <RecentForm vm={vm} />
    <OperationsCanvas vm={vm} />
    <section className="overview-updates">
      <SectionTitle action={<Link to="/team/notifications">Hamısını göstər <ArrowRight size={16} aria-hidden="true" /></Link>}>SON YENİLİKLƏR</SectionTitle>
      {vm.updates.length ? <ol>{vm.updates.map(event => <li key={event.id} data-priority={event.priority}>
        <strong>{event.title}</strong><time dateTime={event.occurredAt}>{overviewDate(event.occurredAt)} · {bakuTime(event.occurredAt)}</time><p>{event.body}</p>
        {event.actionTarget && <Link to={event.actionTarget} aria-label={`${event.title}: ${event.actionLabel || 'Aç'}`}><ArrowRight size={16} aria-hidden="true" /></Link>}
      </li>)}</ol> : <p className="overview-empty">{data.unavailable?.notifications?'Bildiriş xidməti hələ əlçatan deyil.':'Yeni əməliyyat yeniliyi yoxdur.'}</p>}
    </section>
  </div>;
}
