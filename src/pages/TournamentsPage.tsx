import '../styles/public-pages.css';
import { ArrowRight, CalendarDays, Clock3, Layers3, Search, Timer, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { featuredTournamentArtwork, tournamentStripArtwork } from '../assets/tournaments';
import { BrandJoinCta } from '../components/common/BrandJoinCta';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { TournamentCalendar } from '../components/competition/TournamentCalendar';
import { TournamentJoinAction } from '../components/competition/TournamentJoinAction';
import { competitionNow, serviceCapabilities, services } from '../services';
import { usePublicPlatformData } from '../services/PlatformDataContext';
import { eventDateKey, formatEventDate, formatEventTime } from '../utils/calendar';
import { selectPrimaryCompetition } from '../utils/competitionSelectors';
import { resolveTournamentTemporalPhase, type TournamentTemporalPhase } from '../utils/tournamentTime';

const phaseLabels: Record<TournamentTemporalPhase, string> = { 'registration-open': 'Qeydiyyat açıqdır', live: 'Canlı', completed: 'Tamamlanıb', upcoming: 'Planlaşdırılıb', draft: 'Planlaşdırılır', cancelled: 'Ləğv edilib', 'registration-closed': 'Qeydiyyat bağlıdır' };
const filters = [['all', 'Hamısı'], ['registration-open', 'Qeydiyyat açıq'], ['live', 'Canlı'], ['scheduled', 'Planlaşdırılıb'], ['completed', 'Tamamlanıb']] as const;
function Occupancy({ used, max }: { used: number; max: number }) { return <span className="planning-occupancy" role="meter" aria-label="Dolu komanda yerləri" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(max, Math.max(0, used))}><i style={{ width: `${max > 0 ? Math.min(100, Math.max(0, used / max * 100)) : 0}%` }} /></span>; }

export function registrationCountdown(deadline: string, now: Date) {
  const delta = Date.parse(deadline) - now.getTime();
  const seconds = Number.isFinite(delta) ? Math.max(0, Math.ceil(delta / 1000)) : 0;
  return { hours: Math.floor(seconds / 3600), minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60, remaining: seconds };
}
function RegistrationCountdown({ deadline, now, open }: { deadline: string; now: Date; open: boolean }) {
  const countdown = registrationCountdown(deadline, now);
  const active = open && countdown.remaining > 0;
  return <div className="planning-countdown"><Timer aria-hidden="true" /><div><p>{active ? 'Qeydiyyat bağlanmasına:' : 'Qeydiyyat bağlıdır'}</p><div role="timer" aria-live="off" aria-label={active ? `${countdown.hours} saat ${countdown.minutes} dəqiqə ${countdown.seconds} saniyə` : 'Qeydiyyat bağlıdır'}>{[ [active ? countdown.hours : 0, 's'], [active ? countdown.minutes : 0, 'dəq'], [active ? countdown.seconds : 0, 'san'] ].map(([value, unit]) => <span key={unit}><b>{String(value).padStart(2, '0')}</b><small>{unit}</small></span>)}</div><span className="sr-only" role="status">{active ? 'Qeydiyyat açıqdır' : 'Qeydiyyat bağlıdır'}</span></div></div>;
}
function filterMatches(phase: TournamentTemporalPhase, filter: string) {
  return filter === 'all' || phase === filter || (filter === 'scheduled' && ['upcoming', 'registration-closed', 'draft'].includes(phase));
}

