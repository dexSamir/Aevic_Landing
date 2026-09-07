import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './stat-card-strip.css';

export type StatCardItem = {
  key: string;
  eyebrow: string;
  value: ReactNode;
  meta?: ReactNode;
  icon: ReactNode;
  tone: 'gold' | 'purple' | 'ink' | 'soft';
  href?: string;
};

/** Compact operational facts shared by public, team and admin views. */
export function StatCardStrip({ items, label }: { items: readonly StatCardItem[]; label: string }) {
  return <ul className="team-stat-slider" aria-label={label}>{items.map((item) => {
    const content = <><span className="team-stat-slider__heading"><span className="team-stat-slider__eyebrow">{item.eyebrow}</span><span aria-hidden="true">{item.icon}</span></span><strong>{item.value}</strong>{item.meta && <small>{item.meta}</small>}</>;
    const className = `team-stat-slider__card team-stat-slider__card--${item.tone}`;
    return <li key={item.key}>{item.href ? <Link to={item.href} className={className}>{content}</Link> : <div className={className}>{content}</div>}</li>;
  })}</ul>;
}
