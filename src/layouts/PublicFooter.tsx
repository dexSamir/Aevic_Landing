import { useId } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { GuestOnly } from '../services/PublicSessionContext';
import { publicNavigation } from '../app/publicNavigation';
import { BrandMark } from '../components/brand/BrandMark';
import { officialPlatformSocialLinks } from '../components/social/SocialLinks';
import { normalizeSocialUrl } from '../utils/lifecycle';
import { sanitizeOutboundUrl } from '../utils/outboundUrl';
import { serviceCapabilities } from '../services';
import '../styles/cinematic-footer.css';

const socialPlatforms = [
  ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['x', 'X'],
] as const;

/** Shared brand closing for public, authentication and team workspace layouts. */
export function PublicFooter({ showCta = true, registrationEnabled }: { showCta?: boolean; supportEmail?: string; registrationEnabled?: boolean }) {
  const { pathname } = useLocation();
  const socialId = useId();
  const operational = ['/team', '/admin', '/account'].some(root => pathname === root || pathname.startsWith(root + '/'));
  return <>
    {showCta && !operational && pathname !== '/' && <GuestOnly><section className="participation-band" aria-label="Rəqabətə qoşul"><div className="container"><div><span>KOMANDANI QUR.</span><strong>RƏQABƏTƏ QOŞUL.</strong><em>İRSİNİ BAŞLAT.</em></div><Link to={serviceCapabilities.register && registrationEnabled !== false ? '/register' : '/regulations'}><span>{serviceCapabilities.register && registrationEnabled !== false ? 'Komanda yarat' : 'Yarışa hazırlaş'}</span><ArrowRight size={20} aria-hidden="true" /></Link></div></section></GuestOnly>}
    <footer className="cinematic-footer" aria-label="AEVIC Esports">
      <div className="cinematic-footer__scene">
        <div className="cinematic-footer__top">
          <BrandMark variant="signature" />
          <p>Turnirlər.<br />Komandalar.<br />Oyunçular.</p>
          <p>Rəqabətin<br />yeni səhnəsi.</p>
          <p>Azərbaycandan<br />dünya səhnəsinə.</p>
          <a className="cinematic-footer__follow" href={`#${socialId}`}><ArrowDown size={27} strokeWidth={1.3} aria-hidden="true" /><span>BİZİ İZLƏ</span></a>
        </div>
        <p className="cinematic-footer__statement"><span>E-sport tək oyun deyil.</span><span>Bir icma, bir səhnə, bir mirasdır.</span></p>
        <div className="cinematic-footer__information">
          <section className="cinematic-footer__group">
            <h2>(a.) ƏLAQƏ</h2>
            <a className="cinematic-footer__email" href="mailto:aevicesports@gmail.com">aevicesports@gmail.com<ArrowUpRight size={19} aria-hidden="true" /></a>
          </section>
          <nav id={socialId} tabIndex={-1} className="cinematic-footer__group" aria-label="AEVIC sosial şəbəkələri">
            <h2>(b.) SOSİAL ŞƏBƏKƏLƏR</h2>
            <div className="cinematic-footer__links">
              {socialPlatforms.map(([platform, label]) => {
                const url = sanitizeOutboundUrl(officialPlatformSocialLinks[platform] ?? '');
                return url && normalizeSocialUrl(platform, url).ok
                  ? <a key={platform} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> (yeni pəncərədə açılır)</span></a>
                  : <span key={platform} className="cinematic-footer__unavailable" title="Rəsmi keçid hələ əlavə edilməyib">{label}<span className="sr-only"> — rəsmi keçid hələ əlavə edilməyib</span></span>;
              })}
            </div>
          </nav>
          <nav className="cinematic-footer__group" aria-label="Alt naviqasiya">
            <h2>(c.) SƏHİFƏLƏR</h2>
            <div className="cinematic-footer__links">{publicNavigation.primary.map(({ to, label, end }) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}</div>
          </nav>
          <nav className="cinematic-footer__group" aria-label="Hüquqi keçidlər">
            <h2>(d.) QAYDALAR</h2>
            {[publicNavigation.legal[1], { ...publicNavigation.legal[0], label: 'Məxfilik siyasəti' }, publicNavigation.rules].map(({ to, label, end }) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
          </nav>
        </div>
        <div className="cinematic-footer__wordmark" aria-hidden="true">AEVIC</div>
        <div className="cinematic-footer__bottom"><small>© {new Date().getFullYear()} AEVIC Esports</small><span>AD AETERNAM VICTORIAM</span></div>
      </div>
    </footer>
  </>;
}
