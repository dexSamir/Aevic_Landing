import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common/primitives';
import { TeamComparison } from '../../components/team/TeamExperience';
import { usePublicPlatformData } from '../../services/PlatformDataContext';
import '../../styles/public-pages.css';

export function PublicTeamComparisonPage() {
  const { teamComparisonRecords, teams } = usePublicPlatformData();
  const [searchParams] = useSearchParams();
  const requestedLeft = searchParams.get('team');
  const requestedRight = searchParams.get('opponent');
  const leftTeam = requestedLeft ? teams.find((team) => team.slug === requestedLeft) : undefined;
  const rightTeam = requestedRight ? teams.find((team) => team.slug === requestedRight) : undefined;
  const invalidSelection = Boolean((requestedLeft && !leftTeam) || (requestedRight && !rightTeam));
  return <section className="page-section"><div className="container"><PageHeader eyebrow="Public comparison" title="Komandaları müqayisə et" description="Dərc edilmiş rəsmi nəticələri yan-yana oxuyun. Məlumat olmayan göstəricilər açıq şəkildə boş saxlanır." /><TeamComparison key={`${requestedLeft}-${requestedRight}`} records={teamComparisonRecords} initialLeftId={requestedLeft ? leftTeam?.id ?? '' : undefined} initialRightId={requestedRight ? rightTeam?.id ?? '' : undefined} invalidSelection={invalidSelection} /></div></section>;
}
