import {
Laptop,
LogOut
} from "lucide-react";
import { useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
ConfirmDialog,
EmptyState,
LoadingSkeleton,
PageHeader,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
AccountSession
} from "../../types/domain";

export function AccountSessionsPage() {
  const [sessions, setSessions] = useState<AccountSession[]>();
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const load = () =>
    services.account
      .sessions()
      .then(setSessions)
      .catch(() => {
        setNotice("Sessiyalar yüklənmədi.");
        setSessions([]);
      });
  useEffect(() => {
    void load();
  }, []);
  const revoke = async (id: string) => {
    try {
      await services.account.revokeSession(id);
      await load();
      setNotice("Sessiya ləğv edildi.");
    } catch {
      setNotice("Sessiya ləğv edilmədi.");
    }
  };
  const revokeOthers = async () => {
    await services.account.revokeOtherSessions();
    await load();
    setConfirmOpen(false);
    setNotice("Digər sessiyalar ləğv edildi.");
  };
  return (
    <>
      <PageHeader
        eyebrow="Cihazlar və sessiyalar"
        title="Aktiv sessiyalar"
        description="Hesabınıza daxil olan cihazları yoxlayın və tanımadığınız sessiyanı bağlayın."
        actions={
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Digər hamısından çıx
          </Button>
        }
      />
      {notice && <Toast title={notice} onClose={() => setNotice("")} />}
      {!sessions ? (
        <LoadingSkeleton variant="list" rows={5} />
      ) : !sessions.length ? (
        <EmptyState
          title="Sessiya siyahısı əlçatan deyil"
          body="Digər cihazlardan çıxış əməliyyatından istifadə edə bilərsiniz."
        />
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <article key={session.id}>
              <Laptop size={22} />
              <div>
                <strong>{session.device}</strong>
                <span>
                  {session.browser} · {session.location ?? "Məkan yoxdur"}
                </span>
                <small>
                  Son aktivlik:{" "}
                  {new Date(session.lastActiveAt).toLocaleString("az-AZ")}
                </small>
              </div>
              <b>{session.status === "current" ? "Cari sessiya" : "Aktiv"}</b>
              <Button
                variant="ghost"
                disabled={session.status === "current"}
                onClick={() => void revoke(session.id)}
                icon={<LogOut size={16} />}
              >
                Çıxış et
              </Button>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Digər sessiyaları bağla"
        body="Cari cihaz istisna olmaqla bütün sessiyalar ləğv ediləcək."
        confirmLabel="Hamısından çıx"
        onClose={() => setConfirmOpen(false)}
        onConfirm={revokeOthers}
      />
    </>
  );
}
