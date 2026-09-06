import { ArrowLeft, Download, Pause, Play, RotateCcw, Share2, Swords, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, LoadingSkeleton, TeamLogo } from '../components/common/primitives';
import { Seo } from '../components/common/Seo';
import { services } from '../services';
import { queryPolicy, usePlatformQuery } from '../services/queryCache';
import type { ProfileCardFormat, WrappedSummary } from '../types/domain';
import { publicSiteOrigin } from '../utils/publicUrl';
import { yearPeriod } from '../utils/wrapped';
import { canvasBlob, drawWrappedSharecard, wrappedCardSize } from '../utils/wrappedSharecard';

export const WRAPPED_SLIDE_DURATION_MS = 6000;
export type WrappedStory = { id: string; kicker: string; value?: string | number; title: string; context?: string; final?: boolean };

export function buildWrappedStories(summary: WrappedSummary): WrappedStory[] {
  return [
    { id: 'intro', kicker: `AEVIC WRAPPED ${summary.period.label}`, title: summary.entity.name, context: 'Rəqabətdə yazılan bir mövsüm.' },
    { id: 'matches', kicker: 'RƏQABƏT', value: summary.matches, title: 'MATÇ', context: 'Dərc edilmiş rəsmi raundlar.' },
    ...(summary.wwcd > 0 ? [{ id: 'victories', kicker: 'QƏLƏBƏ', value: summary.wwcd, title: 'WWCD', context: `${summary.podiums} podium nəticəsi` }] : []),
    ...(summary.kills > 0 ? [{ id: 'kills', kicker: 'DÖYÜŞ', value: summary.kills, title: 'KILL', context: 'Hər biri nəticə cədvəlinə yazıldı.' }] : []),
    ...(summary.bestMap ? [{ id: 'map', kicker: 'SƏNİN XƏRİTƏN', value: summary.bestMap.map, title: 'ƏN GÜCLÜ XƏRİTƏ', context: `${summary.bestMap.matches} matç · ${summary.bestMap.wwcd} WWCD · #${summary.bestMap.averagePlacement} orta yer` }] : []),
    ...(summary.biggestKillGame ? [{ id: 'peak', kicker: 'PEAK MATCH', value: summary.biggestKillGame.kills, title: 'KILL', context: `${summary.biggestKillGame.map} · ${summary.biggestKillGame.tournamentName}` }] : []),
    ...(summary.records[0] ? [{ id: 'record', kicker: 'AEVIC REKORDU', value: summary.records[0].value, title: summary.records[0].label, context: `${summary.records[0].tournamentName} · ${summary.records[0].map ?? 'Turnir rekordu'}` }] : []),
    ...(summary.achievements[0] ? [{ id: 'achievement', kicker: 'QAZANILMIŞ İRS', title: summary.achievements[0].title, context: summary.achievements[0].description }] : []),
    { id: 'summary', kicker: `AEVIC WRAPPED ${summary.period.label}`, title: summary.entity.name, context: 'Mövsümün factual xülasəsi paylaşmağa hazırdır.', final: true },
  ];
}

export function wrappedAdvanceIndex(index: number, total: number) { return total <= 0 ? 0 : Math.min(total - 1, index + 1); }

export function wrappedNavigationDirection(offsetX: number, width: number) {
  return width > 0 && offsetX < width * .38 ? 'previous' : 'next';
}

const WRAPPED_INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [role="button"], [contenteditable="true"], [data-wrapped-interactive]';

export function isWrappedInteractiveTarget(target: EventTarget | null) {
  return Boolean(target && 'closest' in target && typeof (target as Element).closest === 'function' && (target as Element).closest(WRAPPED_INTERACTIVE_SELECTOR));
}

export function wrappedPointerIntent(input: { deltaX: number; deltaY: number; duration: number; offsetX: number; width: number }) {
  const distance = Math.hypot(input.deltaX, input.deltaY);
  const horizontalThreshold = Math.max(44, input.width * .08);
  if (input.duration <= 700 && Math.abs(input.deltaX) >= horizontalThreshold && Math.abs(input.deltaX) > Math.abs(input.deltaY) * 1.2) return input.deltaX < 0 ? 'next' : 'previous';
  if (input.duration <= 360 && distance <= 10) return wrappedNavigationDirection(input.offsetX, input.width);
  return 'none';
}

export function shouldWrappedAutoAdvance(input: { index: number; total: number; manualPaused: boolean; holding: boolean; tabVisible: boolean; reducedMotion: boolean }) {
  return input.total > 0 && input.index < input.total - 1 && !input.manualPaused && !input.holding && input.tabVisible && !input.reducedMotion;
}

