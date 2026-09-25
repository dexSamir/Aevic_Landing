import { Clock3,MailCheck,ShieldAlert } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { Button,LoadingSkeleton,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import '../../styles/auth.css';
import type { AuthTokenState } from '../../types/domain';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? params.get('token_hash') ?? params.get('token') ?? '');
  useEffect(() => { if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search); }, []);
  const [state, setState] = useState<AuthTokenState>();
  const [nextPath,setNextPath]=useState('/login');
  useEffect(()=>{
    if(state!=='already-verified')return;
    let active=true;
    services.auth.getSession().then(session=>{if(active)setNextPath(!session?'/login':session.role==='visitor'?'/account/legacy-claim':session.role==='admin'?'/admin':'/team');}).catch(()=>{if(active)setNextPath('/login');});
    return()=>{active=false;};
  },[state]);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false); const [notice,setNotice]=useState('');
  useEffect(() => {
    let active = true;
    services.auth.inspectEmailVerification(token).then(async (result) => {
      if (!active) return;
      if (result.state === 'valid') { try { await services.auth.verifyEmail(token); if (active) setState('already-verified'); } catch { if (active) setState('invalid'); } }
      else setState(result.state);
    }).catch(() => { if (active) setState('invalid'); });
    return () => { active = false; };
  }, [token]);
  const resend = async () => { setResending(true); try { await services.auth.resendVerification(); setResent(true); } catch {setNotice('Təsdiq emaili göndərilmədi. Giriş səhifəsindən e-poçt ünvanınızla yenidən cəhd edin.');} finally { setResending(false); } };
  if (!state) return <div className="auth-form-shell"><LoadingSkeleton variant="form" rows={4} /></div>;
  if (state === 'already-verified') return <div className="auth-form-shell auth-success"><MailCheck size={42} /><h1>Email təsdiqləndi.</h1><p>Həssas komanda əməliyyatlarına giriş hesab və komanda səlahiyyəti ilə birlikdə yoxlanacaq.</p><Link className="button button--primary" to={nextPath}><span>{nextPath==='/account/legacy-claim'?'Əvvəlki komandanı bağla':nextPath==='/login'?'Girişə keç':nextPath==='/admin'?'Admin panelini aç':'Komanda panelini aç'}</span></Link></div>;
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{state === 'expired' ? <Clock3 /> : <ShieldAlert />}</span><h1>{state === 'expired' ? 'Təsdiq linkinin vaxtı bitib' : 'Təsdiq linki etibarlı deyil'}</h1><p>Yeni təsdiq emaili istəyin. Hesabın mövcudluğu barədə əlavə məlumat göstərilmir.</p>{notice && <Toast title={notice} />}{resent && <Toast title="Təsdiq emaili göndərildi" body="Gələnlər və spam qovluğunu yoxlayın." />}<Button loading={resending} onClick={() => void resend()}>Yenidən göndər</Button><Link className="back-link" to="/login">Girişə qayıt</Link></div>;
}
