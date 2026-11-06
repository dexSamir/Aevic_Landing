import type { ReactNode } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminPanel({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`admin-panel ${className}`}><header className="admin-panel__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>{children}</section>;
}
export function AdminKpi({ label, value, detail, href, icon }: { label: string; value: number | string; detail: string; href: string; icon: ReactNode }) {
  return <Link className="admin-kpi" to={href}><div className="admin-kpi__label">{icon}<span>{label}</span><ArrowUpRight size={14} aria-hidden="true" /></div><strong>{typeof value === 'number' ? value.toLocaleString('az-AZ') : value}</strong><small>{detail}</small></Link>;
}
export function AdminSearch({ value, onChange, label = 'Axtar', placeholder = 'Ad və ya açar söz axtar' }: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string }) {
  return <div className="search-field"><Search size={17} aria-hidden="true" /><input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /></div>;
}
export function AdminListSummary({ count, total, children }: { count: number; total: number; children?: ReactNode }) {
  return <div className="admin-list-summary"><span><strong>{count.toLocaleString('az-AZ')}</strong> nəticə <span>· {total.toLocaleString('az-AZ')} qeyddən</span></span>{children}</div>;
}
export function AdminNotice({ children }: { children: ReactNode }) { return <p className="admin-notice" role="status">{children}</p>; }
export function AdminCollectionBar({ query, onQuery, count, total, order, onOrder, loaded = false }: { query: string; onQuery: (q: string) => void; count: number; total: number; order?: string; onOrder?: (order: string) => void; loaded?: boolean }) {
  return <><div className="admin-toolbar"><AdminSearch value={query} onChange={onQuery}/>{onOrder && <label className="field"><span>Sıralama</span><select aria-label="Sıralama" value={order} onChange={e => onOrder(e.target.value)}><option value="recent">Əvvəlcə ən yeni</option><option value="oldest">Əvvəlcə ən köhnə</option><option value="name">Ada görə A–Z</option></select></label>}</div><AdminListSummary count={count} total={total}>{loaded && <span>Yüklənmiş qeydlər arasında</span>}</AdminListSummary></>;
}
export function filterAdminItems<T>(items: readonly T[] | undefined, query: string, text: (item: T) => string, order = 'recent', date?: (item: T) => string): T[] {
  return [...(items ?? [])].filter(item => text(item).toLocaleLowerCase('az').includes(query.trim().toLocaleLowerCase('az'))).sort((a,b) => order === 'name' ? text(a).localeCompare(text(b), 'az') : date ? (order === 'oldest' ? 1 : -1) * (Date.parse(date(a)) - Date.parse(date(b))) : 0);
}
export function AdminReviewLinks({ teamId, tournamentId }: { teamId: string; tournamentId?: string }) {
  return <nav className="admin-review-links" aria-label="Yoxlama konteksti"><Link to={`/admin/teams/${teamId}`}>Komanda məlumatları <ArrowUpRight size={14}/></Link>{tournamentId&&<Link to={`/admin/tournaments/${tournamentId}`}>Turnir əməliyyatları <ArrowUpRight size={14}/></Link>}</nav>;
}
