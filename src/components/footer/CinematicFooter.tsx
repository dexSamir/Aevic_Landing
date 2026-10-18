import { useId } from 'react';
import { ArrowDown } from 'lucide-react';
import { FooterLinks } from './FooterLinks';
import '../../styles/cinematic-footer.css';

export function CinematicFooter() {
  const socialId = useId();
  const glassId = useId();
  const maskId = useId();
  const beamId = useId();
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
          <defs><linearGradient id={glassId} gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="180" y2="910"><stop offset="0" stopColor="#fff" stopOpacity=".10" /><stop offset=".45" stopColor="#fff" stopOpacity=".02" /><stop offset=".7" stopColor="#fff" stopOpacity=".008" /><stop offset="1" stopColor="#fff" stopOpacity=".09" /></linearGradient>
            <linearGradient id={beamId}><stop stopColor="white" stopOpacity="0"/><stop offset=".5" stopColor="white" stopOpacity=".16"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
            <clipPath id={maskId}><g fontFamily="Raleway, sans-serif" fontWeight="800" fontSize="1000">{['A', 'E', 'V', 'I', 'C'].map((letter, index) => <text key={letter} x={[0, 600.5, 1159, 1767.5, 1973][index]} y="900">{letter}</text>)}</g></clipPath>
          </defs>
          <g fill={`url(#${glassId})`} stroke="#ffffff30" strokeWidth="1" fontFamily="Raleway, sans-serif" fontWeight="800" fontSize="1000">
            {['A', 'E', 'V', 'I', 'C'].map((letter, index) => <text key={letter} x={[0, 600.5, 1159, 1767.5, 1973][index]} y="900">{letter}</text>)}
          </g>
          <g clipPath={`url(#${maskId})`}><g className="cinematic-footer__reflection"><path d="M -500 -400 L -260 -400 L -960 1300 L -1200 1300 Z" fill={`url(#${beamId})`} /></g></g>
        </svg>
        <div className="cinematic-footer__bottom"><small>© {new Date().getFullYear()} AEVIC Esports</small><span>AD AETERNAM VICTORIAM</span></div>
      </div>
    </footer>
  );
}
