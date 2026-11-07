import { approvedBrandUrl } from '../../content/branding';
import { useSupportEmail, useBranding, useSiteContent, useSiteNavigation } from '../site/SiteContent';
import { ArrowUpRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { publicNavigation } from '../../app/publicNavigation';
import { officialPlatformSocialLinks } from '../social/SocialLinks';
import { normalizeSocialUrl } from '../../utils/lifecycle';
import { sanitizeOutboundUrl } from '../../utils/outboundUrl';

const socialPlatforms = [
  ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['x', 'X'],
] as const;

export function FooterLinks({ socialId }: { socialId: string }) {
  const brand=useBranding();
  const content=useSiteContent('global');
  const navigation=useSiteNavigation(publicNavigation.primary,'footer');
  const email=useSupportEmail();
  return <div className="cinematic-footer__information">
          <section className="cinematic-footer__group">
            <h2>(a.) ƏLAQƏ</h2>
            <a className="cinematic-footer__email" href={`mailto:${email}`}>{email}<ArrowUpRight size={19} aria-hidden="true" /></a>
          </section>
          <nav id={socialId} tabIndex={-1} className="cinematic-footer__group" aria-label="AEVIC sosial şəbəkələri">
            <h2>(b.) SOSİAL ŞƏBƏKƏLƏR</h2>
            <div className="cinematic-footer__links">
              {brand?.links.social ? brand.links.social.filter(link=>link.visible && approvedBrandUrl(link.href)).map(link=><a key={link.href} href={approvedBrandUrl(link.href)} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={13}/></a>) : socialPlatforms.map(([platform, label]) => {
                const url = sanitizeOutboundUrl(content.text(`social.${platform}`,officialPlatformSocialLinks[platform] ?? ''));
                return url && normalizeSocialUrl(platform, url).ok
                  ? <a className="cinematic-footer__social-link" key={platform} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> (yeni pəncərədə açılır)</span></a>
                  : <span key={platform} className="cinematic-footer__unavailable" tabIndex={0} data-tooltip="Rəsmi keçid hələ əlavə edilməyib">{label}<ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> — rəsmi keçid hələ əlavə edilməyib</span></span>;
              })}
            </div>
          </nav>
          <nav className="cinematic-footer__group" aria-label="Alt naviqasiya">
            <h2>(c.) SƏHİFƏLƏR</h2>
            <div className="cinematic-footer__links">{navigation.map(({ to, label, end }) => to.startsWith('/')?<NavLink key={to} to={to} end={end}>{label}</NavLink>:<a key={to} href={to} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
          </nav>
          <nav className="cinematic-footer__group" aria-label="Hüquqi keçidlər">
            <h2>(d.) QAYDALAR</h2>
            {[publicNavigation.legal[1], { ...publicNavigation.legal[0], label: 'Məxfilik siyasəti' }, publicNavigation.rules].map(({ to, label, end }) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
          </nav>
        </div>;
}
