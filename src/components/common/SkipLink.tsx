import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function SkipLink({ target = 'main-content' }: { target?: string }) {
  const [keyboard, setKeyboard] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setKeyboard(false); }, [pathname]);
  useEffect(() => {
    const reset = () => setKeyboard(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Tab') setKeyboard(true);
      if (event.key === 'Escape') reset();
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('pointerdown', reset, true);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    return () => {
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('pointerdown', reset, true);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
    };
  }, []);
  return <a className="skip-link" data-keyboard={keyboard} href={`#${target}`} onBlur={() => setKeyboard(false)} onClick={() => {
    document.getElementById(target)?.focus();
    setKeyboard(false);
  }}>Əsas məzmuna keç</a>;
}
