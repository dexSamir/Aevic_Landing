import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, SectionHeading, Select, TeamLogo, Textarea } from '../components/common/primitives';
import { useTeamPlatformData } from '../services/PlatformDataContext';
import { services, serviceCapabilities } from '../services';
import type { DurableInvitation, TeamAuthorityMember, TeamAuthorityRole } from '../types/domain';

type Decision = 'transfer' | 'archive' | 'leave' | 'remove' | 'cancel';
const roles: Record<TeamAuthorityRole, string> = { OWNER: 'Sahib', CAPTAIN: 'Kapitan', MANAGER: 'Menecer', CO_CAPTAIN: 'Kapitan köməkçisi', PLAYER: 'Oyunçu', SUBSTITUTE: 'Əvəzedici' };
const decisionLabels: Record<Decision, string> = { transfer: 'Sahibliyi ötür', archive: 'Komandanı arxivlə', leave: 'Komandadan ayrıl', remove: 'Üzvün girişini ləğv et', cancel: 'Dəvəti ləğv et' };

export function TeamGovernancePage() {
  const { currentTeam } = useTeamPlatformData();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamAuthorityMember[]>();
  const [invitations, setInvitations] = useState<DurableInvitation[]>([]);
  const [viewerId, setViewerId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<Decision>();
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const requestKey = useRef('');
  const load = async () => {
    try { const [authority, page, session] = await Promise.all([services.teams.authority(currentTeam.id), services.teams.invitations(currentTeam.id), services.auth.getSession()]); setMembers(authority); setInvitations(page.items); setViewerId(session?.user.id ?? ''); }
    catch { setError('Səlahiyyətlər yüklənmədi. Yenidən cəhd edin.'); }
  };
  useEffect(() => { void load(); }, [currentTeam.id]);
  const viewer = members?.find(member => member.userId === viewerId && member.status === 'ACTIVE');
  const isOwner = viewer?.role === 'OWNER';
  const canManage = isOwner || Boolean(viewer?.permissions.includes('team.manage'));
  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!canManage || loading) return;
    const form = event.currentTarget; const data = new FormData(form); setLoading(true); setError('');
    try { await services.teams.invite(currentTeam.id, String(data.get('recipient')), data.get('role') as TeamAuthorityRole, crypto.randomUUID()); await load(); setNotice('Dəvət göndərildi.'); form.reset(); }
    catch { setError('Dəvət göndərilmədi. İcazələri və hesab məlumatını yoxlayın.'); }
    finally { setLoading(false); }
  };
  const openDecision = (kind: Decision, id = '') => { setDecision(kind); setTargetId(id); setReason(''); setConfirmation(''); setError(''); requestKey.current = crypto.randomUUID(); };
  const needsName = decision === 'transfer' || decision === 'archive';
  const allowed = (decision === 'leave' ? Boolean(viewer) && !isOwner : decision === 'transfer' ? isOwner && serviceCapabilities.ownershipTransfer : decision === 'archive' ? isOwner : canManage);
  const confirm = async () => {
    if (!decision || !allowed || loading || (needsName && confirmation !== currentTeam.name) || reason.trim().length < 10) return;
    if ((decision === 'transfer' || decision === 'remove' || decision === 'cancel') && !targetId) return;
    setLoading(true); setError('');
    try {
      if (decision === 'transfer') setMembers(await services.teams.transferOwnership(currentTeam.id, targetId, confirmation, requestKey.current));
      if (decision === 'archive') await services.teams.archive(currentTeam.id, reason.trim(), confirmation, requestKey.current);
      if (decision === 'leave') await services.teams.leave(currentTeam.id, reason.trim());
      if (decision === 'remove') await services.teams.removeAuthorityMember(currentTeam.id, targetId, reason.trim());
      if (decision === 'cancel') await services.teams.cancelInvitation(currentTeam.id, targetId);
      setDecision(undefined); setNotice('Dəyişiklik təsdiqləndi.'); if(decision==='archive'||decision==='leave')navigate('/account');else await load();
    } catch { setError('Dəyişiklik təsdiqlənmədi. İcazələri və komandanın yarış vəziyyətini yoxlayın.'); }
    finally { setLoading(false); }
  };
  return <><PageHeader eyebrow="// İDARƏETMƏ" title="Menecerlər və səlahiyyətlər" description="Komandanın sahibi, kapitanı və idarəetmə heyəti." actions={<Link className="button button--secondary" to="/team/invitations">Bütün dəvətlər <ArrowRight size={17} /></Link>} />
    {notice && <p role="status">{notice}</p>}{error && !decision && <p role="alert" className="field__error">{error}<Button variant="ghost" onClick={() => void load()}>Yenidən yoxla</Button></p>}
    <div className="completion-grid"><section><SectionHeading title="İdarəetmə heyəti" />{members ? <div className="authority-ledger">{members.map(member => <article key={member.id}><TeamLogo name={member.displayName} /><div><strong>{member.displayName}</strong><small>{roles[member.role]} · {member.status === 'ACTIVE' ? 'Aktiv' : 'Giriş dayandırılıb'}</small></div>{canManage && member.role !== 'OWNER' && member.userId !== viewerId && <Button variant="ghost" onClick={() => openDecision('remove', member.id)}>Girişi ləğv et</Button>}</article>)}</div> : <LoadingSkeleton variant="list" rows={4} />}</section>
    <section><SectionHeading title="Menecer dəvət et" description="Dəvət qəbul edildikdən sonra seçilən rol qüvvəyə minir." /><form className="operation-form" onSubmit={invite}><Input name="recipient" label="E-poçt" type="email" required /><Select name="role" label="Rol" defaultValue="MANAGER"><option value="MANAGER">Menecer</option><option value="CO_CAPTAIN">Kapitan köməkçisi</option></Select><Button type="submit" disabled={!canManage} loading={loading} icon={<UserPlus size={17} />}>Dəvət göndər</Button></form></section></div>
    <section className="team-management-invitations"><SectionHeading title="Gözləyən dəvətlər" />{invitations.filter(item => item.status === 'PENDING').length ? <div className="invitation-ledger">{invitations.filter(item => item.status === 'PENDING').map(invite => <article key={invite.id}><ShieldCheck size={18} /><div><strong>{invite.recipientLabel}</strong><small>{invite.role ? roles[invite.role as TeamAuthorityRole] ?? invite.role : 'Dəvət'} · {new Date(invite.expiresAt).toLocaleString('az-AZ')}</small></div>{canManage && <Button variant="ghost" onClick={() => openDecision('cancel', invite.id)}>Ləğv et</Button>}</article>)}</div> : <EmptyState title="Gözləyən dəvət yoxdur" body="Göndərilən və qəbul gözləyən dəvətlər burada görünəcək." />}</section>
    <section className="danger-ledger"><div><strong>Sahibliyi ötür</strong><p>Komanda üzərində sahib hüquqları seçdiyiniz aktiv üzvə keçir.</p></div><Button variant="secondary" disabled={!isOwner} onClick={() => openDecision('transfer')}>Ötürmə axınını aç</Button><div><strong>Komandanı arxivlə</strong><p>Tarixi nəticələr saxlanır. Cari yarış iştirakı server tərəfindən yoxlanır.</p></div><Button variant="secondary" disabled={!isOwner} onClick={() => openDecision('archive')}>Arxiv qaydalarını yoxla</Button><div><strong>Komandadan ayrıl</strong><p>{isOwner ? 'Ayrılmadan əvvəl sahibliyi başqa üzvə ötürün.' : 'Bu komandanın iş sahəsinə girişiniz bitir.'}</p></div><Button variant="secondary" disabled={!viewer || isOwner} onClick={() => openDecision('leave')}>Ayrılma şərtləri</Button></section>
    <Modal open={Boolean(decision)} title={decision ? decisionLabels[decision] : ''} onClose={() => { if (!loading) setDecision(undefined); }} footer={<><Button variant="ghost" disabled={loading} onClick={() => setDecision(undefined)}>Geri</Button><Button variant="danger" loading={loading} disabled={!allowed || reason.trim().length < 10 || (needsName && confirmation !== currentTeam.name) || (decision === 'transfer' && !targetId)} onClick={() => void confirm()}>Dəyişikliyi təsdiqlə</Button></>}>
      <div className="modal-form">{!allowed && <p role="note">Bu əməliyyat cari hesab və xidmət imkanları ilə əlçatan deyil. Heç bir dəyişiklik edilməyəcək.</p>}{error && <p role="alert" className="field__error">{error}</p>}{decision === 'transfer' && <Select label="Yeni sahib" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Aktiv üzv seçin</option>{members?.filter(member => member.status === 'ACTIVE' && member.role !== 'OWNER').map(member => <option key={member.id} value={member.id}>{member.displayName} · {roles[member.role]}</option>)}</Select>}<Textarea label="Dəyişiklik səbəbi" minLength={10} value={reason} onChange={event => setReason(event.target.value)} />{needsName && <Input label={`Təsdiq üçün “${currentTeam.name}” yazın`} value={confirmation} onChange={event => setConfirmation(event.target.value)} />}</div>
    </Modal>
  </>;
}
