import { AchievementMedal } from '../../components/team/Achievements';
import { Link,useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
EmptyState,
PageHeader,
SectionHeading
} from "../../components/common/primitives";
import {
useTeamPlatformData
} from "../../services/PlatformDataContext";
import { formatDate } from './TeamCompletionPagesShared';
export function BadgeDetailPage() {
  const { badgeId = "" } = useParams();
  const { teamAchievements } = useTeamPlatformData();
  const badge = teamAchievements.find((item) => item.id === badgeId);
  if (!badge)
    return (
      <EmptyState
        heading="h1"
        title="Nişan tapılmadı"
        body="Bu nişan komandanın kolleksiyasında yoxdur."
      />
    );
  return (
    <>
      <Link className="text-link" to="/team/badges">
        ← Nişan kabineti
      </Link>
      <PageHeader
        eyebrow={badge.category}
        title={badge.title}
        description={badge.description}
      />
      <div className="completion-grid">
        <section className="badge-detail-art"><AchievementMedal achievement={badge} featured /></section>
        <section>
          <SectionHeading title="Səviyyə və irəliləyiş" />
          <dl className="detail-ledger">
            <div>
              <dt>Səviyyə</dt>
              <dd>{badge.tier}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{locked:'Kilidli',progress:'Davam edir',unlocked:'Qazanılıb'}[badge.state]}</dd>
            </div>
            <div>
              <dt>Tələb</dt>
              <dd>
                {badge.progress
                  ? `${badge.progress.target} ${badge.progress.unit}`
                  : badge.description}
              </dd>
            </div>
            <div>
              <dt>İrəliləyiş</dt>
              <dd>
                {badge.progress
                  ? `${badge.progress.current} / ${badge.progress.target}`
                  : "Hələ nəticə qeydə alınmayıb"}
              </dd>
            </div>
            <div>
              <dt>Qazanılma tarixi</dt>
              <dd>
                {badge.unlockedAt ? formatDate(badge.unlockedAt) : "Açılmayıb"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <p>Nişanlar yalnız dərc edilmiş rəsmi nəticələrdən hesablanır. Əvvəlki tarixçənin qeydə alınmamış nəticələri bu göstəriciyə daxil deyil.</p>
    </>
  );
}
