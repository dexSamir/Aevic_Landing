import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Link2, Plus, Trash2 } from 'lucide-react';
import {
  assetLabels,
  approvedBrandUrl,
  brandAssetUrl,
  brandRoutes,
  type Branding,
  type BrandAsset,
  type LinkGroup,
  type BrandLink,
} from '../../content/branding';
import { publicNavigation } from '../../app/publicNavigation';
import { useSupportEmail, useSiteContent, useSiteNavigation } from '../site/SiteContent';
import { officialPlatformSocialLinks } from '../social/SocialLinks';
import { Button, Input, LoadingSkeleton, Modal, Switch, Textarea } from '../common/primitives';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';

const groups = { header: 'Üst menyu', footer: 'Alt menyu', social: 'Sosial şəbəkələr' };
const limits = { header: 5, footer: 12, social: 10 };
export function BrandingSettings({ editSupport }: { editSupport: () => void }) {
  const query = usePlatformQuery({ key: 'admin:branding', query: services.admin.branding });
  if (!query.data)
    return query.error ? (
      <p role="alert">
        Brend parametrləri yüklənmədi. <Button onClick={query.refetch}>Yenilə</Button>
      </p>
    ) : (
      <LoadingSkeleton variant="form" rows={4} />
    );
  return <BrandEditor initial={query.data} editSupport={editSupport} />;
}
function BrandEditor({ initial, editSupport }: { initial: Branding; editSupport: () => void }) {
  const supportEmail = useSupportEmail();
  const [draft, setDraft] = useState(initial),
    [group, setGroup] = useState<LinkGroup>('header');
  const [busy, setBusy] = useState(false),
    [upload, setUpload] = useState<BrandAsset>(),
    [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(initial);
  const [previews, setPreviews] = useState<Partial<Record<BrandAsset, string>>>({});
  const blobs = useRef<string[]>([]);
  useEffect(
    () => () => {
      blobs.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  const content = useSiteContent('global'),
    nav = useSiteNavigation(publicNavigation.primary, group === 'footer' ? 'footer' : 'header');
  const inherited: BrandLink[] =
    group === 'social'
      ? (['instagram', 'tiktok', 'linkedin', 'x', 'youtube', 'discord', 'twitch'] as const).flatMap((key) => {
          const href = content.text('social.' + key, officialPlatformSocialLinks[key] ?? '');
          return href
            ? [
                {
                  label: {
                    instagram: 'Instagram',
                    tiktok: 'TikTok',
                    linkedin: 'LinkedIn',
                    x: 'X',
                    youtube: 'YouTube',
                    discord: 'Discord',
                    twitch: 'Twitch',
                  }[key],
                  href,
                  visible: true,
                },
              ]
            : [];
        })
      : nav.map((link) => ({ label: link.label, href: link.to, visible: true }));
  const rows = draft.links[group] ?? inherited;
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const valid =
    draft.name.trim().length >= 2 &&
    Object.values(draft.links).every(
      (list) =>
        list.every((row) => row.label.trim() && approvedBrandUrl(row.href)) &&
        new Set(list.map((row) => approvedBrandUrl(row.href))).size === list.length,
    );
  function change(next: Partial<Branding>) {
    setDraft((current) => ({ ...current, ...next }));
    setNotice('');
    setError('');
  }
  function setRows(next: BrandLink[]) {
    change({ links: { ...draft.links, [group]: next } });
  }
  function edit(index: number, patch: Partial<BrandLink>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function move(from: number, to: number) {
    const next = [...rows];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setRows(next);
  }
  async function uploadImage(key: BrandAsset, file: File) {
    if (upload) return;
    if (!file.size || file.size > 4_000_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('PNG, JPG və ya WebP şəkli seçin (maksimum 4 MB).');
      return;
    }
    setUpload(key);
    setError('');
    setNotice('');
    try {
      const image = await services.admin.uploadBrandImage(file);
      const preview = URL.createObjectURL(file);
      blobs.current.push(preview);
      setPreviews((current) => ({ ...current, [key]: preview }));
      setDraft((current) => ({ ...current, assets: { ...current.assets, [key]: image.id } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Şəkil yüklənmədi.');
    } finally {
      setUpload(undefined);
    }
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await services.admin.updateBranding(draft);
      setSaved(next);
      setDraft(next);
      setNotice('Brend və keçidlər yayımlandı.');
    } catch (e) {
      const conflict = (e as { code?: string }).code === 'STALE_VERSION';
      setStale(conflict);
      setError(
        conflict
          ? 'Başqa admin bu parametrləri dəyişib. Cari versiyanı yükləyin.'
          : e instanceof Error
            ? e.message
            : 'Yadda saxlanılmadı.',
      );
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  async function reset() {
    try {
      const next = await services.admin.branding();
      setDraft(next);
      setSaved(next);
      setPreviews({});
      setError('');
      setStale(false);
    } catch {
      setError('Cari versiya yüklənmədi.');
    }
  }
  return (
    <form
      className="comm-brand"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setConfirm(true);
      }}
    >
      <section className="comm-panel">
        <header className="comm-heading">
          <ImagePlus />
          <h2>Brend kimliyi</h2>
        </header>
        <Input
          label="Saytın adı"
          maxLength={48}
          value={draft.name}
          required
          onChange={(e) => change({ name: e.target.value })}
        />
        <div className="comm-actions">
          <span>Dəstək emaili · {supportEmail}</span>
          <Button variant="ghost" size="sm" onClick={editSupport}>
            Əlaqə məlumatını dəyiş
          </Button>
        </div>
        <div className="comm-pair">
          <Textarea
            label="Qısa təsvir"
            maxLength={180}
            rows={2}
            value={draft.description}
            onChange={(e) => change({ description: e.target.value })}
          />
          <Textarea
            label="Standart SEO təsviri"
            maxLength={240}
            rows={2}
            value={draft.seoDescription}
            onChange={(e) => change({ seoDescription: e.target.value })}
          />
        </div>
        <div className="brand-assets">
          {(Object.keys(assetLabels) as BrandAsset[]).map((key) => {
            const source =
              previews[key] ??
              brandAssetUrl(draft.assets[key]) ??
              (key === 'fallback' ? '/brand/aevic-phoenix.jpg' : '/icons/aevic-192.png');
            return (
              <div className="brand-asset" key={key}>
                <div>
                  <img src={source} alt={assetLabels[key] + ' önbaxışı'} />
                </div>
                <strong>{assetLabels[key]}</strong>
                <label className="brand-upload">
                  {upload === key ? 'Yüklənir…' : 'Şəkil seç'}
                  <input
                    type="file"
                    aria-label={assetLabels[key]}
                    disabled={Boolean(upload) || busy}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {draft.assets[key] && (
                  <button
                    type="button"
                    onClick={() => {
                      const assets = { ...draft.assets };
                      delete assets[key];
                      change({ assets });
                      setPreviews({ ...previews, [key]: undefined });
                    }}
                  >
                    Standarta qaytar
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <small className="comm-muted">PNG, JPG və WebP · 4 MB-dək</small>
      </section>
      <section className="comm-panel">
        <header className="comm-heading">
          <Link2 />
          <h2>İctimai keçidlər</h2>
        </header>
        <div className="comm-options">
          {(Object.keys(groups) as LinkGroup[]).map((id) => (
            <button type="button" key={id} aria-pressed={group === id} onClick={() => setGroup(id)}>
              {groups[id]}
            </button>
          ))}
        </div>
        <p className="comm-muted">
          Sayt səhifəsi və ya rəsmi sosial profilin ünvanını seçin. Keçidlər aşağıdakı sıra ilə göstərilir.
        </p>
        <datalist id="brand-public-routes">
          {brandRoutes.map((route) => (
            <option key={route} value={route} />
          ))}
        </datalist>
        {rows.map((row, i) => (
          <div className="brand-link" key={group + i}>
            <Input
              label="Etiket"
              value={row.label}
              maxLength={30}
              required
              onChange={(e) => edit(i, { label: e.target.value })}
            />
            <Input
              label="Ünvan"
              list="brand-public-routes"
              placeholder={group === 'social' ? 'https://…' : '/tournaments'}
              value={row.href}
              maxLength={350}
              required
              error={
                row.href && !approvedBrandUrl(row.href)
                  ? 'İctimai səhifə və ya təsdiqli sosial domen seçin.'
                  : undefined
              }
              onChange={(e) => edit(i, { href: e.target.value })}
            />
            <div className="brand-link-tools">
              <Switch label="Görünür" checked={row.visible} onChange={() => edit(i, { visible: !row.visible })} />
              <button
                type="button"
                aria-label={row.label + ' yuxarı'}
                disabled={!i}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label={row.label + ' aşağı'}
                disabled={i === rows.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label={row.label + ' sil'}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={rows.length >= limits[group]}
          icon={<Plus size={16} />}
          onClick={() => setRows([...rows, { label: '', href: '', visible: true }])}
        >
          Keçid əlavə et
        </Button>
        <div className="brand-link-preview" aria-label="Keçid önbaxışı">
          <small>Önbaxış</small>
          {rows
            .filter((row) => row.visible && approvedBrandUrl(row.href))
            .map((row, i) => (
              <a key={i} href={approvedBrandUrl(row.href)} target="_blank" rel="noopener noreferrer">
                {row.label}
              </a>
            ))}
        </div>
      </section>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert">
          {error} {stale && <Button onClick={reset}>Cari versiyanı yüklə</Button>}
        </p>
      )}
      <footer className="comm-actions">
        <span>{dirty ? 'Yayımlanmamış dəyişikliklər' : 'Cari brend parametrləri'}</span>
        <Button type="submit" disabled={!valid || !dirty || Boolean(upload) || busy || stale}>
          Dəyişiklikləri yayımla
        </Button>
      </footer>
      <Modal
        open={confirm}
        title="Brend dəyişikliklərini yayımla"
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
              Geri
            </Button>
            <Button loading={busy} onClick={save}>
              Yayımla
            </Button>
          </>
        }
      >
        <p>“{draft.name}” üçün seçdiyiniz şəkillər və keçidlər ictimai saytda görünəcək.</p>
      </Modal>
    </form>
  );
}
