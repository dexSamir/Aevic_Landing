import { ArrowLeft,ArrowRight,CheckCircle2,Mail } from 'lucide-react';
import { type FormEvent,useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthRecoveryShell } from '../../components/auth/AuthRecoveryShell';
import { Button,Input,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import '../../styles/auth.css';
import '../../styles/registration-fields.css';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  const send = async (event?: FormEvent) => { event?.preventDefault(); if (cooldown || loading) return; setLoading(true); setError(''); try { await services.auth.requestPasswordReset(email); setSent(true); setCooldown(30); } catch { setError('Sorğu göndərilmədi. Şəbəkəni yoxlayıb yenidən cəhd edin.'); } finally { setLoading(false); } };
  return <AuthRecoveryShell title={<>Şifrəni<br /><em>bərpa et</em></>} description="Hesab mövcud olarsa, email ünvanına təhlükəsiz bərpa linki göndəriləcək.">
    {error && <Toast tone="error" title="Sorğu tamamlanmadı" body={error} />}
    {sent ? <div className="recovery-state" role="status"><CheckCircle2 className="recovery-state__icon" size={52} /><h2>Şifrə bərpa linki göndərildi.</h2><p>Hesab mövcud olarsa link bir neçə dəqiqə ərzində gələcək. Spam qovluğunu da yoxlayın.</p><Button variant="secondary" disabled={cooldown > 0} loading={loading} onClick={() => void send()}>{cooldown ? `Yenidən göndər · ${cooldown}s` : 'Yenidən göndər'}</Button></div> : <form className="auth-form" onSubmit={send}><Input leadingIcon={<Mail size={20} aria-hidden="true" />} label="E-poçt" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="captain@gmail.com" autoComplete="email" required /><Button type="submit" icon={<ArrowRight size={20} />} loading={loading}>Bərpa linkini göndər</Button></form>}
    <Link className="back-link" to="/login"><ArrowLeft size={16} /> Girişə qayıt</Link>
  </AuthRecoveryShell>;
}
