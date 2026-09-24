import "../app/workspaceStyles";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  FileClock,
  History,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingSkeleton,
  PageHeader,
  SectionHeading,
  Select,
  TeamLogo,
  Textarea,
  Toast,
} from "../components/common/primitives";
import { serviceCapabilities, services } from "../services";
import {
  useAdminPlatformData,
  useTeamPlatformData,
} from "../services/PlatformDataContext";
import type {
  DurableInvitation,
  ResultVersion,
  SupportTicket,
  TeamAuthorityMember,
  TeamAuthorityRole,
  VerificationRequest,
  VerificationStatus,
} from "../types/domain";
import { invalidateQuery } from "../services/queryCache";
import { safeInternalPath } from "../utils/routes";

function formatDate(value: string) {
  return new Date(value).toLocaleString("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SearchResultsPage() {
  const [loadError, setLoadError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [result, setResult] =
    useState<Awaited<ReturnType<typeof services.search.public>>>();
  useEffect(() => {
    let active = true;
    setLoadError(false);
    setResult(undefined);
    services.search
      .public(query)
      .then((value) => {
        if (active) setResult(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [query]);
  const items = useMemo(
    () =>
      result
        ? Object.entries(result.groups)
            .filter(([group]) => group !== "player")
            .flatMap(([, group]) => group ?? [])
            .map((item) => ({ ...item, href: safeInternalPath(item.href) }))
            .filter((item): item is typeof item & { href: string } =>
              Boolean(item.href),
            )
        : [],
    [result],
  );
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
          eyebrow="Platformada axtarış"
          title="Axtarış nəticələri"
          description="Komandaları, turnirləri və rəsmi rekordları tapın."
        />
        <form
          className="directory-search"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSearchParams({ q: String(data.get("q") ?? "").trim() });
          }}
        >
          <Input
            key={query}
            name="q"
            label="Axtarış"
            defaultValue={query}
            minLength={2}
            required
          />
          <Button type="submit">Axtar</Button>
        </form>
        {!result ? (
          <LoadingSkeleton variant="list" rows={5} />
        ) : items.length ? (
          <div className="search-results-ledger">
            {items.map((item) => (
              <Link key={`${item.type}-${item.id}`} to={item.href}>
                <span>{item.type}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nəticə tapılmadı"
            body={
              query
                ? `“${query}” üçün uyğun nəticə yoxdur.`
                : "Axtarış üçün ən azı iki simvol yazın."
            }
          />
        )}
      </div>
    </section>
  );
}

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

export function PlayerClaimPage() {
  const { playerId = "" } = useParams();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await services.players.claim(
        playerId,
        data.get("method") as
          | "ACCOUNT_MATCH"
          | "PUBG_IDENTITY"
          | "ADMIN_REVIEW",
        [],
        crypto.randomUUID(),
      );
      setNotice("Claim review üçün göndərildi.");
    } catch {
      setNotice(
        "Müraciət saxlanılmadı. Yenidən cəhd edin; hesabın sizə aid olduğunu təsdiqləmək üçün əlavə yoxlama tələb oluna bilər.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Player identity"
        title="Oyunçu profilini claim et"
        description="Public oyunçu kimliyini hesabınıza bağlamaq üçün server təsdiqi tələb olunur. Profil avtomatik verilmir."
      />
      {notice && (
        <Toast
          title="Claim statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <form className="operation-form narrow-form" onSubmit={submit}>
        <Select
          name="method"
          label="Verification üsulu"
          defaultValue="ACCOUNT_MATCH"
        >
          <option value="ACCOUNT_MATCH">Mövcud account uyğunluğu</option>
          <option value="PUBG_IDENTITY">PUBG identity verification</option>
          <option value="ADMIN_REVIEW">Admin review</option>
        </Select>
        <Input label="Player ID" value={playerId} disabled />
        <Button type="submit" loading={loading}>
          Claim review göndər
        </Button>
      </form>
    </>
  );
}

export function BadgeDetailPage() {
  const { badgeId = "" } = useParams();
  const { teamAchievements } = useTeamPlatformData();
  const badge = teamAchievements.find((item) => item.id === badgeId);
  if (!badge)
    return (
      <EmptyState
        title="Badge tapılmadı"
        body="Bu badge kolleksiyada yoxdur və ya public görünür deyil."
      />
    );
  return (
    <>
      <Link className="text-link" to="/team/badges">
        ← Badge Cabinet
      </Link>
      <PageHeader
        eyebrow={badge.category}
        title={badge.title}
        description={badge.description}
      />
      <div className="completion-grid">
        <section className="badge-art-pending">
          <span>ART PENDING</span>
          <strong>{badge.tier}</strong>
          <p>
            Nişanın təsviri hazırlanır. Qazanılma şərtləri aşağıda göstərilir.
          </p>
        </section>
        <section>
          <SectionHeading title="Tier və progress" />
          <dl className="detail-ledger">
            <div>
              <dt>Cari tier</dt>
              <dd>{badge.tier}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{badge.state}</dd>
            </div>
            <div>
              <dt>Tələb</dt>
              <dd>
                {badge.progress
                  ? `${badge.progress.target} ${badge.progress.unit}`
                  : badge.description}
              </dd>
            </div>
            <div>
              <dt>Progress</dt>
              <dd>
                {badge.progress
                  ? `${badge.progress.current} / ${badge.progress.target}`
                  : "Authoritative server event tələb olunur"}
              </dd>
            </div>
            <div>
              <dt>Unlock tarixi</dt>
              <dd>
                {badge.unlockedAt ? formatDate(badge.unlockedAt) : "Açılmayıb"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <>
        <p>
          Tier unlock history və yeni achievement notification yalnız
          server-calculated unlock events-dən gəlməlidir.
        </p>
      </>
    </>
  );
}

export function TeamInvitationsPage() {
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<DurableInvitation[]>();
  const [notice, setNotice] = useState("");
  const load = () =>
    services.teams
      .invitations()
      .then((page) => setItems(page.items))
      .catch(() => setLoadError(true));
  useEffect(() => {
    void load();
  }, []);
  const respond = async (id: string, response: "ACCEPTED" | "REJECTED") => {
    try {
      await services.teams.respondToInvitation(
        id,
        response,
        crypto.randomUUID(),
      );
      await load();
      setNotice(
        response === "ACCEPTED" ? "Dəvət qəbul edildi." : "Dəvət rədd edildi.",
      );
    } catch {
      setNotice(
        "Qərar saxlanılmadı. Dəvətin müddətini və bağlantını yoxlayın.",
      );
    }
  };
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
        eyebrow="// KOMANDA DƏVƏTLƏRİ"
        title="Komanda dəvətləri"
        description="Komanda və təşkilat dəvətləri, veriləcək rol və cavab müddəti."
      />
      {notice && (
        <Toast
          title="Dəvət statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      {!items ? (
        <LoadingSkeleton variant="list" rows={5} />
      ) : items.length ? (
        <div className="invitation-ledger">
          {items.map((item) => (
            <article key={item.id}>
              <Users size={19} />
              <div>
                <strong>{item.entityName}</strong>
                <small>
                  {item.role} ·{" "}
                  {item.tournamentImplications ?? "Turnir təsiri yoxdur"} ·{" "}
                  {formatDate(item.expiresAt)}
                </small>
              </div>
              <span>{item.status}</span>
              {item.status === "PENDING" && (
                <div>
                  <Button onClick={() => void respond(item.id, "ACCEPTED")}>
                    Qəbul et
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void respond(item.id, "REJECTED")}
                  >
                    Rədd et
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aktiv dəvət yoxdur"
          body="Sizə göndərilən komanda və təşkilat dəvətləri burada görünəcək."
        />
      )}
    </>
  );
}

export function VerificationApplicationPage() {
  const [loadError, setLoadError] = useState(false);
  const { currentTeam } = useTeamPlatformData();
  const [request, setRequest] = useState<VerificationRequest>();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    services.verifications
      .forEntity("TEAM", currentTeam.id)
      .then(setRequest)
      .catch(() => setLoadError(true));
  }, [currentTeam.id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const next = await services.verifications.apply(
        {
          entityType: "TEAM",
          entityId: currentTeam.id,
          entityName: currentTeam.name,
          representativeName: String(data.get("representative")),
          officialSocials: { website: String(data.get("website")) },
          evidenceNames: [],
          notes: String(data.get("notes")),
        },
        crypto.randomUUID(),
      );
      setRequest(next);
      setNotice("Verification müraciəti göndərildi.");
    } catch {
      setNotice(
        "Müraciət saxlanılmadı. Bağlantını və daxil etdiyiniz məlumatları yoxlayın.",
      );
    } finally {
      setLoading(false);
    }
  };
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
        eyebrow="Authoritative verification"
        title="Verification müraciəti"
        description="Təsdiq nişanı yalnız müraciətiniz yoxlanılıb qəbul edildikdən sonra görünür."
      />
      {notice && (
        <Toast
          title="Verification statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      {request && (
        <section className="verification-status">
          <BadgeCheck size={22} />
          <div>
            <strong>{request.status}</strong>
            <p>
              {request.safeReason ??
                "Müraciət tarixçəsi server tərəfindən saxlanılır."}
            </p>
          </div>
        </section>
      )}
      <form className="operation-form narrow-form" onSubmit={submit}>
        <Input name="representative" label="Səlahiyyətli nümayəndə" required />
        <Input
          name="website"
          label="Rəsmi website/social URL"
          type="url"
          required
        />
        <Textarea name="notes" label="Müraciət qeydi" minLength={20} required />
        <Button type="submit" loading={loading}>
          Müraciəti göndər
        </Button>
      </form>
    </>
  );
}

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

export function AdminVerificationDetailPage() {
  const [loadError, setLoadError] = useState(false);
  const { verificationId = "" } = useParams();
  const [item, setItem] = useState<VerificationRequest>();
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    services.verifications
      .get(verificationId)
      .then(setItem)
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true));
  }, [verificationId]);
  const review = async (status: "APPROVED" | "REJECTED" | "REVOKED") => {
    if (!item || reason.trim().length < 10) {
      setNotice("Qərar üçün ən az 10 simvolluq faktiki səbəb yazın.");
      return;
    }
    try {
      setItem(
        await services.verifications.review(
          item.id,
          status,
          reason,
          item.status,
        ),
      );
      setNotice("Verification qərarı saxlanıldı və audit üçün göndərildi.");
    } catch {
      setNotice(
        "Qərar saxlanılmadı. Müraciət dəyişmiş ola bilər; səhifəni yeniləyib yenidən yoxlayın.",
      );
    }
  };
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
  if (!loaded) return <LoadingSkeleton variant="form" rows={6} />;
  if (!item)
    return (
      <>
        <Link className="text-link" to="/admin/verifications">
          ← Verification növbəsinə qayıt
        </Link>
        <PageHeader
          eyebrow="Verification review"
          title="Verification tapılmadı"
          description="Bu müraciət mövcud deyil və ya onu görmək üçün icazəniz yoxdur."
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow={item.id}
        title={item.entityName}
        description={`${item.entityType} verification review`}
      />
      {notice && (
        <Toast
          title="Review statusu"
          body={notice}
          onClose={() => setNotice("")}
        />
      )}
      <div className="completion-grid">
        <section>
          <SectionHeading title="Müraciət" />
          <dl className="detail-ledger">
            <div>
              <dt>Nümayəndə</dt>
              <dd>{item.representativeName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{item.status}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{item.evidenceNames.length} private file</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{item.notes ?? "—"}</dd>
            </div>
          </dl>
        </section>
        <form className="operation-form">
          <SectionHeading title="Qərar" />
          <Textarea
            label="Qərar səbəbi"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            required
          />
          <div className="decision-actions">
            <Button onClick={() => void review("APPROVED")}>Təsdiqlə</Button>
            <Button variant="danger" onClick={() => void review("REJECTED")}>
              Rədd et
            </Button>
            {item.status === "APPROVED" && (
              <Button variant="danger" onClick={() => void review("REVOKED")}>
                Revoke
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

export function AdminPlayerDetailPage() {
  const [loadError, setLoadError] = useState(false);
  const { playerId = "" } = useParams();
  const [detail, setDetail] =
    useState<Awaited<ReturnType<typeof services.operations.player>>>();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    services.operations
      .player(playerId)
      .then(setDetail)
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true));
  }, [playerId]);
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
  if (!loaded) return <LoadingSkeleton variant="profile" rows={7} />;
  if (!detail)
    return (
      <>
        <PageHeader
          eyebrow="Admin player"
          title="Oyunçu tapılmadı"
          description="Oyunçu mövcud deyil və ya məlumatlarını görmək üçün icazəniz yoxdur."
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="Admin player detail"
        title={detail.ign}
        description="Public identity, linked account, membership history, eligibility, sanctions və verification."
      />
      <div className="completion-grid">
        <section>
          <SectionHeading title="Account və komanda" />
          <dl className="detail-ledger">
            <div>
              <dt>Linked account</dt>
              <dd>{detail.linkedAccount?.emailHint ?? "Bağlanmayıb"}</dd>
            </div>
            <div>
              <dt>Cari komanda</dt>
              <dd>{detail.currentTeam?.name ?? "Yoxdur"}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{detail.verification.status}</dd>
            </div>
          </dl>
        </section>
        <section>
          <SectionHeading title="Eligibility və sanctions" />
          <p>
            {detail.eligibilityConflicts.length} açıq conflict ·{" "}
            {detail.sanctions.length} sanction
          </p>
        </section>
      </div>
      <section>
        <SectionHeading title="Membership history" />
        {detail.membershipHistory.length ? (
          <div className="history-ledger">
            {detail.membershipHistory.map((entry) => (
              <article key={entry.id}>
                <History size={18} />
                <strong>{entry.entityName}</strong>
                <span>{entry.role}</span>
                <time>
                  {formatDate(entry.joinedAt)} —{" "}
                  {entry.leftAt ? formatDate(entry.leftAt) : "davam edir"}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tarixçə yoxdur"
            body="Oyunçunun komanda üzvlüyü tarixçəsi burada görünəcək."
          />
        )}
      </section>
    </>
  );
}

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

export function OrganizationWorkspacePage() {
  const { organizationSlug = "" } = useParams();
  const [organization, setOrganization] =
    useState<Awaited<ReturnType<typeof services.organizations.getBySlug>>>();
  const [members, setMembers] = useState<
    Awaited<ReturnType<typeof services.organizations.members>>
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    services.organizations
      .getBySlug(organizationSlug)
      .then(async (o) => {
        if (active) setOrganization(o);
        if (o) {
          const m = await services.organizations.members(o.id);
          if (active) setMembers(m);
        }
      })
      .catch(() => {
        if (active)
          setNotice("İdarəetmə məlumatı yüklənmədi və ya icazəniz yoxdur.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [organizationSlug]);
  const transfer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organization || busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      setMembers(
        await services.organizations.transferOwnership(
          organization.id,
          String(data.get("memberId")),
          String(data.get("confirmation")),
          crypto.randomUUID(),
        ),
      );
      setNotice("Təşkilatın sahibliyi ötürüldü.");
    } catch {
      setNotice(
        "Sahiblik ötürülmədi. Təşkilatın sahibi, aktiv üzv və dəqiq ad tələb olunur.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!loaded) return <LoadingSkeleton variant="dashboard" rows={6} />;
  if (!organization)
    return (
      <EmptyState
        title="Təşkilat tapılmadı"
        body={notice || "Bu təşkilat mövcud deyil."}
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="Təşkilat idarəetməsi"
        title={organization.name}
        description="Komandalar və təşkilat sahibliyi."
      />
      {notice && <Toast title={notice} onClose={() => setNotice("")} />}
      <div className="completion-grid">
        <section>
          <SectionHeading title="Komandalar" />
          <div className="entity-ledger">
            {organization.ownedTeams.map((t) => (
              <Link key={t.id} to={`/teams/${t.slug}`}>
                <TeamLogo name={t.displayName} />
                <span>{t.displayName}</span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <form className="operation-form" onSubmit={transfer}>
          <SectionHeading title="Sahibliyi ötür" />
          <p>Bu əməliyyatdan sonra seçilmiş üzv təşkilatın sahibi olacaq.</p>
          <Select name="memberId" label="Yeni sahib" required defaultValue="">
            <option value="" disabled>
              Üzv seçin
            </option>
            {members
              .filter((m) => m.role !== "OWNER" && m.status === "ACTIVE")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
          </Select>
          <Input
            name="confirmation"
            label="Təşkilatın tam adı"
            placeholder={organization.name}
            required
          />
          <Button
            variant="danger"
            type="submit"
            loading={busy}
            disabled={!members.some((m) => m.role !== "OWNER")}
          >
            Sahibliyi ötür
          </Button>
        </form>
      </div>
    </>
  );
}

export function TournamentLifecycleAdminPage() {
  const { tournamentId = "" } = useParams();
  const { tournaments } = useAdminPlatformData();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"cancel" | "archive">();
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!tournament || !action || busy) return;
    setBusy(true);
    try {
      if (action === "cancel")
        await services.tournaments.cancel(
          tournament.id,
          reason,
          crypto.randomUUID(),
        );
      else
        await services.tournaments.archive(tournament.id, crypto.randomUUID());
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      setNotice(
        action === "cancel"
          ? "Turnir ləğv edildi və iştirakçılara bildiriş göndərildi."
          : "Turnir arxivləndi.",
      );
      setAction(undefined);
    } catch {
      setNotice(
        "Əməliyyat saxlanmadı. Turnirin cari statusunu və səlahiyyətinizi yoxlayın.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!tournament)
    return (
      <EmptyState title="Turnir tapılmadı" body="Bu turnir mövcud deyil." />
    );
  const finished = ["completed", "cancelled"].includes(tournament.status);
  return (
    <>
      <Link className="text-link" to={`/admin/tournaments/${tournament.id}`}>
        ← Turnir əməliyyatlarına qayıt
      </Link>
      <PageHeader
        eyebrow="Turnir statusu"
        title={tournament.name}
        description={`Cari status: ${tournament.status}`}
      />
      {notice && <Toast title={notice} onClose={() => setNotice("")} />}
      <div className="completion-grid">
        <form
          className="operation-form"
          onSubmit={(e) => {
            e.preventDefault();
            setAction("cancel");
          }}
        >
          <SectionHeading title="Turniri ləğv et" />
          <Textarea
            label="Ləğv səbəbi"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={20}
            maxLength={1000}
            required
          />
          <Button
            type="submit"
            variant="danger"
            disabled={finished}
            loading={busy}
          >
            Ləğvi təsdiqlə
          </Button>
        </form>
        <section>
          <SectionHeading title="Arxivlə" />
          <p>
            Yalnız başa çatmış və ya ləğv edilmiş turnir arxivlənə bilər. Yarış
            tarixçəsi saxlanılır.
          </p>
          <Button
            disabled={!finished}
            loading={busy}
            onClick={() => setAction("archive")}
          >
            Arxivlə
          </Button>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(action)}
        title={
          action === "cancel"
            ? "Turniri ləğv edirsiniz?"
            : "Turniri arxivləyirsiniz?"
        }
        body={
          action === "cancel"
            ? `${tournament.name}: ${reason}`
            : `${tournament.name} arxivə keçiriləcək.`
        }
        confirmLabel={action === "cancel" ? "Turniri ləğv et" : "Arxivlə"}
        onClose={() => setAction(undefined)}
        onConfirm={apply}
      />
    </>
  );
}

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
