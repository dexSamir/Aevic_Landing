import { serviceCapabilities } from '../../services';
import '../../styles/public-pages.css';
import { PublicTeamSummaryPage } from './ProfilePagesShared';
import { TeamProfilePage } from './TeamProfilePage';
export function PublicTeamProfileRoute() {
  return serviceCapabilities.publicTeamHistory ? <TeamProfilePage /> : <PublicTeamSummaryPage />;
}
