import {
ChevronRight,
CircleUserRound,
FileText,
LogOut,
Menu
} from 'lucide-react';
import { useCallback,useEffect,useRef,useState,type CSSProperties,type KeyboardEvent as ReactKeyboardEvent,type ReactNode } from 'react';
import { isRouteErrorResponse,Link,Navigate,NavLink,useLocation,useNavigate,useRouteError } from 'react-router-dom';
import { publicNavigation } from '../app/publicNavigation';
import { BrandEmblem,BrandMark } from '../components/brand/BrandMark';
import { RouteSkeleton } from '../components/common/LoadingSkeleton';
import { RouteTransitionOutlet } from '../components/common/Motion';
import { Button,Drawer,IconButton,TeamLogo } from '../components/common/primitives';
import { RouteSeo } from '../components/common/Seo';
import { InstallAevic,OfflineNotice } from '../components/pwa/PwaExperience';
import { serviceCapabilities,services } from '../services';
import { PublicPlatformProvider } from '../services/PlatformDataContext';
import '../styles/public-shell.css';
import type { Team } from '../types/domain';
import { activePublicRoute } from '../utils/routes';
import { PublicFooter } from './PublicFooter';
import { usePlatformQuery } from '../services/queryCache';

function PublicNavLinks({ onNavigate, drawer = false }: { onNavigate?: () => void; drawer?: boolean }) {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState({ x: 0, width: 0, ready: false });
  const activeRoute = activePublicRoute(pathname);

  const positionIndicator = useCallback((element?: HTMLAnchorElement | null) => {
    if (drawer || !element) return;
    setIndicator({ x: element.offsetLeft, width: element.offsetWidth, ready: true });
  }, [drawer]);

  useEffect(() => {
    if (drawer) return;
    const activeItem = itemRefs.current.get(activeRoute);
    if (!activeItem) {
      setIndicator((current) => ({ ...current, ready: false }));
      return;
    }
    let frame = window.requestAnimationFrame(() => positionIndicator(activeItem));
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return () => window.cancelAnimationFrame(frame);
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => positionIndicator(itemRefs.current.get(activeRoute)));
    });
    observer.observe(nav);
    itemRefs.current.forEach((item) => observer.observe(item));
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [activeRoute, drawer, positionIndicator]);

  const indicatorStyle = {
    '--nav-indicator-x': `${indicator.x}px`,
    '--nav-indicator-width': `${indicator.width}px`,
  } as CSSProperties;

  return <nav ref={navRef} className={`public-nav-capsule ${drawer ? 'public-nav-capsule--drawer' : ''}`} aria-label="Əsas naviqasiya" data-indicator-ready={indicator.ready || undefined} style={drawer ? undefined : indicatorStyle}>{!drawer && <span className="public-nav-indicator" aria-hidden="true" />}{publicNavigation.primary.map((link) => { const current = activeRoute === link.to; const exactFamily = link.to === '/' ? pathname === '/' : pathname === link.to || pathname.startsWith(`${link.to}/`); return <NavLink key={link.to} ref={(node) => { if (node) itemRefs.current.set(link.to, node); else itemRefs.current.delete(link.to); }} to={link.to} end={link.end} className={current ? 'active' : undefined} aria-current={current ? exactFamily ? 'page' : 'location' : undefined} onClick={onNavigate}><span>{link.label}</span></NavLink>; })}</nav>;
}

function PublicAuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof services.auth.getSession>> | undefined>();
  const [team, setTeam] = useState<Team>();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    if (!serviceCapabilities.publicSession) {
      setSession(null);
      setTeam(undefined);
      return () => { active = false; };
    }
    services.auth.getSession().then(async (nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession && ['captain', 'team'].includes(nextSession.role)) {
        const nextTeam = await services.teams.current().catch(() => undefined);
        if (active) setTeam(nextTeam);
      } else setTeam(undefined);
    }).catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeFromOutside);
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  }, [open]);

  if (!session) return <div className="public-nav-actions"><Link aria-current={pathname === '/login' ? 'page' : undefined} className={`nav-login button button--secondary button--sm ${pathname === '/login' ? 'is-active' : ''}`} to={publicNavigation.login.to} onClick={onNavigate}>{publicNavigation.login.label}</Link><Link aria-current={pathname === '/register' ? 'page' : undefined} className={`nav-cta button button--primary button--sm ${pathname === '/register' ? 'is-active' : ''}`} to={publicNavigation.register.to} onClick={onNavigate}>{publicNavigation.register.label}</Link></div>;

  const close = (restoreFocus = false) => {
    setOpen(false);
    onNavigate?.();
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  };
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try {
      await services.auth.logout();
      setSession(null); close(); navigate('/');
    } catch { setLogoutError('Çıxış tamamlanmadı. Bağlantını yoxlayıb yenidən cəhd edin.'); }
    finally { setLoggingOut(false); }
  };
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + delta + items.length) % items.length]?.focus();
  };
  const isAdmin = session.role === 'admin';
  const hasTeamArea = !isAdmin && ['captain', 'team'].includes(session.role);
  const identity = isAdmin ? (session.user.firstName || 'Admin') : team?.name || session.user.firstName || 'Hesab';
  return <div className="public-nav-actions public-nav-actions--authenticated" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={buttonRef} type="button" className="public-identity-trigger" aria-label={`${identity} hesab menyusu`} aria-haspopup="menu" aria-expanded={open} aria-controls="public-identity-menu" onClick={() => setOpen((value) => !value)}>
      {hasTeamArea && team ? <TeamLogo name={team.name} src={team.logoUrl} size="sm" /> : <CircleUserRound size={20} />}
      <span className="public-identity-label">{identity}</span><ChevronRight size={15} aria-hidden="true" />
    </button>
    {open && <div ref={menuRef} id="public-identity-menu" className="public-identity-menu" role="menu" aria-label="Hesab əməliyyatları" onKeyDown={handleMenuKeyDown}>
      <header><span>{isAdmin ? 'ADMIN ACCESS' : team?.tag || 'AEVIC TEAM'}</span><strong>{identity}</strong></header>
      {isAdmin && <Link role="menuitem" tabIndex={-1} to="/admin" onClick={() => close()}>Admin paneli <ChevronRight size={16} /></Link>}
      {hasTeamArea && <Link role="menuitem" tabIndex={-1} to="/team" onClick={() => close()}>Komanda paneli <ChevronRight size={16} /></Link>}
      <Link role="menuitem" tabIndex={-1} to="/account/profile" onClick={() => close()}>Hesab <ChevronRight size={16} /></Link>
      <Link role="menuitem" tabIndex={-1} to={isAdmin ? '/admin/settings' : hasTeamArea ? '/team/settings' : '/account/security'} onClick={() => close()}>Ayarlar <ChevronRight size={16} /></Link>
      <button role="menuitem" tabIndex={-1} type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={16} /> {loggingOut ? 'Çıxış edilir…' : 'Çıxış'}</button>
      {logoutError && <p role="alert">{logoutError}</p>}
    </div>}
  </div>;
}

export function PublicHeader() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const transparentAtTop = pathname === '/' || pathname === '/teams' || /^\/teams\/(?!compare(?:\/|$))[^/]+$/.test(pathname);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', update); };
  }, [pathname]);

  const mode = transparentAtTop && !scrolled ? 'hero-top' : scrolled ? 'scrolled' : 'standard-top';
  return <><header className={`site-header site-header--${mode}`} data-public-header-state={mode}><div className="container site-header__inner"><BrandMark variant="navigation" /><div className="site-header__desktop"><PublicNavLinks /></div><div className="site-header__tools"><Link className="public-rules-link" aria-label="Yarış qaydaları" to={publicNavigation.rules.to} aria-current={pathname === '/regulations' ? 'page' : undefined}><FileText size={17} aria-hidden="true" /><span>{publicNavigation.rules.label}</span></Link><div className="site-header__auth"><PublicAuthActions /></div><IconButton className="site-header__menu" label="Menyunu aç" aria-expanded={menuOpen} aria-controls="public-mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></IconButton></div></div></header><Drawer id="public-mobile-menu" open={menuOpen} title="AEVIC menyu" onClose={() => setMenuOpen(false)}><div className="drawer-public-nav"><PublicNavLinks drawer onNavigate={() => setMenuOpen(false)} /><Link className="public-rules-link" to={publicNavigation.rules.to} onClick={() => setMenuOpen(false)}>{publicNavigation.rules.label}</Link><PublicAuthActions onNavigate={() => setMenuOpen(false)} /></div><div className="drawer-install"><InstallAevic /></div></Drawer></>;
}

