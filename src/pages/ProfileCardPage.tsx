import {usePlatformQuery} from '../services/queryCache';
import { Link, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
const ProfileCardGenerator = lazy(() => import('../components/profile/ProfileCardGenerator').then(module => ({ default: module.ProfileCardGenerator })));
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
  const metric = (key: string) => profile.career?.metrics.find((item) => item.key === key)?.value;
  const data: TeamProfileCardData = { teamId: profile.team.id, teamName: profile.team.name, teamLogo: profile.team.logoUrl, teamBanner: profile.team.bannerUrl, teamTag: profile.team.tag, organizationName: profile.organization?.name, country: profile.team.country, profileUrl: publicTeamUrl(teamSlug), matches: metric('matches'), finishes: metric('finishes'), wwcd: metric('wwcd'), championships: metric('championships'), podiums: metric('podiums'), roster: profile.team.roster.map(({ ign, role }) => ({ ign, role })), sourceLabel: profile.team.legacyHistoryIncomplete ? 'Recorded official results · Earlier history may be incomplete' : 'Published official results' };
  return <section className="page-section profile-card-page"><div className="container"><PageHeader eyebrow="AEVIC Komanda Kartı" title={`${profile.team.name} Kart Studiyası`} description="Rəsmi komanda kimliyini idarəli şablonlarla 1:1, 4:5 və 9:16 formatlarında hazırla." actions={<Link className="button button--ghost" to={`/teams/${teamSlug}`}><span>Profilə qayıt</span></Link>} /><p className="muted">Yalnız sistemdə dərc edilmiş rəsmi nəticələr göstərilir.{profile.team.legacyHistoryIncomplete && ' Əvvəlki tarixçə tam olmaya bilər.'}</p><Suspense fallback={<LoadingSkeleton variant="media" />}><ProfileCardGenerator data={data} /></Suspense></div></section>;
}
