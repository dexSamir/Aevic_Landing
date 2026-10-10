import { Clock3,MailCheck,ShieldAlert } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { Button,Input,LoadingSkeleton,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import '../../styles/auth.css';
import type { AuthTokenState } from '../../types/domain';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? params.get('token_hash') ?? params.get('token') ?? '');
  useEffect(() => { const url=new URL(window.location.href);url.hash='';url.searchParams.delete('token');url.searchParams.delete('token_hash');window.history.replaceState(null, '', url.pathname + url.search); }, []);
  const [state, setState] = useState<AuthTokenState>();
  const [nextPath,setNextPath]=useState('/login');
  useEffect(()=>{
    if(state!=='already-verified')return;
    let active=true;
    services.auth.getSession().then(session=>{if(active)setNextPath(!session?'/login':session.role==='visitor'?'/account/legacy-claim':session.role==='admin'?'/admin':'/team');}).catch(()=>{if(active)setNextPath('/login');});
    return()=>{active=false;};
  },[state]);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(false), 60000); return () => clearTimeout(timer); }, [cooldown]);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false); const [notice,setNotice]=useState('');
  useEffect(() => {
    let active = true;
    services.auth.inspectEmailVerification(token).then(async (result) => {
      if (!active) return;
      if (result.state === 'valid') { try { await services.auth.verifyEmail(token); if (active) setState('already-verified'); } catch { const latest=await services.auth.inspectEmailVerification(token);if(active)setState(latest.state); } }
      else setState(result.state);
    }).catch(() => { if (active) setState('invalid'); });
    return () => { active = false; };
  }, [token]);
  const resend = async () => { setResending(true); try { await services.auth.resendVerification(email || undefined); setResent(true); setCooldown(true); } catch {setNotice('Təsdiq emaili göndərilmədi. Giriş səhifəsindən e-poçt ünvanınızla yenidən cəhd edin.');} finally { setResending(false); } };
  if (!state) return <div className="auth-form-shell"><LoadingSkeleton variant="form" rows={4} /></div>;
  if (state === 'already-verified') return <div className="auth-form-shell auth-success"><MailCheck size={42} /><h1>Email təsdiqləndi.</h1><p>Həssas komanda əməliyyatlarına giriş hesab və komanda səlahiyyəti ilə birlikdə yoxlanacaq.</p><Link className="button button--primary" to={nextPath}><span>{nextPath==='/account/legacy-claim'?'Əvvəlki komandanı bağla':nextPath==='/login'?'Girişə keç':nextPath==='/admin'?'Admin panelini aç':'Komanda panelini aç'}</span></Link></div>;
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{state === 'expired' ? <Clock3 /> : <ShieldAlert />}</span><h1>{!token ? 'E-poçt ünvanınızı təsdiqləyin' : state === 'expired' ? 'Təsdiq linkinin vaxtı bitib' : 'Təsdiq linki etibarlı deyil'}</h1><p>Yeni təsdiq emaili istəyin. Hesabın mövcudluğu barədə əlavə məlumat göstərilmir.</p>{notice && <Toast title={notice} />}{resent && <Toast title="Sorğu qəbul edildi" body="Uyğun hesab varsa, təsdiq məktubu göndəriləcək. Gələnlər və spam qovluğunu yoxlayın." />}<Input label="E-poçt ünvanınız" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /><Button loading={resending} disabled={cooldown} onClick={() => void resend()}>{cooldown ? '60 saniyə sonra yenidən cəhd edin' : 'Yenidən göndər'}</Button><Link className="back-link" to="/login">Girişə qayıt</Link></div>;
}
