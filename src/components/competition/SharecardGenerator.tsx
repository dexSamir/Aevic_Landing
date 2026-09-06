import { Download, Share2 } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { officialAssets } from '../../assets/official';
import type { TournamentResultBreakdown } from '../../types/domain';
import { BrandEmblem } from '../brand/BrandMark';
import { Button, Select, Tabs, TeamLogo, Toast } from '../common/primitives';

type PosterFamily = 'result' | 'leaderboard';
type LeaderboardLimit = '10' | '16' | 'all';

export interface SharecardGeneratorProps {
  teamName: string;
  teamLogo?: string;
  tournamentName: string;
  tournamentId: string;
  result?: TournamentResultBreakdown;
  standings: { tournamentId: string; teamId: string; rank: number; team: string; wwcd: number; placementPoints: number; killPoints: number; totalPoints: number }[];
  provenance: { tournamentId: string; occurredAt: string; stageLabel: string; sourceLabel: string } | null;
  initialFamily?: PosterFamily;
  showFamilySelector?: boolean;
  compactDownload?: boolean;
}

function PosterFrame({ children, className, label }: { children: ReactNode; className: string; label: string }) {
  return <article className={`generated-poster ${className}`} aria-label={label}>
    <div className="generated-poster__atmosphere" aria-hidden="true" />
    <div className="generated-poster__content">{children}</div>
  </article>;
}

function posterDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Baku' }).format(new Date(value)).toLocaleUpperCase('en-GB');
}

function validProvenance(provenance: SharecardGeneratorProps['provenance']): provenance is NonNullable<SharecardGeneratorProps['provenance']> {
  return Boolean(provenance && Number.isFinite(Date.parse(provenance.occurredAt)) && provenance.stageLabel.trim() && provenance.sourceLabel.trim());
}

function PosterBrandline({ provenance, title }: { provenance: NonNullable<SharecardGeneratorProps['provenance']>; title: string }) {
  return <header className="poster-brandline"><BrandEmblem variant="sharecard" decorative={false} /><div><span>{provenance.sourceLabel}</span><strong>{title}</strong></div><time dateTime={provenance.occurredAt}>{posterDate(provenance.occurredAt)}</time></header>;
}

function mapArtwork(map: string, roundIndex: number) {
  const normalized = map.toLocaleLowerCase('az');
  if (normalized.includes('miramar')) return officialAssets.mapsSmall[1];
  if (normalized.includes('rondo')) return officialAssets.mapsSmall[2];
  if (normalized.includes('erangel')) return roundIndex === 3 ? officialAssets.mapsSmall[3] : officialAssets.mapsSmall[0];
  return officialAssets.mapsSmall[roundIndex % officialAssets.mapsSmall.length];
}

function TournamentResultPoster({ teamName, teamLogo, tournamentName, result, provenance }: Omit<SharecardGeneratorProps, 'standings'> & { result: TournamentResultBreakdown; provenance: NonNullable<SharecardGeneratorProps['provenance']> }) {
  const initials = teamName.split(' ').map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('az');
  return <PosterFrame className="generated-poster--result" label={`${teamName} turnir nəticəsi`}>
    <PosterBrandline provenance={provenance} title={tournamentName} />
    <section className="poster-result__hero"><div className="poster-result__team">{teamLogo ? <TeamLogo name={teamName} src={teamLogo} size="lg" /> : <span className="poster-result__team-fallback" aria-label={`${teamName} üçün standart komanda işarəsi`}>{initials}</span>}<div><span>{provenance.stageLabel}</span><h2>{teamName}</h2></div></div><div className="poster-result__placement"><span>Final placement</span><strong>#{String(result.placement).padStart(2, '0')}</strong></div></section>
    <div className="poster-result__ledger"><dl><div><dt>Matches</dt><dd>{result.matches}</dd></div><div><dt>WWCD</dt><dd>{result.wwcd}</dd></div><div><dt>Total kills</dt><dd>{result.kills}</dd></div><div><dt>Placement points</dt><dd>{result.placementPoints}</dd></div><div className="is-total"><dt>Total points</dt><dd>{result.totalPoints}</dd></div></dl>{result.penalties > 0 && <p>Penalty <strong>−{result.penalties}</strong></p>}</div>
    <div className="poster-result__rotation" aria-label="Raund nəticələri">{result.maps.map((round, index) => <article className={round.isWWCD ? 'is-wwcd' : ''} key={round.matchId}><div><img src={mapArtwork(round.map, index)} alt="" /><b>R{round.round}</b>{round.isWWCD && <em>WWCD</em>}</div><strong>{round.map}</strong><p>{round.isWWCD ? 'WWCD' : `#${round.placement}`} <span>·</span> {round.kills} KILL</p><small><span>{round.totalPoints} PTS</span><span>{round.placementPoints} PP · {round.killPoints} KP</span></small></article>)}</div>
    <p className="poster-result__legend">PP · placement points&nbsp;&nbsp; KP · kill points</p>
    <footer><span>AEVIC OFFICIAL RESULT</span><strong>AD AETERNAM VICTORIAM.</strong></footer>
  </PosterFrame>;
}

