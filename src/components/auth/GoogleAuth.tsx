import { MfaCodeInput } from './MfaCodeInput';
import {navigateGoogleOAuth} from '../../utils/googleOAuthRedirect';
import {useEffect,useState} from 'react';
import {Button,PasswordInput,Checkbox} from '../common/primitives';
import {sessionTransport} from '../../services/tokenSession';
import {safeAuthReturn} from '../../utils/authReturn';
import {ApiError} from '../../services/apiError';
const root=(import.meta.env.VITE_API_BASE_URL as string|undefined)||'/api';
export type GoogleContinuation={remember?:boolean;email:string;firstName:string;lastName:string;mode:'login'|'link'|'register'};
export const googleContinuation=()=>sessionTransport(root).request<GoogleContinuation>('/auth/google/continuation');
export function GoogleAuth({registration=false,onContinuation}:{registration?:boolean;onContinuation?:(active:boolean)=>void}){
 const [remember,setRemember]=useState(true);
 const [resolving,setResolving] = useState(() => !registration && new URLSearchParams(window.location.search).get('google') === 'continue');
 const [enabled,setEnabled]=useState(false),[pending,setPending]=useState<GoogleContinuation>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[needsOtp,setNeedsOtp]=useState(false);
 useEffect(()=>{
  let active=true;
  const query=new URLSearchParams(window.location.search);
  if(query.get('mfa')==='required')setNeedsOtp(true);
  if(query.get('google')==='failed')setError('Google girişi tamamlanmadı. Yenidən cəhd edin.');
  sessionTransport(root).request<{enabled:boolean}>('/auth/google/status').then(r=>{if(active)setEnabled(r.enabled);}).catch(()=>{if(active)setError('Google giriş seçimi yüklənmədi. Səhifəni yeniləyib cəhd edin.');});
  if(!registration&&query.get('google')==='continue')googleContinuation().then(r=>{if(active){setPending(r);setRemember(r.remember ?? false);}}).catch(()=>{if(active)setError('Google təsdiqinin müddəti bitib. Yenidən başlayın.');}).finally(()=>{if(active)setResolving(false);});
  return()=>{active=false;};
 },[registration]);
 useEffect(() => { onContinuation?.(Boolean(resolving || pending && pending.mode !== 'register')); }, [pending, resolving, onContinuation]);
 useEffect(() => { const restored = () => setBusy(false); window.addEventListener('pageshow', restored); return () => window.removeEventListener('pageshow', restored); }, []);
 const start=async()=>{
  if (busy) return;
  setBusy(true);setError('');
  try{const result=await sessionTransport(root).request<{url:string}>('/auth/google/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({remember,returnTo:safeAuthReturn(new URLSearchParams(window.location.search).get('returnTo'))})});navigateGoogleOAuth(result.url);}
  catch{setError('Google girişi hazırda əlçatan deyil. Yenidən cəhd edin.');setBusy(false);}
 };
 const complete=async()=>{
  if (busy) return;
  setBusy(true);setError('');
  try{const result=await sessionTransport(root).request<{redirectTo:string}>('/auth/google/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pending?.mode==='link'?password:undefined,otp:otp||undefined,remember})});window.location.replace(result.redirectTo === '/' ? '/' : safeAuthReturn(result.redirectTo) ?? '/');}
  catch(e){if(e instanceof ApiError&&['MFA_REQUIRED','MFA_INVALID'].includes(e.code)){setNeedsOtp(true);setError(e.code === 'MFA_INVALID' ? 'Kod yanlışdır və ya müddəti bitib. Yeni kodla yenidən cəhd edin.' : '');}else setError('Giriş tamamlanmadı. Şifrəni yoxlayın və ya Google təsdiqini yenidən başladın.');setBusy(false);}
 };
 if(resolving)return <p role="status">Google təsdiqi yoxlanılır…</p>;
 if(!enabled&&!error&&!pending)return null;
 return <section className="google-auth" aria-label="Google ilə giriş">
  {pending&&pending.mode!=='register'?<form onSubmit={event=>{event.preventDefault();void complete();}}><p><strong>{pending.email}</strong></p>{!needsOtp && <p>{pending.mode==='link'?'Google hesabını əlaqələndirmək üçün mövcud AEVIC şifrənizi təsdiqləyin.':needsOtp?'Google hesabınız təsdiqləndi. İki mərhələli doğrulamanı tamamlayın.':'Google hesabınız təsdiqləndi. Girişi tamamlayın.'}</p>}{pending.mode==='link'&&<PasswordInput label="Mövcud AEVIC şifrəsi" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />}{needsOtp&&<MfaCodeInput invalid={Boolean(error)} value={otp} onChange={setOtp} disabled={busy} action={<Button type="submit" loading={busy} disabled={(pending.mode==='link'&&!password)||(needsOtp&&!otp)}>{pending.mode==='link'?'Hesabı əlaqələndir və daxil ol':'Girişi tamamla'}</Button>} />}{!needsOtp && <Button type="submit" loading={busy} disabled={(pending.mode==='link'&&!password)||(needsOtp&&!otp)}>{pending.mode==='link'?'Hesabı əlaqələndir və daxil ol':'Girişi tamamla'}</Button>}<Checkbox label="Bu cihazda məni xatırla (30 gün)" checked={remember} disabled={busy} onChange={event=>setRemember(event.target.checked)} /><button type="button" disabled={busy} onClick={()=>window.location.assign('/login')}>Girişə qayıt</button></form>:enabled&&<Button className="google-auth-button" type="button" variant="secondary" loading={busy} onClick={()=>void start()} icon={<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>}>Google ilə davam et</Button>}
  {(!pending || pending.mode==='register') && <Checkbox label="Bu cihazda məni xatırla (30 gün)" checked={remember} disabled={busy} onChange={event=>setRemember(event.target.checked)} />}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
