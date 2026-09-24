import { useLocation } from 'react-router-dom';
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
  const isRegister = location.pathname === '/register';
  const isRecovery = ['/forgot-password', '/reset-password'].includes(location.pathname);
  return <div className={`auth-shell ${isRecovery ? 'auth-shell--recovery' : isRegister ? 'auth-shell--register auth-identity' : location.pathname === '/login' ? 'auth-shell--login auth-identity' : ''}`}>
    <RouteSeo /><OfflineNotice /><a className="skip-link" href="#main-content">Əsas məzmuna keç</a><PublicHeader />
    <main id="main-content" tabIndex={-1}>
      {isRecovery ? <MediaBackdrop {...responsiveArtwork['auth-recovery-lock']} sizes="100vw" className="auth-shell__media" priority width={1672} height={941} focalDesktop="54% center" focalMobile="62% center" /> : isRegister || location.pathname === "/login" ? <MediaBackdrop {...(isRegister ? responsiveArtwork['register-background'] : responsiveArtwork['login-background'])} sizes="100vw" className="auth-shell__media" priority width={1672} height={941} focalDesktop={isRegister ? "58% center" : "60% center"} focalMobile={isRegister ? "72% center" : "74% center"} /> : <MediaBackdrop src={officialAssets.authBackdrop} srcSet={officialAssets.authBackdropSrcSet} sources={officialAssets.authBackdropSources} sizes="100vw" className="auth-shell__media" priority width={1586} height={992} focalDesktop="49% 48%" focalMobile="44% 45%" />}
      <div className="auth-shell__content"><RouteTransitionOutlet family="auth" /></div>
    </main>
    <PublicFooter showCta={false} />
  </div>;
}


