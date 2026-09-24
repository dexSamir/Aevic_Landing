import { useEffect,useState,type FormEvent } from "react";
import {
Button,
Input,
Select
} from "../../components/common/primitives";
import { serviceCapabilities,services } from "../../services";
import { useAdminPlatformData } from "../../services/PlatformDataContext";
import { invalidateQuery } from "../../services/queryCache";
import "../../styles/lifecycle.css";

export function TournamentOperations({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { teams, matchSchedule } = useAdminPlatformData();
  const [entries, setEntries] =
      useState<Array<{ id: string; teamId: string; status: string }>>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = () =>
    services.tournaments.entries(tournamentId).then(setEntries);
  useEffect(() => {
    void load().catch(() => setNotice("Turnir qeydiyyatları yüklənmədi."));
  }, [tournamentId]);
  const review = async (teamId: string, status: "confirmed" | "rejected") => {
    if (busy) return;
    setBusy(true);
    try {
      await services.tournaments.reviewEntry(tournamentId, teamId, status);
      await load();
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      setNotice("Qeydiyyat yeniləndi.");
    } catch {
      setNotice("Qərar saxlanılmadı. Tutum və qeydiyyat statusunu yoxlayın.");
    } finally {
      setBusy(false);
    }
  };
  const saveRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await services.tournaments.saveRoom(
        String(data.get("match")),
        String(data.get("room")),
        String(data.get("password")),
      );
      form.reset();
      setNotice("Otaq məlumatları təhlükəsiz saxlanıldı.");
    } catch {
      setNotice("Otaq məlumatları saxlanılmadı.");
    } finally {
      setBusy(false);
    }
  };
  if (!serviceCapabilities.tournamentCreation) return null;
  return (
    <section className="operation-form">
      <h2>Turnir qeydiyyatları</h2>
      {notice && <p role="status">{notice}</p>}
      {entries?.length ? (
        entries.map((e) => (
          <div className="settings-savebar" key={e.id}>
            <span>
              {teams.find((t) => t.id === e.teamId)?.name ?? e.teamId} ·{" "}
              {e.status}
            </span>
            {e.status === "pending" && (
              <div className="decision-actions">
                <Button
                  disabled={busy}
                  onClick={() => void review(e.teamId, "confirmed")}
                >
                  Təsdiqlə
                </Button>
                <Button
                  disabled={busy}
                  variant="danger"
                  onClick={() => void review(e.teamId, "rejected")}
                >
                  Rədd et
                </Button>
              </div>
            )}
          </div>
        ))
      ) : (
        <p>Qeydiyyat yoxdur.</p>
      )}
      <form onSubmit={saveRoom}>
        <h2>Otaq məlumatları</h2>
        <Select label="Raund" name="match" required>
          <option value="">Raund seçin</option>
          {matchSchedule
            ?.filter((m) => m.tournamentId === tournamentId)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.round}. raund · {m.map}
              </option>
            ))}
        </Select>
        <div className="form-grid">
          <Input
            name="room"
            label="Otaq ID"
            maxLength={100}
            autoComplete="off"
            required
          />
          <Input
            name="password"
            label="Otaq şifrəsi"
            maxLength={200}
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" loading={busy}>
          Otaq məlumatlarını saxla
        </Button>
      </form>
    </section>
  );
}
