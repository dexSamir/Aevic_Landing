import { useSiteContent } from '../site/SiteContent';
import { GuestOnly } from '../../services/PublicSessionContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homeArtwork } from '../../assets/home';
import { serviceCapabilities } from '../../services';
import { MediaBackdrop } from './MediaBackdrop';

export function BrandJoinCta() {
  const content=useSiteContent('home');
  return <GuestOnly><section className="home-brand-statement" aria-labelledby="home-brand-title"><MediaBackdrop deferred {...homeArtwork.participation} {...(content.media('join.media')?{src:content.media('join.media')!,srcSet:undefined,sources:undefined,localPreview:true}: {})} sizes="100vw" className="home-brand-statement__media" focalDesktop="70% 50%" focalMobile="72% 42%" /><div className="container"><div data-reveal data-reveal-variant="fade-up"><h2 id="home-brand-title">{content.document?.fields['join.title']?content.text('join.title',''):<>Burada oyun<br />daha böyükdür.</>}</h2><p>{content.document?.fields['join.body']?content.text('join.body',''):<>E-sport tək oyun deyil,<br />bir icma, bir səhnə, bir mirasdır.</>}</p><Link className="button" to={serviceCapabilities.register ? '/register' : '/regulations'}><span>{content.text('join.cta','Rəqabətin bir hissəsi ol')}</span><ArrowRight size={18} /></Link></div></div></section></GuestOnly>;
}
