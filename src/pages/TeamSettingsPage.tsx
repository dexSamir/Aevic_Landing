import { ArrowRight, Bell, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, LoadingSkeleton, PageHeader, Switch, Toast } from '../components/common/primitives';
import { services } from '../services';
import { usePlatformQuery, updateCachedQuery } from '../services/queryCache';
import type { NotificationPreferences } from '../types/domain';

export function TeamSettingsPage() {
  const navigate=useNavigate();
  const [creating,setCreating]=useState(false);
  async function createOrganization(event:FormEvent<HTMLFormElement>){event.preventDefault();if(creating)return;const form=new FormData(event.currentTarget);setCreating(true);setError('');try{const organization=await services.organizations.create({name:String(form.get('name')),shortName:String(form.get('shortName')),country:String(form.get('country')),description:String(form.get('description'))},crypto.randomUUID());navigate(`/team/organization/${organization.slug}`);}catch{setError('Təşkilat yaradılmadı. Adı və bağlantını yoxlayın.');}finally{setCreating(false);}}

  const query = usePlatformQuery({ key: 'notification-preferences', query: () => services.notifications.preferences() });
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (query.data) setPreferences(query.data); }, [query.data]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!preferences || saving) return;
    setSaving(true); setError(''); setNotice('');
    try { const saved = await services.notifications.updatePreferences(preferences); setPreferences(saved); updateCachedQuery<NotificationPreferences>('notification-preferences', () => saved); setDirty(false); setNotice('Bildiriş seçimləri saxlanıldı.'); }
    catch { setError('Seçimlər saxlanılmadı. Yenidən cəhd edin.'); }
    finally { setSaving(false); }
  };
  const eventLabels: Record<string, string> = { checkIn: 'Check-in', 'check-in': 'Check-in', room: 'Otaq məlumatları', roomRelease: 'Otaq məlumatları', adminMessages: 'Admin mesajları', results: 'Rəsmi nəticələr', roster: 'Heyət dəyişiklikləri', registration: 'Qeydiyyat', announcements: 'Elanlar' };
  return <><PageHeader eyebrow="// İDARƏETMƏ" title="Ayarlar" description="Bildiriş seçimləri, hesab təhlükəsizliyi və komanda səlahiyyətləri." />
    {notice && <Toast title={notice} onClose={() => setNotice('')} />}{error && <p role="alert" className="field__error">{error}</p>}
    <div className="settings-workspace">
      <nav className="settings-subnav" aria-label="Ayar bölmələri"><a href="#preferences"><Bell size={18} /> Bildirişlər</a><Link to="/team/settings/managers"><Users size={18} /> İdarəetmə və giriş</Link><Link to="/account/profile">Kapitan məlumatları <ArrowRight size={18} /></Link><Link to="/account/security"><ShieldCheck size={18} /> Hesab təhlükəsizliyi</Link><Link to="/team/profile">Public profil <ArrowRight size={18} /></Link></nav>
      <form id="preferences" className="settings-panel" onSubmit={save}><header><div><span>HADİSƏ SEÇİMLƏRİ</span><h2>Bildirişlər</h2><p>Komandanız üçün hansı yenilikləri almaq istədiyinizi seçin.</p></div></header>
        {query.loading ? <LoadingSkeleton variant="form" rows={4} /> : query.error && query.data === undefined ? <div className="settings-section"><p role="alert">Bildiriş seçimləri yüklənmədi. Bağlantını yoxlayıb yenidən cəhd edin.</p><Button variant="secondary" disabled={query.retryAfterSeconds > 0} onClick={query.refetch}>{query.retryAfterSeconds > 0 ? `${query.retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button></div> : preferences && <><div className="settings-section settings-switches">{Object.entries(preferences.events).map(([key, checked]) => <Switch key={key} label={eventLabels[key] ?? key} checked={checked} onChange={() => { setPreferences(value => value && ({ ...value, events: { ...value.events, [key]: !checked } })); setDirty(true); }} />)}</div><footer className="settings-savebar"><span>{dirty ? 'Saxlanılmamış dəyişikliklər' : 'Cari bildiriş seçimləri'}</span><Button type="submit" disabled={!dirty} loading={saving}>Seçimləri saxla</Button></footer></>}
      </form>
    </div>
    <form className="operation-form narrow-form" onSubmit={createOrganization}><h2>Təşkilat yarat</h2><p>Kapitan hesabınız təşkilatın sahibi olacaq. Komandalar yalnız dəvəti qəbul etdikdən sonra qoşulur.</p><Input name="name" label="Təşkilat adı" required minLength={2} maxLength={100}/><Input name="shortName" label="Qısa ad" required maxLength={20}/><Input name="country" label="Ölkə" maxLength={80}/><Input name="description" label="Təsvir" maxLength={3000}/><Button type="submit" loading={creating}>Təşkilat yarat</Button></form>
    <section className="danger-zone"><ShieldCheck size={22} /><div><h2>Komanda üzərində səlahiyyət</h2><p>Sahiblik transferi, komandadan ayrılma və arxivləşdirmə təsdiq tələb edir.</p></div><Link className="button button--secondary" to="/team/settings/managers">Səlahiyyətləri idarə et <ArrowRight size={17} /></Link></section>
  </>;
}
