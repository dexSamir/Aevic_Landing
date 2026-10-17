import { Seo } from '../../components/common/Seo';
import { useEffect } from 'react';
import { Link,useParams } from 'react-router-dom';
import { Button,EmptyState,LoadingSkeleton } from '../../components/common/primitives';
import { PublicTeamDetail } from '../../components/profile/PublicTeamDetail';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import '../../styles/public-pages.css';

export function TeamProfilePage() {
  const { teamSlug = '' } = useParams();
  const {data:profile,loading,error,refetch,retryAfterSeconds}=usePlatformQuery({key:`profile:${teamSlug}`,scope:'public',query:signal=>services.profiles.teamBySlug(teamSlug,signal)});
  const failed=Boolean(error&&!profile);

  useEffect(() => {
    if (!profile) return;
    const hash = window.location.hash.slice(1);
    if (['overview', 'form', 'roster', 'performance', 'matches'].includes(hash)) {
      const settleHash = () => window.requestAnimationFrame(() => {
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
        window.requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
      });
      settleHash();
      void document.fonts.ready.then(settleHash);
    }
  }, [profile]);

  if (loading) return <LoadingSkeleton variant="profile" rows={5} />;
  if (failed) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Profil yüklənmədi" body={error?.message ?? 'Profil hazırda yüklənə bilmir.'} action={error?.retryable ? <Button disabled={retryAfterSeconds > 0} onClick={refetch}>{retryAfterSeconds > 0 ? `${retryAfterSeconds} san. sonra yoxla` : 'Yenidən yoxla'}</Button> : <Link className="button button--secondary" to="/teams">Komanda kataloqu</Link>} /></div></section>;
  if (!profile) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Komanda tapılmadı" body="Profil mövcud deyil və ya ictimai görünürlükdən çıxarılıb. Təsdiqlənmiş kimlikləri kataloqdan seçin." action={<Link className="button button--secondary" to="/teams">Komanda kataloqu</Link>} /></div></section>;

  return <>{error && <aside className="container" role="status"><p>Son yüklənmiş məlumat göstərilir. {error.message}</p>{error.retryable && <Button variant="secondary" disabled={retryAfterSeconds > 0} onClick={refetch}>Yenidən yoxla</Button>}</aside>}<Seo title={profile.team.name} description={`${profile.team.name} — AEVIC PUBG Mobile komanda profili, heyəti və dərc edilmiş nəticələri.`} canonicalPath={`/teams/${profile.team.slug}`} image={profile.team.logoUrl} publicEntity /><PublicTeamDetail team={profile.team} profile={profile} /></>;
}
