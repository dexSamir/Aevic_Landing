import { NavLink } from 'react-router-dom';
import { publicFooterNavigation, publicNavigation } from '../app/publicNavigation';
import { BrandMark } from '../components/brand/BrandMark';
import { officialPlatformSocialLinks, SocialLinks } from '../components/social/SocialLinks';
import { demoMode } from '../services';

/** Compact public wayfinding: the navbar's graphite, type and gold focus grammar.
 * Identity → primary routes → secondary destinations → legal. No decorative glass.
 * Social destinations are configured, sanitized and omitted when absent.
 */
export function PublicFooter() {
  const hasConfiguredSocials = Object.values(officialPlatformSocialLinks).some(Boolean);
  return <footer className="site-footer">
    <div className="container site-footer__inner">
      <div className="site-footer__main">
        <section className="site-footer__brand" aria-label="AEVIC Esports">
          <BrandMark variant="signature" />
          <p>Azərbaycan PUBG Mobile rəqabət platforması.</p>
          <strong>Ad Aeternam Victoriam.</strong>
        </section>
        <nav className="site-footer__group site-footer__primary" aria-label="Əsas alt naviqasiya">
          <h2>Əsas naviqasiya</h2>
          {publicFooterNavigation.map((link) => <NavLink key={link.to} {...link}>{link.label}</NavLink>)}
        </nav>
        <nav className="site-footer__group site-footer__secondary" aria-label="Məhsul və dəstək">
          <h2>Məhsul və dəstək</h2>
          {publicNavigation.secondary.map((link) => <NavLink key={link.to} {...link}>{link.label}</NavLink>)}
        </nav>
        {hasConfiguredSocials && <section className="site-footer__group site-footer__social">
          <h2>Bizi izləyin</h2>
          <SocialLinks links={officialPlatformSocialLinks} ownerName="AEVIC Esports" />
        </section>}
      </div>
      <div className="site-footer__bottom">
        <small>© {new Date().getFullYear()} AEVIC Esports{demoMode ? ' · Nümunə məlumat rejimi' : ''}</small>
        <nav aria-label="Hüquqi keçidlər">
          {publicNavigation.legal.map((link) => <NavLink key={link.to} {...link}>{link.label}</NavLink>)}
        </nav>
      </div>
    </div>
  </footer>;
}
