import { Link,useParams } from 'react-router-dom';
import { EmptyState } from '../../components/common/primitives';
import { PublicTeamDetail } from '../../components/profile/PublicTeamDetail';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';

export const emptyDirectoryTournaments: import('../../types/domain').Tournament[] = [];
export function PublicTeamSummaryPage() {
  const { teamSlug } = useParams();
  const { teams } = usePublicPlatformData();
  const team = teams.find((item) => item.slug === teamSlug);
  return team ? <PublicTeamDetail team={team} /> : <section className="page-section"><div className="container"><EmptyState heading="h1" title="Komanda tapılmadı" body="Bu kimlik ictimai kataloqda yoxdur." /><Link to="/teams">Komanda kataloquna qayıt</Link></div></section>;
}