export function TournamentsPage() {
  const { tournaments } = usePublicPlatformData();
  const [now, setNow] = useState(competitionNow);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const initialTournament = selectPrimaryCompetition(tournaments, now);
  const [selection, setSelection] = useState(() => ({ date: initialTournament ? eventDateKey(initialTournament.startsAt) : eventDateKey(now), tournamentId: initialTournament?.id ?? '' }));
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [participationVersion, setParticipationVersion] = useState(0);
  const [showCta, setShowCta] = useState(!serviceCapabilities.publicSession);
  useEffect(() => {
    const started = Date.now();
    const reference = competitionNow().getTime();
    const tick = () => setNow(new Date(reference + Date.now() - started));
    let timer: number | undefined;
    const resume = () => { window.clearInterval(timer); if (!document.hidden) { tick(); timer = window.setInterval(tick, 1000); } };
    resume(); document.addEventListener('visibilitychange', resume);
    let active = true;
    if (serviceCapabilities.publicSession) void services.auth.getSession().then(async session => {
      const team = session && ['captain', 'team', 'admin'].includes(session.role) ? await services.teams.current() : undefined;
      if (active) setShowCta(!team);
      if (team) {
        const registrations = await Promise.allSettled(tournaments.map(async tournament => (await services.tournaments.slots(tournament.id)).some(slot => slot.teamId === team.id) ? tournament.id : undefined));
        if (active) setRegisteredIds(registrations.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []));
      }
    }).catch(() => { if (active) setShowCta(false); });
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, []);
  const featured = selectPrimaryCompetition(tournaments, now);
  const visible = tournaments.filter(tournament => {
    const phase = resolveTournamentTemporalPhase(tournament, now);
    return `${tournament.name} ${tournament.shortName} ${tournament.description}`.toLocaleLowerCase('az-AZ').includes(search.toLocaleLowerCase('az-AZ').trim()) && filterMatches(phase, filter);
  }).sort((a, b) => Number(resolveTournamentTemporalPhase(a, now) === 'completed') - Number(resolveTournamentTemporalPhase(b, now) === 'completed') || Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return <>
    <section className="tournaments-calendar-page"><div className="container">
      <header className="planning-title"><div><span className="planning-eyebrow">// &nbsp; TURNİR PLANLAMASI</span><h1>Turnir təqvimi</h1><p>Tarixi seçin, turnirin vəziyyətini və iştirak şərtlərini görün.</p></div><div className="planning-motto" aria-hidden="true"><i />MORE<br />THAN A GAME<br />A LEGACY</div></header>
      {featured && <article className="planning-feature">
        <div className="planning-feature__visual">{(featured.id === 'daily-cup-24' || tournamentStripArtwork[featured.id]) && <MediaBackdrop {...(featured.id === 'daily-cup-24' ? featuredTournamentArtwork : tournamentStripArtwork[featured.id])} className="planning-feature__media" sizes="(max-width: 767px) 100vw, 70vw" priority />}<div className="planning-feature__copy"><span className="planning-eyebrow">AEVIC · PUBG MOBILE</span><h2>{featured.name}</h2><p>{featured.description}</p>{resolveTournamentTemporalPhase(featured, now) === 'registration-open' ? <TournamentJoinAction tournament={featured} currentTime={now} refreshKey={participationVersion} onStateChange={(participation) => { if (participation && participation !== 'not-registered' && participation !== 'rejected') setRegisteredIds(ids => ids.includes(featured.id) ? ids : [...ids, featured.id]); }} onJoined={() => setParticipationVersion(value => value + 1)} /> : <Link className="button button--primary" to={`/tournaments/${featured.id}`}><span>Turnirə bax</span><ArrowRight size={18} /></Link>}</div></div>
        <div className="planning-feature__info"><RegistrationCountdown deadline={featured.registrationDeadline} now={now} open={resolveTournamentTemporalPhase(featured, now) === 'registration-open'} /><dl className="planning-feature__facts"><div><CalendarDays /><dt>Başlanğıc</dt><dd>{formatEventDate(featured.startsAt, { withTime: true })}</dd></div><div><Users /><dt>Komanda yeri</dt><dd>{featured.usedSlots} / {featured.maxSlots}<Occupancy used={featured.usedSlots} max={featured.maxSlots} /></dd></div><div><Layers3 /><dt>Proqram</dt><dd>{featured.days * featured.roundsPerDay} raund</dd></div></dl></div>
      </article>}
      {tournaments.length ? <div className="tournament-program"><aside className="tournament-program__index"><TournamentCalendar tournaments={tournaments} compact planning currentTime={now} selection={selection} onSelectionChange={next => { setSelection(next); if (next.tournamentId) { setFilter('all'); setSearch(''); } }} participationVersion={participationVersion} onParticipationChange={(id) => { setRegisteredIds(ids => ids.includes(id) ? ids : [...ids, id]); setParticipationVersion(value => value + 1); }} /></aside><section className="tournament-program__ledger" aria-labelledby="planning-list-title">
        <header className="planning-list-heading"><div><h2 id="planning-list-title"><span>//</span> Turnir xətti</h2><p>Yaxın və tamamlanmış turnirlərin siyahısı.</p></div><label className="planning-search"><Search size={18} /><span className="sr-only">Turnir axtar</span><input type="search" placeholder="Turnir axtar..." value={search} onChange={event => setSearch(event.target.value)} /></label></header>
        <div className="planning-filters" role="group" aria-label="Turnir statusu">{filters.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} ({tournaments.filter(tournament => filterMatches(resolveTournamentTemporalPhase(tournament, now), value)).length})</button>)}</div>
        <div className="planning-events" aria-live="polite">{visible.map(tournament => {
          const phase = resolveTournamentTemporalPhase(tournament, now); const date = eventDateKey(tournament.startsAt).split('-');
          return <article key={tournament.id} className="planning-event" data-phase={phase} data-selected={tournament.id === selection.tournamentId}>
            {tournamentStripArtwork[tournament.id] && <MediaBackdrop {...tournamentStripArtwork[tournament.id]} className="planning-event__media" sizes="(max-width: 1023px) 100vw, 65vw" />}
            <button type="button" className="planning-event__date" aria-label={`${tournament.name} təqvimdə seç`} aria-pressed={tournament.id === selection.tournamentId} onClick={() => setSelection({ date: eventDateKey(tournament.startsAt), tournamentId: tournament.id })}><strong>{date[2]}</strong><span>{['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'][Number(date[1]) - 1]}</span><small>{date[0]}</small></button>
            <div className="planning-event__body"><div className="planning-event__badges"><span className="planning-status">{phaseLabels[phase]}</span>{registeredIds.includes(tournament.id) && <span className="planning-status planning-status--registered">Sizin komandanız qeydiyyatdadır</span>}</div><h3><Link to={`/tournaments/${tournament.id}`}>{tournament.name}</Link></h3><div className="planning-event__meta"><span><Clock3 />{formatEventTime(tournament.startsAt)} AZT</span><span><Users /><span>{tournament.usedSlots} / {tournament.maxSlots}<Occupancy used={tournament.usedSlots} max={tournament.maxSlots} /></span></span><span><Layers3 />{tournament.days * tournament.roundsPerDay} raund</span></div></div>
            <Link className="planning-event__arrow" to={`/tournaments/${tournament.id}`} aria-label={`${tournament.name} detallarını aç`}><ArrowRight size={20} /></Link>
          </article>;
        })}{!visible.length && <div className="planning-empty"><h3>Axtarışa uyğun turnir yoxdur.</h3><p>Başqa ad və ya status seçin.</p><button type="button" onClick={() => { setSearch(''); setFilter('all'); }}>Filtrləri təmizlə</button></div>}</div>

      </section></div> : <div className="planning-empty"><h2>Hazırda dərc edilmiş turnir yoxdur.</h2><Link to="/regulations">Yarış qaydaları <ArrowRight size={18} /></Link></div>}
    </div></section>
    {showCta && <BrandJoinCta />}
  </>;
}
