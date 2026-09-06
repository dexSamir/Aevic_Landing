import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, MailCheck, ShieldAlert } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, LoadingSkeleton, PasswordInput, Toast } from '../components/common/primitives';
import { services } from '../services';
import type { AuthTokenState } from '../types/domain';
import { passwordRequirements } from '../utils/lifecycle';

const resetCopy: Record<Exclude<AuthTokenState, 'already-verified'>, { title: string; body: string }> = {
  valid: { title: 'Yeni şifrə yarat', body: 'Əvvəl istifadə etmədiyiniz güclü şifrə seçin.' },
  invalid: { title: 'Bərpa linki etibarlı deyil', body: 'Link natamam və ya dəyişdirilmiş ola bilər.' },
  expired: { title: 'Bu bərpa linkinin vaxtı bitib.', body: 'Hesabın təhlükəsizliyi üçün yeni link tələb edin.' },
  used: { title: 'Bu link artıq istifadə olunub', body: 'Şifrəniz dəyişdirilibsə girişə keçin; əks halda yeni link istəyin.' },
};

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<AuthTokenState>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; services.auth.inspectPasswordReset(token).then((result) => { if (active) setState(result.state); }).catch(() => { if (active) setState('invalid'); }); return () => { active = false; }; }, [token]);
  const requirements = useMemo(() => { const result = passwordRequirements(password); return [result.minimumLength, result.uppercase, result.number]; }, [password]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!requirements.every(Boolean)) { setError('Yeni şifrə bütün təhlükəsizlik şərtlərini tamamlamır.'); return; }
    if (password !== confirmation) { setError('Şifrələr uyğun gəlmir.'); return; }
    setLoading(true);
    try { await services.auth.resetPassword(token, password); setDone(true); } catch { setState('invalid'); }
    finally { setLoading(false); }
  };
  if (!state) return <div className="auth-form-shell"><LoadingSkeleton rows={4} /></div>;
  if (done) return <div className="auth-form-shell auth-success"><CheckCircle2 size={42} /><h1>Şifrə yeniləndi.</h1><p>Bütün aktiv sessiyaların ləğvi backend təhlükəsizlik siyasəti ilə idarə olunur.</p><Link className="button button--primary" to="/login"><span>Girişə keç</span></Link></div>;
  if (state !== 'valid') { const copy = resetCopy[state === 'already-verified' ? 'invalid' : state]; return <AuthBlockedState icon={state === 'expired' ? <Clock3 /> : <AlertTriangle />} title={copy.title} body={copy.body} />; }
  return <div className="auth-form-shell"><header className="auth-header"><span>AEVIC secure access</span><h1>{resetCopy.valid.title}</h1><p>{resetCopy.valid.body}</p></header>{error && <Toast tone="error" title="Şifrə yenilənmədi" body={error} />}<form className="auth-form" onSubmit={submit}><PasswordInput label="Yeni şifrə" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><PasswordInput label="Şifrəni təsdiqlə" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /><ul className="password-requirements" aria-label="Şifrə şərtləri"><li className={requirements[0] ? 'met' : ''}><CheckCircle2 size={15} />Minimum 8 simvol</li><li className={requirements[1] ? 'met' : ''}><CheckCircle2 size={15} />Bir böyük hərf</li><li className={requirements[2] ? 'met' : ''}><CheckCircle2 size={15} />Bir rəqəm</li></ul><Button type="submit" loading={loading}>Şifrəni yenilə</Button></form></div>;
}

function AuthBlockedState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{icon}</span><h1>{title}</h1><p>{body}</p><div><Link className="button button--primary" to="/forgot-password"><span>Yeni link göndər</span></Link><Link className="button button--ghost" to="/login"><span>Girişə qayıt</span></Link></div></div>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<AuthTokenState>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  useEffect(() => {
    let active = true;
    services.auth.inspectEmailVerification(token).then(async (result) => {
      if (!active) return;
      if (result.state === 'valid') { try { await services.auth.verifyEmail(token); if (active) setState('already-verified'); } catch { if (active) setState('invalid'); } }
      else setState(result.state);
    }).catch(() => { if (active) setState('invalid'); });
    return () => { active = false; };
  }, [token]);
  const resend = async () => { setResending(true); try { await services.auth.resendVerification(); setResent(true); } finally { setResending(false); } };
  if (!state) return <div className="auth-form-shell"><LoadingSkeleton rows={4} /></div>;
  if (state === 'already-verified') return <div className="auth-form-shell auth-success"><MailCheck size={42} /><h1>Email təsdiqləndi.</h1><p>Həssas komanda əməliyyatlarına giriş hesab və komanda səlahiyyəti ilə birlikdə yoxlanacaq.</p><Link className="button button--primary" to="/team"><span>Komanda panelini aç</span></Link></div>;
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{state === 'expired' ? <Clock3 /> : <ShieldAlert />}</span><h1>{state === 'expired' ? 'Təsdiq linkinin vaxtı bitib' : 'Təsdiq linki etibarlı deyil'}</h1><p>Yeni təsdiq emaili istəyin. Hesabın mövcudluğu barədə əlavə məlumat göstərilmir.</p>{resent && <Toast title="Təsdiq emaili göndərildi" body="Gələnlər və spam qovluğunu yoxlayın." />}<Button loading={resending} onClick={() => void resend()}>Yenidən göndər</Button><Link className="back-link" to="/login">Girişə qayıt</Link></div>;
}

export function AccessStatePage({ state }: { state: 'unauthorized' | 'forbidden' | 'session-expired' | 'account-locked' | 'rate-limited' }) {
  const copy = {
    unauthorized: ['Giriş tələb olunur', 'Bu səhifəni açmaq üçün hesabınıza daxil olun.'],
    forbidden: ['Bu əməliyyat üçün icazəniz yoxdur', 'Komanda rolu və ya admin səlahiyyəti backend tərəfindən yoxlanılır.'],
    'session-expired': ['Sessiyanın vaxtı bitib', 'Davam etmək üçün təhlükəsiz şəkildə yenidən daxil olun.'],
    'account-locked': ['Hesab müvəqqəti kilidlənib', 'Təhlükəsizlik səbəbi ilə giriş dayandırılıb. Dəstək xidməti ilə əlaqə saxlayın.'],
    'rate-limited': ['Çox sayda cəhd edildi', 'Bir neçə dəqiqə gözləyin və yenidən cəhd edin.'],
  }[state];
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{state === 'rate-limited' ? <Clock3 /> : state === 'account-locked' ? <LockKeyhole /> : <ShieldAlert />}</span><h1>{copy[0]}</h1><p>{copy[1]}</p><div><Link className="button button--primary" to="/login"><span>Girişə keç</span></Link><Link className="button button--ghost" to="/support"><span>Dəstək mərkəzi</span></Link></div></div>;
}
