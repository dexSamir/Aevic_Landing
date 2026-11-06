import { Link } from 'react-router-dom';
import { AdminCollectionBar, filterAdminItems } from '../../components/admin/AdminPrimitives';
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
  const [search,setSearch]=useState('');
  const visible=filterAdminItems(items,search,i=>i.teamName+' '+i.tournamentName);
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
        eyebrow="İştirak nəzarəti"
        title="Buraxılmış check-in"
        description="Check-in vaxtını buraxmış komandalar və iştirak qərarları."
      />
      <AdminCollectionBar query={search} onQuery={setSearch} count={visible.length} total={items?.length??0}/>
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : visible.length ? (
        <div className="review-ledger">
          {visible.map((item) => (
            <article key={item.id}>
              <AlertTriangle size={19} />
              <div>
                <strong>{item.teamName}</strong>
                <small>
                  {item.tournamentName} · {item.consequence}
                </small>
              </div>
              <span>{item.appealAllowed ? "Etiraz mümkündür" : "Yekun qərar"}</span>
              <time>{formatDate(item.missedAt)}</time><Link to={`/admin/tournaments/${item.tournamentId}`}>Turniri aç</Link>
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
