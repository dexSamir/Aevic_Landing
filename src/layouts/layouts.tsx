import { SidebarNav } from './WorkspaceNav';
import '../styles/public-shell.css';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  FileText,
  GitCompareArrows,
  History,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeft,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { PublicPlatformProvider } from '../services/PlatformDataContext';
import { isRouteErrorResponse, Link, Navigate, NavLink, useLocation, useNavigate, useRouteError } from 'react-router-dom';
import { officialAssets } from '../assets/official';
import { BrandEmblem, BrandMark } from '../components/brand/BrandMark';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { Button, Drawer, IconButton, LoadingSkeleton, StatusBadge, TeamLogo } from '../components/common/primitives';
import { competitionNow, demoMode, serviceCapabilities, services } from '../services';
import { publicNavigation } from '../app/publicNavigation';
import { PublicFooter } from './PublicFooter';
import { InstallAevic, OfflineNotice } from '../components/pwa/PwaExperience';
import { RouteSeo } from '../components/common/Seo';
import { RouteTransitionOutlet } from '../components/common/Motion';
import type { Team } from '../types/domain';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../services/PlatformDataContext';
import { activePublicRoute } from '../utils/routes';
import { formatEventDate } from '../utils/calendar';
import { productRouteMetadata, type ProductArea } from '../utils/routeMetadata';

const teamLinks = [
  { to: '/team', label: 'İcmal', icon: LayoutDashboard, end: true, group: 'Əsas' },
  { to: '/team/tournaments', label: 'Turnirlərim', icon: Trophy, group: 'Əsas' },
  { to: '/team/roster', label: 'Heyət', icon: Users, group: 'Heyət' },
  { to: '/team/roster-requests', label: 'Heyət sorğuları', icon: ListChecks, group: 'Heyət' },
  { to: '/team/invitations', label: 'Dəvətlər', icon: UserRoundCog, group: 'Heyət' },
  { to: '/team/settings/managers', label: 'Menecerlər', icon: Users, group: 'Heyət' },
  { to: '/team/history', label: 'Tarixçə', icon: History, group: 'Karyera' },
  { to: '/team/comparison', label: 'Müqayisə', icon: GitCompareArrows, group: 'Karyera' },
  { to: '/team/sharecards', label: 'Paylaşım studiyası', icon: Sparkles, group: 'Karyera' },
  { to: '/team/badges', label: 'Nişan kabineti', icon: Trophy, group: 'Karyera' },
  { to: '/team/notifications', label: 'Bildirişlər', icon: Bell, group: 'Əlaqə' },
  { to: '/team/messages', label: 'Mesajlar', icon: MessageSquare, group: 'Əlaqə' },
  { to: '/team/disputes', label: 'Etirazlar', icon: FileText, group: 'Əlaqə' },
  { to: '/team/verification', label: 'Təsdiq', icon: ShieldAlert, group: 'İdarəetmə' },
  { to: '/team/settings', label: 'Komanda ayarları', icon: Settings, group: 'İdarəetmə' },
];

const adminLinks = [
  { to: '/admin', label: 'Diqqət tələb edənlər', icon: LayoutDashboard, end: true, group: 'Əməliyyatlar' },
  { to: '/admin/roster-requests', label: 'Heyət növbəsi', icon: ListChecks, group: 'Əməliyyatlar' },
  { to: '/admin/disputes', label: 'Etiraz növbəsi', icon: FileText, group: 'Əməliyyatlar' },
  { to: '/admin/check-ins/missed', label: 'Buraxılmış check-in', icon: CalendarDays, group: 'Əməliyyatlar' },
  { to: '/admin/tournaments', label: 'Turnirlər', icon: Trophy, group: 'Yarış' },
  { to: '/admin/results', label: 'Nəticələr', icon: FileText, group: 'Yarış' },
  { to: '/admin/teams', label: 'Komandalar', icon: Users, group: 'Qurumlar' },
  { to: '/admin/organizations', label: 'Təşkilatlar', icon: Sparkles, group: 'Qurumlar' },
  { to: '/admin/verifications', label: 'Təsdiqlər', icon: ShieldAlert, group: 'Qurumlar' },
  { to: '/admin/support', label: 'Dəstək', icon: MessageSquare, group: 'Dəstək' },
  { to: '/admin/messages', label: 'Mesajlar', icon: MessageSquare, group: 'Moderasiya' },
  { to: '/admin/blacklist', label: 'Qara siyahı', icon: ShieldAlert, group: 'Moderasiya' },
  { to: '/admin/audit', label: 'Audit jurnalı', icon: History, group: 'Sistem' },
  { to: '/admin/users', label: 'Admin istifadəçiləri', icon: UserRoundCog, group: 'Sistem' },
  { to: '/admin/settings', label: 'Parametrlər', icon: Settings, group: 'Sistem' },
];

