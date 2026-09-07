import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HomeArtwork } from '../../assets/home';
import type { Tournament } from '../../types/domain';
import { officialAssets } from '../../assets/official';
import { competitionNow } from '../../services';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { formatEventDate } from '../../utils/calendar';
import { MediaBackdrop } from '../common/MediaBackdrop';
import { StatusBadge } from '../common/primitives';
import './competition-feature.css';

export function CompetitionFeature({ tournament, artwork }: { tournament: Tournament; artwork?: HomeArtwork }) {
  const phase = resolveTournamentTemporalPhase(tournament, competitionNow());
  return <article className="competition-feature">
    <MediaBackdrop {...(artwork ?? { src: officialAssets.maps[0], srcSet: officialAssets.mapSrcSets[0], width: 1600, height: 900 })} sizes="(max-width: 900px) 100vw, 60vw" focalDesktop={artwork ? '65% 45%' : '50% 50%'} focalMobile={artwork ? '64% 42%' : '50% 50%'} className="competition-feature__media" />
    <div className="competition-feature__identity"><span>AEVIC · PUBG MOBILE</span><StatusBadge status={phase === 'live' ? 'live' : phase === 'completed' ? 'completed' : phase === 'registration-open' ? 'open' : 'draft'}>{({ live: 'Canlı', completed: 'Tamamlanıb', 'registration-open': 'Qeydiyyat açıq', 'registration-closed': 'Qeydiyyat bağlı', upcoming: 'Planlaşdırılıb', draft: 'Planlaşdırılır', cancelled: 'Ləğv edilib' })[phase]}</StatusBadge><h2>{tournament.name}</h2><p>{tournament.description}</p><Link to={`/tournaments/${tournament.id}`}>Turniri aç <ArrowRight size={20} aria-hidden="true" /></Link></div>
    <dl><div><dt>Başlanğıc</dt><dd>{formatEventDate(tournament.startsAt, { withTime: true })}</dd></div><div><dt>Komandalar</dt><dd>{tournament.usedSlots} / {tournament.maxSlots}</dd></div><div><dt>Proqram</dt><dd>{tournament.days * tournament.roundsPerDay} raund</dd></div></dl>
  </article>;
}
