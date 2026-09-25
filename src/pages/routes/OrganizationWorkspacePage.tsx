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
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { services } from "../../services";

export function OrganizationWorkspacePage() {
  const {currentTeam,accountId,publicTeams=[]}=useTeamPlatformData();
  const { organizationSlug = "" } = useParams();
  const [organization, setOrganization] =
    useState<Awaited<ReturnType<typeof services.organizations.getBySlug>>>();
  const [members, setMembers] = useState<
    Awaited<ReturnType<typeof services.organizations.members>>
  >([]);
  const [invitations,setInvitations]=useState<Awaited<ReturnType<typeof services.organizations.invitations>>>();
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
          const role=m.find(member=>member.userId===(accountId??currentTeam.id))?.role;
          if(role==='OWNER'||role==='MANAGER'){const page=await services.organizations.invitations(o.id);if(active)setInvitations(page);}
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
  }, [organizationSlug,currentTeam.id,accountId]);
  const myRole=members.find(m=>m.userId===(accountId??currentTeam.id))?.role;
  const invite=async(e:FormEvent<HTMLFormElement>,kind:'member'|'team')=>{
    e.preventDefault();if(!organization||busy)return;const form=e.currentTarget,data=new FormData(form);setBusy(true);
    try {if(kind==='member')await services.organizations.inviteMember(organization.id,String(data.get('recipient')),String(data.get('role')) as 'MANAGER'|'MEMBER',crypto.randomUUID());else await services.organizations.inviteTeam(organization.id,String(data.get('teamId')),crypto.randomUUID());setNotice('Dəvət göndərildi. Qoşulmaq üçün qarşı tərəfin razılığı tələb olunur.');form.reset();setInvitations(await services.organizations.invitations(organization.id));}
    catch{setNotice('Dəvət göndərilmədi. Hesabı, mövcud əlaqəni və icazənizi yoxlayın.');}finally{setBusy(false);}
  };
  async function unlink(teamId:string){if(!organization||busy)return;setBusy(true);try{setOrganization(await services.organizations.removeTeam(organization.id,teamId,'Təşkilat idarəetməsindən əlaqə dayandırıldı.'));setNotice('Komanda təşkilatdan ayrıldı.');}catch{setNotice('Komanda əlaqəsi dəyişdirilmədi.');}finally{setBusy(false);}}
  async function saveSocials(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!organization||busy)return;const data=new FormData(e.currentTarget);setBusy(true);try{setOrganization(await services.organizations.updateSocialLinks(organization.id,{...organization.socialLinks,website:String(data.get('website')),instagram:String(data.get('instagram')),discord:String(data.get('discord'))}));setNotice('Sosial keçidlər saxlanıldı.');}catch{setNotice('Keçidlər saxlanılmadı. HTTPS ünvanlarını yoxlayın.');}finally{setBusy(false);}}
  async function moreInvitations(){if(!organization||!invitations?.nextCursor||busy)return;setBusy(true);try{const page=await services.organizations.invitations(organization.id,invitations.nextCursor);setInvitations({...page,items:[...invitations.items,...page.items]});}catch{setNotice('Dəvətlər yüklənmədi.');}finally{setBusy(false);}}
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
              <div key={t.id}><Link to={`/teams/${t.slug}`}>
                <TeamLogo name={t.displayName} />
                <span>{t.displayName}</span>
                <ArrowRight size={17} />
              </Link>{(myRole==='OWNER'||myRole==='MANAGER'||currentTeam.id===t.teamId)&&<Button variant="ghost" disabled={busy} onClick={()=>void unlink(t.teamId)}>Təşkilatdan ayır</Button>}</div>
            ))}
          </div>
        </section>
        {myRole==='OWNER'&&<form className="operation-form" onSubmit={transfer}>
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
        </form>}
      </div>
      {(myRole==='OWNER'||myRole==='MANAGER')&&<div className="completion-grid">
        <form className="operation-form" onSubmit={e=>void invite(e,'member')}><SectionHeading title="Üzv dəvət et"/><Input name="recipient" type="email" label="Kapitan hesabının e-poçtu" required/><Select name="role" label="Rol" defaultValue="MEMBER"><option value="MEMBER">Üzv</option><option value="MANAGER">Menecer</option></Select><Button type="submit" loading={busy}>Dəvət göndər</Button></form>
        <form className="operation-form" onSubmit={e=>void invite(e,'team')}><SectionHeading title="Komanda dəvət et"/><Select name="teamId" label="Komanda" required defaultValue=""><option value="" disabled>Komanda seçin</option>{publicTeams.filter(t=>!organization.ownedTeams.some(o=>o.teamId===t.id)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select><p>Komanda kapitanı dəvəti öz panelindən qəbul edir.</p><Button type="submit" loading={busy}>Komanda dəvət et</Button></form>
      </div>}
      {(myRole==='OWNER'||myRole==='MANAGER')&&<>
        <form className="operation-form narrow-form" onSubmit={saveSocials}><SectionHeading title="Sosial keçidlər"/>{(['website','instagram','discord'] as const).map(key=><Input key={key} name={key} type="url" label={key} defaultValue={organization.socialLinks[key]??''} placeholder="https://" maxLength={500}/>)}<Button type="submit" loading={busy}>Keçidləri saxla</Button></form>
        <section><SectionHeading title="Göndərilmiş dəvətlər"/>{invitations?.items.length?invitations.items.map(item=><p key={item.id}>{item.recipientLabel} · {item.type==='ORGANIZATION_TEAM'?'Komanda':item.role} · {item.status}</p>):<p>Dəvət yoxdur.</p>}{invitations?.hasMore&&<Button disabled={busy} onClick={()=>void moreInvitations()}>Daha çox</Button>}</section>
      </>}
      <section><SectionHeading title="Təşkilat üzvləri"/>{members.map(member=><p key={member.id}>{member.displayName} · {member.role}</p>)}</section>
    </>
  );
}
