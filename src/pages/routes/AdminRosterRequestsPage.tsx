import {
ArrowRight,
FileClock
} from "lucide-react";
import { useMemo,useState } from "react";
import { Link } from "react-router-dom";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
StatusBadge,
Tabs
} from "../../components/common/primitives";
import { services } from "../../services";
import { usePlatformQuery } from "../../services/queryCache";
import type { } from "../../types/domain";
import { productTerm } from "../../utils/productLexicon";

export function AdminRosterRequestsPage() {
  const {data:items,error}=usePlatformQuery({key:'admin:roster-requests',query:()=>services.rosterRequests.list()});
  const loadError=Boolean(error&&!items);
  const [filter, setFilter] = useState("all");

  const visible = useMemo(
    () =>
      items?.filter((item) => filter === "all" || item.status === filter) ?? [],
    [filter, items],
  );
  if (loadError)
    return (
      <EmptyState
        title="Məlumat yüklənmədi"
        body="Xidmət hazırda cavab vermir."
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
        eyebrow="Diqqət tələb edir"
        title="Heyət sorğuları"
        description="Gələn və gedən oyunçu, son tarix, səbəb və qərar bir yoxlama axınında."
      />
      <Tabs
        active={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "Hamısı", count: items?.length ?? 0 },
          { id: "pending", label: "Gözləyir" },
          { id: "under-review", label: "Yoxla" },
          { id: "approved", label: "Təsdiqlənib" },
          { id: "rejected", label: "Rədd edilib" },
        ]}
      />
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : visible.length ? (
        <div className="request-ledger">
          {visible.map((item) => (
            <Link to={`/admin/roster-requests/${item.id}`} key={item.id}>
              <span>
                <FileClock size={19} />
                {item.id}
              </span>
              <div>
                <strong>{item.teamName}</strong>
                <small>
                  {item.outgoing.ign} → {item.incoming.ign}
                </small>
              </div>
              <StatusBadge
                status={
                  item.status === "approved"
                    ? "approved"
                    : item.status === "rejected"
                      ? "rejected"
                      : "warning"
                }
              >
                {productTerm(item.status)}
              </StatusBadge>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Bu filtrdə sorğu yoxdur"
          body="Başqa status seçin və ya növbəni yeniləyin."
        />
      )}
    </>
  );
}
