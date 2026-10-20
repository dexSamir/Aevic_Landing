import '../../styles/team-share-modal.css';
import { BarChart3, Check, Download, Map, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ProfileCardFormat, TeamProfileCardData } from '../../types/domain';
import { drawTeamIdentityCard, loadCardImage, teamIdentityCardBlob, teamIdentityCardSizes, resolveTeamCardOptions, type TeamIdentityCardAssets } from '../../utils/teamIdentityCard';
import { Button, Switch } from '../common/primitives';

export function ProfileCardGenerator({ data }: { data: TeamProfileCardData }) {
  const groupId = useId();
  const [format, setFormat] = useState<ProfileCardFormat>('square');
  const [extended, setExtended] = useState(false);
  const [showMaps, setShowMaps] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [assets, setAssets] = useState<TeamIdentityCardAssets>();
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [rendered, setRendered] = useState('');
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const exportLock = useRef(false);
  const version = JSON.stringify([data, format, extended, showMaps, showRecent, showQr, attempt]);
  const hasMaps = Boolean(data.mapStats?.some(map => map.matches > 0));
  const hasRecent = Boolean(data.recentMatches?.length);
  const options = useMemo(() => resolveTeamCardOptions(data, { template: 'career', showStats: true, showRoster: true, showMaps, showRecent, extended, showQr }), [data, extended, showMaps, showRecent, showQr]);

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
    // Coalesce rapid changes; obsolete renders never become downloadable.
    const timer = window.requestAnimationFrame(() => {
      try {
        if (!canvasRef.current) return;
        if (previewRef.current) drawTeamIdentityCard(previewRef.current, data, format, assets ?? {}, options, true);
        if (!assets) return;
        drawTeamIdentityCard(canvasRef.current, data, format, assets, options);
        setRendered(version); setError('');
      } catch { setError('Önizləmə hazırlanmadı. Yenidən cəhd edin.'); }
    });
    return () => window.cancelAnimationFrame(timer);
  }, [assets, data, format, extended, showMaps, showRecent, showQr, version, options]);
  const ready = Boolean(assets && rendered === version && !error);
  const download = async () => {
    if (!ready || !canvasRef.current || exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    try {
      // The hidden canvas contains real public data; the visible skeleton describes its sections.
      const blob = await teamIdentityCardBlob(canvasRef.current);
      const name = data.teamName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `AEVIC-${name}-${format}-${extended ? 'extended' : 'standard'}.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('PNG hazırlanmadı. Yenidən cəhd edin.'); }
    finally { exportLock.current = false; setExporting(false); }
  };
  return <div className="team-share-studio">
    <canvas ref={canvasRef} hidden aria-hidden="true" />
    <div className="team-share-preview" data-format={format} role="img" aria-label={`${data.teamName}: kartın sxematik önizləməsi. PNG-də həqiqi ictimai məlumatlar göstərilir.`}>
      <canvas ref={previewRef} className="identity-skeleton" style={{ aspectRatio: `${teamIdentityCardSizes[format].width} / ${teamIdentityCardSizes[format].height}`, '--card-ratio': teamIdentityCardSizes[format].width / teamIdentityCardSizes[format].height } as React.CSSProperties} aria-hidden="true" />
    </div>
    <aside className="team-share-controls">
      <div className="team-share-heading"><h2>Komanda kartını <em>hazırla</em></h2><p>Komandanın rəsmi paylaşım kartını öz tərzində yarat və yüklə.</p></div>
      <fieldset className="team-share-formats"><legend>Format</legend><div data-format={format}>
        <span className="team-share-selection" aria-hidden="true"/>
        {(['square', 'portrait', 'story'] as const).map(id => <label key={id} className={format === id ? 'is-active' : ''}>
          <input type="radio" name={`${groupId}-format`} value={id} checked={format === id} onChange={() => setFormat(id)} disabled={exporting}/>
          <span className={`team-share-format-icon team-share-format-icon--${id}`} aria-hidden="true" />
          {format === id && <Check className="team-share-selected" size={20} aria-hidden="true"/>}
          <strong>{teamIdentityCardSizes[id].use}</strong><small>{teamIdentityCardSizes[id].label}</small>
        </label>)}
      </div></fieldset>
      <fieldset className="team-share-options"><legend>Kart elementləri</legend>
        <div><QrCode aria-hidden="true"/><Switch label="QR kodu və profil linki" description="Komandanın ictimai profilinə keçid." checked={options.showQr} disabled={!extended || exporting} onChange={event => setShowQr(event.target.checked)}/></div>
        <div><Map aria-hidden="true"/><Switch label="Xəritə statistikası" description={hasMaps ? 'Ən çox oynanan xəritələr və orta yer.' : 'Xəritə statistikası hələ dərc edilməyib.'} checked={options.showMaps} disabled={!extended || !hasMaps || exporting} onChange={event => setShowMaps(event.target.checked)}/></div>
        <div><BarChart3 aria-hidden="true"/><Switch label="Son 5 matç" description={hasRecent ? 'Komandanın son 5 matçının nəticələri.' : 'Matç nəticələri hələ dərc edilməyib.'} checked={options.showRecent} disabled={!extended || !hasRecent || exporting} onChange={event => setShowRecent(event.target.checked)}/></div>
      </fieldset>
      <fieldset className="team-share-content"><legend>Məzmun</legend><div>{[false, true].map(value => <label key={String(value)} className={extended === value ? 'is-active' : ''}><input type="radio" name={`${groupId}-mode`} checked={extended === value} onChange={() => setExtended(value)} disabled={exporting}/><span>{value ? 'Geniş' : 'Standart'}</span></label>)}</div><small>{extended ? 'Əlavələri seçin. Seçimlər saxlanılır.' : 'Əlavələr Geniş rejimində açılır.'}</small></fieldset>
      <div className="team-share-download">
        {warning && <p role="status">{warning}</p>}
        {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Yenidən yoxla</button></p>}
        {!ready && !error && <p role="status">Kart hazırlanır…</p>}
        <Button loading={exporting} disabled={!ready} icon={<Download size={18} aria-hidden="true"/>} onClick={() => void download()}>PNG yüklə</Button>
        <small>{teamIdentityCardSizes[format].width} × {teamIdentityCardSizes[format].height} · PNG<span className="team-share-export-note"> · İctimai profil üçün optimallaşdırılıb.</span></small>
      </div>
    </aside>
  </div>;
}
