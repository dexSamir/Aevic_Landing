import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandEmblem } from '../components/brand/BrandMark';
import './team-workspace-frame.css';

/** Shared geometry for session resolution, data resolution and the ready workspace. */
export function TeamWorkspaceFrame({ sidebar, header, children, overlays, busy = false }: {
  sidebar: ReactNode; header: ReactNode; children: ReactNode; overlays?: ReactNode; busy?: boolean;
}) {
  return <div className="product-shell product-shell--team team-workspace-frame" aria-busy={busy || undefined}>
    <a className="skip-link" href="#main-content">Əsas məzmuna keç</a>
    <aside className="product-sidebar">{sidebar}</aside>
    <div className="product-main">{header}<main id="main-content" className="product-page" tabIndex={-1}>{children}</main></div>
    {overlays}
  </div>;
}

const Placeholder = ({ kind = 'line' }: { kind?: string }) => <span className={`workspace-placeholder workspace-placeholder--${kind}`} />;

function PendingSidebar({ loading = true }: { loading?: boolean }) {
  return <><div className="workspace-brand"><BrandEmblem /><span>AEVIC<small>Komanda iş sahəsi</small></span></div>
    {loading ? <><div aria-hidden="true" className="workspace-pending-identity"><Placeholder kind="avatar" /><div><Placeholder /><Placeholder kind="short" /></div></div>
    <div aria-hidden="true" className="workspace-pending-nav">{[2, 3, 3, 2].map((count, group) => <div key={group}><Placeholder kind="label" />{Array.from({ length: count }, (_, index) => <div className="workspace-pending-nav__item" key={index}><Placeholder kind="icon" /><Placeholder /></div>)}</div>)}</div></> : <nav className="workspace-recovery-nav" aria-label="İş sahəsi dəstəyi"><Link to="/account/profile">Hesab ayarları</Link><Link to="/support">Dəstək mərkəzi</Link><Link to="/">Ana səhifə</Link></nav>}
  </>;
}

export function TeamWorkspacePlaceholder({ children, phase = 'context' }: { children?: ReactNode; phase?: 'route' | 'session' | 'context' }) {
  return <TeamWorkspaceFrame busy={!children} sidebar={<PendingSidebar loading={!children} />} header={<header className="product-topbar">
    <div className="workspace-pending-header"><BrandEmblem variant="compact" /><span>Komanda iş sahəsi</span></div>
    {children ? <Link className="workspace-recovery-link" to="/account/profile">Hesab ayarları</Link> : <div className="workspace-pending-actions" aria-hidden="true"><Placeholder kind="control" /><Placeholder kind="control" /><span className="workspace-pending-menu"><Placeholder kind="control" /></span></div>}
  </header>}>{children ?? <div className="workspace-loading" data-loading-phase={phase} role="status" aria-label="AEVIC komanda iş sahəsi yüklənir">
    <span className="sr-only">Komanda iş sahəsi hazırlanır.</span>
    <div aria-hidden="true">
      <div className="workspace-pending-title"><Placeholder kind="label" /><Placeholder kind="title" /><Placeholder kind="description" /></div>
      <div className="workspace-pending-command"><Placeholder kind="label" /><Placeholder kind="title" /><Placeholder kind="description" /><Placeholder kind="button" /></div>
      <div className="workspace-pending-stats">{Array.from({ length: 5 }, (_, index) => <div key={index}><Placeholder kind="value" /><Placeholder kind="label" /></div>)}</div>
      <div className="workspace-pending-columns">{[4, 3].map((count, index) => <div className="workspace-pending-panel" key={index}><Placeholder kind="label" />{Array.from({ length: count }, (_, row) => <div className="workspace-pending-row" key={row}><Placeholder kind="icon" /><Placeholder /><Placeholder kind="short" /></div>)}</div>)}</div>
    </div>
  </div>}</TeamWorkspaceFrame>;
}
