import { useId } from 'react';
import { ArrowDown } from 'lucide-react';
import { FooterLinks } from './FooterLinks';
import '../../styles/cinematic-footer.css';

export function CinematicFooter() {
  const socialId = useId();
  return (
    <footer className="cinematic-footer" aria-label="AEVIC Esports">
      <div className="cinematic-footer__scene">
        <div className="cinematic-footer__top">
          <p>Turnirlər.<br />Komandalar.<br />Oyunçular.</p>
          <p>Rəqabətin<br />yeni səhnəsi.</p>
          <p>Azərbaycandan<br />dünya səhnəsinə.</p>
          <a className="cinematic-footer__follow" href={`#${socialId}`}><ArrowDown size={27} strokeWidth={1.3} aria-hidden="true" /><span>BİZİ İZLƏ</span></a>
        </div>
        <p className="cinematic-footer__statement"><span>Gəlin e-sportun gələcəyini birlikdə quraq.</span><a href="mailto:aevicesports@gmail.com">aevicesports@gmail.com</a></p>
        <FooterLinks socialId={socialId} />
        <div className="cinematic-footer__wordmark" aria-hidden="true">AEVIC</div>
        <div className="cinematic-footer__bottom"><small>© {new Date().getFullYear()} AEVIC Esports</small><span>AD AETERNAM VICTORIAM</span></div>
      </div>
    </footer>
  );
}
