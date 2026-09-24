import { ArrowLeft,ArrowRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthRecoveryShell } from '../../components/auth/AuthRecoveryShell';
import '../../styles/auth.css';
import type { AuthTokenState } from '../../types/domain';

export const resetCopy: Record<Exclude<AuthTokenState, 'already-verified'>, { title: string; body: string }> = {
  valid: { title: 'Yeni şifrə yarat', body: 'Əvvəl istifadə etmədiyiniz güclü şifrə seçin.' },
  invalid: { title: 'Bərpa linki etibarlı deyil', body: 'Link natamam və ya dəyişdirilmiş ola bilər.' },
  expired: { title: 'Bu bərpa linkinin vaxtı bitib.', body: 'Hesabın təhlükəsizliyi üçün yeni link tələb edin.' },
  used: { title: 'Bu link artıq istifadə olunub', body: 'Şifrəniz dəyişdirilibsə girişə keçin; əks halda yeni link istəyin.' },
};
export function AuthBlockedState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <AuthRecoveryShell title={<>Şifrəni<br /><em>bərpa et</em></>}><div className="recovery-state" role="status"><span className="recovery-state__icon recovery-state__icon--error">{icon}</span><h2>{title}</h2><p>{body}</p><Link className="button button--primary" to="/forgot-password"><span>Yeni bərpa linki istə</span><ArrowRight size={20} /></Link></div><Link className="back-link" to="/login"><ArrowLeft size={16} />Girişə qayıt</Link></AuthRecoveryShell>;
}
