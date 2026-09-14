import { ArrowRight, Download, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import phone from '../../assets/official/team-wrapped-phone.png';
import artwork from '../../assets/official/team-share-card-background.png';
import { competitionNow, services } from '../../services';
import { queryPolicy, usePlatformQuery } from '../../services/queryCache';
import type { PublicTeamProfile, PublicTeamSummary, Team, TeamProfileCardData } from '../../types/domain';
import { yearPeriod } from '../../utils/wrapped';
import { publicTeamUrl } from '../../utils/publicUrl';
import { drawPublicTeamIdentityCard, loadCardImage, teamIdentityCardBlob } from '../../utils/teamIdentityCard';
import { Button } from '../common/primitives';

export function PublicTeamFeatures({ team, profile }: { team: Team | PublicTeamSummary; profile?: PublicTeamProfile }) {
  const year = competitionNow().getFullYear();
  const slug = team.slug ?? team.id;
  const period = useMemo(() => yearPeriod(year), [year]);
  const wrapped = usePlatformQuery({ key: `wrapped:${slug}:${period.label}`, query: () => services.wrapped.forTeam(slug, period), staleTime: queryPolicy.historical, retry: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const data = useMemo<TeamProfileCardData>(() => {
    const metric = (key: string) => profile?.career?.metrics.find(item => item.key === key)?.value;
    const founded = profile?.team.foundedAt ? new Date(profile.team.foundedAt).getFullYear() : undefined;
    return { teamId: team.id, teamName: team.name, teamTag: team.tag, teamLogo: team.logoUrl, country: team.country, profileUrl: publicTeamUrl(slug), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), year: founded && Number.isFinite(founded) ? founded : undefined, roster: [] };
  }, [team, profile, slug]);
  useEffect(() => {
    let cancelled = false; setReady(false);
    void (async () => {
      await document.fonts?.ready;
      const [banner, logo] = await Promise.all([loadCardImage(artwork), loadCardImage(data.teamLogo).catch(() => undefined)]);
      if (cancelled || !canvas.current) return;
      drawPublicTeamIdentityCard(canvas.current, data, { banner, logo }); setReady(true);
    })().catch(() => { if (!cancelled) setNotice('Kart yüklənmədi. Səhifəni yeniləyib cəhd edin.'); });
    return () => { cancelled = true; };
  }, [data]);
  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `aevic-${slug}-official-team.png`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const act = async (share: boolean) => {
    if (!ready || !canvas.current || busy) return;
    setBusy(true); setNotice('');
    try {
      const blob = await teamIdentityCardBlob(canvas.current);
      const file = new File([blob], `aevic-${slug}.png`, { type: 'image/png' });
      if (!share) { downloadBlob(blob); setNotice('PNG hazırdır.'); }
      else if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `${team.name} · AEVIC`, files: [file] });
      else if (navigator.share) await navigator.share({ title: `${team.name} · AEVIC`, url: data.profileUrl });
      else { await navigator.clipboard.writeText(data.profileUrl); setNotice('Profil keçidi kopyalandı. PNG-ni də yükləyə bilərsiniz.'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Əməliyyat alınmadı. Yenidən cəhd edin və ya profil keçidini ünvan sətrindən kopyalayın.');
    } finally { setBusy(false); }
  };
  return <div className="public-team-features">
    <section className="public-team-wrapped" aria-labelledby="team-wrapped-title">
      <div className="public-team-feature-copy"><span className="public-team-eyebrow">// SEZON XÜLASƏSİ</span><h2 id="team-wrapped-title">{year} mövsümü üçün hazırdır.</h2><p>Bu mövsümün hekayəsini yenidən yaşa.</p>
        <dl className="public-team-wrapped-stats">{[['Matç', wrapped.data?.matches], ['WWCD', wrapped.data?.wwcd], ['Kill', wrapped.data?.kills]].map(([label, value]) => <div key={label}><dd>{value ?? '—'}</dd><dt>{label}</dt></div>)}</dl>
        <Link className="button button--primary" to={`/teams/${slug}/wrapped/${year}`}>İcmala bax<ArrowRight size={19} /></Link>
      </div>
      <div className="public-team-wrapped-visual" aria-hidden="true"><img src={phone} alt="" width="1024" height="1536" loading="lazy" /><div className="public-team-phone-title"><strong>{team.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</strong><span>{team.name}</span><small>{year} SEZON XÜLASƏSİ</small></div></div>
      <p className="public-team-wrapped-tagline">SAYILAR<br />OYNAYIR<br />HEKAYƏNİ<br />DANIŞIR.</p>
    </section>
    <section className="public-team-official" aria-labelledby="team-official-title">
      <div className="public-team-feature-copy"><span className="public-team-eyebrow">// RƏSMİ KOMANDA KARTI</span><h2 id="team-official-title">{team.name}</h2><span className="public-team-identity-line">TEAM IDENTITY // COMPETITIVE LEGACY</span><p>Rəsmi komanda kartınızı paylaş və AEVIC icmasında təmsil et.</p><div className="public-team-feature-actions"><Button disabled={!ready || busy} onClick={() => void act(true)} icon={<Share2 size={18} />}>Paylaş<ArrowRight size={18} /></Button><Button variant="secondary" disabled={!ready || busy} onClick={() => void act(false)} icon={<Download size={18} />}>PNG-ni yüklə</Button></div>{notice && <p role="status" className="public-team-feature-notice">{notice}</p>}</div>
      <div className="public-team-card-preview"><canvas ref={canvas} width="1200" height="660" role="img" aria-label={`${team.name} rəsmi komanda kartı: ${data.matches ?? '—'} matç, ${data.finishes ?? '—'} kill, ${data.wwcd ?? '—'} WWCD, ${data.championships ?? '—'} çempionluq`} /><button type="button" aria-label="Rəsmi komanda kartını paylaş" disabled={!ready || busy} onClick={() => void act(true)}><ArrowRight size={28} /></button></div>
    </section>
  </div>;
}
