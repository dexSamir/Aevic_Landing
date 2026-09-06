import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Crown, Swords, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { officialAssets, officialRotation } from '../../assets/official';
import { restoreLocalImageFallback, type ResponsiveImageSource } from '../../assets/imageDelivery';
import type { Tournament } from '../../types/domain';
import { Button, Countdown, ProgressBar, StatusBadge } from '../common/primitives';

export type MapMatchStatus = 'completed' | 'live' | 'next' | 'scheduled';

export interface CompetitionRoundProgramItem {
  id: string;
  map: string;
  round: number;
  startsAt: string;
  status: 'completed' | 'live' | 'upcoming' | 'scheduled';
  stageLabel: string;
}

const statusCopy: Record<MapMatchStatus, string> = {
  completed: 'Tamamlandı',
  live: 'Canlı',
  next: 'Növbəti',
  scheduled: 'Planlaşdırılıb',
};

const tacticalTags = [
  ['Açıq ərazi', 'Uzaq məsafə', 'Nəqliyyat'],
  ['Səhra', 'Uzaq məsafə', 'Hündürlük'],
  ['Şəhər döyüşü', 'Yaxın məsafə', 'Sürətli rotasiya'],
  ['Açıq ərazi', 'Qarışıq məsafə', 'Nəqliyyat'],
] as const;

function OfficialMapImage({ index, sizes, alt, eager = false }: { index: number; sizes: string; alt: string; eager?: boolean }) {
  const sources = officialAssets.mapSources[index] as ResponsiveImageSource[] | undefined;
  return <picture>
    {sources?.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />)}
    <img src={officialAssets.maps[index]} srcSet={officialAssets.mapSrcSets[index]} sizes={sizes} alt={alt} width={1600} height={900} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={(event) => restoreLocalImageFallback(event, officialAssets.maps[index])} />
  </picture>;
}

export function MapRotation({
  statuses = ['next', 'scheduled', 'scheduled', 'scheduled'],
  compact = false,
  heading,
  variant = 'standard',
  ariaLabel = 'Rəsmi xəritə rotasiyası',
}: {
  statuses?: MapMatchStatus[];
  compact?: boolean;
  heading?: string;
  variant?: 'standard' | 'stage' | 'program';
  ariaLabel?: string;
}) {
  if (variant === 'program') return <section className="map-program" aria-label={ariaLabel}>
    {heading && <header><Swords size={19} /><h2>{heading}</h2><span>4 raund</span></header>}
    <ol tabIndex={0} aria-label={ariaLabel}>
      {officialRotation.map((map, index) => {
        const status = statuses[index];
        return <li key={`${map}-${index}`} style={{ '--map-index': index } as CSSProperties}>
          <div className="map-program__frame">
            <div className="map-program__art"><OfficialMapImage index={index} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 22vw, 18rem" alt="" /></div>
            <div className="map-program__scrim" aria-hidden="true" />
            <span className="map-program__ghost" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {status && <span className={`map-program__pill map-program__pill--${status}`}>{statusCopy[status]}</span>}
            <div className="map-program__identity"><span className="map-program__round">Raund {String(index + 1).padStart(2, '0')}</span><strong>{map}</strong></div>
          </div>
        </li>;
      })}
    </ol>
  </section>;
  return <section className={`visual-map-rotation visual-map-rotation--${variant} ${compact ? 'visual-map-rotation--compact' : ''}`} aria-label="Rəsmi xəritə rotasiyası">
    {heading && <header><Swords size={19} /><h2>{heading}</h2><span>4 raund</span></header>}
    <div>
      {officialRotation.map((map, index) => {
        const status = statuses[index] ?? 'scheduled';
        return <article key={`${map}-${index}`} className={`map-card map-card--${status}`}>
          <OfficialMapImage index={index} sizes={compact ? '(max-width: 640px) 46vw, 18rem' : '(max-width: 640px) 82vw, (max-width: 1024px) 45vw, 25vw'} alt={`${map} xəritəsinin AEVIC turnir visualı`} eager={index === 0 && !compact} />
          <div className="map-card__shade" aria-hidden="true" />
          <div className="map-card__round"><span>Raund</span><strong>{String(index + 1).padStart(2, '0')}</strong></div>
          <div className="map-card__identity"><strong>{map}</strong><span>{statusCopy[status]}</span></div>
          {variant === 'stage' && <ul className="map-card__tags">{tacticalTags[index].map((tag) => <li key={tag}>{tag}</li>)}</ul>}
          {variant === 'standard' && <StatusBadge status={status === 'live' ? 'live' : status === 'completed' ? 'completed' : status === 'next' ? 'warning' : 'locked'}>{statusCopy[status]}</StatusBadge>}
        </article>;
      })}
    </div>
  </section>;
}

