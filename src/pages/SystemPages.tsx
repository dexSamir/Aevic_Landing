import './system-pages.css';
import { CloudOff, Construction, House, RefreshCcw, ServerCrash, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/primitives';

type SystemState = 'forbidden' | 'not-found' | 'server-error' | 'maintenance' | 'offline';

const copy: Record<SystemState, { code: string; title: string; body: string; icon: typeof ShieldAlert }> = {
  forbidden: { code: '403', title: 'Bu səhifə üçün icazəniz yoxdur', body: 'Rol və ownership icazəsi backend tərəfindən rədd edildi. Başqa hesabla daxil olun və ya dəstəklə əlaqə saxlayın.', icon: ShieldAlert },
  'not-found': { code: '404', title: 'Bu səhifə yarış cədvəlində yoxdur', body: 'Ünvan dəyişdirilmiş, arxivlənmiş və ya heç yaradılmamış ola bilər.', icon: House },
  'server-error': { code: '500', title: 'Platforma sorğunu tamamlaya bilmədi', body: 'Məlumatlarınız qorunub. Bir az sonra yenidən cəhd edin və problem davam edərsə request ID ilə dəstəyə yazın.', icon: ServerCrash },
  maintenance: { code: 'MAINTENANCE', title: 'Planlı texniki xidmət gedir', body: 'Yarış əməliyyatları müvəqqəti dayandırılıb. Backend status məlumatı təqdim etdikdə gözlənilən bərpa vaxtı burada görünəcək.', icon: Construction },
  offline: { code: 'OFFLINE', title: 'Şəbəkə bağlantısı yoxdur', body: 'İnternet bağlantısını bərpa edin. Canlı status və hesab məlumatları oflayn saxlanmır.', icon: CloudOff },
};

export function SystemStatePage({ state }: { state: SystemState }) {
  const item = copy[state]; const Icon = item.icon;
  return <section className={`system-state system-state--${state}`}><Icon size={34} /><span>{item.code}</span><h1>{item.title}</h1><p>{item.body}</p><div>{state !== 'maintenance' && <Button onClick={() => window.location.reload()} icon={<RefreshCcw size={17} />}>Yenidən cəhd et</Button>}<Link className="button button--ghost" to="/"><House size={17} /><span>Ana səhifə</span></Link></div></section>;
}