export function productRouteTitle(pathname: string, area: ProductArea) {
  return productRouteMetadata(pathname, area)?.title ?? (area === 'team' ? 'Komanda iş sahəsi' : 'Admin əməliyyatları');
}

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

  return <nav ref={navRef} className={`public-nav-capsule ${drawer ? 'public-nav-capsule--drawer' : ''}`} aria-label="Əsas naviqasiya" data-indicator-ready={indicator.ready || undefined} style={drawer ? undefined : indicatorStyle}>{!drawer && <span className="public-nav-indicator" aria-hidden="true" />}{publicNavigation.primary.map((link) => { const current = activeRoute === link.to; const exactFamily = link.to === '/' ? pathname === '/' : pathname === link.to || pathname.startsWith(`${link.to}/`); return <NavLink key={link.to} ref={(node) => { if (node) itemRefs.current.set(link.to, node); else itemRefs.current.delete(link.to); }} to={link.to} end={link.end} className={current ? 'active' : undefined} aria-current={current ? exactFamily ? 'page' : 'location' : undefined} onClick={onNavigate}>{link.label}</NavLink>; })}</nav>;
}

function PublicAuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof services.auth.getSession>> | undefined>();
  const [team, setTeam] = useState<Team>();
  const [open, setOpen] = useState(false);

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
    await services.auth.logout();
    setSession(null);
    close();
    navigate('/');
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
      <span>{identity}</span><ChevronRight size={15} aria-hidden="true" />
    </button>
    {open && <div ref={menuRef} id="public-identity-menu" className="public-identity-menu" role="menu" aria-label="Hesab əməliyyatları" onKeyDown={handleMenuKeyDown}>
      <header><span>{isAdmin ? 'ADMIN ACCESS' : team?.tag || 'AEVIC TEAM'}</span><strong>{identity}</strong></header>
      {isAdmin && <Link role="menuitem" tabIndex={-1} to="/admin" onClick={() => close()}>Admin paneli <ChevronRight size={16} /></Link>}
      {hasTeamArea && <Link role="menuitem" tabIndex={-1} to="/team" onClick={() => close()}>Komanda paneli <ChevronRight size={16} /></Link>}
      <Link role="menuitem" tabIndex={-1} to="/account/profile" onClick={() => close()}>Hesab <ChevronRight size={16} /></Link>
      <Link role="menuitem" tabIndex={-1} to={isAdmin ? '/admin/settings' : '/team/settings'} onClick={() => close()}>Ayarlar <ChevronRight size={16} /></Link>
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => void logout()}><LogOut size={16} /> Çıxış</button>
    </div>}
  </div>;
}

export function PublicHeader() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const transparentAtTop = pathname === '/';

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
  const { pathname } = useLocation();
  const needsData = pathname === '/leaderboard' || ['/teams', '/tournaments', '/organizations'].some((root) => pathname === root || pathname.startsWith(root + '/'));
  return <div className="site-shell"><RouteSeo /><OfflineNotice /><a className="skip-link" href="#main-content">Əsas məzmuna keç</a><PublicHeader /><main id="main-content" tabIndex={-1}>{needsData ? <PublicPlatformProvider><RouteTransitionOutlet /></PublicPlatformProvider> : <RouteTransitionOutlet />}</main><PublicFooter /></div>;
}