export function PublicLayout() {
  const {data:settings}=usePlatformQuery({key:'platform:settings',scope:'public',query:()=>services.admin.publicSettings()});
  const { pathname } = useLocation();
  const needsData = pathname === '/leaderboard' || ['/teams', '/tournaments', '/organizations'].some((root) => pathname === root || pathname.startsWith(root + '/'));
  return <div className={`site-shell${pathname === '/tournaments' ? ' public-shell--wide' : ''}`}><RouteSeo /><OfflineNotice /><a className="skip-link" href="#main-content">Əsas məzmuna keç</a><PublicHeader /><main id="main-content" tabIndex={-1}>{settings?.maintenanceMessage&&<aside className="platform-announcement container" role="status">{settings.maintenanceMessage}</aside>}{needsData ? <PublicPlatformProvider><RouteTransitionOutlet /></PublicPlatformProvider> : <RouteTransitionOutlet />}</main><PublicFooter supportEmail={settings?.supportEmail} registrationEnabled={settings?.registrationEnabled} showCta={pathname !== '/matches' && pathname !== '/tournaments' && pathname !== '/teams' && !/^\/teams\/(?!compare(?:\/|$))[^/]+$/.test(pathname)} /></div>;
}

export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const forbidden = status === 401 || status === 403;
  return <main className="route-error"><BrandMark variant="signature" /><span>{status}</span><h1>{forbidden ? 'Bu səhifə üçün icazəniz yoxdur.' : status === 404 ? 'Bu səhifə yarış cədvəlində yoxdur.' : 'Platforma sorğunu tamamlaya bilmədi.'}</h1><p>{forbidden ? 'Hesab rolunuzu yoxlayın və ya dəstək xidməti ilə əlaqə saxlayın.' : status === 404 ? 'Ünvan dəyişdirilmiş və ya silinmiş ola bilər.' : 'Bir az sonra yenidən cəhd edin və ya ana səhifəyə qayıdın.'}</p><Link className="button button--primary" to={forbidden ? '/login' : '/'}><span>{forbidden ? 'Girişə keç' : 'Ana səhifəyə qayıt'}</span></Link></main>;
}

export function ProtectedRoute({ area, children }: { area: 'team' | 'admin' | 'account'; children: ReactNode }) {
  const [checking, setChecking] = useState<boolean>(true);
  const [allowed, setAllowed] = useState(false);
  const [deniedPath, setDeniedPath] = useState(!serviceCapabilities.publicSession ? (area === 'admin' ? '/admin/login' : '/login') : '');
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [identity,setIdentity] = useState('');
  useEffect(()=>{const refresh=()=>setAttempt(n=>n+1);window.addEventListener('focus',refresh);window.addEventListener('aevic:session-change',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('aevic:session-change',refresh);};},[]);
  useEffect(() => {
    let active = true;
    if (!serviceCapabilities.publicSession) {
      setAllowed(false);
      setDeniedPath(area === 'admin' ? '/admin/login' : '/login');
      setChecking(false);
      return;
    }
    setUnavailable(false);
    services.auth.getSession().then((session) => {
      if (!active) return;
      const accepted = area === 'admin' ? session?.role === 'admin' : area === 'account' ? Boolean(session) : Boolean(session && ['captain', 'team', 'admin'].includes(session.role));
      setIdentity(session?.user.id??'');setAllowed(accepted);
      if (!accepted) setDeniedPath(session ? '/forbidden' : area === 'admin' ? '/admin/login' : '/login');
    }).catch(() => { if(active) { setAllowed(false); setUnavailable(true); } }).finally(() => { if(active)setChecking(false); });
    return () => { active = false; };
  }, [area, attempt]);
  if (checking) return <main className="route-loading"><div className="route-loading__identity"><BrandEmblem decorative={false} /><span>AEVIC secure access</span></div><RouteSkeleton path={window.location.pathname}/></main>;
  if (unavailable) return <main className="route-loading"><h1>Bağlantını yoxlayın</h1><p role="status">Hesab sessiyasını yoxlamaq mümkün olmadı. Bir az sonra yenidən cəhd edin.</p><Button onClick={() => setAttempt(value => value + 1)}>Yenidən yoxla</Button></main>;
  if (!allowed) return <Navigate to={deniedPath || (area === 'admin' ? '/admin/login' : '/login')} replace />;
  return <div key={identity} data-protected-area={area}>{children}</div>;
}
