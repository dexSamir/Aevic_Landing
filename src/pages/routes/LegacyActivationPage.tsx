import { useState,type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button,Input,PageHeader } from '../../components/common/primitives';
import { services } from '../../services';

export function LegacyActivationPage(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await services.legacyClaims.activate(email,password);setPassword('');setNotice('Sorğu qəbul edildi. Uyğun olduqda email təsdiqi üçün təlimat gələcək. Bu bildiriş email çatdırılmasını və komanda sahibliyini təsdiqləmir.');}catch{setError('Sorğu tamamlanmadı. Bir qədər sonra yenidən cəhd edin.');}finally{setBusy(false);}}
 return <section className="auth-card"><PageHeader title="Əvvəlki komandanı bərpa et" description="Əvvəlcə yeni hesabınızı yaradın və emailinizi təsdiqləyin. Köhnə şifrəniz istifadə olunmur; komanda ayrıca müstəqil yoxlamadan sonra bağlanır."/><form className="account-form" onSubmit={submit}><Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/><Input label="Yeni şifrə" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} pattern="(?=.*[A-Z])(?=.*[0-9]).{8,128}" required/><small>Ən az 8 simvol, bir böyük hərf və bir rəqəm.</small><Button type="submit" loading={busy}>Hesab üçün müraciət et</Button></form>{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}<p><Link to="/login">Artıq hesabınız var? Daxil olun</Link></p><p><Link to="/forgot-password">Yeni hesabın şifrəsini bərpa et</Link></p><p><Link to="/account/legacy-claim">Email təsdiqindən sonra komandanı tələb et</Link></p></section>;
}
