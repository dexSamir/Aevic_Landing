import { useState } from "react";
import { Link,useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
ConfirmDialog,
EmptyState,
PageHeader,
SectionHeading,
Textarea,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import {
useAdminPlatformData
} from "../../services/PlatformDataContext";
import { invalidateQuery } from "../../services/queryCache";

export function TournamentLifecycleAdminPage() {
  const { tournamentId = "" } = useParams();
  const { tournaments } = useAdminPlatformData();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"cancel" | "archive">();
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!tournament || !action || busy) return;
    setBusy(true);
    try {
      if (action === "cancel")
        await services.tournaments.cancel(
          tournament.id,
          reason,
          crypto.randomUUID(),
        );
      else
        await services.tournaments.archive(tournament.id, crypto.randomUUID());
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      setNotice(
        action === "cancel"
          ? "Turnir ləğv edildi və iştirakçılara bildiriş göndərildi."
          : "Turnir arxivləndi.",
      );
      setAction(undefined);
    } catch {
      setNotice(
        "Əməliyyat saxlanmadı. Turnirin cari statusunu və səlahiyyətinizi yoxlayın.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!tournament)
    return (
      <EmptyState title="Turnir tapılmadı" body="Bu turnir mövcud deyil." />
    );
  const finished = ["completed", "cancelled"].includes(tournament.status);
  return (
    <>
      <Link className="text-link" to={`/admin/tournaments/${tournament.id}`}>
        ← Turnir əməliyyatlarına qayıt
      </Link>
      <PageHeader
        eyebrow="Turnir statusu"
        title={tournament.name}
        description={`Cari status: ${tournament.status}`}
      />
      {notice && <Toast title={notice} onClose={() => setNotice("")} />}
      <div className="completion-grid">
        <form
          className="operation-form"
          onSubmit={(e) => {
            e.preventDefault();
            setAction("cancel");
          }}
        >
          <SectionHeading title="Turniri ləğv et" />
          <Textarea
            label="Ləğv səbəbi"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={20}
            maxLength={1000}
            required
          />
          <Button
            type="submit"
            variant="danger"
            disabled={finished}
            loading={busy}
          >
            Ləğvi təsdiqlə
          </Button>
        </form>
        <section>
          <SectionHeading title="Arxivlə" />
          <p>
            Yalnız başa çatmış və ya ləğv edilmiş turnir arxivlənə bilər. Yarış
            tarixçəsi saxlanılır.
          </p>
          <Button
            disabled={!finished}
            loading={busy}
            onClick={() => setAction("archive")}
          >
            Arxivlə
          </Button>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(action)}
        title={
          action === "cancel"
            ? "Turniri ləğv edirsiniz?"
            : "Turniri arxivləyirsiniz?"
        }
        body={
          action === "cancel"
            ? `${tournament.name}: ${reason}`
            : `${tournament.name} arxivə keçiriləcək.`
        }
        confirmLabel={action === "cancel" ? "Turniri ləğv et" : "Arxivlə"}
        onClose={() => setAction(undefined)}
        onConfirm={apply}
      />
    </>
  );
}
