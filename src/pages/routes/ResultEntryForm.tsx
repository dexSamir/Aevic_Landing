import { RoundScreenshotDraft } from '../../components/admin/RoundScreenshotDraft';
import { ScreenshotResultDraft } from '../../components/admin/ScreenshotResultDraft';
import { scoreMatch } from '../../utils/scoring';
import { ApiError } from '../../services/apiError';
import { useEffect,useState,type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
Button,
ConfirmDialog,
StatusBadge,
Input,
PageHeader,
Select
} from "../../components/common/primitives";
import { serviceCapabilities,services } from "../../services";
import { useAdminPlatformData } from "../../services/PlatformDataContext";
import { invalidateQuery } from "../../services/queryCache";
import "../../styles/lifecycle.css";
import type { RoundResult } from "../../types/domain";

export function ResultEntryForm() {
  const snapshot = useAdminPlatformData();
  const [params]=useSearchParams();
  const [tour, setTour] = useState(params.get('tournament')??""),
    [round, setRound] = useState(params.get('round')??""),
    [team, setTeam] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [roundReview, setRoundReview] = useState(false);
  const [confirmPublish,setConfirmPublish]=useState(false);
  const [score,setScore]=useState({placement:1,kills:0,penalties:0});
  const formula=snapshot.tournaments.find(t=>t.id===tour)?.pointFormula;
  const preview=formula?scoreMatch(formula,score.placement,score.kills,score.penalties):undefined;
  const published=Boolean(snapshot.publishedRoundIds?.[tour]?.includes(round));
  const [saved, setSaved] = useState<RoundResult[]>([]);
  const [loadedRound, setLoadedRound] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setSaved([]);
    setLoadedRound("");
    if (round)
      void services.results
        .roundEntries(round)
        .then((rows) => {
          if (active) {
            setSaved(rows);
            setLoadedRound(round);
          }
        })
        .catch(() => {
          if (active) setNotice("Saxlanmış nəticələr yüklənmədi.");
        });
    return () => {
      active = false;
    };
  }, [round, revision]);
  const [entries, setEntries] = useState<
    Array<{ teamId: string; status: string }>
  >([]);
  const rounds = (snapshot.matchSchedule ?? []).filter(
    (m) => m.tournamentId === tour,
  );
  useEffect(() => {
    let active = true;
    setEntries([]);
    if (tour)
      void services.tournaments
        .entries(tour)
        .then((items) => {
          if (active) setEntries(items);
        })
        .catch(() => {
          if (active) setNotice("Qeydiyyatlar yüklənmədi.");
        });
    return () => {
      active = false;
    };
  }, [tour]);
  const selectTeam = (teamId: string) => {
    const existing = saved.find(row => row.teamId === teamId);
    setTeam(teamId);
    setScore({
      placement: existing?.placement ?? 1,
      kills: existing?.finishes ?? 0,
      penalties: existing?.penalties ?? 0,
    });
  };
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || published || !tour || !team || !round || loadedRound !== round) return;
    setBusy(true);
    setNotice("");
    const form = new FormData(e.currentTarget);
    try {
      await services.results.saveRound({
        id: crypto.randomUUID(),
        tournamentId: tour,
        roundId: round,
        teamId: team,
        placement: Number(form.get("placement")),
        finishes: Number(form.get("kills")),
        penalties: Number(form.get("penalties")),
        placementPoints: 0,
        finishPoints: 0,
        totalPoints: 0,
        published: false,
      });
      setRevision((v) => v + 1);
      setNotice(
        "Komanda nəticəsi saxlanıldı. Bütün komandalar tamamlandıqdan sonra raundu dərc edin.",
      );
    } catch (error) {
      setNotice(
        error instanceof ApiError ? error.message : "Nəticə saxlanılmadı. Təkrar komanda, yerləşmə və ya səlahiyyəti yoxlayın.",
      );
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (busy || !round || loadedRound !== round || !saved.length) return;
    setBusy(true);
    try {
      await services.tournaments.publishMatch(round);
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      setRevision((v) => v + 1);
      setNotice("Raundun bütün nəticələri dərc edildi.");
    } catch (error) {
      setNotice(
        error instanceof ApiError ? error.message : "Dərc tamamlanmadı. Hər təsdiqlənmiş komandanın nəticəsi tələb olunur.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Rəsmi nəticələr"
        title="Nəticə girişi"
        description="Turniri və raundu seçin, komanda nəticələrini daxil edin və rəsmi dərcə hazırlayın."
      />
      {notice && <p role="status">{notice}</p>}
      <div className="operation-form admin-result-form"><section className="admin-result-context">
        <Select
          form="result-entry" label="Turnir" disabled={busy || roundReview}
          value={tour}
          onChange={(e) => {
            setTour(e.target.value);
            setRound("");
            setTeam("");
            setScore({ placement: 1, kills: 0, penalties: 0 });
          }}
          required
        >
          <option value="">Turnir seçin</option>
          {snapshot.tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          form="result-entry" label="Raund" disabled={busy || roundReview}
          value={round}
          onChange={(e) => { setRound(e.target.value); setTeam(""); setScore({ placement: 1, kills: 0, penalties: 0 }); }}
          required
        >
          <option value="">Raund seçin</option>
          {rounds.map((m) => (
            <option key={m.id} value={m.id}>
              {m.round}. raund · {m.map}
            </option>
          ))}
        </Select>
        {!roundReview && <Select
          form="result-entry" label="Komanda"
          disabled={busy || !round || loadedRound !== round}
          value={team}
          onChange={e => selectTeam(e.target.value)}
          required
        >
          <option value="">Komanda seçin</option>
          {entries
            .filter((e) => e.status === "confirmed")
            .map((e) => (
              <option key={e.teamId} value={e.teamId}>
                {snapshot.teams.find((t) => t.id === e.teamId)?.name ??
                  e.teamId}
              </option>
            ))}
        </Select>}
        </section>
        {roundReview ? <RoundScreenshotDraft key={round} saved={saved} busy={busy}
          participants={entries.filter(e => e.status === 'confirmed').map(e => {
            const t = snapshot.teams.find(item => item.id === e.teamId);
            return { id: e.teamId, name: t?.name ?? e.teamId, tag: t?.tag };
          })}
          onCancel={() => setRoundReview(false)}
          onSave={async (rows, expected) => {
            if (busy || published) return;
            setBusy(true);
            try {
              await services.results.saveRoundDraft(round, tour, rows, expected);
              setRoundReview(false); setTeam(""); setRevision(v => v + 1);
              setNotice('Yoxlanmış raund qaralaması saxlanıldı. Rəsmi dərc ayrıca təsdiq tələb edir.');
            } catch (error) {
              if (error instanceof ApiError && error.code === 'STALE_VERSION') {
                setRevision(v => v + 1);
                setNotice('Saxlanmış nəticələr dəyişib. Son dəyərləri görmək üçün qaralamanı bağlayıb yenidən açın.');
              } else setNotice(error instanceof ApiError ? error.message : 'Qaralama saxlanılmadı. Yenidən cəhd edin.');
            } finally { setBusy(false); }
          }} /> : <>
        {round && !published && serviceCapabilities.resultPublishing && <Button variant="secondary"
          disabled={busy || loadedRound !== round || !entries.some(e => e.status === 'confirmed')}
          onClick={() => { setNotice(''); setRoundReview(true); }}>Raund cədvəlini şəkillərdən hazırla</Button>}
        {round && team && !published && serviceCapabilities.resultPublishing && <ScreenshotResultDraft
          key={JSON.stringify([tour, round, team])}
          teamName={snapshot.teams.find(item => item.id === team)?.name ?? team}
          disabled={busy}
          onVerify={fields => setScore(previous => ({ ...previous, ...fields }))}
        />}
        <form id="result-entry" onSubmit={save}><section className="admin-field-group"><h2>Komanda nəticəsi</h2><div className="form-grid">
          <Input
            label="Yerləşmə"
            name="placement"
            value={score.placement} onChange={e=>setScore(v=>({...v,placement:Number(e.target.value)}))}
            type="number"
            min={1}
            max={100}
            required
          />
          <Input
            label="Kill sayı"
            name="kills"
            value={score.kills} onChange={e=>setScore(v=>({...v,kills:Number(e.target.value)}))}
            type="number"
            min={0}
            max={400}
            required
          />
          <Input
            label="Cərimə xalı"
            name="penalties"
            value={score.penalties} onChange={e=>setScore(v=>({...v,penalties:Number(e.target.value)}))}
            type="number"
            min={0}
            max={1000}
            required
          />
        </div>
        {preview&&<div className="admin-score-preview"><span>Yerləşmə <b>{preview.placementPoints}</b></span><span>Eliminasiya <b>{preview.finishPoints}</b></span><span>Cərimə <b>−{score.penalties}</b></span><strong>Cəmi {preview.totalPoints} xal</strong></div>}
        {published&&<p className="admin-notice">Bu raund dərc edilib. Dəyişiklik üçün saxlanmış nəticədən düzəliş səhifəsini açın.</p>}
        </section><div className="admin-result-actions"><Button
          type="submit"
          loading={busy}
          disabled={!serviceCapabilities.resultPublishing || published || !round || loadedRound !== round || !team}
        >
          Komanda nəticəsini saxla
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !round || loadedRound !== round || !saved.length || published || !serviceCapabilities.resultPublishing}
          onClick={() => setConfirmPublish(true)}
        >
          Bütün raund nəticələrini dərc et
        </Button>
        </div></form></>}</div><ConfirmDialog open={confirmPublish} title="Raund nəticələrini dərc et?" body={`${saved.length} saxlanmış nəticənin yoxlanıldığını təsdiq edirsiniz? Dərcdən sonra dəyişikliklər yalnız əsaslandırılmış düzəlişlə edilir.`} confirmLabel="Nəticələri dərc et" onClose={()=>{if(!busy)setConfirmPublish(false);}} onConfirm={async()=>{await publish();setConfirmPublish(false);}}/>
      {!roundReview && saved.length > 0 && (
        <section className="operation-form">
          <h2>Saxlanmış nəticələr</h2>
          {saved.map((r) => (
            <div className="admin-result-row" key={r.id}>
              <strong>
                {snapshot.teams.find((t) => t.id === r.teamId)?.name ??
                  r.teamId}
              </strong>{" "}
              · #{r.placement} · {r.finishes} kill · {r.totalPoints} xal ·{" "}
              <StatusBadge status={r.published?'completed':'draft'}>{r.published ? "Dərc edilib" : "Qaralama"}</StatusBadge>{" "}
              {r.published
                ? <Link to={`/admin/results/${r.id}/correct`}>Düzəliş et</Link>
                : <a href="#result-entry" onClick={() => selectTeam(r.teamId)}>Qaralamanı redaktə et</a>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
