import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { House, Trophy, Users, Swords, CircleUserRound, LogOut } from 'lucide-react';
import { TeamLogo } from '../components/common/primitives';
import { publicNavigation } from '../app/publicNavigation';
import { activePublicRoute } from '../utils/routes';
import { services } from '../services';
import { usePublicSession } from '../services/PublicSessionContext';
import type { Team } from '../types/domain';
import './mobile-bottom-nav.css';

type Session = Awaited<ReturnType<typeof services.auth.getSession>>;
type Props = { session: Session | undefined; team?: Team; loading?: boolean; refresh?: () => void };
const icons = [House, Trophy, Users, Swords];
const inFamily = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export function PublicMobileBottomNav() {
  return <MobileBottomNav {...usePublicSession()} />;
}

/** Identity comes from the layout's existing session and active workspace. */
export function MobileBottomNav({ session, team, loading, refresh }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const menuId = useId();
  const accountActive = ['/account', '/team', '/login', '/register', '/forgot-password', '/reset-password'].some(path => inFamily(location.pathname, path));
  const active = accountActive ? '' : activePublicRoute(location.pathname);
  const isAdmin = session?.role === 'admin';
  const workspace = !isAdmin && team;
  const identity = workspace ? team.name : session?.user.firstName || 'Hesab';

  useEffect(() => { setOpen(false); setError(''); }, [location.key]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    const media = window.matchMedia('(min-width: 1024px)');
    const resize = () => { if (media.matches) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    media.addEventListener('change', resize);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); media.removeEventListener('change', resize); };
  }, [open]);

  const logout = async () => {
    setBusy(true); setError('');
    try { await services.auth.logout(); setOpen(false); navigate('/'); }
    catch { setError('Çıxış tamamlanmadı. Yenidən cəhd edin.'); }
    finally { setBusy(false); }
  };

  return <div className="mobile-nav-slot">
    <div className="mobile-nav" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {open && <nav id={menuId} ref={panel} className="mobile-profile-panel" aria-label="Hesab əməliyyatları" onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
        <strong>{identity}</strong>
        {loading ? <p role="status">Sessiya yoxlanılır…</p> : session === undefined ? <button onClick={refresh}>Sessiyanı yenidən yoxla</button> : session ? <>
          <Link to="/account/profile">Hesabım</Link>
          {workspace ? <><Link to="/team">Komanda paneli</Link><Link to="/team/profile">Komanda profili</Link><Link to="/team/roster">Heyəti idarə et</Link><Link to="/team/tournaments">Turnirlərim</Link><Link to="/team/settings">Komanda ayarları</Link></> : !isAdmin && <Link to="/register">Komanda yarat</Link>}
          <Link to="/account/security">Təhlükəsizlik</Link>
          <button disabled={busy} onClick={() => void logout()}><LogOut size={18} aria-hidden="true" />{busy ? 'Çıxış edilir…' : 'Çıxış'}</button>
        </> : <><Link to={publicNavigation.login.to}>{publicNavigation.login.label}</Link><Link to={publicNavigation.register.to}>{publicNavigation.register.label}</Link></>}
        {error && <p role="alert">{error}</p>}
      </nav>}
      <nav className="mobile-nav__items" aria-label="Mobil əsas naviqasiya">
        {publicNavigation.primary.map((item, index) => { const Icon = icons[index]; return <Link key={item.to} to={item.to} aria-current={active === item.to ? 'page' : undefined}><Icon size={22} strokeWidth={1.8} aria-hidden="true" /><span>{item.label}</span></Link>; })}
        <button ref={trigger} type="button" className={accountActive || open ? 'is-active' : undefined} aria-label={`${identity} hesab menyusu`} aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(value => !value)}>
          {workspace ? <TeamLogo name={team.name} src={team.logoUrl} size="sm" /> : <CircleUserRound size={22} strokeWidth={1.8} aria-hidden="true" />}<span>{workspace ? 'Komandam' : 'Hesab'}</span>
        </button>
      </nav>
    </div>
  </div>;
}
