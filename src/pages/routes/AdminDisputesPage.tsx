import {
ArrowRight,
ClipboardList
} from "lucide-react";
import { useState } from "react";
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

export function AdminDisputesPage() {
  const {data:items,error}=usePlatformQuery({key:'admin:disputes',query:()=>services.disputes.list()});
  const loadError=Boolean(error&&!items);
  const [filter, setFilter] = useState("all");

  const visible =
    items?.filter((item) => filter === "all" || item.status === filter) ?? [];
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
        title="Nəticə etirazları"
        description="Sübut, matç, son tarix və qərar qeydi ilə nəticə etirazları."
      />
      <Tabs
        active={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "Hamısı", count: items?.length ?? 0 },
          { id: "pending", label: "Gözləyir" },
          { id: "under-review", label: "Yoxla" },
          { id: "resolved", label: "Həll edilib" },
          { id: "rejected", label: "Rədd edilib" },
        ]}
      />
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : visible.length ? (
        <div className="request-ledger">
          {visible.map((item) => (
            <Link to={`/admin/disputes/${item.id}`} key={item.id}>
              <span>
                <ClipboardList size={19} />
                {item.id}
              </span>
              <div>
                <strong>
                  {item.teamName} · {item.tournamentName}
                </strong>
                <small>
                  {item.roundLabel} · {item.issueType}
                </small>
              </div>
              <StatusBadge
                status={
                  item.status === "resolved"
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
          title="Bu filtrdə etiraz yoxdur"
          body="Başqa status seçin və ya növbəni yeniləyin."
        />
      )}
    </>
  );
}
