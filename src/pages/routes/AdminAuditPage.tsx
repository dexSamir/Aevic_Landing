import { AdminListSummary } from '../../components/admin/AdminPrimitives';
import {
Search,
ShieldCheck
} from "lucide-react";
import { useMemo,useState } from "react";
import {
Button,
EmptyState,
LoadingSkeleton,
PageHeader,
Select
} from "../../components/common/primitives";
import { services } from "../../services";
import { usePlatformQuery } from "../../services/queryCache";
import type { } from "../../types/domain";

export function AdminAuditPage() {
  const {data:events,error}=usePlatformQuery({key:'admin:audit',query:()=>services.operations.audit()});
  const loadError=Boolean(error&&!events);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");

  const visible = useMemo(
    () =>
      events?.filter(
        (event) =>
          (action === "all" || event.action === action) &&
          (!query ||
            `${event.action} ${event.actorName} ${event.entityType} ${event.entityId}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ) ?? [],
    [action, events, query],
  );
  const actions = [...new Set(events?.map((event) => event.action) ?? [])];
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
        eyebrow="Dəyişdirilməyən sistem tarixçəsi"
        title="Audit jurnalı"
        description="İnzibati qərarlar, dəyişikliklər və giriş tarixçəsi."
      />
      <div className="admin-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Audit axtar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Admin, obyekt və ya ID"
          />
        </div>
        <Select
          label="Əməliyyat"
          value={action}
          onChange={(event) => setAction(event.target.value)}
        >
          <option value="all">Bütün əməliyyatlar</option>
          {actions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </div>
      {events&&<AdminListSummary count={visible.length} total={events.length}/>}
      {!events ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : visible.length ? (
        <div className="audit-ledger">
          {visible.map((event) => (
            <article key={event.id}>
              <span>
                <ShieldCheck size={18} />
                {event.action}
              </span>
              <div>
                <strong>{event.actorName}</strong>
                <small>
                  {event.actorRole} · {event.entityType}:{event.entityId}
                </small>
              </div>
              <time>{new Date(event.createdAt).toLocaleString("az-AZ")}</time>
              <details className="admin-audit-metadata"><summary>Hadisə detalları</summary><code>
                {Object.entries(event.metadata)
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join(" · ")}
              </code></details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Audit hadisəsi tapılmadı"
          body="Axtarış və filtr dəyərlərini dəyişin."
        />
      )}
    </>
  );
}
