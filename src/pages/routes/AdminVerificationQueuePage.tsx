import {
ArrowRight,
BadgeCheck
} from "lucide-react";
import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
Select
} from "../../components/common/primitives";
import { services } from "../../services";
import type {
VerificationRequest,
VerificationStatus
} from "../../types/domain";

export function AdminVerificationQueuePage() {
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<VerificationStatus>("PENDING");
  const [items, setItems] = useState<VerificationRequest[]>();
  useEffect(() => {
    let active = true;
    setLoadError(false);
    setItems(undefined);
    services.verifications
      .page(filter)
      .then((page) => {
        if (active) setItems(page.items);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [filter]);
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
        eyebrow="Trust operations"
        title="Təsdiq sorğuları"
        description="Müraciətləri yoxlayın və hər qərarın səbəbini qeyd edin. Təqdim edilən sübutlar məxfidir."
      />
      <div className="admin-toolbar">
        <Select
          label="Status"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as VerificationStatus)
          }
        >
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
          <option>REVOKED</option>
        </Select>
      </div>
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : items.length ? (
        <div className="review-ledger">
          {items.map((item) => (
            <article key={item.id}>
              <BadgeCheck size={20} />
              <div>
                <strong>{item.entityName}</strong>
                <small>
                  {item.entityType} · {item.representativeName}
                </small>
              </div>
              <span>{item.status}</span>
              <Link to={`/admin/verifications/${item.id}`}>
                Yoxla <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Bu statusda müraciət yoxdur"
          body="Seçilmiş statusda müraciət daxil olduqda burada görünəcək."
        />
      )}
    </>
  );
}
