import { useEffect } from 'react';
import { Link,useParams } from 'react-router-dom';
import { EmptyState,LoadingSkeleton } from '../../components/common/primitives';
import { PublicTeamDetail } from '../../components/profile/PublicTeamDetail';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import '../../styles/public-pages.css';

export function TeamProfilePage() {
  const { teamSlug = '' } = useParams();
  const {data:profile,loading,error}=usePlatformQuery({key:`profile:${teamSlug}`,scope:'public',query:()=>services.profiles.teamBySlug(teamSlug)});
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

  if (loading) return <section className="page-section"><div className="container"><LoadingSkeleton variant="profile" rows={5} /></div></section>;
  if (failed) return <section className="page-section"><div className="container"><EmptyState title="Profil yüklənmədi" body="Public profil servisi hazırda cavab vermir. Bir az sonra yenidən cəhd edin." /></div></section>;
  if (!profile) return <section className="page-section"><div className="container"><EmptyState heading="h1" title="Komanda tapılmadı" body="Profil mövcud deyil və ya ictimai görünürlükdən çıxarılıb. Təsdiqlənmiş kimlikləri kataloqdan seçin." action={<Link className="button button--secondary" to="/teams">Komanda kataloqu</Link>} /></div></section>;

  return <PublicTeamDetail team={profile.team} profile={profile} />;
}
