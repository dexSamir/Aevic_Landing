import { Check, Copy, Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import type { ProfileCardFormat, TeamProfileCardData } from '../../types/domain';
import { drawTeamIdentityCard, loadCardImage, teamIdentityCardBlob, teamIdentityCardSizes, type TeamIdentityCardAssets } from '../../utils/teamIdentityCard';
import { Button, Checkbox, Toast } from '../common/primitives';

function safeFileName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || "Komanda";
}

function FormatSelector({ value, onChange }: { value: ProfileCardFormat; onChange: (format: ProfileCardFormat) => void }) {
  return <div className="share-format-selector" role="radiogroup" aria-label="Share card formatı">{Object.entries(teamIdentityCardSizes).map(([id, format]) => <button key={id} type="button" role="radio" aria-checked={value === id} className={value === id ? 'is-active' : ''} onClick={() => onChange(id as ProfileCardFormat)}><strong>{format.label}</strong><span>{format.use}</span><small>{format.width} × {format.height}</small></button>)}</div>;
}

export function ProfileCardGenerator({ data }: { data: TeamProfileCardData }) {
  const [format, setFormat] = useState<ProfileCardFormat>('portrait');
  const [showStats, setShowStats] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<TeamIdentityCardAssets>({});

  useEffect(() => {
    let active = true;
    setBusy(true);
    void Promise.all([
      loadCardImage(data.teamLogo).catch(() => undefined),
      loadCardImage(data.teamBanner).catch(() => undefined),
      QRCode.toDataURL(data.profileUrl, { errorCorrectionLevel: 'H', margin: 4, width: 360, color: { dark: '#070709', light: '#f3c450' } }).then((source) => loadCardImage(source, true)).catch(() => undefined),
    ]).then(([logo, banner, qr]) => {
      if (!active) return;
      assetsRef.current = { logo, banner, qr };
      if (!qr) setNotice('QR hazırlanmadı; public profil keçidi kartda mətn kimi saxlanıldı.');
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [data.profileUrl, data.teamBanner, data.teamLogo]);

  const options = { template: 'identity' as const, showStats, showQr };
  useEffect(() => { if (canvasRef.current && !busy) drawTeamIdentityCard(canvasRef.current, data, format, assetsRef.current, options); }, [busy, data, format, showQr, showStats]);

  const exportBlob = async () => {
    const canvas = canvasRef.current; if (!canvas) throw new Error('Preview unavailable');
    await document.fonts.ready;
    drawTeamIdentityCard(canvas, data, format, assetsRef.current, options);
    return teamIdentityCardBlob(canvas);
  };
  const filename = `AEVIC_${safeFileName(data.teamName)}_Profile${data.year ? `_${data.year}` : ''}.png`;
  const download = async () => {
    setBusy(true);
    try { const blob = await exportBlob(); const link = document.createElement('a'); link.download = filename; link.href = URL.createObjectURL(blob); link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000); setNotice(`${teamIdentityCardSizes[format].width} × ${teamIdentityCardSizes[format].height} PNG hazırdır.`); }
    catch { setNotice('PNG hazırlanmadı. Preview tam yükləndikdən sonra yenidən cəhd edin.'); }
    finally { setBusy(false); }
  };
  const share = async () => {
    setBusy(true);
    try {
      const blob = await exportBlob(); const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `${data.teamName} · AEVIC Team Identity`, text: 'AEVIC public team profile', files: [file], url: data.profileUrl });
      else { const link = document.createElement('a'); link.download = filename; link.href = URL.createObjectURL(blob); link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000); await navigator.clipboard.writeText(data.profileUrl); setNotice('Fayl paylaşımı dəstəklənmir; PNG yükləndi və profil keçidi kopyalandı.'); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Paylaşım alınmadı. PNG-ni yükləyib əl ilə paylaşın.'); }
    finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(data.profileUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };

  return <>
    {notice && <Toast tone={notice.includes('alınmadı') ? 'error' : 'info'} title="Team Identity Card" body={notice} onClose={() => setNotice('')} />}
    <div className="profile-card-studio">
      <aside>
        <span className="profile-kicker">Official AEVIC identity asset</span>
        <h2>Komanda kimliyi</h2>
        <p>Bir rəsmi public aktiv: logo, heyət, profil keçidi və istəyə görə dərc edilmiş karyera sübutu. Preview və PNG eyni kompozisiya mənbəyindən çəkilir.</p>
        <FormatSelector value={format} onChange={setFormat} />
        <div className="share-card-options"><Checkbox checked={showStats} onChange={(event) => setShowStats(event.target.checked)} label="Dərc edilmiş statistikanı göstər" /><Checkbox checked={showQr} onChange={(event) => setShowQr(event.target.checked)} label="Public profil QR-ni göstər" /></div>
        <div className="studio-actions"><Button loading={busy} icon={<Download size={17} />} onClick={() => void download()}>PNG yüklə</Button><Button variant="secondary" disabled={busy} icon={<Share2 size={17} />} onClick={() => void share()}>Paylaş</Button><Button variant="ghost" icon={copied ? <Check size={17} /> : <Copy size={17} />} onClick={() => void copy()}>{copied ? 'Kopyalandı' : 'Profil linkini kopyala'}</Button></div>
        <small>Yalnız public kimlik və dərc edilmiş statistika. Export: {teamIdentityCardSizes[format].width} × {teamIdentityCardSizes[format].height} PNG.</small>
      </aside>
      <section className={`profile-card-canvas profile-card-canvas--${format}`} aria-label={`${data.teamName} ${teamIdentityCardSizes[format].label} kart önizləməsi`}><canvas ref={canvasRef} /></section>
    </div>
  </>;
}