export function CompetitionRoundProgram({ rounds, tournamentId }: { rounds: CompetitionRoundProgramItem[]; tournamentId: string }) {
  return <section id="matches" className="competition-round-program" aria-labelledby="round-program-title">
    <header><div><span>RAUND PROQRAMI</span><h2 id="round-program-title">Xəritə və matç cədvəli</h2></div><Link to="/matches">Matç mərkəzi <ArrowRight size={16} /></Link></header>
    <ol>{rounds.map((round, index) => <li key={round.id}><Link to={`/tournaments/${tournamentId}#results`} state={{ roundId: round.id }} aria-label={`Raund ${round.round}, ${round.map} nəticələrinə keç`}><div className="competition-round-program__art"><OfficialMapImage index={index % officialAssets.maps.length} sizes="(max-width: 640px) 30vw, 18rem" alt="" /><span>R{String(round.round).padStart(2, '0')}</span></div><div className="competition-round-program__copy"><strong>{round.map}</strong><small>{round.stageLabel}</small></div><time dateTime={round.startsAt}>{new Date(round.startsAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}<strong>{new Date(round.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</strong></time><StatusBadge status={round.status === 'live' ? 'live' : round.status === 'completed' ? 'completed' : round.status === 'upcoming' ? 'warning' : 'locked'}>{round.status === 'live' ? 'Canlı' : round.status === 'completed' ? 'Nəticə' : round.status === 'upcoming' ? 'Növbəti' : 'Planlanıb'}</StatusBadge><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ol>
  </section>;
}

export function TournamentCountdown({ target, label = 'Qeydiyyat bağlanır' }: { target: string; label?: string }) {
  return <div className="tournament-countdown"><span>{label}</span><Countdown target={target} compact /></div>;
}

export function SlotProgress({ used, max }: { used: number; max: number }) {
  const remaining = Math.max(0, max - used);
  return <div className="slot-progress"><div><span>Komanda slotları</span><strong>{remaining} yer qalır</strong></div><ProgressBar value={used} max={max} /></div>;
}

export function MapRotationPreview({ statuses = ['next', 'scheduled', 'scheduled', 'scheduled'], heading = 'Bu axşamın rotasiyası' }: { statuses?: MapMatchStatus[]; heading?: string }) {
  return <MapRotation compact statuses={statuses} heading={heading} />;
}

export type TournamentParticipationState = 'available' | 'pending' | 'full' | 'registered';

const participationCopy: Record<TournamentParticipationState, { label: string; badge: 'open' | 'warning' | 'locked' | 'checked-in' }> = {
  available: { label: 'Qoşulmaq mümkündür', badge: 'open' },
  pending: { label: 'Təsdiq gözlənilir', badge: 'warning' },
  full: { label: 'Slotlar doludur', badge: 'locked' },
  registered: { label: 'Komandanız qeydiyyatdadır', badge: 'checked-in' },
};

export function DailyTournamentCard({ tournament, participationState = 'available', surface = 'public', showRotation = true }: { tournament: Tournament; participationState?: TournamentParticipationState; surface?: 'public' | 'team'; showRotation?: boolean }) {
  const remaining = tournament.maxSlots - tournament.usedSlots;
  const startTime = new Date(tournament.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  const checkInTime = new Date(tournament.checkInOpensAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  const participation = participationCopy[participationState];
  const destination = surface === 'team' ? `/team/tournaments/${tournament.id}` : `/tournaments/${tournament.id}`;
  const ctaLabel = participationState === 'registered' ? 'Turnir əməliyyatlarını aç' : 'Turnirə qoşul';
  return <article className={`daily-tournament-card ${showRotation ? '' : 'daily-tournament-card--focused'}`}>
    <div className="daily-tournament-card__summary">
      <div><StatusBadge status={participation.badge}>{participation.label}</StatusBadge><span className="demo-label">Bugün · {startTime}</span></div>
      <h3>{tournament.name}</h3>
      <p>Bu günün rəsmi PUBG Mobile ranking turniri.</p>
      <dl>
        <div><dt><Clock3 size={16} />Başlanğıc</dt><dd>{startTime}</dd></div>
        <div><dt><Users size={16} />Boş slot</dt><dd>{remaining} / {tournament.maxSlots}</dd></div>
        <div><dt><CalendarDays size={16} />Check-in</dt><dd>{checkInTime}</dd></div>
      </dl>
      <SlotProgress used={tournament.usedSlots} max={tournament.maxSlots} />
      <TournamentCountdown target={tournament.checkInOpensAt} label="Check-in açılır" />
      {participationState === 'pending' || participationState === 'full'
        ? <Button disabled icon={participationState === 'full' ? <Users size={18} /> : <Clock3 size={18} />}>{participation.label}</Button>
        : <Link className="button button--primary" to={destination}><span>{ctaLabel}</span>{participationState === 'registered' ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}</Link>}
    </div>
    {showRotation && <MapRotationPreview />}
  </article>;
}

export function TeamStatsVisual() {
  return <section className="team-stats-visual" aria-label="Komandanın son performansı">
    <header><div><Crown size={19} /><span>Son 5 raund</span></div><strong>Ranking forması</strong></header>
    <div className="team-stats-visual__bars">{[64, 82, 51, 74, 90].map((value, index) => <span key={index} style={{ '--bar-value': `${value}%` } as CSSProperties}><i /><b>R{index + 1}</b></span>)}</div>
    <dl><div><dt>Orta yer</dt><dd>4.8</dd></div><div><dt>Kill</dt><dd>27</dd></div><div><dt>WWCD</dt><dd>2</dd></div></dl>
  </section>;
}
