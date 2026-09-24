import {
History
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
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
ResultVersion
} from "../../types/domain";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminResultCorrectionPage() {
  const { resultId = "" } = useParams();
  const [versions, setVersions] = useState<ResultVersion[]>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    services.results
      .versions(resultId)
      .then((v) => {
        if (active) setVersions(v);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [resultId]);
  const latest = versions?.reduce<ResultVersion | undefined>(
    (last, v) => (!last || v.version > last.version ? v : last),
    undefined,
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!latest || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const next = await services.results.correct(
        resultId,
        {
          ...latest.dataSnapshot,
          placement: Number(data.get("placement")),
          finishes: Number(data.get("finishes")),
          penalties: Number(data.get("penalties")),
        },
        String(data.get("reason")),
        latest.version,
        crypto.randomUUID(),
      );
      setVersions((current) => [...(current ?? []), next]);
      invalidateQuery("snapshot:");
      setNotice("Düzəliş saxlanıldı. Rəsmi xallar yenidən hesablandı.");
    } catch {
      setNotice(
        "Düzəliş saxlanmadı. Nəticə dəyişmiş ola bilər; son versiyanı yenidən yükləyin.",
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
      ) : !versions ? (
        <LoadingSkeleton variant="form" rows={5} />
      ) : !latest ? (
        <EmptyState
          title="Nəticə tapılmadı"
          body="Düzəliş üçün saxlanmış nəticə tələb olunur."
        />
      ) : (
        <>
          <div className="history-ledger">
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
            key={latest.version}
            className="operation-form narrow-form"
            onSubmit={submit}
          >
            <Input
              name="placement"
              type="number"
              label="Yerləşmə"
              min={1}
              max={100}
              defaultValue={latest.dataSnapshot.placement}
              required
            />
            <Input
              name="finishes"
              type="number"
              label="Kill"
              min={0}
              max={400}
              defaultValue={latest.dataSnapshot.finishes}
              required
            />
            <Input
              name="penalties"
              type="number"
              label="Cərimə xalı"
              min={0}
              max={1000}
              defaultValue={latest.dataSnapshot.penalties}
              required
            />
            <Textarea
              name="reason"
              label="Düzəliş səbəbi"
              minLength={20}
              maxLength={3000}
              required
            />
            <Button type="submit" loading={busy}>
              Yeni versiyanı saxla
            </Button>
          </form>
        </>
      )}
    </>
  );
}
