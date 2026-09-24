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
        title="Badge tapılmadı"
        body="Bu badge kolleksiyada yoxdur və ya public görünür deyil."
      />
    );
  return (
    <>
      <Link className="text-link" to="/team/badges">
        ← Badge Cabinet
      </Link>
      <PageHeader
        eyebrow={badge.category}
        title={badge.title}
        description={badge.description}
      />
      <div className="completion-grid">
        <section className="badge-art-pending">
          <span>ART PENDING</span>
          <strong>{badge.tier}</strong>
          <p>
            Nişanın təsviri hazırlanır. Qazanılma şərtləri aşağıda göstərilir.
          </p>
        </section>
        <section>
          <SectionHeading title="Tier və progress" />
          <dl className="detail-ledger">
            <div>
              <dt>Cari tier</dt>
              <dd>{badge.tier}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{badge.state}</dd>
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
              <dt>Progress</dt>
              <dd>
                {badge.progress
                  ? `${badge.progress.current} / ${badge.progress.target}`
                  : "Authoritative server event tələb olunur"}
              </dd>
            </div>
            <div>
              <dt>Unlock tarixi</dt>
              <dd>
                {badge.unlockedAt ? formatDate(badge.unlockedAt) : "Açılmayıb"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <>
        <p>
          Tier unlock history və yeni achievement notification yalnız
          server-calculated unlock events-dən gəlməlidir.
        </p>
      </>
    </>
  );
}
