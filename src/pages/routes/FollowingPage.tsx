import {
ShieldCheck
} from "lucide-react";
import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import '../../styles/public-discovery.css';
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader
} from "../../components/common/primitives";
import { services } from "../../services";

export function FollowingPage() {
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] =
    useState<
      Awaited<ReturnType<NonNullable<typeof services.follows>["list"]>>
    >();
  useEffect(() => {
    if (services.follows)
      services.follows
        .list()
        .then(setItems)
        .catch(() => setLoadError(true));
    else setItems([]);
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
    <section className="page-section completion-page">
      <div className="container">
        <PageHeader
          eyebrow="Yarış yenilikləri"
          title="İzlədiklərim"
          description="Yalnız yarış baxımından əhəmiyyətli komanda və oyunçu yenilikləri burada görünür."
        />
        {!items ? (
          <LoadingSkeleton variant="cards" rows={4} />
        ) : items.length ? (
          <div className="entity-ledger">
            {items.map((item) => (
              <article key={`${item.entityType}-${item.entityId}`}>
                <ShieldCheck size={18} />
                <span>
                  <strong>{item.entityType}</strong>
                  <small>{item.entityId}</small>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="İzlənən profil yoxdur"
            body="İzləməyə başladığınız komandalar burada görünəcək."
            action={
              <Link className="button button--secondary" to="/teams">
                <span>Komandaları kəşf et</span>
              </Link>
            }
          />
        )}
      </div>
    </section>
  );
}
