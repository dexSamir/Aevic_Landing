import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { GuestOnly } from '../services/PublicSessionContext';
import { serviceCapabilities } from '../services';
import { CinematicFooter } from '../components/footer/CinematicFooter';

/** Shared brand closing for public, authentication and team workspace layouts. */
export function PublicFooter({ showCta = true, registrationEnabled }: { showCta?: boolean; registrationEnabled?: boolean }) {
  const { pathname } = useLocation();
  const operational = ['/team', '/admin', '/account'].some(root => pathname === root || pathname.startsWith(root + '/'));
  return <>
    {showCta && !operational && pathname !== '/' && <GuestOnly><section className="participation-band" aria-label="Rəqabətə qoşul"><div className="container"><div><span>KOMANDANI QUR.</span><strong>RƏQABƏTƏ QOŞUL.</strong><em>İRSİNİ BAŞLAT.</em></div><Link to={serviceCapabilities.register && registrationEnabled !== false ? '/register' : '/regulations'}><span>{serviceCapabilities.register && registrationEnabled !== false ? 'Komanda yarat' : 'Yarışa hazırlaş'}</span><ArrowRight size={20} aria-hidden="true" /></Link></div></section></GuestOnly>}
    <CinematicFooter />
  </>;
}
