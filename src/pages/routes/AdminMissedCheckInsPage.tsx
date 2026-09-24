import {
AlertTriangle
} from "lucide-react";
import { useEffect,useState } from "react";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader
} from "../../components/common/primitives";
import { services } from "../../services";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminMissedCheckInsPage() {
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] =
    useState<
      Awaited<ReturnType<typeof services.tournaments.missedCheckIns>>["items"]
    >();
  useEffect(() => {
    services.tournaments
      .missedCheckIns()
      .then((page) => setItems(page.items))
      .catch(() => setLoadError(true));
  }, []);
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
        eyebrow="Check-in exceptions"
        title="Missed check-ins"
        description="Komanda, nəticə, appeal imkanı və deadline durable state kimi saxlanır; button-un yox olması status hesab edilmir."
      />
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : items.length ? (
        <div className="review-ledger">
          {items.map((item) => (
            <article key={item.id}>
              <AlertTriangle size={19} />
              <div>
                <strong>{item.teamName}</strong>
                <small>
                  {item.tournamentName} · {item.consequence}
                </small>
              </div>
              <span>{item.appealAllowed ? "APPEAL" : "FINAL"}</span>
              <time>{formatDate(item.missedAt)}</time>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Missed check-in yoxdur"
          body="Backend missed-check-in events təqdim etdikdə burada paginated görünəcək."
        />
      )}
    </>
  );
}
