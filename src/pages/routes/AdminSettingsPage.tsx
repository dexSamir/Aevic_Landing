import { AdminAliasSettings } from '../../components/admin/AdminAliasSettings';
import { BrandingSettings } from '../../components/admin/BrandingSettings';
import '../../styles/admin-communications.css';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Input,
  Textarea,
  Switch,
  PageHeader,
  LoadingSkeleton,
  Toast,
} from '../../components/common/primitives';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
type Settings = Awaited<ReturnType<typeof services.admin.settings>>;
function PlatformSettings() {
  const query = usePlatformQuery({ key: 'admin:settings', query: () => services.admin.settings() });
  const [draft, setDraft] = useState<Settings>(),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    if (query.data && !dirty) setDraft(query.data);
  }, [query.data, dirty]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setDraft(await services.admin.updateSettings(draft));
      setDirty(false);
      setNotice('Platforma parametrləri saxlanıldı.');
    } catch {
      setError('Parametrlər saxlanılmadı. Səlahiyyətinizi və bağlantını yoxlayın.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {notice && <Toast title={notice} />}
      {error && <p role="alert">{error}</p>}
      {query.loading ? (
        <LoadingSkeleton variant="form" rows={3} />
      ) : query.error && !draft ? (
        <p role="alert">Parametrlər yüklənmədi. Bu bölmə üçün baş administrator səlahiyyəti tələb olunur.</p>
      ) : (
        draft && (
          <form className="settings-panel" onSubmit={save}>
            <section className="settings-section">
              <div className="admin-settings-heading">
                <h2>Əlaqə məlumatları</h2>
                <p>Komandaların dəstək xidməti ilə əlaqəsi.</p>
              </div>
              <Input
                id="platform-support-email"
                label="Dəstək emaili"
                type="email"
                required
                value={draft.supportEmail}
                onChange={(e) => {
                  setDraft({ ...draft, supportEmail: e.target.value });
                  setDirty(true);
                }}
              />
            </section>
            <section className="settings-section">
              <div className="admin-settings-heading">
                <h2>Qeydiyyat</h2>
                <p>Yeni komanda hesablarının yaradılmasını idarə edin.</p>
              </div>
              <Switch
                label="Yeni komanda qeydiyyatı açıqdır"
                checked={draft.registrationEnabled}
                onChange={() => {
                  setDraft({ ...draft, registrationEnabled: !draft.registrationEnabled });
                  setDirty(true);
                }}
              />
            </section>
            <section className="settings-section">
              <div className="admin-settings-heading">
                <h2>Platforma elanı</h2>
                <p>Platformada göstəriləcək qısa məlumat.</p>
              </div>
              <Textarea
                label="Platforma elanı"
                maxLength={500}
                value={draft.maintenanceMessage}
                onChange={(e) => {
                  setDraft({ ...draft, maintenanceMessage: e.target.value });
                  setDirty(true);
                }}
              />
            </section>
            <footer className="settings-savebar">
              <span>{dirty ? 'Saxlanılmamış dəyişikliklər' : 'Cari parametrlər'}</span>
              <Button
                variant="ghost"
                disabled={!dirty || busy}
                onClick={() => {
                  setDraft(query.data);
                  setDirty(false);
                }}
              >
                Dəyişiklikləri geri al
              </Button>
              <Button type="submit" disabled={!dirty} loading={busy}>
                Saxla
              </Button>
            </footer>
          </form>
        )
      )}
    </>
  );
}

export function AdminSettingsPage() {
  const profile = usePlatformQuery({ key: 'admin:alias', query: services.admin.alias });
  const [tab, setTab] = useState('profile'),
    [openedBrand, setOpenedBrand] = useState(false);
  return (
    <div className="communications">
      <PageHeader
        title="Admin parametrləri"
        description="Admin imzanızı və platforma parametrlərini idarə edin."
      />
      {profile.loading ? (
        <LoadingSkeleton variant="form" rows={2} />
      ) : !profile.data ? (
        <p role="alert">
          Admin profili yüklənmədi. <Button onClick={profile.refetch}>Yenilə</Button>
        </p>
      ) : (
        <>
          <div className="comm-options comm-settings-tabs">
            {(profile.data.canBrand
              ? [
                  ['profile', 'Profil və platforma'],
                  ['brand', 'Brend və keçidlər'],
                ]
              : [['profile', 'Profil']]
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  if (id === 'brand') setOpenedBrand(true);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div hidden={tab !== 'profile'}>
            <AdminAliasSettings alias={profile.data.alias} displayName={profile.data.displayName} />
            {profile.data.canBrand && <PlatformSettings />}
          </div>
          {profile.data.canBrand && openedBrand && (
            <div hidden={tab !== 'brand'}>
              <BrandingSettings
                editSupport={() => {
                  setTab('profile');
                  requestAnimationFrame(() => document.getElementById('platform-support-email')?.focus());
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
