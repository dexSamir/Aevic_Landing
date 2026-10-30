import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Input } from '../common/primitives';

/** One native input preserves paste, selection, autofill and keyboard semantics. */
export function MfaCodeInput({ value, onChange, disabled = false, invalid = false, action }: { value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean; action?: ReactNode }) {
  const [caret, setCaret] = useState(0);
  const [recovery, setRecovery] = useState(false);
  const root = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => { root.current?.querySelector('input')?.focus({ preventScroll: true }); }, [recovery]);
  return <section ref={root} className="mfa-challenge" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{recovery ? 'Hesabın bərpası' : 'Təhlükəsizlik kodu'}</h2>
    <p id={`${id}-help`}>{recovery ? 'Saxladığınız birdəfəlik bərpa kodunu daxil edin.' : 'Authenticator tətbiqinizdəki 6 rəqəmli kodu daxil edin.'}</p>
    {recovery ? <Input label="Bərpa kodu" aria-invalid={invalid || undefined} value={value} onChange={event => onChange(event.target.value.trim())} autoComplete="off" maxLength={40} required disabled={disabled} /> : <div className="otp-control">
      <div className="otp-slots" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} data-active={i === Math.min(caret, 5)}>{value[i] || ''}</span>)}</div>
      <input aria-label="Authenticator kodu" aria-invalid={invalid || undefined} aria-describedby={`${id}-help`} value={value} onSelect={event => setCaret(event.currentTarget.selectionStart ?? value.length)} onChange={event => { const next = event.target.value.replace(/\D/g, '').slice(0, 6); onChange(next); setCaret(event.target.selectionStart ?? next.length); }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={disabled} />
    </div>}
    {action}
    <button className="mfa-method-switch" type="button" disabled={disabled} onClick={() => { setRecovery(!recovery); setCaret(0); onChange(''); }}>{recovery ? 'Authenticator koduna qayıt' : 'Bərpa kodundan istifadə et'}</button>
  </section>;
}
