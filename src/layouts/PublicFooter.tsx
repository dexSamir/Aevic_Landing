import { ArrowRight } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { publicNavigation } from '../app/publicNavigation';
import { BrandMark } from '../components/brand/BrandMark';
import { PlatformFooterSocials } from '../components/social/SocialLinks';
import { serviceCapabilities } from '../services';

/** Brand signature and configured public wayfinding, below the participation band. */
export function PublicFooter({ showCta = true }: { showCta?: boolean }) {
  const { pathname } = useLocation();
  const operational = ['/team', '/admin', '/account'].some((root) => pathname === root || pathname.startsWith(root + '/'));
  if (operational) return null;
  return <>{showCta && pathname !== '/' && <section className="participation-band" aria-label="Rəqabətə qoşul"><div className="container"><div><span>KOMANDANI QUR.</span><strong>RƏQABƏTƏ QOŞUL.</strong><em>İRSİNİ BAŞLAT.</em></div><Link to={serviceCapabilities.register ? '/register' : '/regulations'}><span>{serviceCapabilities.register ? 'Komanda yarat' : 'Yarışa hazırlaş'}</span><ArrowRight size={20} aria-hidden="true" /></Link></div></section>}<footer className="site-footer">
    <div className="container site-footer__inner">
      <div className="site-footer__main">
        <section className="site-footer__brand" aria-label="AEVIC Esports">
          <BrandMark variant="signature" />
          <p>Azərbaycan PUBG Mobile rəqabət platforması.</p>
          <strong>Ad Aeternam Victoriam.</strong>
        </section>
        <nav className="site-footer__group site-footer__primary" aria-label="Əsas alt naviqasiya">
          <h2>Sürətli keçidlər</h2>
          {[...publicNavigation.primary, publicNavigation.legal[2]].map((link) => <NavLink key={link.to} {...link}>{link.label}</NavLink>)}
        </nav>
        {<section className="site-footer__group site-footer__social">
          <h2>Bizi izlə</h2>
          <PlatformFooterSocials />
        </section>}
      </div>
      <div className="site-footer__bottom">
        <small>© {new Date().getFullYear()} AEVIC Esports. Bütün hüquqlar qorunur.</small>
        <nav aria-label="Hüquqi keçidlər">
          {publicNavigation.legal.slice(0, 2).map((link) => <NavLink key={link.to} {...link}>{link.label}</NavLink>)}
        </nav>
      </div>
    </div>
  </footer></>;
}