export function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  return <div className={`auth-shell ${isRegister ? 'auth-shell--register' : ''}`}>
    <RouteSeo /><OfflineNotice /><a className="skip-link" href="#main-content">Əsas məzmuna keç</a><PublicHeader />
    <main id="main-content" tabIndex={-1}>
      <MediaBackdrop src={officialAssets.authBackdrop} srcSet={officialAssets.authBackdropSrcSet} sources={officialAssets.authBackdropSources} sizes="100vw" className="auth-shell__media" priority width={1586} height={992} focalDesktop="49% 48%" focalMobile="44% 45%" />
      <div className="auth-shell__content"><RouteTransitionOutlet family="auth" /></div>
    </main>
    <PublicFooter />
  </div>;
}


function ProductTopbar({ metadata, admin = false, onMenu }: { metadata?: ReturnType<typeof productRouteMetadata>; team?: Team; admin?: boolean; onMenu: () => void }) {
  return <header className="product-topbar"><div className="product-topbar__mobile-identity"><IconButton className="product-topbar__menu" label="Naviqasiyanı aç" onClick={onMenu}><PanelLeft size={20} /></IconButton><BrandMark variant="compact" /></div><div className="product-topbar__route"><span>{metadata?.parentLabel ?? (admin ? 'Admin' : 'Komanda iş sahəsi')}</span><strong>{metadata?.title ?? (admin ? 'Admin əməliyyatları' : 'Komanda iş sahəsi')}</strong>{demoMode && !admin && <small className="demo-mode-indicator">NÜMUNƏ</small>}</div><div className="product-topbar__actions">{!admin && <Link className="icon-button" aria-label="Bildirişlər" to="/team/notifications"><Bell size={19} /></Link>}<Link className="icon-button" aria-label={admin ? 'Admin hesabı' : 'Hesab ayarları'} title={admin ? 'Admin hesabı' : 'Hesab ayarları'} to={admin ? '/admin/users' : '/account/profile'}><CircleUserRound size={20} /></Link></div></header>;
}

function TeamIdentityBlock({ team, compact = false, onNavigate }: { team: Team; compact?: boolean; onNavigate?: () => void }) {
  const profilePath = `/teams/${encodeURIComponent(team.slug ?? team.id)}`;
  return <div className={compact ? 'team-identity team-identity--drawer drawer-identity' : 'team-identity'}><TeamLogo name={team.name} src={team.logoUrl} /><div className="team-identity__body"><strong title={team.name}>{team.name}</strong>{!compact && <StatusBadge status="approved" />}<Link to={profilePath} onClick={onNavigate}>İctimai profili aç <ExternalLink size={14} aria-hidden="true" /></Link></div></div>;
}

