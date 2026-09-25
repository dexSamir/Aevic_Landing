import { AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Clock3 } from 'lucide-react';
import { type FormEvent,useEffect,useMemo,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { AuthRecoveryShell } from '../../components/auth/AuthRecoveryShell';
import { Button,LoadingSkeleton,PasswordInput,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import '../../styles/auth.css';
import type { AuthTokenState } from '../../types/domain';
import { passwordRequirements } from '../../utils/lifecycle';
import { AuthBlockedState,resetCopy } from './AuthLifecyclePagesShared';
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? params.get('token_hash') ?? params.get('token') ?? '');
  useEffect(() => { window.history.replaceState(null, '', window.location.pathname); }, []);
  const [state, setState] = useState<AuthTokenState>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; services.auth.inspectPasswordReset(token).then((result) => { if (active) setState(result.state); }).catch(() => { if (active) {setState('invalid');setError('Bərpa linki yoxlanılmadı. Xidmət müvəqqəti əlçatan deyil.');} }); return () => { active = false; }; }, [token]);
  const requirements = useMemo(() => { const result = passwordRequirements(password); return [result.minimumLength, result.uppercase, result.number]; }, [password]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!requirements.every(Boolean)) { setError('Yeni şifrə bütün təhlükəsizlik şərtlərini tamamlamır.'); return; }
    if (password !== confirmation) { setError('Şifrələr uyğun gəlmir.'); return; }
    setLoading(true);
    try { await services.auth.resetPassword(token, password); setDone(true); } catch { setError('Şifrə yenilənmədi. Bağlantını yoxlayın və yenidən cəhd edin. Linkin vaxtı bitibsə yeni bərpa linki istəyin.'); }
    finally { setLoading(false); }
  };
  if (!state) return <AuthRecoveryShell title="Bərpa linki yoxlanılır"><LoadingSkeleton variant="form" rows={4} /></AuthRecoveryShell>;
  if (done) return <AuthRecoveryShell title={<>Şifrə uğurla<br /><em>yeniləndi.</em></>}><div className="recovery-state" role="status"><CheckCircle2 className="recovery-state__icon" size={52} /><h2>Yeni şifrəniz hazırdır.</h2><p>Yeni şifrənizlə hesabınıza daxil ola bilərsiniz.</p><Link className="button button--primary" to={token.startsWith('adm.')?'/admin/login':'/login'}><span>Girişə keç</span><ArrowRight size={20} /></Link></div></AuthRecoveryShell>;
  if (state !== 'valid') { const copy = resetCopy[state === 'already-verified' ? 'invalid' : state]; return <AuthBlockedState icon={state === 'expired' ? <Clock3 /> : <AlertTriangle />} title={error ? 'Bərpa xidməti əlçatan deyil' : copy.title} body={error || copy.body} />; }
  return <AuthRecoveryShell title={<>Yeni şifrə<br /><em>yarat</em></>} description={resetCopy.valid.body}>{error && <Toast tone="error" title="Şifrə yenilənmədi" body={error} />}<form className="auth-form" onSubmit={submit}><PasswordInput label="Yeni şifrə" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><PasswordInput label="Şifrəni təsdiqlə" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /><ul className="password-requirements" aria-label="Şifrə şərtləri"><li className={requirements[0] ? 'met' : ''}><CheckCircle2 size={15} />Minimum 8 simvol</li><li className={requirements[1] ? 'met' : ''}><CheckCircle2 size={15} />Bir böyük hərf</li><li className={requirements[2] ? 'met' : ''}><CheckCircle2 size={15} />Bir rəqəm</li></ul><Button type="submit" icon={<ArrowRight size={20} />} loading={loading}>Şifrəni yenilə</Button></form><Link className="back-link" to="/login"><ArrowLeft size={16} />Girişə qayıt</Link></AuthRecoveryShell>;
}
