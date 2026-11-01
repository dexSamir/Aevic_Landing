import { ArrowLeft,ArrowRight,CheckCircle2,Mail } from 'lucide-react';
import { type FormEvent,useEffect,useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthRecoveryShell } from '../../components/auth/AuthRecoveryShell';
import { Button,Input,Toast } from '../../components/common/primitives';
import { ApiError } from '../../services/apiError';
import { services } from '../../services';
import '../../styles/auth.css';
import '../../styles/registration-fields.css';

export function ForgotPasswordPage() {
  const inFlight = useRef(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (cooldown || inFlight.current) return;
    inFlight.current = true; setLoading(true); setError('');
    try {
      await services.auth.requestPasswordReset(email);
      setSent(true);
      // CaptainAuthService suppresses replacement tokens for 60 seconds.
      setCooldown(60);
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'rate-limit') {
        setCooldown(Math.max(60, Math.ceil((error.retryAfterMs ?? 0) / 1000)));
        setError('Çox sayda sorğu göndərildi. Göstərilən müddətdən sonra yenidən cəhd edin.');
      } else if (error instanceof ApiError && ['server', 'timeout'].includes(error.kind)) {
        setError('Sorğunun nəticəsi təsdiqlənmədi. E-poçtunuzu yoxlayın və bir az sonra yenidən cəhd edin.');
      } else setError('Sorğu göndərilmədi. Şəbəkəni yoxlayıb yenidən cəhd edin.');
    } finally { inFlight.current = false; setLoading(false); }
  };
  return <AuthRecoveryShell title={<>Şifrəni<br /><em>bərpa et</em></>} description="Hesab mövcud olarsa, email ünvanına təhlükəsiz bərpa linki göndəriləcək.">
    {error && <Toast tone="error" title="Sorğu tamamlanmadı" body={error} />}
    {sent ? <div className="recovery-state" role="status"><CheckCircle2 className="recovery-state__icon" size={52} /><h2>Bərpa sorğusu qəbul edildi.</h2><p>Hesab mövcuddursa, bərpa məktubu göndəriləcək. Çatdırılma gecikə bilər; spam qovluğunu da yoxlayın. Yeni sorğu əvvəlki linki etibarsız edə bilər. Yalnız ən son sorğunuza aid məktubdakı linkdən istifadə edin.</p><Button variant="secondary" disabled={cooldown > 0} loading={loading} onClick={() => void send()}>{cooldown ? `Yenidən göndər · ${cooldown}s` : 'Yenidən göndər'}</Button></div> : <form className="auth-form" onSubmit={send}><Input leadingIcon={<Mail size={20} aria-hidden="true" />} label="E-poçt" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="captain@gmail.com" autoComplete="email" required /><Button type="submit" disabled={cooldown > 0} icon={<ArrowRight size={20} />} loading={loading}>{cooldown ? `Yenidən cəhd · ${cooldown}s` : 'Bərpa linkini göndər'}</Button></form>}
    <Link className="back-link" to="/login"><ArrowLeft size={16} /> Girişə qayıt</Link>
  </AuthRecoveryShell>;
}