export function TeamLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { currentTeam: team, notifications: inbox } = useTeamPlatformData();
  const activeContext = useTeamCompetitionContexts().current;
  const unread = inbox.filter((item) => !item.read).length;
  const nextMatch = activeContext?.nextMatch;
  const activeTournament = activeContext?.tournament;
  const tournamentContext = nextMatch && activeTournament ? <Link className="sidebar-note sidebar-note--interactive" to={`/team/tournaments/${activeTournament.id}`} aria-label={`${nextMatch.map}, Raund ${nextMatch.round} turnir əməliyyatlarını aç`}><CalendarDays size={17} aria-hidden="true" /><span>Növbəti matç<strong>{nextMatch.map} · {new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}</strong></span><ChevronRight size={16} aria-hidden="true" /></Link> : <div className="sidebar-note sidebar-note--status"><CalendarDays size={17} aria-hidden="true" /><span>Növbəti matç<strong>Hələ planlanmayıb</strong></span></div>;
  return <div className="product-shell product-shell--team"><RouteSeo /><aside className="product-sidebar"><BrandMark variant="navigation" /><TeamIdentityBlock team={team} /><SidebarNav links={teamLinks} unread={unread} />{tournamentContext}</aside><div className="product-main"><ProductTopbar metadata={productRouteMetadata(pathname, 'team')} team={team} onMenu={() => setMenuOpen(true)} /><main id="main-content" className="product-page" tabIndex={-1}><RouteTransitionOutlet family="team" /></main></div><Drawer open={menuOpen} title="Komanda paneli" onClose={() => setMenuOpen(false)}><TeamIdentityBlock team={team} compact onNavigate={() => setMenuOpen(false)} /><SidebarNav links={teamLinks} unread={unread} onNavigate={() => setMenuOpen(false)} />{nextMatch && activeTournament && <Link className="drawer-tournament-context" to={`/team/tournaments/${activeTournament.id}`} onClick={() => setMenuOpen(false)}>Növbəti matç · {nextMatch.map} · {new Date(nextMatch.startsAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' })}<ChevronRight size={16} aria-hidden="true" /></Link>}</Drawer></div>;
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  return <div className="product-shell product-shell--admin"><RouteSeo /><aside className="product-sidebar"><BrandMark /><div className="admin-identity"><UserRoundCog size={20} /><div><strong>Yarış əməliyyatları</strong><span>Admin iş sahəsi</span></div></div><SidebarNav links={adminLinks} label="Admin naviqasiyası" />{demoMode && <div className="sidebar-note sidebar-note--warning"><ShieldAlert size={17} /><span>Nümunə adapter<strong>Backend girişi tələb olunur</strong></span></div>}</aside><div className="product-main"><ProductTopbar metadata={productRouteMetadata(pathname, 'admin')} admin onMenu={() => setMenuOpen(true)} /><main id="main-content" className="product-page" tabIndex={-1}>{demoMode && <div className="mock-banner"><LogIn size={17} /><span>Nümunə admin sessiyası · yarış vaxtı {formatEventDate(competitionNow(), { withTime: true })} AZT · brauzer qoruması avtorizasiya deyil</span></div>}<RouteTransitionOutlet family="admin" /></main></div><Drawer open={menuOpen} title="Admin naviqasiyası" onClose={() => setMenuOpen(false)}><SidebarNav links={adminLinks} label="Admin naviqasiyası" onNavigate={() => setMenuOpen(false)} /></Drawer></div>;
}

export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const forbidden = status === 401 || status === 403;
  return <main className="route-error"><span>{status}</span><h1>{forbidden ? 'Bu səhifə üçün icazəniz yoxdur.' : status === 404 ? 'Bu səhifə yarış cədvəlində yoxdur.' : 'Platforma sorğunu tamamlaya bilmədi.'}</h1><p>{forbidden ? 'Hesab rolunuzu yoxlayın və ya dəstək xidməti ilə əlaqə saxlayın.' : status === 404 ? 'Ünvan dəyişdirilmiş və ya silinmiş ola bilər.' : 'Bir az sonra yenidən cəhd edin. Raw server xətası göstərilmir.'}</p><Link className="button button--primary" to={forbidden ? '/login' : '/'}><span>{forbidden ? 'Girişə keç' : 'Ana səhifəyə qayıt'}</span></Link></main>;
}

export function ProtectedRoute({ area, children }: { area: 'team' | 'admin'; children: ReactNode }) {
  const [checking, setChecking] = useState(!serviceCapabilities.mockPreview && serviceCapabilities.publicSession);
  const [allowed, setAllowed] = useState(serviceCapabilities.mockPreview);
  const [deniedPath, setDeniedPath] = useState(!serviceCapabilities.mockPreview && !serviceCapabilities.publicSession ? (area === 'admin' ? '/admin/login' : '/login') : '');
  useEffect(() => {
    if (serviceCapabilities.mockPreview) return;
    if (!serviceCapabilities.publicSession) {
      setAllowed(false);
      setDeniedPath(area === 'admin' ? '/admin/login' : '/login');
      setChecking(false);
      return;
    }
    services.auth.getSession().then((session) => {
      const accepted = area === 'admin' ? session?.role === 'admin' : Boolean(session && ['captain', 'team', 'admin'].includes(session.role));
      setAllowed(accepted);
      if (!accepted) setDeniedPath(session ? '/forbidden' : area === 'admin' ? '/admin/login' : '/login');
    }).catch(() => { setAllowed(false); setDeniedPath('/session-expired'); }).finally(() => setChecking(false));
  }, [area]);
  if (checking) return <main className="route-loading"><div className="route-loading__identity"><BrandEmblem decorative={false} /><span>AEVIC secure access</span></div><LoadingSkeleton rows={3} /></main>;
  if (!allowed) return <Navigate to={deniedPath || (area === 'admin' ? '/admin/login' : '/login')} replace />;
  return <div data-protected-area={area} data-demo-access={serviceCapabilities.mockPreview}>{children}</div>;
}
