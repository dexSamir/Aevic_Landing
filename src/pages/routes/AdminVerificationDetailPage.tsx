import { useEffect,useState } from "react";
import { Link,useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
SectionHeading,
Textarea,
Toast
} from "../../components/common/primitives";
import { SocialLinks } from "../../components/social/SocialLinks";
import { services } from "../../services";
import type {
VerificationRequest
} from "../../types/domain";

export function AdminVerificationDetailPage() {
  const [loadError, setLoadError] = useState(false);
  const { verificationId = "" } = useParams();
  const [item, setItem] = useState<VerificationRequest>();
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [saving,setSaving]=useState(false);
  useEffect(() => {
    services.verifications
      .get(verificationId)
      .then(setItem)
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true));
  }, [verificationId]);
  const review = async (status: "APPROVED" | "REJECTED" | "REVOKED") => {
    if(saving)return;
    if (!item || reason.trim().length < 10) {
      setNotice("Qərar üçün ən az 10 simvolluq faktiki səbəb yazın.");
      return;
    }
    setSaving(true);
    try {
      setItem(
        await services.verifications.review(
          item.id,
          status,
          reason,
          item.status,
        ),
      );
      setNotice("Verification qərarı saxlanıldı və audit üçün göndərildi.");
    } catch {
      setNotice(
        "Qərar saxlanılmadı. Müraciət dəyişmiş ola bilər; səhifəni yeniləyib yenidən yoxlayın.",
      );
    } finally {setSaving(false);}
  };
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
  if (!loaded) return <LoadingSkeleton variant="form" rows={6} />;
  if (!item)
    return (
      <>
        <Link className="text-link" to="/admin/verifications">
          ← Verification növbəsinə qayıt
        </Link>
        <PageHeader
          eyebrow="Verification review"
          title="Verification tapılmadı"
          description="Bu müraciət mövcud deyil və ya onu görmək üçün icazəniz yoxdur."
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow={item.id}
        title={item.entityName}
        description={`${item.entityType} verification review`}
      />
      {notice && (
        <Toast
          title="Review statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <div className="completion-grid">
        <section>
          <SectionHeading title="Müraciət" />
          <dl className="detail-ledger">
            <div>
              <dt>Nümayəndə</dt>
              <dd>{item.representativeName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{item.status}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{item.evidenceNames.length} private file</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{item.notes ?? "—"}</dd>
            </div>
          </dl>
          <SocialLinks links={item.officialSocials} ownerName={item.entityName}/>
        </section>
        <form className="operation-form">
          <SectionHeading title="Qərar" />
          <Textarea
            label="Qərar səbəbi"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            required
          />
          <div className="decision-actions">
            <Button disabled={item.status!=="PENDING"||saving} loading={saving} onClick={() => void review("APPROVED")}>Təsdiqlə</Button>
            <Button disabled={item.status!=="PENDING"||saving} variant="danger" onClick={() => void review("REJECTED")}>
              Rədd et
            </Button>
            {item.status === "APPROVED" && (
              <Button disabled={saving} variant="danger" onClick={() => void review("REVOKED")}>
                Təsdiqi ləğv et
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
