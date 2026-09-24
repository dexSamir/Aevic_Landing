import {
Users
} from "lucide-react";
import { useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
DurableInvitation
} from "../../types/domain";
import { formatDate } from './TeamCompletionPagesShared';
export function TeamInvitationsPage() {
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<DurableInvitation[]>();
  const [notice, setNotice] = useState("");
  const load = () =>
    services.teams
      .invitations()
      .then((page) => setItems(page.items))
      .catch(() => setLoadError(true));
  useEffect(() => {
    void load();
  }, []);
  const respond = async (id: string, response: "ACCEPTED" | "REJECTED") => {
    try {
      await services.teams.respondToInvitation(
        id,
        response,
        crypto.randomUUID(),
      );
      await load();
      setNotice(
        response === "ACCEPTED" ? "Dəvət qəbul edildi." : "Dəvət rədd edildi.",
      );
    } catch {
      setNotice(
        "Qərar saxlanılmadı. Dəvətin müddətini və bağlantını yoxlayın.",
      );
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
        eyebrow="// KOMANDA DƏVƏTLƏRİ"
        title="Komanda dəvətləri"
        description="Komanda və təşkilat dəvətləri, veriləcək rol və cavab müddəti."
      />
      {notice && (
        <Toast
          title="Dəvət statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      {!items ? (
        <LoadingSkeleton variant="list" rows={5} />
      ) : items.length ? (
        <div className="invitation-ledger">
          {items.map((item) => (
            <article key={item.id}>
              <Users size={19} />
              <div>
                <strong>{item.entityName}</strong>
                <small>
                  {item.role} ·{" "}
                  {item.tournamentImplications ?? "Turnir təsiri yoxdur"} ·{" "}
                  {formatDate(item.expiresAt)}
                </small>
              </div>
              <span>{item.status}</span>
              {item.status === "PENDING" && (
                <div>
                  <Button onClick={() => void respond(item.id, "ACCEPTED")}>
                    Qəbul et
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void respond(item.id, "REJECTED")}
                  >
                    Rədd et
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aktiv dəvət yoxdur"
          body="Sizə göndərilən komanda və təşkilat dəvətləri burada görünəcək."
        />
      )}
    </>
  );
}
