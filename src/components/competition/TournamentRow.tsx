import { ArrowRight, CalendarDays, Layers3, MapPin, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tournament } from '../../types/domain';
import { tournamentStripArtwork } from '../../assets/tournaments';
import { eventDateKey, formatEventDate } from '../../utils/calendar';
import { resolveTournamentTemporalPhase, type TournamentTemporalPhase } from '../../utils/tournamentTime';
import { MediaBackdrop } from '../common/MediaBackdrop';
import './tournament-row.css';

const labels: Record<TournamentTemporalPhase, string> = { 'registration-open': 'Qeydiyyat açıqdır', live: 'Davam edir', completed: 'Tamamlanıb', upcoming: 'Qeydiyyat hələ açılmayıb', draft: 'Planlaşdırılır', cancelled: 'Ləğv edilib', 'registration-closed': 'Qeydiyyat bağlıdır' };
const months = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'];

export function TournamentRow({ tournament, now, discovery = false, selected = false, registered = false, onSelect }: { tournament: Tournament; now: Date; discovery?: boolean; selected?: boolean; registered?: boolean; onSelect?: () => void }) {
  const phase = resolveTournamentTemporalPhase(tournament, now);
  const date = eventDateKey(tournament.startsAt).split('-');
  const artwork = tournamentStripArtwork[tournament.id];
  return <article className={`tournament-row${discovery ? ' tournament-row--discovery planning-event' : ''}`} data-phase={phase} data-selected={selected}>
    {discovery && <button className="tournament-row__date" type="button" aria-label={`${date[2]} ${months[Number(date[1]) - 1]} ${date[0]} — ${tournament.name} təqvimdə seç`} aria-pressed={selected} onClick={onSelect}><strong>{date[2]}</strong><span>{months[Number(date[1]) - 1]}</span></button>}
    <div className="tournament-row__thumbnail">{artwork ? <MediaBackdrop {...artwork} sizes="72px" /> : <Trophy aria-hidden="true" />}</div>
    <div className="tournament-row__body"><div className="tournament-row__title"><h3><Link to={`/tournaments/${tournament.id}`}>{tournament.name}</Link></h3><span className="tournament-row__status">{labels[phase]}</span></div><div className="tournament-row__meta"><span><CalendarDays aria-hidden="true" />{formatEventDate(tournament.startsAt)} – {formatEventDate(tournament.endsAt)}</span><span><MapPin aria-hidden="true" />Online</span></div>{registered && <small className="tournament-row__registered">Sizin komandanız qeydiyyatdadır</small>}</div>
    <div className="tournament-row__fact"><Users aria-hidden="true" /><span><b>{tournament.usedSlots} / {tournament.maxSlots}</b><small>Komanda</small></span></div>
    <div className="tournament-row__fact"><Layers3 aria-hidden="true" /><span><b>{tournament.days * tournament.roundsPerDay}</b><small>Raund</small></span></div>
    <Link className="tournament-row__arrow" to={`/tournaments/${tournament.id}`} aria-label={`${tournament.name} detallarını aç`}><ArrowRight size={18} /></Link>
  </article>;
}
