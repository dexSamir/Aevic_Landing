import {
History
} from "lucide-react";
import { type FormEvent,useEffect,useRef,useState } from "react";
import { Link,useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
Input,
LoadingSkeleton,
PageHeader,
Textarea,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";
import { invalidateQuery } from "../../services/queryCache";
import type {
CurrentResult, ResultVersion
} from "../../types/domain";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminResultCorrectionPage() {
  const { resultId = "" } = useParams();
  const [versions, setVersions] = useState<ResultVersion[]>();
  const [current, setCurrent] = useState<CurrentResult>();
  const attempt = useRef<{payload: string; key: string} | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    setCurrent(undefined);
    setVersions(undefined);
    setLoadError(false);
    attempt.current = undefined;
    Promise.all([services.results.current(resultId), services.results.versions(resultId)])
      .then(([result, history]) => {
        if (active) { setCurrent(result); setVersions(history); }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [resultId]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const { version, ...result } = current;
      const edited = { ...result, placement: Number(data.get("placement")), finishes: Number(data.get("finishes")), penalties: Number(data.get("penalties")) };
      const reason = String(data.get("reason"));
      const payload = JSON.stringify({resultId, edited, reason, version});
      // Keep the same key when retrying an uncertain response for the same edit.
      if (attempt.current?.payload !== payload) attempt.current = {payload, key: crypto.randomUUID()};
      const next = await services.results.correct(resultId, edited, reason, version, attempt.current.key);
      setCurrent(next);
      attempt.current = undefined;
      services.results.versions(resultId).then(setVersions).catch(() => setNotice("Düzəliş saxlanıldı. Tarixçəni görmək üçün səhifəni yeniləyin."));
      invalidateQuery("snapshot:");
      setNotice("Düzəliş saxlanıldı. Rəsmi xallar yenidən hesablandı.");
    } catch {
      setNotice(
        "Düzəliş təsdiqlənmədi. Bağlantını yoxlayın və ya son versiyanı yenidən yükləyin.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link className="text-link" to="/admin/results">
        ← Nəticələrə qayıt
      </Link>
      <PageHeader
        eyebrow="Nəticə tarixçəsi"
        title="Nəticəni düzəlt"
        description="Hər düzəliş ayrıca versiya kimi saxlanılır. Rəsmi xallar serverdə hesablanır."
      />
      {notice && <Toast title={notice} onClose={() => setNotice("")} />}
      {loadError ? (
        <EmptyState
          title="Nəticə yüklənmədi"
          body="Səhifəni yeniləyib cəhd edin."
        />
      ) : !versions || !current ? (
        <LoadingSkeleton variant="form" rows={5} />
      ) : (
        <>
          <p role="status">Cari versiya: {current.version}</p>
          {versions.length === 0 && <p>Bu nəticəyə hələ düzəliş edilməyib.</p>}
          <div className="admin-correction-layout"><div className="history-ledger">
            {versions.map((v) => (
              <article key={v.id}>
                <History size={18} />
                <strong>Versiya {v.version}</strong>
                <span>{v.reason}</span>
                <time>{formatDate(v.createdAt)}</time>
              </article>
            ))}
          </div>
          <form
            key={current.version}
            className="operation-form narrow-form"
            onSubmit={submit}
          >
            <Input
              name="placement"
              type="number"
              label="Yerləşmə"
              min={1}
              max={100}
              defaultValue={current.placement}
              required
            />
            <Input
              name="finishes"
              type="number"
              label="Kill"
              min={0}
              max={400}
              defaultValue={current.finishes}
              required
            />
            <Input
              name="penalties"
              type="number"
              label="Cərimə xalı"
              min={0}
              max={1000}
              defaultValue={current.penalties}
              required
            />
            <Textarea
              name="reason"
              label="Düzəliş səbəbi"
              minLength={10}
              maxLength={2000}
              required
            />
            <Button type="submit" loading={busy}>
              Yeni versiyanı saxla
            </Button>
          </form></div>
        </>
      )}
    </>
  );
}
