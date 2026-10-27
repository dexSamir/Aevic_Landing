import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { regulationSections as sections, rulebookVersion } from '../content/regulations';
import { PageHeader } from '../components/common/primitives';
import '../styles/regulations.css';

export function RegulationsPage() {
  const { hash, key } = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(sections[0].id);
  const nav = useRef<HTMLElement>(null);
  const mobile = useRef<HTMLDivElement>(null);
  const offset = () => (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 80) + (window.innerWidth <= 900 ? (mobile.current?.offsetHeight ?? 72) : 0) + 24;
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = offset();
      let current = sections[0].id;
      for (const section of sections) {
        if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= line + 2) current = section.id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].id;
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    const target = document.getElementById(hash.slice(1));
    if (!target || !hash.startsWith('#rule-')) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset(), behavior: 'instant' });
      setActive(target.id);
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key]);
  useEffect(() => {
    const root = nav.current, item = root?.querySelector<HTMLElement>(`[href$="#${active}"]`);
    if (!root || !item) return;
    const delta = item.getBoundingClientRect().top - root.getBoundingClientRect().top;
    if (delta < 0 || delta + item.offsetHeight > root.clientHeight) root.scrollTop += delta - root.clientHeight / 2 + item.offsetHeight / 2;
  }, [active]);
  return <section className="page-section regulations-page"><div className="container regulations-layout">
    <PageHeader title="Yarış reqlamenti" description="AEVIC-in peşəkar yarış və platforma standartları." />
    <aside><span>AEVIC YARIŞ BƏLƏDÇİSİ</span><strong>{rulebookVersion}</strong><p>Layihə · qüvvəyə minmə tarixi təsdiq gözləyir.</p><nav ref={nav} aria-label="Reqlament bölmələri">{sections.map(section => <Link key={section.id} to={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>{section.letter}. {section.title}</Link>)}</nav></aside>
    <div ref={mobile} className="regulations-mobile"><label htmlFor="rule-section">Bölməyə keç</label><select id="rule-section" value={active} onChange={event => navigate(`#${event.target.value}`)}>{sections.map(section => <option key={section.id} value={section.id}>{section.letter}. {section.title}</option>)}</select></div>
    <article><p className="regulations-disclosure">Təsdiq üçün layihə. Yaş, mükafat, media icazələri, məlumat siyasəti və qüvvəyə minmə tarixi sahibin təsdiqini gözləyir. Bu sənəd milli qanunvericilik deyil.</p>
      {sections.map(section => <section id={section.id} tabIndex={-1} key={section.id} aria-labelledby={`${section.id}-title`}><h2 id={`${section.id}-title`}>{section.letter}. {section.title}</h2>{section.subsections.map((sub, i) => <div className="regulations-clause" key={i}><h3>{section.letter}.{i + 1}. {sub.title}</h3><p>{sub.body}</p></div>)}</section>)}
      <p className="regulations-version">Versiya 1.1: bölmələr və yarımbölmələr yenidən təşkil edilib. Əvvəlki 1.0 layihəsi: 27 oktyabr 2026. Təsdiqlənmiş dəyişikliklərin tətbiq tarixi ayrıca dərc ediləcək.</p>
      <p><Link to="/privacy">Məxfilik məlumatı</Link> · <Link to="/terms">İstifadə şərtləri</Link> · <Link to="/contact">Əlaqə</Link></p>
    </article>
  </div></section>;
}
