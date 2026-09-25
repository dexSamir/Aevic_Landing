import { useState,type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
Button,
Input,
PageHeader,
Select,
Textarea
} from "../../components/common/primitives";
import { serviceCapabilities,services } from "../../services";
import { invalidateQuery } from "../../services/queryCache";
import "../../styles/lifecycle.css";
import type { TournamentCreation } from "../../types/domain";

export function TournamentCreateForm() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const [rounds, setRounds] = useState<
    Array<{ map: "Erangel" | "Miramar" | "Rondo"; startsAt: string }>
  >([
    { map: "Erangel", startsAt: "" },
    { map: "Miramar", startsAt: "" },
    { map: "Rondo", startsAt: "" },
    { map: "Erangel", startsAt: "" },
  ]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    try {
      const input: TournamentCreation = {
        name: value("name"),
        shortName: value("shortName"),
        description: value("description"),
        startsAt: new Date(value("startsAt")).toISOString(),
        endsAt: new Date(value("endsAt")).toISOString(),
        registrationOpensAt: new Date(
          value("registrationOpensAt"),
        ).toISOString(),
        registrationDeadline: new Date(
          value("registrationDeadline"),
        ).toISOString(),
        checkInOpensAt: new Date(value("checkInOpensAt")).toISOString(),
        checkInClosesAt: new Date(value("checkInClosesAt")).toISOString(),
        maxSlots: Number(value("maxSlots")),
        rules: value("rules")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        rounds: rounds.map((r) => ({
          ...r,
          startsAt: new Date(r.startsAt).toISOString(),
        })),
      };
      const t = await services.tournaments.create(input, key);
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      navigate(`/admin/tournaments/${t.id}`);
    } catch {
      setError(
        "Turnir yaradılmadı. Tarix ardıcıllığını və tələb olunan sahələri yoxlayın.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Turnir konfiqurasiyası"
        title="Yeni turnir"
        description="Vaxtlar cihazınızın saat qurşağında daxil edilir. Hər raundun dəqiq başlanğıcını yoxlayın."
      />
      <form className="operation-form" onSubmit={submit}>
        {error && (
          <p role="alert" className="field__error">
            {error}
          </p>
        )}
        <div className="form-grid">
          <Input
            label="Turnir adı"
            name="name"
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            label="Qısa ad"
            name="shortName"
            minLength={2}
            maxLength={50}
            required
          />
        </div>
        <Textarea label="Təsvir" name="description" maxLength={3000} />
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
          ).map(([name, label]) => (
            <Input
              key={name}
              name={name}
              label={label}
              type="datetime-local"
              required
            />
          ))}
        </div>
        <Input
          label="Maksimum komanda sayı"
          name="maxSlots"
          type="number"
          min={1}
          max={100}
          defaultValue={20}
          required
        />
        <h2>Raund cədvəli</h2>
        {rounds.map((round, i) => (
          <div className="form-grid" key={i}>
            <Select
              label={`${i + 1}. raund xəritəsi`}
              value={round.map}
              onChange={(e) =>
                setRounds((items) =>
                  items.map((r, k) =>
                    k === i ? { ...r, map: e.target.value as typeof r.map } : r,
                  ),
                )
              }
            >
              {["Erangel", "Miramar", "Rondo"].map((map) => (
                <option key={map}>{map}</option>
              ))}
            </Select>
            <Input
              label={`${i + 1}. raund başlayır`}
              type="datetime-local"
              value={round.startsAt}
              onChange={(e) =>
                setRounds((items) =>
                  items.map((r, k) =>
                    k === i ? { ...r, startsAt: e.target.value } : r,
                  ),
                )
              }
              required
            />
          </div>
        ))}
        <p>
          Otaq məlumatı hər raunddan 10 dəqiqə əvvəl uyğun komandalara açılır.
          Yerləşmə xalları: 10, 6, 5, 4, 3, 2, 1, 1. Hər kill: 1 xal. WWCD üçün
          əlavə bonus yoxdur.
        </p>
        <Textarea
          label="Qaydalar — hər sətirdə bir qayda"
          name="rules"
          required
        />
        <Button
          type="submit"
          loading={busy}
          disabled={!serviceCapabilities.tournamentCreation}
        >
          Qaralama turnir yarat
        </Button>
      </form>
    </>
  );
}
