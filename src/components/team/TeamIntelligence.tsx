import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock3, KeyRound, Trophy, Users, Bell } from 'lucide-react';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../../services/PlatformDataContext';
import { competitionNow, services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import { bakuTime, overviewDate } from '../../utils/teamOverview';
import '../../styles/team-insights.css';

export function countdown(until: string, now: number) {
  const remaining = Date.parse(until) - now;
  if (!Number.isFinite(remaining)) return 'Vaxt təsdiqlənməyib';
  if (remaining <= 0) return 'Vaxt çatıb';
  const minutes = Math.ceil(remaining / 60_000);
  return `${Math.floor(minutes / 1440)}g ${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}s ${String(minutes % 60).padStart(2, '0')}d`;
}
type Card = { id: string; label: string; value: string; detail: string; href: string; priority: number; deadline?: number; icon: typeof Clock3 };

export function TeamIntelligence() {
  const data = useTeamPlatformData(), { all } = useTeamCompetitionContexts();
  const [now, setNow] = useState(() => competitionNow().getTime());
  const [reduced, setReduced] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: true });
  const rail = useRef<HTMLDivElement>(null);
  const roomContext = !data.unavailable?.room && !data.unavailable?.competition ? all.find(context => context.lifecycle === 'current' && context.participation.status === 'confirmed' && context.room) : undefined;
  const room = roomContext?.room;
  // This service performs server authorization; snapshot release state alone never reveals a code.
  const roomQuery = usePlatformQuery({ key: `intelligence-room:${data.currentTeam.id}:${roomContext?.tournament.id}:${room?.roundId}`, query: () => services.rooms.getForEligibleTeam(roomContext!.tournament.id, room!.roundId), enabled: Boolean(roomContext && room?.status === 'released'), staleTime: 15_000, retry: 0 });
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches); update();
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(competitionNow().getTime()); };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    if (!roomContext || room?.status !== 'released') return;
    const timer = window.setInterval(() => { if (!document.hidden && navigator.onLine) roomQuery.refetch(); }, 30_000);
    return () => clearInterval(timer);
  }, [roomContext?.tournament.id, room?.roundId, room?.status, roomQuery.refetch]);

  const cards: Card[] = [];
  if (room && roomContext) {
    const credentials = !roomQuery.error ? roomQuery.data : undefined;
    const released = credentials?.status === 'released' && credentials.roundId === room.roundId;
    const denied = roomQuery.error?.status === 401 || roomQuery.error?.status === 403;
    const round = roomContext.matches.find(match => match.id === room.roundId);
    cards.push({ id: 'room', label: 'OTAQ', value: room.status !== 'released' ? 'Bağlıdır' : denied ? 'Giriş icazəsi tələb olunur' : roomQuery.error ? 'Otaq məlumatı yüklənmədi' : roomQuery.loading ? 'Otaq yoxlanılır…' : released && credentials.roomId ? `ID: ${credentials.roomId}` : 'Otaq məlumatını aç', detail: `${room.status !== 'released' ? `${overviewDate(room.releaseAt)} · ${bakuTime(room.releaseAt)} açılır · ` : ''}${roomContext.tournament.shortName || roomContext.tournament.name}${round ? ` · ${round.map} · R${round.round} · ${bakuTime(round.startsAt)}` : ''}`, href: `/team/tournaments/${roomContext.tournament.id}#room`, priority: 1, icon: KeyRound });
  }
  if (!data.unavailable?.competition) {
    for (const context of all.filter(c => c.lifecycle === 'current' || c.lifecycle === 'upcoming')) {
      const href = `/team/tournaments/${context.tournament.id}`;
      const checkIn = context.checkIn;
      if (checkIn?.status === 'open' && Date.parse(checkIn.closesAt) > now) cards.push({ id: `check-in:${context.tournament.id}`, label: 'İŞTİRAKI TƏSDİQLƏ', value: countdown(checkIn.closesAt, now), detail: `${context.tournament.name} · son vaxt ${bakuTime(checkIn.closesAt)} (Bakı)`, href, priority: 0, deadline: Date.parse(checkIn.closesAt), icon: Clock3 });
      if (context.nextMatch) {
        const match = context.nextMatch;
        cards.push({ id: `match:${match.id}`, label: match.status === 'live' ? 'MATÇ CANLIDIR' : 'NÖVBƏTİ MATÇ', value: match.map, detail: `${context.tournament.shortName || context.tournament.name} · ${overviewDate(match.startsAt)} · ${bakuTime(match.startsAt)} (Bakı)`, href, priority: match.status === 'live' ? 1 : 3, deadline: Date.parse(match.startsAt), icon: Clock3 });
      }
      const statusLabels: Record<string, string> = { confirmed: 'Təsdiqlənib', pending: 'Təsdiq gözləyir', rejected: 'Qəbul edilməyib', withdrawn: 'İştirak ləğv edilib' };
      cards.push({ id: `entry:${context.tournament.id}`, label: 'TURNİR İŞTİRAKI', value: statusLabels[context.participation.status] ?? 'İştirak məlumatı', detail: context.tournament.name, href, priority: 5, icon: Trophy });
    }
    const deadline = data.tournaments.filter(t => t.status === 'registration-open' && Date.parse(t.registrationOpensAt) <= now && Date.parse(t.registrationDeadline) > now && !data.participations.some(p => p.tournamentId === t.id && ['pending', 'confirmed'].includes(p.status))).sort((a, b) => Date.parse(a.registrationDeadline) - Date.parse(b.registrationDeadline))[0];
    if (deadline) cards.push({ id: 'deadline', label: 'QEYDİYYAT BİTİR', value: countdown(deadline.registrationDeadline, now), detail: deadline.name, href: `/tournaments/${deadline.id}`, priority: 4, deadline: Date.parse(deadline.registrationDeadline), icon: Clock3 });
  }
  if (!data.unavailable?.notifications) {
    const events = data.notifications.filter(n => !n.read && n.actionHref && (n.priority === 'critical' || n.priority === 'important')).sort((a, b) => Number(b.priority === 'critical') - Number(a.priority === 'critical')).slice(0, 3);
    for (const event of events) {
      // A registration update replaces its generic status card, preserving the actionable message.
      if (event.eventType === 'registration') {
        const duplicate = cards.findIndex(card => card.id.startsWith('entry:') && card.href === event.actionHref);
        if (duplicate >= 0) cards.splice(duplicate, 1);
      }
      cards.push({ id: `notification:${event.id}`, label: 'VACİB BİLDİRİŞ', value: event.title, detail: event.body, href: event.actionHref!, priority: event.priority === 'critical' ? 0 : 2, icon: Bell });
    }
  }
  const roster = data.currentTeam.roster.filter(p => p.role !== 'substitute' && p.ign.trim()).length;
  cards.push({ id: 'roster', label: roster < 4 ? 'HEYƏTİ TAMAMLA' : 'ƏSAS HEYƏT', value: `${roster}/4 oyunçu`, detail: roster < 4 ? 'Əsas heyətdə boş yerlər var' : 'Heyəti nəzərdən keçir və idarə et', href: '/team/roster', priority: roster < 4 ? 2 : 8, icon: Users });
  const latest = data.historyAvailable !== false ? [...data.matchHistory].filter(m => Number.isFinite(Date.parse(m.playedAt))).sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))[0] : undefined;
  if (latest) cards.push({ id: 'result', label: 'SON RƏSMİ NƏTİCƏ', value: `#${latest.placement} · ${latest.finishes} kill`, detail: `${latest.map} · ${latest.points} xal · ${overviewDate(latest.playedAt)}`, href: '/team/history', priority: 7, icon: Trophy });
  // Keep the workspace useful between competitions without implying unavailable data is empty.
  if (!roomContext) cards.push({ id: 'room-status', label: 'OTAQ', value: data.unavailable?.room || data.unavailable?.competition ? 'Məlumat əlçatan deyil' : 'Aktiv otaq yoxdur', detail: 'Otaq məlumatı yalnız uyğun iştirakçılara açılır', href: '/team/tournaments', priority: 9, icon: KeyRound });
  if (!cards.some(card => card.id.startsWith('match:'))) cards.push({ id: 'schedule', label: 'NÖVBƏTİ MATÇ', value: data.unavailable?.competition ? 'Cədvəl əlçatan deyil' : 'Matç təyin edilməyib', detail: 'Yarış cədvəlini və iştirakınızı buradan izləyin', href: '/team/tournaments', priority: 10, icon: Clock3 });
  if (!all.some(context => context.lifecycle === 'current' || context.lifecycle === 'upcoming')) cards.push({ id: 'participation', label: 'TURNİR İŞTİRAKI', value: data.unavailable?.competition ? 'Məlumat əlçatan deyil' : 'Aktiv iştirak yoxdur', detail: 'Komandanın turnir iştiraklarını nəzərdən keçir', href: '/team/tournaments', priority: 11, icon: Trophy });
  cards.sort((a, b) => a.priority - b.priority || (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || a.id.localeCompare(b.id));
  const cardKeys = cards.map(card => card.id).join('|');

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const measure = () => {
      const next = { start: node.scrollLeft <= 1, end: node.scrollLeft >= node.scrollWidth - node.clientWidth - 1 };
      setEdges(previous => previous.start === next.start && previous.end === next.end ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    node.addEventListener('scroll', measure, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener('scroll', measure); };
  }, [cardKeys]);
  const scroll = (direction: number) => { rail.current?.scrollBy({ left: direction * (rail.current.clientWidth * .8), behavior: reduced ? 'instant' : 'smooth' }); };
  const overflow = !(edges.start && edges.end);
  return <section className="team-intelligence" aria-label="Komandanın vacib məlumatları">
    <header><span>KOMANDA RADARI</span>{overflow && <div><button type="button" aria-label="Əvvəlki kartlar" disabled={edges.start} onClick={() => scroll(-1)}><ArrowLeft size={16} /></button><button type="button" aria-label="Növbəti kartlar" disabled={edges.end} onClick={() => scroll(1)}><ArrowRight size={16} /></button></div>}</header>
    <div ref={rail} className="intelligence-rail" tabIndex={0} role="group" aria-label="Kartları ox düymələri ilə üfüqi sürüşdürün" onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scroll(event.key === 'ArrowLeft' ? -1 : 1); }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); rail.current?.scrollTo({ left: event.key === 'Home' ? 0 : rail.current.scrollWidth, behavior: reduced ? 'instant' : 'smooth' }); }
    }}>
      {cards.map(({ id, label, value, detail, href, icon: Icon }) => <Link className="intelligence-card" key={id} to={href}><span><Icon size={17} aria-hidden="true" />{label}</span><strong title={value}>{value}</strong><p title={detail}>{detail}</p><span className="intelligence-card-action">Ətraflı <ArrowRight size={14} aria-hidden="true" /></span></Link>)}
    </div>
  </section>;
}