type WrappedShareTarget = {
  share?: (data?: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

export function canShareWrappedFile(target: WrappedShareTarget, file: File) {
  return Boolean(target.share && target.canShare?.({ files: [file] }));
}

function WrappedShareStudio({ summary }: { summary: WrappedSummary }) {
  const [format, setFormat] = useState<ProfileCardFormat>('story');
  const [notice, setNotice] = useState('');
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (previewRef.current) drawWrappedSharecard(previewRef.current, summary, format, true); }, [format, summary]);
  const exportBlob = async () => { await document.fonts.ready; const canvas = document.createElement('canvas'); drawWrappedSharecard(canvas, summary, format); return canvasBlob(canvas); };
  const filename = `aevic-wrapped-${summary.entity.slug}-${summary.period.label}-${format}.png`;
  const downloadBlob = (blob: Blob) => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  const download = async () => { downloadBlob(await exportBlob()); setNotice('PNG hazırdır.'); };
  const share = async () => {
    try {
      const blob = await exportBlob(); const file = new File([blob], filename, { type: 'image/png' });
      if (canShareWrappedFile(navigator, file)) await navigator.share({ title: `${summary.entity.name} — AEVIC Wrapped ${summary.period.label}`, files: [file] });
      else { downloadBlob(blob); await navigator.clipboard.writeText(new URL(`/teams/${summary.entity.slug}/wrapped/${summary.period.label}`, publicSiteOrigin()).toString()); setNotice('Fayl paylaşımı dəstəklənmir; PNG yükləndi və canonical keçid kopyalandı.'); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Paylaşım alınmadı. PNG-ni yükləyin.'); }
  };
  const [width, height] = wrappedCardSize(format);
  return <div className="wrapped-share-studio"><canvas ref={previewRef} aria-label={`${width} × ${height} AEVIC Wrapped sharecard önizləməsi`} /><div className="wrapped-share-studio__controls" role="group" aria-label="Sharecard formatı">{(['story', 'portrait', 'square'] as const).map((item) => <button key={item} type="button" aria-pressed={format === item} onClick={() => setFormat(item)}>{item === 'square' ? '1:1' : item === 'portrait' ? '4:5' : '9:16'}</button>)}</div><div className="wrapped-share-studio__actions"><Button icon={<Share2 size={18} />} onClick={() => void share()}>Paylaş</Button><Button variant="secondary" icon={<Download size={18} />} onClick={() => void download()}>PNG yüklə</Button></div>{notice && <p role="status">{notice}</p>}</div>;
}

export function WrappedPage() {
  const { teamSlug = '', year = '' } = useParams();
  const parsedYear = Number(year);
  const period = useMemo(() => yearPeriod(Number.isInteger(parsedYear) && parsedYear > 2000 ? parsedYear : new Date().getFullYear()), [parsedYear]);
  const query = usePlatformQuery({ key: `wrapped:${teamSlug}:${period.label}`, query: () => services.wrapped.forTeam(teamSlug, period), staleTime: queryPolicy.historical, retry: 0 });
  const [index, setIndex] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showNavigationHint, setShowNavigationHint] = useState(true);
  const pointerStart = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const navigate = useNavigate();
  const summary = query.data;
  const stories = useMemo(() => summary ? buildWrappedStories(summary) : [], [summary]);
  const paused = !shouldWrappedAutoAdvance({ index, total: stories.length, manualPaused, holding, tabVisible, reducedMotion });
  const next = useCallback(() => { setShowNavigationHint(false); setIndex((value) => wrappedAdvanceIndex(value, stories.length)); }, [stories.length]);
  const previous = useCallback(() => { setShowNavigationHint(false); setIndex((value) => Math.max(0, value - 1)); }, []);

  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { const onVisibility = () => setTabVisible(!document.hidden); document.addEventListener('visibilitychange', onVisibility); return () => document.removeEventListener('visibilitychange', onVisibility); }, []);
  useEffect(() => { document.body.classList.add('wrapped-active'); return () => document.body.classList.remove('wrapped-active'); }, []);
  useEffect(() => { if (paused || !stories.length) return; const timer = window.setTimeout(next, WRAPPED_SLIDE_DURATION_MS); return () => window.clearTimeout(timer); }, [index, next, paused, stories.length]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isWrappedInteractiveTarget(event.target)) return;
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === ' ') { event.preventDefault(); setManualPaused((value) => !value); }
      if (event.key === 'Escape') navigate(`/teams/${teamSlug}`);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [navigate, next, previous, teamSlug]);
  useEffect(() => { if (index >= stories.length && stories.length) setIndex(stories.length - 1); }, [index, stories.length]);
  useEffect(() => { if (!showNavigationHint) return; const timer = window.setTimeout(() => setShowNavigationHint(false), 4500); return () => window.clearTimeout(timer); }, [showNavigationHint]);

  if (query.loading) return <main className="wrapped-shell"><div className="wrapped-loading"><LoadingSkeleton rows={6} /></div></main>;
  if (query.error) return <main className="wrapped-shell"><EmptyState title="Wrapped yüklənmədi" body="Public nəticə servisi hazırda cavab vermir." action={<Button onClick={query.refetch}>Yenidən cəhd et</Button>} /></main>;
  if (!summary) return <main className="wrapped-shell"><EmptyState title="Komanda tapılmadı" body="Bu public komanda üçün Wrapped mövcud deyil." /></main>;
  if (!summary.available) return <main className="wrapped-shell"><Seo title={`${summary.entity.name} — AEVIC Wrapped ${summary.period.label}`} /><EmptyState icon={<Swords size={28} />} title="Bu dövr üçün kifayət qədər rəsmi nəticə yoxdur" body={`Wrapped üçün ən azı ${summary.minimumMatches} dərc edilmiş matç tələb olunur. Hazırda ${summary.matches} matç mövcuddur.`} action={<Link className="button button--secondary" to={`/teams/${teamSlug}`}><span>Komanda profilinə qayıt</span></Link>} /></main>;
  const story = stories[index];
  const pointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    setHolding(false);
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId || story.final || isWrappedInteractiveTarget(event.target)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const intent = wrappedPointerIntent({ deltaX: event.clientX - start.x, deltaY: event.clientY - start.y, duration: performance.now() - start.time, offsetX: event.clientX - bounds.left, width: bounds.width });
    if (intent === 'previous') previous();
    if (intent === 'next') next();
  };
  return <main className={`wrapped-shell ${paused ? 'is-paused' : ''}`} aria-label={`${summary.entity.name} AEVIC Wrapped ${summary.period.label}`}>
    <Seo title={`${summary.entity.name} — AEVIC Wrapped ${summary.period.label}`} description={`${summary.entity.name}: ${summary.matches} matç, ${summary.kills} kill və ${summary.wwcd} WWCD ilə AEVIC Wrapped ${summary.period.label}.`} />
    <section className={`wrapped-story wrapped-story--${story.id}`}>
      <header className="wrapped-story__top"><div className="wrapped-progress" role="progressbar" aria-label="Wrapped gedişatı" aria-valuemin={1} aria-valuemax={stories.length} aria-valuenow={index + 1} aria-valuetext={`${index + 1} / ${stories.length}`}>{stories.map((item, itemIndex) => <span key={item.id} className={itemIndex < index ? 'is-complete' : itemIndex === index ? 'is-current' : ''}><i style={itemIndex === index ? { animationDuration: `${WRAPPED_SLIDE_DURATION_MS}ms` } : undefined} /></span>)}</div><div className="wrapped-story__controls">{!story.final && <button type="button" aria-label={manualPaused ? 'Avtomatik keçidi davam etdir' : 'Avtomatik keçidi dayandır'} aria-pressed={manualPaused} onClick={() => setManualPaused((value) => !value)}>{manualPaused ? <Play size={18} /> : <Pause size={18} />}</button>}<Link to={`/teams/${teamSlug}`} aria-label="Wrapped-dən çıx"><X size={20} /></Link></div></header>
      <article key={story.id} className="wrapped-story__content" aria-live="polite" onPointerDown={(event) => { if (story.final || isWrappedInteractiveTarget(event.target) || event.button !== 0) return; pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() }; setHolding(true); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={pointerUp} onPointerCancel={() => { pointerStart.current = null; setHolding(false); }}>
        <div className="wrapped-facet" aria-hidden="true" /><span>{story.kicker}</span>{story.id === 'intro' && <TeamLogo name={summary.entity.name} src={summary.entity.logoUrl} size="lg" />}{story.value !== undefined && <strong className="wrapped-story__value">{story.value}</strong>}<h1>{story.title}</h1><p>{story.context}</p>{story.id === 'intro' && showNavigationHint && <p className="wrapped-navigation-hint" role="status">← Sol/sağ toxun · üfüqi sürüşdür · ox düymələri →</p>}{story.id === 'victories' && <Trophy size={34} aria-hidden="true" />}
        {story.final && <><dl className="wrapped-summary-rail"><div><dt>Matç</dt><dd>{summary.matches}</dd></div><div><dt>WWCD</dt><dd>{summary.wwcd}</dd></div><div><dt>Kill</dt><dd>{summary.kills}</dd></div><div><dt>Podium</dt><dd>{summary.podiums}</dd></div>{summary.bestMap && <div><dt>Best map</dt><dd>{summary.bestMap.map}</dd></div>}</dl><WrappedShareStudio summary={summary} /><div className="wrapped-final-actions"><Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={previous}>Əvvəlki</Button><Button className="wrapped-replay" variant="ghost" icon={<RotateCcw size={17} />} onClick={() => { setIndex(0); setManualPaused(false); }}>Yenidən bax</Button></div><footer className="wrapped-final-signature"><span>AD AETERNAM</span><strong>VICTORIAM.</strong></footer></>}
      </article>
    </section>
  </main>;
}
