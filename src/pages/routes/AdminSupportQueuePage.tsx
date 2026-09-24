import {
ArrowRight
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
SupportTicket
} from "../../types/domain";
import { formatDate } from './AdminCompletionPagesShared';
export function AdminSupportQueuePage() {
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<SupportTicket[]>();
  const [filter, setFilter] = useState<SupportTicket["status"] | "">("");
  useEffect(() => {
    let active = true;
    setLoadError(false);
    setItems(undefined);
    services.support
      .adminPage(undefined, filter || undefined)
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
        eyebrow="Support operations"
        title="Dəstək sorğuları"
        description="Dəstək sorğularına cavab verin və gedişatını izləyin."
      />
      <div className="admin-toolbar">
        <Select
          label="Status"
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
        >
          <option value="">Hamısı</option>
          <option value="open">Open</option>
          <option value="waiting-for-user">Waiting for user</option>
          <option value="under-review">Under review</option>
          <option value="resolved">Həll edilib</option>
          <option value="closed">Closed</option>
        </Select>
      </div>
      {!items ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : items.length ? (
        <div className="request-ledger">
          {items.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/account/support/tickets/${ticket.id}?view=admin`}
            >
              <span>{ticket.id}</span>
              <div>
                <strong>{ticket.subject}</strong>
                <small>
                  {ticket.category} · {formatDate(ticket.updatedAt)}
                </small>
              </div>
              <b>{ticket.status}</b>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Ticket yoxdur"
          body="Bu filtrdə support ticket tapılmadı."
        />
      )}
    </>
  );
}
