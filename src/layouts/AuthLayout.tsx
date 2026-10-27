import { PublicMobileBottomNav } from './MobileBottomNav';
import { SkipLink } from '../components/common/SkipLink';
import { PublicSessionProvider, usePublicSession } from '../services/PublicSessionContext';
import { Navigate, useLocation } from 'react-router-dom';
import { officialAssets } from '../assets/official';
import { responsiveArtwork } from '../assets/official/responsive';
import { MediaBackdrop } from '../components/common/MediaBackdrop';
import { RouteTransitionOutlet } from '../components/common/Motion';
import { RouteSeo } from '../components/common/Seo';
import { OfflineNotice } from '../components/pwa/PwaExperience';
import '../styles/public-shell.css';
import { PublicFooter } from './PublicFooter';

import { PublicHeader } from './layouts';
export function AuthLayout() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const isRegister = pathname === '/register';
  const isRecovery = ['/forgot-password', '/reset-password'].includes(pathname);
  return <PublicSessionProvider><div className={`auth-shell ${pathname === '/admin/login' ? 'auth-shell--admin ' : ''}${isRecovery ? 'auth-shell--recovery' : isRegister ? 'auth-shell--register auth-identity' : pathname === '/login' ? 'auth-shell--login auth-identity' : ''}`}>
    <RouteSeo /><OfflineNotice /><SkipLink target="main-content" /><PublicHeader />
    <main id="main-content" tabIndex={-1}>
      {isRecovery ? <MediaBackdrop {...responsiveArtwork['auth-recovery-lock']} sizes="100vw" className="auth-shell__media" priority width={1672} height={941} focalDesktop="54% center" focalMobile="62% center" /> : isRegister || pathname === "/login" ? <MediaBackdrop {...(isRegister ? responsiveArtwork['register-background'] : responsiveArtwork['login-background'])} sizes="100vw" className="auth-shell__media" priority width={1672} height={941} focalDesktop={isRegister ? "58% center" : "60% center"} focalMobile={isRegister ? "72% center" : "74% center"} /> : <MediaBackdrop src={officialAssets.authBackdrop} srcSet={officialAssets.authBackdropSrcSet} sources={officialAssets.authBackdropSources} sizes="100vw" className="auth-shell__media" priority width={1586} height={992} focalDesktop="49% 48%" focalMobile="44% 45%" />}
      <div className="auth-shell__content"><AuthEntry pathname={pathname} /></div>
    </main>
    <PublicFooter showCta={false} />{pathname !== '/admin/login' && <PublicMobileBottomNav />}
  </div></PublicSessionProvider>;
}



function AuthEntry({ pathname }: { pathname: string }) {
  const { session, loading, error, refresh } = usePublicSession();
  const guestRoute = pathname === '/login' || pathname === '/register';
  if (!guestRoute) return <RouteTransitionOutlet family="auth" />;
  if (loading) return <div role="status" className="route-loading">Sessiya yoxlanılır…</div>;
  if (error) return <div role="alert"><p>Sessiyanı yoxlamaq mümkün olmadı.</p><button className="button button--secondary" onClick={refresh}>Yenidən yoxla</button></div>;
  if (session) return <Navigate to="/" replace />;
  return <RouteTransitionOutlet family="auth" />;
}
