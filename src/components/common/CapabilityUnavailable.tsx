import { Link, useLocation } from 'react-router-dom';
import { RouteSeo } from './Seo';
import { EmptyState } from './primitives';

export function CapabilityUnavailable() {
  const { pathname } = useLocation();
  const standalone = (pathname !== '/admin/login' && /^\/(team|admin|account)(\/|$)/.test(pathname)) || /^\/teams\/[^/]+\/wrapped\//.test(pathname);
  const Container = standalone ? 'main' : 'section';
  return <Container className="page-section capability-unavailable" data-capability-unavailable><RouteSeo /><div className="container"><EmptyState heading="h1" title="Bu xidmət hələ açılmayıb" body="Bu funksiya hazırkı ictimai buraxılışa daxil deyil. Hesab və yarış əməliyyatları açıldıqda burada əlçatan olacaq. İndi yarış bələdçisi ilə tanış ola bilərsiniz." action={<Link className="button button--primary" to="/regulations"><span>Yarış bələdçisini oxu</span></Link>} /></div></Container>;
}
