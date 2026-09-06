import { ArrowRight, CalendarClock, Check, ChevronLeft, ChevronRight, LockKeyhole, Radio } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { competitionNow, demoMode, serviceCapabilities } from '../../services';
import { selectPrimaryCompetition } from '../../utils/competitionSelectors';
import type { Tournament, TournamentCalendarEvent, TournamentCalendarStatus } from '../../types/domain';
import { AEVIC_EVENT_TIMEZONE, calendarDateFromKey, calendarDateKey, eventDateKey, formatEventTime } from '../../utils/calendar';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { EmptyState } from '../common/primitives';
import { TournamentJoinAction } from './TournamentJoinAction';
import './competition-schedule.css';

const weekdayLabels = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];
const monthLabels = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const statusCopy: Record<TournamentCalendarStatus, string> = {
  'registration-open': 'Qeydiyyat açıqdır',
  'registration-closed': 'Qeydiyyat bağlıdır',
  live: 'Canlı',
  completed: 'Tamamlanıb',
};


function eventStatus(tournament: Tournament, now = competitionNow()): TournamentCalendarStatus {
  const phase = resolveTournamentTemporalPhase(tournament, now);
  if (phase === 'live') return 'live';
  if (phase === 'completed') return 'completed';
  if (phase === 'registration-open') return 'registration-open';
  return 'registration-closed';
}

function readableDate(date: Date, withYear = false) {
  return `${date.getUTCDate()} ${monthLabels[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ''}`;
}

function monthDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  return [...Array.from({ length: leading }, () => null), ...Array.from({ length: count }, (_, index) => new Date(Date.UTC(year, month, index + 1, 12)))];
}

function StatusIcon({ status }: { status: TournamentCalendarStatus }) {
  if (status === 'live') return <Radio size={14} aria-hidden="true" />;
  if (status === 'completed') return <Check size={14} aria-hidden="true" />;
  if (status === 'registration-open') return <CalendarClock size={14} aria-hidden="true" />;
  return <LockKeyhole size={14} aria-hidden="true" />;
}

