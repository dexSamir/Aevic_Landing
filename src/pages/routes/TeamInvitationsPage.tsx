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
  const [busy,setBusy]=useState(false);
  const [cursor,setCursor]=useState<string>();
  const [notice, setNotice] = useState("");
  const load = () =>
    services.teams
      .invitations()
      .then((page) => {setItems(page.items);setCursor(page.nextCursor);setLoadError(false);})
      .catch(() => setLoadError(true));
  useEffect(() => {
    void load();
  }, []);
  const respond = async (item: DurableInvitation, response: "ACCEPTED" | "REJECTED") => {
    if(busy)return;setBusy(true);
    try {
      await (item.type.startsWith("ORGANIZATION_")?services.organizations.respondToInvitation:services.teams.respondToInvitation)(
        item.id,
        response,
        crypto.randomUUID(),
      );
      await load();
      if(response==='ACCEPTED'&&!item.type.startsWith('ORGANIZATION_')){window.location.assign('/team');return;}
      setNotice(
        response === "ACCEPTED" ? "Dəvət qəbul edildi." : "Dəvət rədd edildi.",
      );
    } catch {
      setNotice(
        "Qərar saxlanılmadı. Dəvətin müddətini və bağlantını yoxlayın.",
      );
    }finally{setBusy(false);}
  };
  async function more(){if(!cursor||busy)return;setBusy(true);try{const page=await services.teams.invitations(undefined,cursor);setItems(rows=>[...(rows??[]),...page.items]);setCursor(page.nextCursor);}catch{setNotice('Dəvətlər yüklənmədi.');}finally{setBusy(false);}}
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
                  <Button disabled={busy} onClick={() => void respond(item, "ACCEPTED")}>
                    Qəbul et
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void respond(item, "REJECTED")}
                  >
                    Rədd et
                  </Button>
                </div>
              )}
            </article>
          ))}
          {cursor&&<Button disabled={busy} onClick={()=>void more()}>Daha çox</Button>}
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
