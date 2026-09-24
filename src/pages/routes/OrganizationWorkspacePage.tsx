import {
ArrowRight
} from "lucide-react";
import { type FormEvent,useEffect,useState } from "react";
import { Link,useParams } from "react-router-dom";
import "../../app/workspaceStyles";
import {
Button,
EmptyState,
Input,
LoadingSkeleton,
PageHeader,
SectionHeading,
Select,
TeamLogo,
Toast
} from "../../components/common/primitives";
import { services } from "../../services";

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
