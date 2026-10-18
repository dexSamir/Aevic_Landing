import '../../styles/share-controls.css';
import '../../styles/share-studio.css';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import type { ProfileCardFormat, TeamProfileCardData } from '../../types/domain';
import { drawTeamIdentityCard, loadCardImage, teamIdentityCardBlob, teamIdentityCardSizes, type TeamIdentityCardAssets } from '../../utils/teamIdentityCard';
import { Button, Checkbox } from '../common/primitives';

export function ProfileCardGenerator({ data }: { data: TeamProfileCardData }) {
  const [format, setFormat] = useState<ProfileCardFormat>('square');
  const [extended, setExtended] = useState(false);
  const [showMaps, setShowMaps] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [assets, setAssets] = useState<TeamIdentityCardAssets>();
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [rendered, setRendered] = useState('');
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const version = JSON.stringify([data, format, extended, showMaps, showQr, attempt]);
  const hasMaps = Boolean(data.mapStats?.some(map => map.matches > 0));
  const hasExtended = data.roster.length > 0 || [data.matches, data.finishes, data.wwcd, data.championships, data.podiums].some(value => typeof value === 'number');

  // Assets and fonts load once per team, never when a content switch changes.
  useEffect(() => {
    let active = true;
    setAssets(undefined); setError(''); setWarning('');
    void (async () => {
      await Promise.all([document.fonts?.load('800 48px Orbitron'), document.fonts?.load('700 24px Raleway')]);
      await document.fonts?.ready;
      const [logo, qr] = await Promise.all([
        loadCardImage(data.teamLogo).catch(() => { if (active) setWarning('Loqo yüklənmədi. Kartda komandanın baş hərfləri göstərilir.'); return undefined; }),
        QRCode.toDataURL(data.profileUrl, { errorCorrectionLevel: 'H', margin: 4, width: 360, color: { dark: '#070709', light: '#ffffff' } }).then(source => loadCardImage(source, true)),
      ]);
      if (active) setAssets({ logo, qr });
    })().catch(() => { if (active) setError('Kart hazırlanmadı. Bağlantını yoxlayıb yenidən cəhd edin.'); });
    return () => { active = false; };
  }, [data.teamLogo, data.profileUrl, attempt]);

  useEffect(() => {
    if (!assets) return;
    // Coalesce rapid changes; obsolete renders never become downloadable.
    const timer = window.setTimeout(() => {
      try {
        if (!canvasRef.current) return;
        drawTeamIdentityCard(canvasRef.current, data, format, assets, { template: 'career', showStats: extended, showRoster: extended, showMaps, showQr });
        setRendered(version); setError('');
      } catch { setError('Önizləmə hazırlanmadı. Yenidən cəhd edin.'); }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [assets, data, format, extended, showMaps, showQr, version]);
  const ready = Boolean(assets && rendered === version && !error);
  const download = async () => {
    if (!ready || !canvasRef.current || exporting) return;
    setExporting(true);
    try {
      // Export the exact preview pixels. No second render, request or authorization change.
      const blob = await teamIdentityCardBlob(canvasRef.current);
      const name = data.teamName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `AEVIC-${name}-${format}-${extended ? 'extended' : 'standard'}.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('PNG hazırlanmadı. Yenidən cəhd edin.'); }
    finally { setExporting(false); }
  };
  return <div className="profile-card-studio team-export-studio">
    <section className={`profile-card-canvas profile-card-canvas--${format}`} aria-busy={!ready} aria-label={`${data.teamName} kart önizləməsi`}>
      <canvas ref={canvasRef} role="img" aria-label={`${data.teamName} · ${teamIdentityCardSizes[format].label} · ${extended ? 'Geniş' : 'Standart'} komanda kartı`} />
      {!ready && !error && <p role="status">Önizləmə hazırlanır…</p>}
    </section>
    <aside>
      <span className="profile-kicker">AEVIC × {data.teamName}</span>
      <p>Komandanın kimliyi. Sənin formatın.</p>
      <fieldset className="team-export-formats"><legend>Format</legend><div>{(['square', 'story', 'portrait'] as const).map(id => <label key={id} className={format === id ? 'is-active' : ''}><input type="radio" name="team-card-format" value={id} checked={format === id} onChange={() => setFormat(id)} disabled={exporting}/><strong>{teamIdentityCardSizes[id].label}</strong><span>{teamIdentityCardSizes[id].use}</span></label>)}</div></fieldset>
      <fieldset className="team-export-formats"><legend>Məzmun</legend><div>{[false, true].map(value => <label key={String(value)} className={extended === value ? 'is-active' : ''}><input type="radio" name="team-card-mode" checked={extended === value} onChange={() => setExtended(value)} disabled={exporting || value && !hasExtended}/><strong>{value ? 'Geniş' : 'Standart'}</strong></label>)}</div></fieldset>
      {!hasExtended && <small>Geniş kart üçün dərc edilmiş heyət və ya statistika yoxdur.</small>}
      <div className="share-card-options"><Checkbox checked={showMaps} disabled={!hasMaps || exporting} onChange={event => setShowMaps(event.target.checked)} label="Xəritə statistikasını daxil et"/>{!hasMaps && <small>Xəritə statistikası hələ dərc edilməyib.</small>}<Checkbox checked={showQr} disabled={exporting} onChange={event => setShowQr(event.target.checked)} label="QR kodu göstər"/></div>
      {warning && <p role="status">{warning}</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Yenidən yoxla</button></p>}
      <Button loading={exporting} disabled={!ready} icon={<Download size={18}/>} onClick={() => void download()}>PNG yüklə</Button>
      <small>{teamIdentityCardSizes[format].width} × {teamIdentityCardSizes[format].height} · PNG · İctimai profil</small>
    </aside>
  </div>;
}
