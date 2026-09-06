import { ArrowRight } from 'lucide-react';
import { publicImageUrl } from '../../utils/mediaUrl';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type TeamMarkSize = 'sm' | 'md' | 'lg' | 'xl';

function teamInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toLocaleUpperCase('az');
}

export function TeamMark({ name, src, size = 'md', className = '' }: { name: string; src?: string; size?: TeamMarkSize; className?: string }) {
  const [failed, setFailed] = useState<string>();
  const safeSrc = publicImageUrl(src);
  const visible = safeSrc && failed !== safeSrc;
  return <span className={`team-logo team-mark team-logo--${size} ${visible ? 'team-mark--artwork' : 'team-mark--fallback'} ${className}`.trim()}>
    {visible ? <img src={safeSrc} onError={() => setFailed(safeSrc)} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{teamInitials(name)}</span>}
  </span>;
}

export function TeamLogo(props: Parameters<typeof TeamMark>[0]) {
  return <TeamMark {...props} />;
}

export function TeamRosterReveal({ name, tag, roster = [], profileHref, meta, variant = 'default', id }: { name: string; tag?: string; roster?: string[]; profileHref?: string; meta?: ReactNode; variant?: 'default' | 'names-only'; id?: string }) {
  if (variant === 'names-only') return <div id={id} className="team-roster-reveal team-roster-reveal--names" aria-label={`${name} ictimai oyunçu adları`}>
    <span>İCTİMAİ HEYƏT</span>
    {roster.length ? <ul>{roster.map((player) => <li key={player}>{player}</li>)}</ul> : <p>Oyunçu adları dərc edilməyib.</p>}
  </div>;
  return <div className="team-roster-reveal">
    <span>{tag || 'PUBG MOBILE'}</span>
    <h3>{name}</h3>
    {roster.length ? <p>{roster.join(' · ')}</p> : meta ? <p>{meta}</p> : null}
    {profileHref && <Link to={profileHref}>Public profil <ArrowRight size={16} aria-hidden="true" /></Link>}
  </div>;
}

export function TeamLogoTile({ id, name, tag, logoUrl, roster, profileHref, meta, selected = false, onSelect, ordinal, className = '', selectLabel, controlsId, revealVariant = 'default' }: { id: string; name: string; tag?: string; logoUrl?: string; roster?: string[]; profileHref: string; meta?: ReactNode; selected?: boolean; onSelect?: (id: string) => void; ordinal?: number; className?: string; selectLabel?: string; controlsId?: string; revealVariant?: 'default' | 'names-only' }) {
  return <article className={`team-logo-tile ${selected ? 'is-selected' : ''} ${className}`.trim()} data-team-id={id}>
    {typeof ordinal === 'number' && <span className="team-logo-tile__ordinal" aria-hidden="true">{String(ordinal).padStart(2, '0')}</span>}
    {onSelect ? <button type="button" aria-label={selectLabel ?? `${name} komandasını seç`} aria-pressed={selected} aria-expanded={revealVariant === 'default' ? selected : undefined} aria-controls={revealVariant === 'default' ? controlsId : undefined} aria-describedby={revealVariant === 'names-only' ? controlsId : undefined} onClick={() => onSelect(id)}><TeamMark name={name} src={logoUrl} size="xl" /><span className="team-logo-tile__label"><strong>{name}</strong><small>{meta ?? tag ?? 'PUBG Mobile'}</small></span></button> : <Link className="team-logo-tile__destination" to={profileHref} aria-label={`${name} public profilini aç`}><TeamMark name={name} src={logoUrl} size="xl" /><span className="team-logo-tile__label"><strong>{name}</strong><small>{meta ?? tag ?? 'PUBG Mobile'}</small></span></Link>}
    <TeamRosterReveal id={controlsId} name={name} tag={tag} roster={roster} profileHref={onSelect && revealVariant === 'default' ? profileHref : undefined} meta={meta} variant={revealVariant} />
  </article>;
}
