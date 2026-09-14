import { ArrowRight, Bell, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, LoadingSkeleton, PageHeader, Switch, Toast } from '../components/common/primitives';
import { demoMode, services } from '../services';
import { usePlatformQuery, updateCachedQuery } from '../services/queryCache';
import type { NotificationPreferences } from '../types/domain';

export function TeamSettingsPage() {
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
    try { const saved = await services.notifications.updatePreferences(preferences); setPreferences(saved); updateCachedQuery<NotificationPreferences>('notification-preferences', () => saved); setDirty(false); setNotice(demoMode ? 'Bildiriş seçimləri nümunə sessiyasında saxlanıldı.' : 'Bildiriş seçimləri saxlanıldı.'); }
    catch { setError('Seçimlər saxlanılmadı. Yenidən cəhd edin.'); }
    finally { setSaving(false); }
  };
  const eventLabels: Record<string, string> = { checkIn: 'Check-in', 'check-in': 'Check-in', room: 'Otaq məlumatları', roomRelease: 'Otaq məlumatları', adminMessages: 'Admin mesajları', results: 'Rəsmi nəticələr', roster: 'Heyət dəyişiklikləri', registration: 'Qeydiyyat', announcements: 'Elanlar' };
  return <><PageHeader eyebrow="// İDARƏETMƏ" title="Ayarlar" description="Bildiriş seçimləri, hesab təhlükəsizliyi və komanda səlahiyyətləri." />
    {notice && <Toast title={notice} onClose={() => setNotice('')} />}{error && <p role="alert" className="field__error">{error}</p>}
    <div className="settings-workspace">
      <nav className="settings-subnav" aria-label="Ayar bölmələri"><a href="#preferences"><Bell size={18} /> Bildirişlər</a><Link to="/team/settings/managers"><Users size={18} /> İdarəetmə və giriş</Link><Link to="/account/security"><ShieldCheck size={18} /> Hesab təhlükəsizliyi</Link><Link to="/team/profile">Public profil <ArrowRight size={18} /></Link></nav>
      <form id="preferences" className="settings-panel" onSubmit={save}><header><div><span>HADİSƏ SEÇİMLƏRİ</span><h2>Bildirişlər</h2><p>Komandanız üçün hansı yenilikləri almaq istədiyinizi seçin.</p></div></header>
        {query.loading ? <LoadingSkeleton rows={4} /> : query.error ? <div className="settings-section"><p role="alert">Bildiriş seçimləri yüklənmədi.</p><Button onClick={query.refetch}>Yenidən yoxla</Button></div> : preferences && <><div className="settings-section settings-switches">{Object.entries(preferences.events).map(([key, checked]) => <Switch key={key} label={eventLabels[key] ?? key} checked={checked} onChange={() => { setPreferences(value => value && ({ ...value, events: { ...value.events, [key]: !checked } })); setDirty(true); }} />)}</div><footer className="settings-savebar"><span>{dirty ? 'Saxlanılmamış dəyişikliklər' : 'Cari bildiriş seçimləri'}</span><Button type="submit" disabled={!dirty} loading={saving}>Seçimləri saxla</Button></footer></>}
      </form>
    </div><section className="danger-zone"><ShieldCheck size={22} /><div><h2>Komanda üzərində səlahiyyət</h2><p>Sahiblik transferi, komandadan ayrılma və arxivləşdirmə təsdiq tələb edir.</p></div><Link className="button button--secondary" to="/team/settings/managers">Səlahiyyətləri idarə et <ArrowRight size={17} /></Link></section>
  </>;
}
