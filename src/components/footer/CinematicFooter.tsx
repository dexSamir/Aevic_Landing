import { useId } from 'react';
import { ArrowDown } from 'lucide-react';
import { FooterLinks } from './FooterLinks';
import '../../styles/cinematic-footer.css';

export function CinematicFooter() {
  const socialId = useId();
  const glassId = useId();
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
        {/* Raleway 800 contour contacts, measured in a 1000-unit em. Each glyph
            keeps its natural proportions; the shared viewBox scales all contacts. */}
        <svg className="cinematic-footer__wordmark" viewBox="0 180 2648 730" aria-hidden="true" focusable="false">
          <defs><linearGradient id={glassId} x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".21" /><stop offset=".27" stopColor="#fff" stopOpacity=".03" /><stop offset=".45" stopColor="#fff" stopOpacity=".02" /><stop offset=".46" stopColor="#fff" stopOpacity=".16" /><stop offset=".49" stopColor="#fff" stopOpacity=".035" /><stop offset=".74" stopColor="#fff" stopOpacity=".008" /><stop offset="1" stopColor="#fff" stopOpacity=".13" /></linearGradient></defs>
          <g fill={`url(#${glassId})`} stroke="#ffffff30" strokeWidth="1" fontFamily="Raleway, sans-serif" fontWeight="800" fontSize="1000">
            {['A', 'E', 'V', 'I', 'C'].map((letter, index) => <text key={letter} x={[0, 600.5, 1159, 1767.5, 1973][index]} y="900">{letter}</text>)}
          </g>
        </svg>
        <div className="cinematic-footer__bottom"><small>© {new Date().getFullYear()} AEVIC Esports</small><span>AD AETERNAM VICTORIAM</span></div>
      </div>
    </footer>
  );
}
