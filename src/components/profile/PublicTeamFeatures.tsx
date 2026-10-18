import { ArrowRight, Download, Share2 } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { responsiveArtwork } from '../../assets/official/responsive';
const phone = responsiveArtwork['team-wrapped-phone'];
const artwork = responsiveArtwork['team-share-card-background'].src;
import { competitionNow, services } from '../../services';
import { queryPolicy, usePlatformQuery } from '../../services/queryCache';
import type { PublicTeamProfile, PublicTeamSummary, Team, TeamProfileCardData } from '../../types/domain';
import { yearPeriod } from '../../utils/wrapped';
import { publicTeamUrl } from '../../utils/publicUrl';
import { Button, Modal } from '../common/primitives';

const ProfileCardGenerator = lazy(() => import('./ProfileCardGenerator').then(module => ({ default: module.ProfileCardGenerator })));

export function PublicTeamFeatures({ team, profile }: { team: Team | PublicTeamSummary; profile?: PublicTeamProfile }) {
  const year = competitionNow().getFullYear();
  const slug = team.slug ?? team.id;
  const period = useMemo(() => yearPeriod(year), [year]);
  const wrapped = usePlatformQuery({ scope:'public', key: `wrapped:${slug}:${period.label}`, query: () => services.wrapped.forTeam(slug, period), staleTime: queryPolicy.historical, retry: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !region.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '200px' });
    observer.observe(region.current);
    return () => observer.disconnect();
  }, [visible]);

  const [notice, setNotice] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);
  const closeStudio = useCallback(() => setStudioOpen(false), []);
  const data = useMemo<TeamProfileCardData>(() => {
    const metric = (key: string) => profile?.career?.metrics.find(item => item.key === key)?.value;
    const founded = profile?.team.foundedAt ? new Date(profile.team.foundedAt).getFullYear() : undefined;
    return { teamId: team.id, teamName: team.name, teamTag: team.tag, teamLogo: team.logoUrl, country: team.country, profileUrl: publicTeamUrl(slug), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), year: founded && Number.isFinite(founded) ? founded : undefined, roster: (profile?.team.roster ?? team.roster ?? []).map(({ign, role}) => ({ign, role})), mapStats: profile?.mapSpecialization.metrics, podiums: metric('podiums'), sourceLabel: profile?.career?.scopeLabel };
  }, [team, profile, slug]);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      const { drawPublicTeamIdentityCard, loadCardImage } = await import('../../utils/teamIdentityCard');
      await document.fonts?.ready;
      const [background, logo] = await Promise.all([loadCardImage(artwork), loadCardImage(data.teamLogo).catch(() => undefined)]);
      if (cancelled || !canvas.current) return;
      drawPublicTeamIdentityCard(canvas.current, data, { background, logo });
    })().catch(() => { if (!cancelled) setNotice('Kart yüklənmədi. Səhifəni yeniləyib cəhd edin.'); });
    return () => { cancelled = true; };
  }, [data, visible]);
  return <div ref={region} className="public-team-features">
    <section className="public-team-wrapped" aria-labelledby="team-wrapped-title">
      <div className="public-team-feature-copy"><span className="public-team-eyebrow">// SEZON XÜLASƏSİ</span><h2 id="team-wrapped-title">{`${year} mövsümünün rəsmi nəticələri`}</h2><p>{team.legacyHistoryIncomplete ? "İcmal yalnız sistemdə qeydə alınmış rəsmi nəticələri əhatə edir. Əvvəlki tarixçə tam olmaya bilər." : "Bu mövsümün hekayəsini yenidən yaşa."}</p>
        <dl className="public-team-wrapped-stats">{[['Matç', wrapped.data?.matches], ['WWCD', wrapped.data?.wwcd], ['Kill', wrapped.data?.kills]].map(([label, value]) => <div key={label}><dd>{value ?? '—'}</dd><dt>{label}</dt></div>)}</dl>
        <Link className="button button--primary" to={`/teams/${slug}/wrapped/${year}`}>İcmala bax<ArrowRight size={19} /></Link>
      </div>
      <div className="public-team-wrapped-visual" aria-hidden="true"><picture><source type="image/avif" srcSet={phone.sources[0].srcSet} sizes="(max-width: 768px) 80vw, 440px" /><img src={phone.src} srcSet={phone.srcSet} sizes="(max-width: 768px) 80vw, 440px" alt="" width={phone.width} height={phone.height} loading="lazy" decoding="async" /></picture><div className="public-team-phone-title"><strong>{team.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</strong><span>{team.name}</span><small>{year} SEZON XÜLASƏSİ</small></div></div>
      <p className="public-team-wrapped-tagline">SAYILAR<br />OYNAYIR<br />HEKAYƏNİ<br />DANIŞIR.</p>
    </section>
    <section className="public-team-official" aria-labelledby="team-official-title">
      <div className="public-team-feature-copy"><span className="public-team-eyebrow">// RƏSMİ KOMANDA KARTI</span><h2 id="team-official-title">{team.name}</h2><span className="public-team-identity-line">TEAM IDENTITY // COMPETITIVE LEGACY</span><p>Rəsmi komanda kartınızı paylaş və AEVIC icmasında təmsil et.</p><div className="public-team-feature-actions"><Button onClick={() => setStudioOpen(true)} icon={<Share2 size={18} />}>Paylaş<ArrowRight size={18} /></Button><Button variant="secondary" onClick={() => setStudioOpen(true)} icon={<Download size={18} />}>PNG-ni yüklə</Button></div>{notice && <p role="status" className="public-team-feature-notice">{notice}</p>}</div>
      <div className="public-team-card-preview"><canvas ref={canvas} width="1200" height="660" role="img" aria-label={`${team.name} rəsmi komanda kartı: ${data.matches ?? '—'} matç, ${data.finishes ?? '—'} kill, ${data.wwcd ?? '—'} WWCD, ${data.championships ?? '—'} çempionluq`} /><button type="button" aria-label="Rəsmi komanda kartını paylaş" onClick={() => setStudioOpen(true)}><ArrowRight size={28} /></button></div>
    </section>
    <Modal open={studioOpen} onClose={closeStudio} title="Komanda kartını hazırla">{studioOpen && <Suspense fallback={<p role="status">Studiya yüklənir…</p>}><ProfileCardGenerator data={data}/></Suspense>}</Modal>
  </div>;
}
