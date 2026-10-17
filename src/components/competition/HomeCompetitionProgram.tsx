import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Tournament } from '../../types/domain';
import { homeArtwork } from '../../assets/home';
import { featuredTournamentArtwork, tournamentStripArtwork } from '../../assets/tournaments';
import { eventDateKey, formatEventDate } from '../../utils/calendar';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { useTournamentClock } from '../../utils/useTournamentClock';
import { CompetitionFeature } from './CompetitionFeature';
import { TournamentCalendar } from './TournamentCalendar';

export default function HomeCompetitionProgram({ featured, tournaments }: { featured: Tournament; tournaments: Tournament[] }) {
  const now = useTournamentClock(tournaments);
  const [selection, setSelection] = useState({ date: eventDateKey(featured.startsAt), tournamentId: featured.id });
  useEffect(() => {
    if (selection.tournamentId && !tournaments.some(item => item.id === selection.tournamentId)) {
      setSelection({ date: eventDateKey(featured.startsAt), tournamentId: featured.id });
    }
  }, [tournaments, featured.id, featured.startsAt, selection.tournamentId]);
  const selected = tournaments.find(item => item.id === selection.tournamentId);
  const hero = selected ?? featured;
  const others = tournaments.filter(item => item.id !== featured.id);
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const update = () => setEdges({ start: node.scrollLeft <= 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    update(); node.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update); observer.observe(node);
    return () => { node.removeEventListener('scroll', update); observer.disconnect(); };
  }, [hero.id, tournaments]);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .85, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  return <>
    <div className="home-tournament-visual"><CompetitionFeature key={hero.id} tournament={hero} artwork={hero.id === 'daily-cup-24' ? featuredTournamentArtwork : tournamentStripArtwork[hero.id] ?? homeArtwork.tournament} cinematic currentTime={now} /></div>
    <div className="home-competition-program__calendar"><TournamentCalendar tournaments={tournaments} compact overview cinematic currentTime={now} selection={selection} onSelectionChange={setSelection} /></div>
    {others.length > 0 && <section className="home-other-tournaments" aria-label="Digər turnirlər">
      <header><h3>DİGƏR TURNİRLƏR</h3><div><button type="button" aria-label="Əvvəlki turnirlər" disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={21} /></button><button type="button" aria-label="Növbəti turnirlər" disabled={edges.end} onClick={() => move(1)}><ChevronRight size={21} /></button></div></header>
      <div className="home-other-tournaments__rail" ref={rail} tabIndex={0} aria-label="Turnirləri üfüqi sürüşdürün">{others.map(tournament => {
        const thumbnail = tournamentStripArtwork[tournament.id] ?? homeArtwork.tournament;
        const phase = resolveTournamentTemporalPhase(tournament, now);
        const label = { 'registration-open': 'Qeydiyyat açıqdır', 'registration-closed': 'Qeydiyyat bağlıdır', upcoming: 'Tezliklə', live: 'Canlı', completed: 'Tamamlanıb', draft: 'Planlaşdırılır', cancelled: 'Ləğv edilib' }[phase];
        return <button className="home-other-tournament" type="button" key={tournament.id} onClick={() => setSelection({ date: eventDateKey(tournament.startsAt), tournamentId: tournament.id })} aria-pressed={selected?.id === tournament.id} aria-label={`${tournament.name} turnirini seç`}>
          <img src={thumbnail.src} srcSet={thumbnail.srcSet} sizes="140px" alt="" loading="lazy" width="140" height="100" />
          <span><strong>{tournament.name}</strong><time dateTime={tournament.startsAt}>{formatEventDate(tournament.startsAt)}</time><small data-phase={phase}><i aria-hidden="true" />{label}</small></span>
        </button>;
      })}</div>
    </section>}
  </>;
}
