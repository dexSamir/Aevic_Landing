import { ArrowRight,CalendarDays,Flag,Globe2 } from 'lucide-react';
import { useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { Button,EmptyState,LoadingSkeleton,SectionHeading,StatusBadge } from '../../components/common/primitives';
import { OrganizationBanner,OrganizationIdentity,SocialLinkList,VerificationCrest } from '../../components/profile/ProfileElements';
import { BadgeCollectionDrawer,FeaturedBadgeCabinet } from '../../components/team/BadgeCabinet';
import { services } from '../../services';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import { usePlatformQuery } from '../../services/queryCache';
import '../../styles/public-pages.css';
import { sanitizeOutboundUrl } from '../../utils/outboundUrl';
import { organizationTeamPath } from '../../utils/routes';

export function OrganizationProfilePage() {
  const { teamAchievements } = usePublicPlatformData();
  const { organizationSlug = '' } = useParams(); const [cabinetOpen, setCabinetOpen] = useState(false);
  const {data:organization,loading,error,refetch}=usePlatformQuery({key:`organization:${organizationSlug}`,scope:'public',query:()=>services.organizations.getBySlug(organizationSlug)});
  if(error&&!organization)return <EmptyState title="Təşkilat yüklənmədi" body="Xidmət hazırda cavab vermir." action={<Button onClick={refetch}>Yenidən yoxla</Button>}/>;
  if (loading) return <section className="page-section"><div className="container"><LoadingSkeleton variant="profile" rows={5} /></div></section>;
  if (!organization) return <section className="page-section"><div className="container"><EmptyState title="Təşkilat tapılmadı" body="Bu public profil mövcud deyil və ya görünürlükdən çıxarılıb." action={<Link className="button button--secondary" to="/organizations"><span>Directory-yə qayıt</span></Link>} /></div></section>;
  const featured = teamAchievements.filter((item) => organization.featuredAchievements.includes(item.id)).map((item, index) => ({ ...item, displayOrder: index + 1 }));
  return <>
    <article className="public-profile organization-profile">
      <div className="container">
        <OrganizationBanner organization={organization}>
          <div className="profile-banner__content"><OrganizationIdentity organization={organization} /><SocialLinkList links={organization.socialLinks} ownerName={organization.name} compact /></div>
        </OrganizationBanner>
        <nav className="profile-anchor-nav" aria-label="Təşkilat profili bölmələri"><a href="#overview">İcmal</a><a href="#teams">Komandalar</a><a href="#achievements">Nailiyyətlər</a></nav>
        <section id="overview" className="organization-overview">
          <div><h2>Rəsmi təşkilat profili</h2><p>{organization.description}</p><dl><div><dt>Ölkə</dt><dd><Flag size={16} />{organization.country}</dd></div><div><dt>Qurulub</dt><dd><CalendarDays size={16} />{organization.foundedAt ? new Date(organization.foundedAt).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' }) : 'Dərc edilməyib'}</dd></div>{sanitizeOutboundUrl(organization.website) && <div><dt>Website</dt><dd><Globe2 size={16} /><a href={sanitizeOutboundUrl(organization.website)} target="_blank" rel="noopener noreferrer">Sayta keç</a></dd></div>}</dl></div>
          <aside><strong>İctimai profil statusu</strong><VerificationCrest level={organization.verificationLevel} showLabel /><p>Təsdiq səviyyəsi təşkilat kimliyinə aiddir; nişan və nailiyyətlərdən ayrıdır.</p></aside>
        </section>
        <section id="teams" className="organization-teams">
          <SectionHeading title="Oyun üzrə komandalar" description="Hazırda AEVIC-də yalnız PUBG Mobile aktiv oyun domenidir." />
          {organization.ownedTeams.map((item) => <Link key={item.id} to={organizationTeamPath(item)} className="organization-team-row"><span className="game-monogram">PM</span><div><span>PUBG Mobile</span><h3>{item.displayName}</h3><p>{item.status === 'active' ? 'Aktiv rəqabət heyəti' : item.status}</p></div><StatusBadge status="approved">Təşkilata bağlı</StatusBadge><ArrowRight size={19} /></Link>)}
        </section>
        <section id="achievements"><FeaturedBadgeCabinet achievements={featured} onViewAll={() => setCabinetOpen(true)} /></section>
      </div>
    </article>
    <BadgeCollectionDrawer open={cabinetOpen} achievements={teamAchievements} onClose={() => setCabinetOpen(false)} />
  </>;
}
