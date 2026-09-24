import { ArrowRight,LockKeyhole,Mail,ShieldCheck } from 'lucide-react';
import { type FormEvent,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { Button,Checkbox,Input,PasswordInput,Toast } from '../../components/common/primitives';
import { serviceCapabilities,services } from '../../services';
import { ApiError } from '../../services/apiError';
import '../../styles/auth.css';
import '../../styles/registration-fields.css';
import { AuthAvailabilityNotice,AuthHeader } from './AuthPagesShared';
export function LoginPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [unavailableAttempted, setUnavailableAttempted] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (admin || !serviceCapabilities.login) { setError('Admin girişi hazırda əlçatan deyil.'); setUnavailableAttempted(true); return; }
    setLoading(true);
    try { const session = await services.auth.login(email, password, remember); navigate(admin ? '/admin' : session.role === 'visitor' ? '/account/legacy-claim' : '/team'); }
    catch (nextError) {
      if (nextError instanceof ApiError && nextError.code === 'ACCOUNT_LOCKED') setError('Hesab müvəqqəti kilidlənib. Dəstək xidməti ilə əlaqə saxlayın.');
      else if (nextError instanceof ApiError && nextError.kind === 'rate-limit') setError('Çox sayda giriş cəhdi edildi. Bir az sonra yenidən cəhd edin.');
      else if (nextError instanceof ApiError && nextError.kind === 'timeout') setError('Giriş sorğusu 30 saniyə ərzində tamamlanmadı. Bağlantını yoxlayıb yenidən cəhd edin.');
      else if (nextError instanceof ApiError && nextError.kind === 'network') setError('Serverlə bağlantı qurulmadı. İnternet və lokal server bağlantısını yoxlayın.');
      else if (nextError instanceof ApiError && nextError.kind === 'server') setError(`Giriş serveri xəta qaytardı (${nextError.code || nextError.status}).${nextError.requestId ? ` Sorğu kodu: ${nextError.requestId}` : ''}`);
      else setError('Daxil olmaq mümkün olmadı. Email və şifrəni yoxlayın. Əvvəlki hesabınız varsa “Şifrəni unutmusunuz?” keçidi ilə yeni şifrə yaradın.');
    }
    finally { setLoading(false); }
  };
  if (admin) return <div className="auth-form-shell"><AuthHeader identity={!admin} title={admin ? 'Admin girişi' : 'Komanda panelinə giriş'} body={admin ? 'Yarış əməliyyatları yalnız səlahiyyətli administratorlar üçündür.' : 'Təsdiq, slot, check-in, otaq və nəticələr bir paneldə.'} />{error && <Toast tone="error" title="Giriş alınmadı" body={error} />}<form className="auth-form" onSubmit={submit}><div className="auth-capability-fields"><Input label="E-poçt" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setUnavailableAttempted(false); }} autoComplete="email" required placeholder="captain@gmail.com" /><PasswordInput label="Şifrə" value={password} onChange={(event) => { setPassword(event.target.value); setUnavailableAttempted(false); }} autoComplete="current-password" required /><div className="form-inline"><Checkbox label="Məni xatırla" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><Link to="/forgot-password">Şifrəni unutmusunuz?</Link></div><Button type="submit" loading={loading} aria-describedby={!serviceCapabilities.login ? 'login-capability-status' : undefined}>{admin ? 'Admin panelini aç' : 'Daxil ol'}</Button>{!serviceCapabilities.login && <AuthAvailabilityNotice attempted={unavailableAttempted} />}</div></form>{serviceCapabilities.login && <div className="auth-note"><ShieldCheck size={19} /><p>{<><strong>Təhlükəsiz giriş.</strong> Brauzerin parol meneceri və avtomatik doldurma funksiyasından istifadə edə bilərsiniz.</>}</p></div>}{!admin && <p className="auth-switch">Komandanız yoxdur? <Link to="/register">Komanda yaradın</Link></p>}</div>;
  return <div className="auth-form-shell"><AuthHeader identity={!admin} title={admin ? 'Admin girişi' : 'Komanda panelinə giriş'} body={admin ? 'Yarış əməliyyatları yalnız səlahiyyətli administratorlar üçündür.' : 'Təsdiq, slot, check-in, otaq və nəticələr bir paneldə.'} />{error && <Toast tone="error" title="Giriş alınmadı" body={error} />}<div className="login-card"><form className="auth-form" onSubmit={submit}><div className="auth-capability-fields"><div className="auth-icon-field"><Input leadingIcon={<Mail size={20} aria-hidden="true" />} label="E-poçt" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setUnavailableAttempted(false); }} autoComplete="email" required placeholder="captain@gmail.com" /></div><div className="auth-icon-field"><PasswordInput leadingIcon={<LockKeyhole size={20} aria-hidden="true" />} label="Şifrə" value={password} onChange={(event) => { setPassword(event.target.value); setUnavailableAttempted(false); }} autoComplete="current-password" required placeholder="Şifrənizi daxil edin" /></div><div className="form-inline"><Checkbox label="Məni xatırla" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><Link to="/forgot-password">Şifrəni unutmusunuz?</Link></div><Button type="submit" icon={<ArrowRight size={20} />} loading={loading} aria-describedby={!serviceCapabilities.login ? 'login-capability-status' : undefined}>{admin ? 'Admin panelini aç' : 'Daxil ol'}</Button>{!serviceCapabilities.login && <AuthAvailabilityNotice attempted={unavailableAttempted} />}</div></form><div className="auth-note"><ShieldCheck size={22} /><p>Əvvəlki hesabınız varsa, şifrə bərpası ilə yeni şifrə yaradın.</p></div>{!admin && <p className="auth-switch">Komandanız yoxdur? <Link to="/register">Komanda yaradın <ArrowRight size={17} /></Link></p>}</div></div>;
}