export function TournamentCalendar({ tournaments, compact = false }: { tournaments: Tournament[]; compact?: boolean }) {
  const EventHeading = compact ? 'h3' : 'h2';
  const [now, setNow] = useState(competitionNow);
  const calendarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const tick = () => setNow(competitionNow());
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const firstTournament = selectPrimaryCompetition(tournaments, now);
  const initialDate = calendarDateFromKey(firstTournament ? eventDateKey(firstTournament.startsAt) : eventDateKey(now));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewMonth, setViewMonth] = useState({ year: initialDate.getUTCFullYear(), month: initialDate.getUTCMonth() });
  const [selectedTournamentId, setSelectedTournamentId] = useState(firstTournament?.id ?? '');
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const events = useMemo<TournamentCalendarEvent[]>(() => tournaments.map((tournament) => ({
    id: `calendar-${tournament.id}`,
    tournamentId: tournament.id,
    title: tournament.name,
    startsAt: tournament.startsAt,
    status: eventStatus(tournament, now),
    registrationStatus: tournament.status,
  })), [tournaments, now]);
  const eventsByDay = useMemo(() => events.reduce((grouped, event) => {
    const key = eventDateKey(event.startsAt); grouped.set(key, [...(grouped.get(key) ?? []), event]); return grouped;
  }, new Map<string, TournamentCalendarEvent[]>()), [events]);
  const selectedEvents = tournaments.filter((item) => eventDateKey(item.startsAt) === calendarDateKey(selectedDate));
  const selectedTournament = selectedEvents.find((item) => item.id === selectedTournamentId) ?? selectedEvents[0];
  const days = monthDays(viewMonth.year, viewMonth.month);
  const todayKey = eventDateKey(now);

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setViewMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    setSelectedTournamentId(eventsByDay.get(calendarDateKey(date))?.[0]?.tournamentId ?? '');
  };
  const moveMonth = (amount: number) => {
    const next = new Date(Date.UTC(viewMonth.year, viewMonth.month + amount, 1, 12));
    const monthEvent = tournaments.find((item) => { const parts = eventDateKey(item.startsAt).split('-').map(Number); return parts[0] === next.getUTCFullYear() && parts[1] - 1 === next.getUTCMonth(); });
    selectDay(monthEvent ? calendarDateFromKey(eventDateKey(monthEvent.startsAt)) : next);
  };
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const movement: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const offset = movement[event.key]; if (!offset) return;
    event.preventDefault(); const next = new Date(date); next.setUTCDate(date.getUTCDate() + offset); selectDay(next);
    window.requestAnimationFrame(() => {
      // Month and compact-strip representations share dates; focus only the visible one.
      Array.from(calendarRef.current?.querySelectorAll<HTMLButtonElement>(`[data-calendar-date="${calendarDateKey(next)}"]`) ?? [])
        .find((button) => button.getClientRects().length > 0)?.focus({ preventScroll: true });
    });
  };
  const stripDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(selectedDate); day.setUTCDate(selectedDate.getUTCDate() + index - 3); return day; });

  if (tournaments.length === 0) return <section className={`tournament-calendar tournament-calendar--empty ${compact ? 'tournament-calendar--compact' : ''}`} aria-label="AEVIC turnir təqvimi">
    <EmptyState
      icon={<CalendarClock size={28} />}
      title="Növbəti yarış elanları burada yayımlanacaq"
      body="Hazırda dərc edilmiş turnir yoxdur. Elan gözləyərkən heyət, iştirak və xal şərtləri ilə tanış olun."
      action={<Link className="button button--secondary" to={serviceCapabilities.register ? '/register' : '/regulations'}><span>{serviceCapabilities.register ? 'Komandanı hazırla' : 'Yarış qaydalarına bax'}</span><ArrowRight size={17} /></Link>}
    />
  </section>;

  return <section ref={calendarRef} className={`tournament-calendar ${compact ? 'tournament-calendar--compact' : ''}`} aria-label="AEVIC turnir təqvimi">
    <div className="tournament-calendar__picker">
      <header><div><span>{monthLabels[viewMonth.month]}</span><strong>{viewMonth.year}</strong></div><nav aria-label="Təqvim ayı"><button type="button" onClick={() => moveMonth(-1)} aria-label="Əvvəlki ay"><ChevronLeft size={18} /></button><button type="button" onClick={() => moveMonth(1)} aria-label="Növbəti ay"><ChevronRight size={18} /></button></nav></header>
      <div className="tournament-calendar__month"><div className="tournament-calendar__weekdays" aria-hidden="true">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div><div className="tournament-calendar__days">{days.map((date, index) => date ? <button type="button" key={calendarDateKey(date)} data-calendar-date={calendarDateKey(date)} data-event-status={eventsByDay.get(calendarDateKey(date))?.[0]?.status} aria-current={calendarDateKey(date) === todayKey ? 'date' : undefined} tabIndex={calendarDateKey(date) === calendarDateKey(selectedDate) ? 0 : -1} className={`${calendarDateKey(date) === calendarDateKey(selectedDate) ? 'is-selected' : ''} ${calendarDateKey(date) === todayKey ? 'is-today' : ''} ${eventsByDay.has(calendarDateKey(date)) ? 'has-event' : ''}`} aria-label={`${readableDate(date)}${eventsByDay.has(calendarDateKey(date)) ? `, ${eventsByDay.get(calendarDateKey(date))!.length} turnir, ${statusCopy[eventsByDay.get(calendarDateKey(date))![0].status]}` : ', turnir yoxdur'}`} aria-pressed={calendarDateKey(date) === calendarDateKey(selectedDate)} onClick={() => selectDay(date)} onKeyDown={(event) => onDayKeyDown(event, date)}><span>{date.getUTCDate()}</span>{eventsByDay.has(calendarDateKey(date)) && <i aria-hidden="true" />}</button> : <span key={`empty-${index}`} aria-hidden="true" />)}</div></div>
      <div className="tournament-calendar__strip" aria-label="Seçilmiş gün ətrafındakı tarixlər">{stripDays.map((date) => <button type="button" key={calendarDateKey(date)} data-calendar-date={calendarDateKey(date)} data-event-status={eventsByDay.get(calendarDateKey(date))?.[0]?.status} aria-current={calendarDateKey(date) === todayKey ? 'date' : undefined} tabIndex={calendarDateKey(date) === calendarDateKey(selectedDate) ? 0 : -1} className={`${calendarDateKey(date) === calendarDateKey(selectedDate) ? 'is-selected' : ''} ${calendarDateKey(date) === todayKey ? 'is-today' : ''}`} aria-label={`${readableDate(date)}${eventsByDay.has(calendarDateKey(date)) ? `, ${eventsByDay.get(calendarDateKey(date))!.length} turnir, ${statusCopy[eventsByDay.get(calendarDateKey(date))![0].status]}` : ', turnir yoxdur'}`} aria-pressed={calendarDateKey(date) === calendarDateKey(selectedDate)} onClick={() => selectDay(date)} onKeyDown={(event) => onDayKeyDown(event, date)}><small>{weekdayLabels[(date.getUTCDay() + 6) % 7]}</small><strong>{date.getUTCDate()}</strong>{eventsByDay.has(calendarDateKey(date)) && <i aria-hidden="true" />}</button>)}</div>
      <div className="tournament-calendar__legend" aria-label="Turnir statusları"><span><CalendarClock size={13} />Açıq</span><span><LockKeyhole size={13} />Bağlı</span><span><Radio size={13} />Canlı</span><span><Check size={13} />Bitib</span></div>
    </div>
    <div className="tournament-calendar__agenda">
      <header><span>Seçilmiş gün</span><time dateTime={calendarDateKey(selectedDate)}>{readableDate(selectedDate, true)}</time></header>
      {selectedTournament ? <article className="calendar-event-inspector">
        {selectedEvents.length > 1 && <div className="calendar-event-switcher" role="group" aria-label="Bu günün turnirləri">{selectedEvents.map((item) => <button key={item.id} type="button" aria-pressed={item.id === selectedTournament.id} onClick={() => setSelectedTournamentId(item.id)}>{item.shortName}</button>)}</div>}
        <div className="calendar-event-inspector__heading"><div className={`calendar-event-status calendar-event-status--${eventStatus(selectedTournament, now)}`}><StatusIcon status={eventStatus(selectedTournament, now)} /><span>{statusCopy[eventStatus(selectedTournament, now)]}</span>{demoMode && <small>Nümunə</small>}</div><EventHeading>{selectedTournament.name}</EventHeading></div>
        <dl><div><dt>Başlanğıc</dt><dd>{formatEventTime(selectedTournament.startsAt, AEVIC_EVENT_TIMEZONE)} AZT</dd></div><div><dt>Boş slot</dt><dd>{Math.max(0, selectedTournament.maxSlots - selectedTournament.usedSlots - (joined[selectedTournament.id] ? 1 : 0))} / {selectedTournament.maxSlots}</dd></div><div><dt>Raund</dt><dd>{selectedTournament.roundsPerDay * selectedTournament.days}</dd></div></dl>
        {eventStatus(selectedTournament, now) === 'completed' ? <Link className="button button--secondary" to={`/tournaments/${selectedTournament.id}`}><span>Nəticələrə bax</span><ArrowRight size={17} /></Link> : eventStatus(selectedTournament, now) === 'live' ? <Link className="button button--primary" to={`/tournaments/${selectedTournament.id}`}><span>Turniri izlə</span><Radio size={17} /></Link> : <TournamentJoinAction tournament={selectedTournament} showTeamState onJoined={() => setJoined((current) => ({ ...current, [selectedTournament.id]: true }))} />}
        <small className="calendar-authority-note">Slot və uyğunluq göndərmə anında servis tərəfindən yenidən yoxlanır.</small>
      </article> : <div className="tournament-calendar__empty"><CalendarClock size={24} /><strong>Bu gün turnir yoxdur.</strong><p>Başqa tarixi seçin və ya bütün yarış xəttinə baxın.</p><Link to="/tournaments">Bütün turnirlər <ArrowRight size={15} /></Link></div>}
    </div>
  </section>;
}
