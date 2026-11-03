import { SkipLink } from '../components/common/SkipLink';
import { SkeletonBlock } from '../components/common/LoadingSkeleton';
import { useState, type ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TournamentCommandSkeleton } from '../features/tournament-command/TournamentCommandSkeleton';
import { Link, useLocation } from 'react-router-dom';
import { BrandEmblem } from '../components/brand/BrandMark';
import './team-workspace-frame.css';

/** Shared geometry for session resolution, data resolution and the ready workspace. */
export function TeamWorkspaceFrame({ sidebar, header, children, overlays, busy = false }: {
  sidebar: ReactNode; header: ReactNode; children: ReactNode; overlays?: ReactNode; busy?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('aevic:desktop-sidebar-collapsed') === 'true'; } catch { return false; } });
  const toggle = () => { const next = !collapsed; setCollapsed(next); try { localStorage.setItem('aevic:desktop-sidebar-collapsed', String(next)); } catch { /* Session-only state when storage is unavailable. */ } };
  return <div data-sidebar-collapsed={collapsed || undefined} className="product-shell product-shell--team team-workspace-frame" aria-busy={busy || undefined}>
    <SkipLink target="main-content" />
    <button type="button" className="icon-button workspace-desktop-toggle" aria-label={collapsed ? 'Yan paneli genişləndir' : 'Yan paneli yığ'} aria-expanded={!collapsed} aria-controls="team-desktop-sidebar" onClick={toggle}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
    <aside id="team-desktop-sidebar" className="product-sidebar">{sidebar}</aside>
    <div className="product-main">{header}<main id="main-content" className="product-page" tabIndex={-1}>{children}</main></div>
    {overlays}
  </div>;
}

const Placeholder = ({ kind = 'line' }: { kind?: string }) => <SkeletonBlock className={`workspace-placeholder workspace-placeholder--${kind}`} />;

function PendingSidebar({ loading = true }: { loading?: boolean }) {
  return <>
    {loading ? <><div aria-hidden="true" className="workspace-pending-identity"><Placeholder kind="avatar" /><div><Placeholder /><Placeholder kind="short" /></div></div>
    <div aria-hidden="true" className="workspace-pending-nav">{[2, 3, 3, 2].map((count, group) => <div key={group}><Placeholder kind="label" />{Array.from({ length: count }, (_, index) => <div className="workspace-pending-nav__item" key={index}><Placeholder kind="icon" /><Placeholder /></div>)}</div>)}</div></> : <nav className="workspace-recovery-nav" aria-label="İş sahəsi dəstəyi"><Link to="/account/profile">Hesab ayarları</Link><Link to="/support">Dəstək mərkəzi</Link><Link to="/">Ana səhifə</Link></nav>}
  </>;
}

export function TeamWorkspacePlaceholder({ children, phase = 'context' }: { children?: ReactNode; phase?: 'route' | 'session' | 'context' }) {
  const { pathname } = useLocation();
  const tournamentDetail = /^\/team\/tournaments\/[^/]+\/?$/.test(pathname);
  return <TeamWorkspaceFrame busy={!children} sidebar={<PendingSidebar loading={!children} />} header={<header className="product-topbar">
    <div className="workspace-pending-header"><BrandEmblem variant="compact" /></div>
    {children ? <Link className="workspace-recovery-link" to="/account/profile">Hesab ayarları</Link> : <div className="workspace-pending-actions" aria-hidden="true"><Placeholder kind="control" /><Placeholder kind="control" /><span className="workspace-pending-menu"><Placeholder kind="control" /></span></div>}
  </header>}>{children ?? (tournamentDetail ? <TournamentCommandSkeleton /> : <div className="workspace-loading" data-loading-phase={phase} role="status" aria-label="AEVIC komanda iş sahəsi yüklənir">
    <span className="sr-only">Komanda iş sahəsi hazırlanır.</span>
    <div aria-hidden="true">
      <div className="workspace-pending-title"><Placeholder kind="label" /><Placeholder kind="title" /><Placeholder kind="description" /></div>
      <div className="workspace-analytics-loading"><BrandEmblem variant="compact" /><div><strong>Matç analitikası hazırlanır</strong><p>Rəsmi nəticələr və komanda göstəriciləri yüklənir.</p></div></div>
      <div className="workspace-pending-stats">{Array.from({ length: 5 }, (_, index) => <div key={index}><Placeholder kind="value" /><Placeholder kind="label" /></div>)}</div>
      <div className="workspace-pending-charts">{[0,1].map(index=><div className="workspace-pending-chart" key={index}><Placeholder kind="label" /><div className="workspace-chart-placeholder"><Placeholder /><Placeholder /><Placeholder /></div></div>)}</div>
      <div className="workspace-pending-columns">{[4, 3].map((count, index) => <div className="workspace-pending-panel" key={index}><Placeholder kind="label" />{Array.from({ length: count }, (_, row) => <div className="workspace-pending-row" key={row}><Placeholder kind="icon" /><Placeholder /><Placeholder kind="short" /></div>)}</div>)}</div>
    </div>
  </div>)}</TeamWorkspaceFrame>;
}