function LeaderboardPoster({ tournamentName, standings, provenance, limit }: Pick<SharecardGeneratorProps, 'tournamentName' | 'standings'> & { provenance: NonNullable<SharecardGeneratorProps['provenance']>; limit: LeaderboardLimit }) {
  const rows = limit === 'all' ? standings : standings.slice(0, Number(limit));
  return <PosterFrame className="generated-poster--leaderboard" label={`${tournamentName} liderlik cədvəli`}>
    <PosterBrandline provenance={provenance} title={tournamentName} />
    <div className="poster-leaderboard__stage"><span>{tournamentName} · {provenance.stageLabel}</span><strong>{rows.length} teams</strong></div>
    <div className="poster-leaderboard__head"><span>#</span><span>Komanda</span><span>WWCD</span><span>Place</span><span>Kills</span><span>Total</span></div>
    <ol>{rows.map((row) => <li key={row.teamId}><b>{String(row.rank).padStart(2, '0')}</b><span className="poster-leaderboard__team"><TeamLogo name={row.team} size="sm" /><strong>{row.team}</strong></span><span>{row.wwcd}</span><span>{row.placementPoints}</span><span>{row.killPoints}</span><em>{row.totalPoints}</em></li>)}</ol>
    <footer><span>{posterDate(provenance.occurredAt)} · {provenance.stageLabel.toLocaleUpperCase('en-GB')}</span><strong>RANKING · REPUTATION · LEGACY</strong></footer>
  </PosterFrame>;
}

async function waitForPreviewAssets(node: HTMLElement) {
  await document.fonts.ready;
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    if (!image.complete) await new Promise<void>((resolve, reject) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => reject(new Error('Image failed to load')), { once: true }); });
    if (image.decode) await image.decode().catch(() => undefined);
  }));
}

export function SharecardGenerator(props: SharecardGeneratorProps) {
  const [family, setFamily] = useState<PosterFamily>(props.initialFamily ?? 'result');
  const [leaderboardLimit, setLeaderboardLimit] = useState<LeaderboardLimit>('10');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const provenance = validProvenance(props.provenance) && props.provenance.tournamentId === props.tournamentId ? props.provenance : undefined;
  const provenanceReady = Boolean(provenance);
  const exportReady = provenanceReady && (family === 'leaderboard' ? props.standings.length > 0 && props.standings.every((row) => row.tournamentId === props.tournamentId) : Boolean(props.result?.maps.length && props.result.tournamentId === props.tournamentId));

  const render = async () => {
    if (!previewRef.current || exporting || !exportReady) return;
    const poster = previewRef.current.querySelector<HTMLElement>('.generated-poster');
    if (!poster) return;
    await waitForPreviewAssets(poster);
    const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-deep').trim();
    return toPng(poster, { cacheBust: true, pixelRatio: Math.max(1, 2400 / poster.offsetWidth), backgroundColor });
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true); setError('');
    try {
      const dataUrl = await render();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `aevic-${family}-poster.png`;
      link.href = dataUrl;
      link.click();
    } catch { setError('Poster hazırlanmadı. Şəkillərin yükləndiyini yoxlayıb yenidən cəhd edin.'); }
    finally { setExporting(false); }
  };

  const share = async () => {
    if (exporting) return;
    setExporting(true); setError('');
    try {
      const dataUrl = await render();
      if (!dataUrl) return;
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([blob], `aevic-${family}-poster.png`, { type: 'image/png' });
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error('share-unavailable');
      await navigator.share({ title: `${props.tournamentName} · AEVIC`, text: props.provenance?.sourceLabel, files: [file] });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError('Bu brauzer fayl paylaşımını dəstəkləmir. PNG-ni yükləyib paylaşa bilərsiniz.');
    } finally { setExporting(false); }
  };

  return <>
    {error && <Toast tone="error" title="PNG export alınmadı" body={error} onClose={() => setError('')} />}
    <div className={`sharecard-studio ${props.compactDownload ? 'sharecard-studio--compact-download' : ''}`}>
      <aside>
        {props.showFamilySelector !== false && <Tabs active={family} onChange={(value) => setFamily(value as PosterFamily)} items={[{ id: 'result', label: 'Nəticə' }, { id: 'leaderboard', label: 'Leaderboard' }]} />}
        {family === 'leaderboard' && props.standings.length > 10 && <Select label="Komanda sayı" value={leaderboardLimit} onChange={(event) => setLeaderboardLimit(event.target.value as LeaderboardLimit)}><option value="10">Top 10</option><option value="16">Top 16</option><option value="all">Bütün sıralama</option></Select>}
        {!exportReady && <p className="sharecard-integrity-state" role="alert"><strong>İxrac əlçatan deyil.</strong> Turnir tarixi, mərhələsi və dərc edilmiş nəticə mənbəyi təsdiqlənməyib.</p>}
        {props.compactDownload && <div className="sharecard-studio__compact-copy"><strong>Rəsmi nəticə sharecardı</strong><span>Mövcud dərc edilmiş sıralamadan eyni AEVIC renderer-i ilə 2400 px PNG.</span></div>}
        <div className="studio-actions"><Button icon={<Download size={17} />} loading={exporting} disabled={!exportReady} onClick={download}>PNG yüklə</Button>{!props.compactDownload && <Button variant="secondary" icon={<Share2 size={17} />} disabled={exporting || !exportReady} onClick={share}>Paylaş</Button>}</div>
      </aside>
      <div className="sharecard-canvas"><div ref={previewRef}>{exportReady && provenance ? family === 'result' ? props.result ? <TournamentResultPoster {...props} result={props.result} provenance={provenance} /> : <div className="sharecard-integrity-placeholder">Komanda üzrə dərc edilmiş nəticə olmadan rəsmi poster yaradılmır.</div> : <LeaderboardPoster tournamentName={props.tournamentName} standings={props.standings} provenance={provenance} limit={leaderboardLimit} /> : <div className="sharecard-integrity-placeholder">Mənbə məlumatı olmadan rəsmi poster yaradılmır.</div>}</div></div>
    </div>
  </>;
}
