import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homeArtwork } from '../../assets/home';
import { serviceCapabilities } from '../../services';
import { MediaBackdrop } from './MediaBackdrop';

export function BrandJoinCta() {
  return <section className="home-brand-statement" aria-labelledby="home-brand-title"><MediaBackdrop {...homeArtwork.participation} sizes="100vw" className="home-brand-statement__media" focalDesktop="70% 50%" focalMobile="72% 42%" /><div className="container"><div data-reveal data-reveal-variant="fade-up"><h2 id="home-brand-title">Burada oyun<br />daha böyükdür.</h2><p>E-sport tək oyun deyil,<br />bir icma, bir səhnə, bir mirasdır.</p><Link className="button" to={serviceCapabilities.register ? '/register' : '/regulations'}><span>Rəqabətin bir hissəsi ol</span><ArrowRight size={18} /></Link></div></div></section>;
}
