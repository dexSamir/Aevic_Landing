import {usePlatformQuery} from '../services/queryCache';
import { Link, useParams } from 'react-router-dom';
import { ProfileCardGenerator } from '../components/profile/ProfileCardGenerator';
import { Button, EmptyState, LoadingSkeleton, PageHeader } from '../components/common/primitives';
import { services } from '../services';
import type { TeamProfileCardData } from '../types/domain';
import { publicTeamUrl } from '../utils/publicUrl';

export function TeamProfileCardPage() {
  const {teamSlug=''}=useParams();
  const {data:profile,loading,error,refetch}=usePlatformQuery({key:`profile:${teamSlug}`,scope:'public',query:()=>services.profiles.teamBySlug(teamSlug)});
  const failed=Boolean(error&&!profile);
  if (loading) return <section className="page-section"><div className="container"><LoadingSkeleton variant="profile" rows={6} /></div></section>;
  if (failed) return <section className="page-section"><div className="container"><EmptyState title="Profil kartı yüklənmədi" body="Public profil servisi hazırda cavab vermir." action={<Button variant="secondary" onClick={refetch}>Yenidən cəhd et</Button>} /></div></section>;
  if (!profile) return <section className="page-section"><div className="container"><EmptyState title="Profil kartı əlçatan deyil" body="Public komanda profili tapılmadı." /></div></section>;
  if (profile.team.legacyHistoryIncomplete) return <EmptyState title="Əvvəlki tarixçə yoxlanılır" body="Tam karyera kartı tarixçə uzlaşdırıldıqdan sonra açılacaq. Dərc edilmiş ayrı-ayrı turnir nəticələri komanda studiyasında paylaşılır." />;
  const metric = (key: string) => profile.career?.metrics.find((item) => item.key === key)?.value;
  const data: TeamProfileCardData = { teamId: profile.team.id, teamName: profile.team.name, teamLogo: profile.team.logoUrl, teamBanner: profile.team.bannerUrl, teamTag: profile.team.tag, organizationName: profile.organization?.name, country: profile.team.country, profileUrl: publicTeamUrl(teamSlug), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), podiums: metric('podiums'), roster: profile.team.roster.map(({ ign, role }) => ({ ign, role })), sourceLabel: 'Published public career stats' };
  return <section className="page-section profile-card-page"><div className="container"><PageHeader eyebrow="AEVIC Komanda Kartı" title={`${profile.team.name} Kart Studiyası`} description="Rəsmi komanda kimliyini idarəli şablonlarla 1:1, 4:5 və 9:16 formatlarında hazırla." actions={<Link className="button button--ghost" to={`/teams/${teamSlug}`}><span>Profilə qayıt</span></Link>} /><ProfileCardGenerator data={data} /></div></section>;
}
