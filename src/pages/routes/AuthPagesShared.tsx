import { ArrowRight,ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeAzerbaijanPhone } from '../../components/common/primitives';
import { serviceCapabilities } from '../../services';
import '../../styles/auth.css';
import '../../styles/registration-fields.css';
import type { RegistrationPlayerDraft,TeamRegistrationDraft } from '../../types/domain';
import { parseRegistrationDraft,REGISTER_DRAFT_KEY } from '../../utils/registrationDraft';

export function AuthHeader({ title, body, identity = false }: { title: string; body: string; identity?: boolean }) {
  return <header className="auth-header"><span>{identity ? "// AEVIC HESABI" : serviceCapabilities.login ? "AEVIC secure access" : "AEVIC hesabı"}</span><h1>{title}</h1><p>{body}</p></header>;
}
export function AuthAvailabilityNotice({ registration = false, attempted = false }: { registration?: boolean; attempted?: boolean }) {
  if (registration) return <details id="register-capability-status" className="auth-availability auth-availability--compact" open={attempted || undefined}>
    <summary><ShieldCheck size={16} aria-hidden="true" />Komanda qeydiyyatı hazırda aktiv deyil.</summary>
    <div role="status"><p>{attempted ? 'Qaralamanız saxlanıldı. Son göndəriş ictimai baxış rejimində serverə ötürülmür.' : 'Formanı doldurub bütün addımları yoxlaya bilərsiniz. Yalnız son server göndərişi bağlıdır.'}</p><Link to="/support">Dəstək və mövcud imkanlar <ArrowRight size={15} aria-hidden="true" /></Link></div>
  </details>;
  return <aside id={registration ? 'register-capability-status' : 'login-capability-status'} className={`auth-availability ${attempted ? 'is-confirmed' : ''}`} role="status" aria-live="polite">
    <ShieldCheck size={20} aria-hidden="true" />
    <div><strong>{registration ? 'Komanda qeydiyyatı hazırda aktiv deyil.' : 'Hesaba giriş hazırda aktiv deyil.'}</strong>
      <p>{registration ? attempted ? 'Qaralamanız saxlanıldı. Son göndəriş ictimai baxış rejimində serverə ötürülmür.' : 'Formanı doldurub bütün addımları yoxlaya bilərsiniz. Yalnız son server göndərişi bağlıdır.' : attempted ? 'Məlumatlarınız olduğu kimi saxlanıldı. İctimai baxış rejimində serverə giriş sorğusu göndərilmir.' : 'İctimai baxış rejimində formanı sınaya bilərsiniz. Giriş sorğusu serverə göndərilməyəcək.'}</p>
      <Link to="/support">Dəstək və mövcud imkanlar <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </aside>;
}
export const defaultPlayers: RegistrationPlayerDraft[] = [
  { ign: '', uid: '', role: 'captain' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'starter' },
  { ign: '', uid: '', role: 'substitute' },
];
export const defaultDraft: TeamRegistrationDraft = { teamName: '', tag: '', firstName: '', lastName: '', phone: '', email: '', players: defaultPlayers };
export type TeamAvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
export type PlayerCheck = { state: 'idle' | 'checking' | 'eligible' | 'unavailable' | 'error'; message?: string };
export function restoreRegistrationDraft() {
  try {
    window.sessionStorage.removeItem('aevic-register-draft-v1');
    const stored = parseRegistrationDraft(window.sessionStorage.getItem(REGISTER_DRAFT_KEY));
    if (stored) return stored;
    window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch { /* Storage may be disabled; the form remains usable. */ }
  return { step: 1, draft: defaultDraft };
}
export function getStepErrors(step: number, draft: TeamRegistrationDraft, password: string, confirmation: string, _playerChecks: Record<number, PlayerCheck> = {}) {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.teamName.trim()) errors.teamName = 'Komanda adını daxil edin.';
  }
  if (step === 2) {
    if (!draft.firstName.trim()) errors.firstName = 'Kapitanın adını daxil edin.';
    if (!draft.lastName.trim()) errors.lastName = 'Kapitanın soyadını daxil edin.';
    if (!/^\+994\d{9}$/.test(normalizeAzerbaijanPhone(draft.phone))) errors.phone = '9 rəqəmli Azərbaycan mobil nömrəsi daxil edin.';
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.email = 'Düzgün email ünvanı daxil edin.';
    if (!password) errors.password = 'Şifrəni daxil edin.';
    else if (password.length < 8 || !/[A-ZƏÖÜĞÇŞİ]/.test(password) || !/\d/.test(password)) errors.password = 'Aşağıdakı üç şərti tamamlayın.';
    if (!confirmation) errors.confirmation = 'Şifrəni təkrar daxil edin.';
    else if (confirmation !== password) errors.confirmation = 'Şifrələr uyğun gəlmir.';
  }
  if (step === 3) {
    draft.players.forEach((player,index)=>{if(index===4&&!player.ign&&!player.uid)return;if(player.ign.trim().length<2)errors[`player-${index}-ign`]='Oyunçu adı ən azı 2 simvol olmalıdır.';if(!/^\d{5,20}$/.test(player.uid))errors[`player-${index}-uid`]='PUBG ID 5–20 rəqəmdən ibarət olmalıdır.';else if(draft.players.some((other,i)=>i!==index&&other.uid===player.uid))errors[`player-${index}-uid`]='Bu PUBG ID heyətdə təkrarlanır.';});
  }
  return errors;
}
