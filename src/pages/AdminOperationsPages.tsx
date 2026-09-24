import {
  ArrowRight,
  ClipboardList,
  FileClock,
  KeyRound,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  EmptyState,
  Input,
  LoadingSkeleton,
  PageHeader,
  SectionHeading,
  Select,
  StatusBadge,
  Tabs,
  TeamLogo,
} from "../components/common/primitives";
import { selectAdminOperationalTournament } from "../utils/competitionSelectors";
import { competitionNow, services } from "../services";
import { useAdminPlatformData } from "../services/PlatformDataContext";
import { invalidateQuery, usePlatformQuery } from "../services/queryCache";
import { productTerm } from "../utils/productLexicon";
import type {
} from "../types/domain";

export function AdminTeamDetailPage() {
  const { teamId = "" } = useParams();
  const { teams, tournaments, slots } = useAdminPlatformData();
  const team = teams.find((item) => item.id === teamId);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  if (!team)
    return (
      <EmptyState
        title="Komanda tapılmadı"
        body="Bu komanda yoxlama siyahısında yoxdur."
      />
    );
  const decide = async (status: "approved" | "rejected") => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setNotice("");
    try {
      await services.teams.setApproval(
        team.id,
        status,
        status === "rejected" ? "Heyət sübutları tamamlanmayıb." : undefined,
      );
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      invalidateQuery("snapshot:team");
    } catch {
      setNotice(
        "Qərar təsdiqlənmədi. Yenidən göndərməzdən əvvəl komandanın vəziyyətini yoxlayın.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Komanda yoxlaması"
        title={team.name}
        description="Kimlik, kapitan, heyət, status və əməliyyat tarixçəsi."
        actions={<StatusBadge status={team.approvalStatus} />}
      />
      {notice && (
        <p className="inline-status" role="status">
          {notice}
        </p>
      )}
      <div className="admin-entity-detail">
        <section>
          <header>
            <TeamLogo name={team.name} src={team.logoUrl} size="lg" />
            <div>
              <span>
                {team.tag ?? "TEAM"} · {team.country ?? "Ölkə yoxdur"}
              </span>
              <h2>{team.name}</h2>
              <small>
                {productTerm(team.verificationLevel ?? "registered")} ·{" "}
                {productTerm(team.organizationRelationship ?? "independent")}
              </small>
            </div>
          </header>
          <SectionHeading title="Heyət" />
          <div className="compact-roster">
            {team.roster.map((member) => (
              <Link
                key={member.id}
                to={`/admin/players/${member.id}`}
                aria-label={`${member.ign} oyunçu detalını aç`}
              >
                <TeamLogo name={member.ign} size="sm" />
                <span>
                  <strong>{member.ign}</strong>
                  <small>{productTerm(member.role)}</small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>
        <aside>
          <SectionHeading title="Yoxlama məlumatları" />
          <dl className="detail-ledger">
            <div>
              <dt>Kapitan</dt>
              <dd>
                {team.captain.firstName} {team.captain.lastName}
              </dd>
            </div>
            <div>
              <dt>E-poçt</dt>
              <dd>{team.captain.email}</dd>
            </div>
            <div>
              <dt>Qeydiyyat</dt>
              <dd>{new Date(team.registeredAt).toLocaleString("az-AZ")}</dd>
            </div>
            <div>
              <dt>Aktiv turnir</dt>
              <dd>
                {selectAdminOperationalTournament(
                  tournaments.filter((item) =>
                    slots.some(
                      (slot) =>
                        slot.tournamentId === item.id &&
                        slot.teamId === team.id,
                    ),
                  ),
                  competitionNow(),
                )?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Rədd səbəbi</dt>
              <dd>{team.rejectionReason ?? "—"}</dd>
            </div>
          </dl>
          <div className="decision-actions">
            <Button
              loading={pending}
              disabled={pending}
              onClick={() => void decide("approved")}
            >
              Təsdiqlə
            </Button>
            <Button
              disabled={pending}
              variant="danger"
              onClick={() => void decide("rejected")}
            >
              Düzəlişə qaytar
            </Button>
          </div>
          <small>
            Canlı sistemdə server icazəsi və dəyişdirilməyən audit qeydi
            məcburidir.
          </small>
        </aside>
      </div>
    </>
  );
}

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
            `${event.actorName} ${event.entityType} ${event.entityId}`
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
        description="Qərar, rol və həssas məlumat girişləri dəyişdirilə bilməyən hadisə kimi saxlanmalıdır."
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
          <option value="all">Bütün action-lar</option>
          {actions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </div>
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
              <code>
                {Object.entries(event.metadata)
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join(" · ")}
              </code>
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

export function AdminUsersPage() {
  const {data:users,error}=usePlatformQuery({key:'admin:users',query:()=>services.operations.adminUsers()});
  const loadError=Boolean(error&&!users);

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
        eyebrow="Rollar və icazələr"
        title="Admin istifadəçiləri"
        description="Rolun interfeysdə göstərilməsi icazə vermir; bütün icazələri server yoxlamalıdır."
        actions={<Button disabled>Admin dəvət et</Button>}
      />
      {!users ? (
        <LoadingSkeleton variant="table" rows={5} />
      ) : (
        <div className="admin-user-list">
          {users.map((user) => (
            <article key={user.id}>
              <span>
                <UserCog size={21} />
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <StatusBadge
                status={user.status === "active" ? "approved" : "pending"}
              >
                {productTerm(user.status)}
              </StatusBadge>
              <div>
                <b>{user.role}</b>
                <small>
                  {user.twoFactorEnabled ? "2FA aktivdir" : "2FA tələb olunur"}
                </small>
              </div>
              <Button variant="ghost" disabled>
                <KeyRound size={17} />
                İcazələr
              </Button>
            </article>
          ))}
        </div>
      )}
      <section className="rbac-note">
        <Users size={21} />
        <div>
          <strong>Rol cədvəli server icazələrini müəyyən edir</strong>
          <p>
            Super Admin, Tournament Manager, Result Operator və Support
            Moderator rollarının hər xidmət üçün ayrıca icazələri olmalıdır.
          </p>
        </div>
      </section>
    </>
  );
}
