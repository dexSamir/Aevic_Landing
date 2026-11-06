import {
ArrowRight
} from "lucide-react";
import { useRef,useState } from "react";
import { Link,useParams } from "react-router-dom";
import {
Button,
Modal,Textarea,
EmptyState,
PageHeader,
SectionHeading,
StatusBadge,
TeamLogo
} from "../../components/common/primitives";
import { competitionNow,services } from "../../services";
import { useAdminPlatformData } from "../../services/PlatformDataContext";
import { invalidateQuery } from "../../services/queryCache";
import type { } from "../../types/domain";
import { selectAdminOperationalTournament } from "../../utils/competitionSelectors";
import { productTerm } from "../../utils/productLexicon";

export function AdminTeamDetailPage() {
  const { teamId = "" } = useParams();
  const { teams, tournaments, slots } = useAdminPlatformData();
  const team = teams.find((item) => item.id === teamId);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [decision,setDecision]=useState<'approved'|'rejected'>(),[reason,setReason]=useState('');
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
        status === "rejected" ? reason.trim() : undefined,
      );
      invalidateQuery("snapshot:admin");
      invalidateQuery("snapshot:public");
      invalidateQuery("snapshot:team");
      setDecision(undefined);setNotice("Komanda qərarı saxlanıldı.");
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
      <div className="admin-command-facts"><div><span>Heyət</span><strong>{team.roster.length} oyunçu</strong></div><div><span>Status</span><strong style={{fontSize:'1rem'}}>{productTerm(team.approvalStatus)}</strong></div><div><span>Turnir iştirakı</span><strong>{new Set(slots.filter(s=>s.teamId===team.id).map(s=>s.tournamentId)).size}</strong></div><div><span>Kimlik</span><strong style={{fontSize:'1rem'}}>{productTerm(team.verificationLevel??'registered')}</strong></div></div><div className="admin-entity-detail">
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
              onClick={() => {setDecision("approved");setReason('');}}
            >
              Təsdiqlə
            </Button>
            <Button
              disabled={pending}
              variant="danger"
              onClick={() => {setDecision("rejected");setReason('');}}
            >
              Düzəlişə qaytar
            </Button>
          </div>

        </aside>
      </div>
      <Modal open={!!decision} title={decision==='approved'?'Komandanı təsdiqlə':'Komandanı düzəlişə qaytar'} onClose={()=>{if(!pending)setDecision(undefined);}}><form className="operation-form" onSubmit={e=>{e.preventDefault();if(decision)void decide(decision);}}><p>{team.name}</p>{decision==='rejected'&&<Textarea label="Qərarın səbəbi" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={1000} required/>}{notice&&<p role="status">{notice}</p>}<Button type="submit" loading={pending} disabled={decision==='rejected'&&reason.trim().length<10}>Qərarı saxla</Button></form></Modal>
    </>
  );
}
