import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TeamLogo } from './TeamIdentity';
import './roster-team-card.css';

/** One logo element and no hover requests; touch keeps the normal profile link. */
export function RosterTeamCard({ name, logoUrl, href, roster = [], children, context, className = '' }: {
  name: string; logoUrl?: string; href: string; roster?: Array<{ id: string; ign: string }>;
  children: ReactNode; context?: ReactNode; className?: string;
}) {
  const players = roster.filter(player => player.ign.trim());
  return <Link to={href} aria-label={`${name} komanda profili`} className={`roster-team-card ${players.length ? 'roster-team-card--has-roster' : ''} ${className}`}>
    {context}
    <TeamLogo name={name} src={logoUrl} size="lg" sizes="144px" />
    <div className="roster-team-card__info">{children}</div>
    {players.length > 0 && <ul className="roster-team-card__players" aria-label={`${name} heyəti`}>{players.map(player => <li key={player.id}>{player.ign}</li>)}</ul>}
  </Link>;
}
