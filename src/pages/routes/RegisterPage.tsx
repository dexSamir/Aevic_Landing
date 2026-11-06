import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Checkbox, Input, PasswordInput } from '../../components/common/primitives';
import { GoogleAuth } from '../../components/auth/GoogleAuth';
import { AccountPurposeChoice } from '../../components/auth/AccountPurposeChoice';
import { services } from '../../services';
import { AuthHeader } from './AuthPagesShared';
import '../../styles/onboarding.css';

export function RegisterPage() {
 const navigate=useNavigate(),pending=useRef(false);
 const [key]=useState(()=>crypto.randomUUID()),[purpose,setPurpose]=useState<'spectator'|'team'|null>(null);
 const [firstName,setFirst]=useState(''),[lastName,setLast]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(pending.current)return;setError('');
  if(!purpose){setError('Hesabın məqsədini seçin.');return;}
  if(password!==confirmation){setError('Şifrələr uyğun gəlmir.');return;}
  if(!accepted){setError('İstifadə şərtlərini qəbul edin.');return;}
  pending.current=true;setBusy(true);
  try{await services.auth.registerAccount({firstName,lastName,email,password,purpose,idempotencyKey:key});navigate(purpose==='team'?'/team/setup':'/account',{replace:true});}
  catch(e){setError(e instanceof Error?e.message:'Hesab yaradılmadı. Yenidən cəhd edin.');}finally{pending.current=false;setBusy(false);}
 };
 return <div className="auth-form-shell account-registration"><AuthHeader identity title="AEVIC-ə qoşul" body="Əvvəl hesabını yarat. Komanda qurmaq istəsən, ayrıca davam edəcəksən."/><GoogleAuth registration/><div className="onboarding-divider"><span>və ya e-poçt ilə</span></div><form className="auth-form" onSubmit={submit}><fieldset disabled={busy} className="onboarding-fields"><AccountPurposeChoice value={purpose} onChange={setPurpose}/><div className="form-grid"><Input label="Ad" autoComplete="given-name" value={firstName} onChange={e=>setFirst(e.target.value)} required maxLength={80}/><Input label="Soyad" autoComplete="family-name" value={lastName} onChange={e=>setLast(e.target.value)} required maxLength={80}/></div><Input label="E-poçt" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/><PasswordInput label="Şifrə" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required hint="Ən az 8 simvol, bir böyük hərf və bir rəqəm."/><PasswordInput label="Şifrəni təkrarla" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required/><Checkbox label="İstifadə şərtlərini və məxfilik qaydalarını qəbul edirəm" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><p className="onboarding-legal"><Link to="/terms">İstifadə şərtləri</Link> · <Link to="/privacy">Məxfilik</Link></p>{error&&<p role="alert">{error}</p>}<Button type="submit" loading={busy} icon={<ArrowRight size={18}/>}>Hesab yarat</Button></fieldset></form><p className="auth-switch">Artıq hesabınız var? <Link to="/login">Daxil olun</Link></p></div>;
}
