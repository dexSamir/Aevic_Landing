import {
PageHeader
} from '../../components/common/primitives';
import { TeamComparison } from '../../components/team/TeamExperience';
import { useTeamPlatformData } from '../../services/PlatformDataContext';

export function TeamComparisonPage() {
  const { teamComparisonRecords } = useTeamPlatformData();
  return <><PageHeader eyebrow="Karyera müqayisəsi" title="Komandaları müqayisə et" description="Eyni dərc edilmiş rəsmi nəticələrdəki göstəriciləri yan-yana yoxlayın. Məlumat olmayan sahələr “—” ilə işarələnir." /><TeamComparison records={teamComparisonRecords} /></>;
}
