import { useState,type FormEvent } from "react";
import {
Button,
Input,
Select,
Textarea
} from "../../components/common/primitives";
import { services } from "../../services";
import { useAdminPlatformData } from "../../services/PlatformDataContext";
import "../../styles/lifecycle.css";

export function TournamentEditForm({ tournamentId }: { tournamentId: string }) {
  const snapshot = useAdminPlatformData();
  const tournament = snapshot.tournaments.find((t) => t.id === tournamentId);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const rounds = (snapshot.matchSchedule ?? [])
    .filter((m) => m.tournamentId === tournamentId)
    .sort((a, b) => a.round - b.round);
  const localTime = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  };
  if (!tournament) return null;
  const locked =
    Date.now() >= Date.parse(tournament.registrationDeadline) ||
    ["ongoing", "completed", "cancelled"].includes(tournament.status);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !tournament.updatedAt) return;
    setBusy(true);
    setNotice("");
    const data = new FormData(e.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    const time = (
      key:
        | "startsAt"
        | "endsAt"
        | "registrationOpensAt"
        | "registrationDeadline"
        | "checkInOpensAt"
        | "checkInClosesAt",
    ) => (locked ? tournament[key] : new Date(value(key)).toISOString());
    try {
      await services.tournaments.update(tournamentId, {
        name: value("name"),
        shortName: value("shortName"),
        description: value("description"),
        rules: value("rules")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        status: (locked
          ? tournament.status
          : value("status")) as typeof tournament.status,
        expectedUpdatedAt: tournament.updatedAt,
        maxSlots: locked ? tournament.maxSlots : Number(value("maxSlots")),
        startsAt: time("startsAt"),
        endsAt: time("endsAt"),
        registrationOpensAt: time("registrationOpensAt"),
        registrationDeadline: time("registrationDeadline"),
        checkInOpensAt: time("checkInOpensAt"),
        checkInClosesAt: time("checkInClosesAt"),
        rounds: rounds.map((m) => ({
          id: m.id,
          map: (locked ? m.map : value(`map:${m.id}`)) as
            | "Erangel"
            | "Miramar"
            | "Rondo",
          startsAt: locked
            ? m.startsAt
            : new Date(value(`time:${m.id}`)).toISOString(),
        })),
      });
      setNotice("Turnir yeniləndi.");
    } catch (error) {
      setNotice(
        error instanceof Error &&
          "code" in error &&
          error.code === "TOURNAMENT_VERSION_CONFLICT"
          ? "Turnir başqa administrator tərəfindən dəyişdirilib. Məlumatları yeniləyib yenidən cəhd edin."
          : "Dəyişiklik saxlanılmadı. İcazəni, vaxtları və cədvəlin kilid vəziyyətini yoxlayın.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="operation-form">
      <summary>Turniri redaktə et</summary>
      {notice && <p role="status">{notice}</p>}
      <form key={tournament.updatedAt} onSubmit={submit}>
        <div className="form-grid">
          <Input
            label="Turnir adı"
            name="name"
            defaultValue={tournament.name}
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            label="Qısa ad"
            name="shortName"
            defaultValue={tournament.shortName}
            minLength={2}
            maxLength={50}
            required
          />
        </div>
        <Textarea
          name="description"
          label="Təsvir"
          defaultValue={tournament.description}
          maxLength={3000}
        />
        <Select
          name="status"
          label="Nəşr statusu"
          defaultValue={tournament.status}
          disabled={locked}
        >
          <option value="draft">Qaralama</option>
          <option value="published">Dərc edilib</option>
          <option value="registration-open">Qeydiyyat açıqdır</option>
          {locked && (
            <option value={tournament.status}>{tournament.status}</option>
          )}
        </Select>
        <p>
          Qeydiyyat olduqda turniri gizlətmək mümkün deyil. Qeydiyyat
          bağlandıqdan sonra cədvəl və tutum kilidlənir.
        </p>
        <div className="form-grid">
          {(
            [
              ["startsAt", "Turnirin başlanğıcı"],
              ["endsAt", "Turnirin bitməsi"],
              ["registrationOpensAt", "Qeydiyyat açılır"],
              ["registrationDeadline", "Qeydiyyat bağlanır"],
              ["checkInOpensAt", "Check-in açılır"],
              ["checkInClosesAt", "Check-in bağlanır"],
            ] as const
          ).map(([key, label]) => (
            <Input
              key={key}
              name={key}
              label={label}
              type="datetime-local"
              defaultValue={localTime(tournament[key])}
              disabled={locked}
              required
            />
          ))}
        </div>
        <Input
          name="maxSlots"
          label="Maksimum komanda sayı"
          type="number"
          min={1}
          max={100}
          defaultValue={tournament.maxSlots}
          disabled={locked}
          required
        />
        {rounds.map((m) => (
          <div className="form-grid" key={m.id}>
            <Select
              name={`map:${m.id}`}
              label={`${m.round}. raund xəritəsi`}
              defaultValue={m.map}
              disabled={locked}
            >
              {["Erangel", "Miramar", "Rondo"].map((map) => (
                <option key={map}>{map}</option>
              ))}
            </Select>
            <Input
              name={`time:${m.id}`}
              label={`${m.round}. raund başlayır`}
              type="datetime-local"
              defaultValue={localTime(m.startsAt)}
              disabled={locked}
              required
            />
          </div>
        ))}
        <Textarea
          label="Qaydalar — hər sətirdə bir qayda"
          name="rules"
          defaultValue={tournament.rules.join("\n")}
          maxLength={10000}
        />
        <Button
          type="submit"
          loading={busy}
          disabled={!tournament.updatedAt || tournament.status === "cancelled"}
        >
          Dəyişiklikləri saxla
        </Button>
      </form>
    </details>
  );
}
