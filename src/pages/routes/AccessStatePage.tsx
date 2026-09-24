import { Clock3,LockKeyhole,ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../styles/auth.css';

export function AccessStatePage({ state }: { state: 'unauthorized' | 'forbidden' | 'session-expired' | 'account-locked' | 'rate-limited' }) {
  const copy = {
    unauthorized: ['Giriş tələb olunur', 'Bu səhifəni açmaq üçün hesabınıza daxil olun.'],
    forbidden: ['Bu əməliyyat üçün icazəniz yoxdur', 'Komanda rolu və ya admin səlahiyyəti backend tərəfindən yoxlanılır.'],
    'session-expired': ['Sessiyanın vaxtı bitib', 'Davam etmək üçün təhlükəsiz şəkildə yenidən daxil olun.'],
    'account-locked': ['Hesab müvəqqəti kilidlənib', 'Təhlükəsizlik səbəbi ilə giriş dayandırılıb. Dəstək xidməti ilə əlaqə saxlayın.'],
    'rate-limited': ['Çox sayda cəhd edildi', 'Bir neçə dəqiqə gözləyin və yenidən cəhd edin.'],
  }[state];
  return <div className="auth-form-shell auth-lifecycle-state"><span className="auth-lifecycle-state__icon">{state === 'rate-limited' ? <Clock3 /> : state === 'account-locked' ? <LockKeyhole /> : <ShieldAlert />}</span><h1>{copy[0]}</h1><p>{copy[1]}</p><div><Link className="button button--primary" to="/login"><span>Girişə keç</span></Link><Link className="button button--ghost" to="/support"><span>Dəstək mərkəzi</span></Link></div></div>;
}
