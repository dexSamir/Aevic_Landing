import { ArrowRight, Crown, CalendarDays, Clock3, Users, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ComponentProps } from 'react';
import type { Tournament } from '../../types/domain';
import { officialAssets } from '../../assets/official';
import { competitionNow } from '../../services';
import { resolveTournamentTemporalPhase } from '../../utils/tournamentTime';
import { formatEventDate, formatEventTime } from '../../utils/calendar';
import { MediaBackdrop } from '../common/MediaBackdrop';
import { StatusBadge } from '../common/primitives';
import './competition-feature.css';

export function CompetitionFeature({ tournament, artwork, cinematic = false, currentTime }: { tournament: Tournament; artwork?: Pick<ComponentProps<typeof MediaBackdrop>, 'src' | 'srcSet' | 'sources' | 'width' | 'height' | 'focalDesktop' | 'focalMobile'>; cinematic?: boolean; currentTime?: Date }) {
  const phase = resolveTournamentTemporalPhase(tournament, currentTime ?? competitionNow());
  return <article className="competition-feature">
    <MediaBackdrop {...(artwork ?? { src: officialAssets.maps[0], srcSet: officialAssets.mapSrcSets[0], width: 1600, height: 900 })} sizes="(max-width: 900px) 100vw, 60vw" focalDesktop={artwork?.focalDesktop ?? (artwork ? '65% 45%' : '50% 50%')} focalMobile={artwork?.focalMobile ?? (artwork ? '64% 42%' : '50% 50%')} className="competition-feature__media" />
    <div className="competition-feature__identity">{cinematic ? <span className="competition-feature__official"><Crown size={19} aria-hidden="true" />Rəsmi Turnir</span> : <span>AEVIC · PUBG MOBILE</span>}<StatusBadge status={phase === 'live' ? 'live' : phase === 'completed' ? 'completed' : phase === 'registration-open' ? 'open' : 'draft'}>{({ live: 'Canlı', completed: 'Tamamlanıb', 'registration-open': 'Qeydiyyat açıq', 'registration-closed': 'Qeydiyyat bağlı', upcoming: 'Planlaşdırılıb', draft: 'Planlaşdırılır', cancelled: 'Ləğv edilib' })[phase]}</StatusBadge><h2>{tournament.name}</h2><p>{tournament.description}</p><Link to={`/tournaments/${tournament.id}`}>{cinematic ? 'Turnirə bax' : 'Turniri aç'} <ArrowRight size={20} aria-hidden="true" /></Link></div>
    <dl><div>{cinematic && <CalendarDays aria-hidden="true" />}<dt>{cinematic ? 'Tarix' : 'Başlanğıc'}</dt><dd>{formatEventDate(tournament.startsAt, { withTime: !cinematic })}</dd></div>{cinematic && <div><Clock3 aria-hidden="true" /><dt>Başlama vaxtı</dt><dd>{formatEventTime(tournament.startsAt)} AZT</dd></div>}<div>{cinematic && <Users aria-hidden="true" />}<dt>Komanda</dt><dd>{tournament.usedSlots}/{tournament.maxSlots}</dd></div><div>{cinematic && <Layers3 aria-hidden="true" />}<dt>Raund</dt><dd>{tournament.days * tournament.roundsPerDay}</dd></div></dl>
  </article>;
}
