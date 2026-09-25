import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/primitives';
import { BadgeCabinetEditor } from '../../components/team/BadgeCabinet';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';

export function TeamBadgeCabinetPage() {
  const { currentTeam, teamAchievements } = useTeamPlatformData();
  return <><PageHeader title="Nişan kabineti" description="Public profilinizdə görünəcək ən çox üç qazanılmış nişanı seçin və sırasını idarə edin." actions={<Link className="button button--secondary" to={`/teams/${currentTeam.slug}`} target="_blank"><span>Public profilə bax</span><ArrowRight size={17} /></Link>} /><BadgeCabinetEditor achievements={teamAchievements} teamId={currentTeam.id} /></>;
}
