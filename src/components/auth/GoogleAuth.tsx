import {useEffect,useState} from 'react';
import {Button,Input,PasswordInput} from '../common/primitives';
import {sessionTransport} from '../../services/tokenSession';
import {ApiError} from '../../services/apiError';
const root=(import.meta.env.VITE_API_BASE_URL as string|undefined)||'/api';
export type GoogleContinuation={email:string;firstName:string;lastName:string;mode:'login'|'link'|'register'};
export const googleContinuation=()=>sessionTransport(root).request<GoogleContinuation>('/auth/google/continuation');
export function GoogleAuth({registration=false}:{registration?:boolean}){
 const [enabled,setEnabled]=useState(false),[pending,setPending]=useState<GoogleContinuation>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[password,setPassword]=useState(''),[otp,setOtp]=useState(''),[needsOtp,setNeedsOtp]=useState(false);
 useEffect(()=>{
  let active=true;
  const query=new URLSearchParams(window.location.search);
  if(query.get('google')==='failed')setError('Google girişi tamamlanmadı. Yenidən cəhd edin.');
  sessionTransport(root).request<{enabled:boolean}>('/auth/google/status').then(r=>{if(active)setEnabled(r.enabled);}).catch(()=>{});
  if(!registration&&query.get('google')==='continue')googleContinuation().then(r=>{if(active)setPending(r);}).catch(()=>{if(active)setError('Google təsdiqinin müddəti bitib. Yenidən başlayın.');});
  return()=>{active=false;};
 },[registration]);
 const start=async()=>{
  setBusy(true);setError('');
  try{const result=await sessionTransport(root).request<{url:string}>('/auth/google/start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});window.location.assign(result.url);}
  catch{setError('Google girişi hazırda əlçatan deyil. Yenidən cəhd edin.');setBusy(false);}
 };
 const complete=async()=>{
  setBusy(true);setError('');
  try{await sessionTransport(root).request('/auth/google/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pending?.mode==='link'?password:undefined,otp:otp||undefined})});window.location.assign('/team');}
  catch(e){if(e instanceof ApiError&&['MFA_REQUIRED','MFA_INVALID'].includes(e.code)){setNeedsOtp(true);setError('Doğrulama və ya bərpa kodunu daxil edin.');}else setError('Giriş tamamlanmadı. Şifrəni yoxlayın və ya Google təsdiqini yenidən başladın.');setBusy(false);}
 };
 if(!enabled&&!error&&!pending)return null;
 return <section className="google-auth" aria-label="Google ilə giriş">
  {pending&&pending.mode!=='register'?<><p><strong>{pending.email}</strong></p><p>{pending.mode==='link'?'Google hesabını əlaqələndirmək üçün mövcud AEVIC şifrənizi təsdiqləyin.':'Google hesabınız təsdiqləndi. Girişi tamamlayın.'}</p>{pending.mode==='link'&&<PasswordInput label="Mövcud AEVIC şifrəsi" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />}{needsOtp&&<Input label="Doğrulama və ya bərpa kodu" value={otp} onChange={e=>setOtp(e.target.value)} autoComplete="one-time-code" />}<Button type="button" loading={busy} disabled={pending.mode==='link'&&!password} onClick={()=>void complete()}>{pending.mode==='link'?'Hesabı əlaqələndir və daxil ol':'Girişi tamamla'}</Button><button type="button" disabled={busy} onClick={()=>void start()}>Başqa Google hesabı seç</button></>:enabled&&<Button type="button" variant="secondary" loading={busy} onClick={()=>void start()}>Google ilə davam et</Button>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
