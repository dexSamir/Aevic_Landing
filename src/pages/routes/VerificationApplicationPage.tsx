import {
BadgeCheck
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
Input,
PageHeader,
Textarea,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import {
useTeamPlatformData
} from "../../services/PlatformDataContext";
import type {
VerificationRequest
} from "../../types/domain";

export function VerificationApplicationPage() {
  const [loadError, setLoadError] = useState(false);
  const { currentTeam } = useTeamPlatformData();
  const [request, setRequest] = useState<VerificationRequest>();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    services.verifications
      .forEntity("TEAM", currentTeam.id)
      .then(setRequest)
      .catch(() => setLoadError(true));
  }, [currentTeam.id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const next = await services.verifications.apply(
        {
          entityType: "TEAM",
          entityId: currentTeam.id,
          entityName: currentTeam.name,
          representativeName: String(data.get("representative")),
          officialSocials: { website: String(data.get("website")) },
          evidenceNames: [],
          notes: String(data.get("notes")),
        },
        crypto.randomUUID(),
      );
      setRequest(next);
      setNotice("Verification müraciəti göndərildi.");
    } catch {
      setNotice(
        "Müraciət saxlanılmadı. Bağlantını və daxil etdiyiniz məlumatları yoxlayın.",
      );
    } finally {
      setLoading(false);
    }
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
  return (
    <>
      <PageHeader
        eyebrow="KOMANDA KİMLİYİ"
        title="Komanda təsdiqi"
        description="Təsdiq nişanı yalnız müraciətiniz yoxlanılıb qəbul edildikdən sonra görünür."
      />
      {notice && (
        <Toast
          title="Verification statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      {request && (
        <section className="verification-status">
          <BadgeCheck size={22} />
          <div>
            <strong>{request.status}</strong>
            <p>
              {request.safeReason ??
                "Müraciət tarixçəsi server tərəfindən saxlanılır."}
            </p>
          </div>
        </section>
      )}
      {!['PENDING','APPROVED'].includes(request?.status??'')&&<form className="operation-form narrow-form" onSubmit={submit}>
        <Input name="representative" label="Səlahiyyətli nümayəndə" required />
        <Input
          name="website"
          label="Rəsmi sayt və ya sosial hesab"
          type="url"
          required
        />
        <Textarea name="notes" label="Müraciət qeydi" minLength={20} required />
        <Button type="submit" loading={loading}>
          Müraciəti göndər
        </Button>
      </form>}
    </>
  );
}
