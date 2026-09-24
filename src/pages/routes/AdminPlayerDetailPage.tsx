import {
History
} from "lucide-react";
import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
SectionHeading
} from "../../components/common/primitives";
import { services } from "../../services";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminPlayerDetailPage() {
  const [loadError, setLoadError] = useState(false);
  const { playerId = "" } = useParams();
  const [detail, setDetail] =
    useState<Awaited<ReturnType<typeof services.operations.player>>>();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    services.operations
      .player(playerId)
      .then(setDetail)
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true));
  }, [playerId]);
  if (loadError)
    return (
      <EmptyState
        heading="h1"
        title="Məlumat yüklənmədi"
        body="Xidmət hazırda cavab vermir. Dəyişiklik edilməyib."
        action={
          <Button onClick={() => window.location.reload()}>
            Yenidən yoxla
          </Button>
        }
      />
    );
  if (!loaded) return <LoadingSkeleton variant="profile" rows={7} />;
  if (!detail)
    return (
      <>
        <PageHeader
          eyebrow="Admin player"
          title="Oyunçu tapılmadı"
          description="Oyunçu mövcud deyil və ya məlumatlarını görmək üçün icazəniz yoxdur."
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="Admin player detail"
        title={detail.ign}
        description="Public identity, linked account, membership history, eligibility, sanctions və verification."
      />
      <div className="completion-grid">
        <section>
          <SectionHeading title="Account və komanda" />
          <dl className="detail-ledger">
            <div>
              <dt>Linked account</dt>
              <dd>{detail.linkedAccount?.emailHint ?? "Bağlanmayıb"}</dd>
            </div>
            <div>
              <dt>Cari komanda</dt>
              <dd>{detail.currentTeam?.name ?? "Yoxdur"}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{detail.verification.status}</dd>
            </div>
          </dl>
        </section>
        <section>
          <SectionHeading title="Eligibility və sanctions" />
          <p>
            {detail.eligibilityConflicts.length} açıq conflict ·{" "}
            {detail.sanctions.length} sanction
          </p>
        </section>
      </div>
      <section>
        <SectionHeading title="Membership history" />
        {detail.membershipHistory.length ? (
          <div className="history-ledger">
            {detail.membershipHistory.map((entry) => (
              <article key={entry.id}>
                <History size={18} />
                <strong>{entry.entityName}</strong>
                <span>{entry.role}</span>
                <time>
                  {formatDate(entry.joinedAt)} —{" "}
                  {entry.leftAt ? formatDate(entry.leftAt) : "davam edir"}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tarixçə yoxdur"
            body="Oyunçunun komanda üzvlüyü tarixçəsi burada görünəcək."
          />
        )}
      </section>
    </>
  );
}
