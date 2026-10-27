import { useEffect, useRef, useState } from 'react';
import { Input } from '../common/primitives';

/** The method switch changes presentation only; the server verifies both credentials. */
export function MfaCodeInput({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [recovery, setRecovery] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => { root.current?.querySelector('input')?.focus({ preventScroll: true }); }, [recovery]);
  return <section ref={root} className="mfa-challenge" aria-label="İki mərhələli doğrulama">
    <h2>İki mərhələli doğrulama</h2>
    <p>{recovery ? 'Saxladığınız birdəfəlik bərpa kodlarından birini daxil edin.' : 'Authenticator tətbiqinizdə göstərilən 6 rəqəmli kodu daxil edin.'}</p>
    <Input key={String(recovery)} label={recovery ? 'Bərpa kodu' : 'Authenticator kodu'} value={value} onChange={event => onChange(recovery ? event.target.value.trim() : event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode={recovery ? 'text' : 'numeric'} autoComplete="one-time-code" pattern={recovery ? undefined : '[0-9]{6}'} minLength={recovery ? undefined : 6} maxLength={recovery ? 40 : 6} required disabled={disabled} />
    <button type="button" disabled={disabled} onClick={() => { setRecovery(!recovery); onChange(''); }}>{recovery ? 'Authenticator koduna qayıt' : 'Bərpa kodundan istifadə et'}</button>
  </section>;
}
