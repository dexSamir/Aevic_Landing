import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface ContextNavItem {
  label: string;
  to?: string;
  href?: string;
  current?: boolean;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return <nav className="breadcrumbs" aria-label="Səhifə yolu"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{index > 0 && <ChevronRight size={14} aria-hidden="true" />}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}

export function EntityContextNav({ label, back, items, action }: { label: string; back?: { label: string; to: string }; items: ContextNavItem[]; action?: ReactNode }) {
  return <div className="entity-context-bar">
    <nav aria-label={label}>
      {back && <Link className="entity-context-bar__back" to={back.to}><ArrowLeft size={15} />{back.label}</Link>}
      <div>{items.map((item) => item.href
        ? <a key={item.label} href={item.href} aria-current={item.current ? 'location' : undefined}>{item.label}</a>
        : <Link key={item.label} to={item.to ?? '#'} aria-current={item.current ? 'page' : undefined}>{item.label}</Link>)}</div>
    </nav>
    {action && <div className="entity-context-bar__action">{action}</div>}
  </div>;
}
