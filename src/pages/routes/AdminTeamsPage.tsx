import {
Search,
UserCheck,
XCircle
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
Button,
Checkbox,
DataTable,
MobileDataList,
Modal,
Textarea,
PageHeader,
StatusBadge,
Tabs,
TeamLogo,
Toast
} from '../../components/common/primitives';
import { services,serviceCapabilities } from '../../services';
import {invalidateQuery} from '../../services/queryCache';
import { useAdminPlatformData } from '../../services/PlatformDataContext';

export function AdminTeamsPage() {
  const { teams } = useAdminPlatformData();
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [decision,setDecision]=useState<'approved'|'rejected'>(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function review(){if(!decision||busy)return;setBusy(true);setError('');try{const result=await services.operations.bulkTeamReview(selected,decision,reason);setToast(`${result.updated} komandanın yoxlaması tamamlandı.`);setSelected([]);setDecision(undefined);invalidateQuery('snapshot:admin');}catch{setError('Komandalar dəyişdirilmədi. Bütün seçimlər gözləyən vəziyyətdə olmalıdır. Siyahını yeniləyin.');invalidateQuery('snapshot:admin');}finally{setBusy(false);}}
  const [toast, setToast] = useState('');
  const filtered = teams.filter((team) => (status === 'all' || team.approvalStatus === status) && `${team.name} ${team.captain.firstName} ${team.captain.lastName} ${team.captain.email} ${team.captain.phone}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  const toggle = (id: string) => setSelected((values) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const rows = filtered.map((team) => [<Checkbox key={team.id} aria-label={`${team.name} seç`} disabled={team.approvalStatus!=='pending'||busy} checked={selected.includes(team.id)} onChange={() => toggle(team.id)} label={<span className="sr-only">Seç</span>} />, <span className="team-cell"><TeamLogo name={team.name} size="sm" /><strong>{team.name}</strong></span>, `${team.captain.firstName} ${team.captain.lastName}`, team.captain.phone, team.roster.length, <StatusBadge status={team.approvalStatus} />, <Link className="button button--ghost" key="action" to={`/admin/teams/${team.id}`}><span>Detallar</span></Link>]);
  return <><PageHeader eyebrow="Təsdiq əməliyyatları" title="Komandalar" description="Təqdim edilmiş heyətlərin təsdiqi, rəddi və bloklanma vəziyyəti." actions={<Link className="button button--secondary" to="/admin/legacy-claims">Əvvəlki komandaların sahibliyi</Link>} />{toast && <Toast title={toast} body="Dəyişiklik saxlanıldı." onClose={() => setToast('')} />}<div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda axtar" placeholder="Komanda, kapitan, e-poçt və ya telefon" /></div><Tabs active={status} onChange={setStatus} items={[{ id: 'all', label: 'Hamısı', count: teams.length }, { id: 'pending', label: 'Gözləyir', count: teams.filter((team) => team.approvalStatus === 'pending').length }, { id: 'approved', label: 'Təsdiqlənib', count: teams.filter((team) => team.approvalStatus === 'approved').length }, { id: 'rejected', label: 'Rədd edilib', count: teams.filter((team) => team.approvalStatus === 'rejected').length }, { id: 'banned', label: 'Bloklanıb', count: teams.filter((team) => team.approvalStatus === 'banned').length }]} /></div>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} komanda seçilib</strong><Button variant="secondary" icon={<UserCheck size={17} />} disabled={!serviceCapabilities.bulkApproval||busy} onClick={()=>{setDecision('approved');setReason('');setError('');}}>Təsdiqlə</Button><Button variant="danger" icon={<XCircle size={17} />} disabled={!serviceCapabilities.bulkApproval||busy} onClick={()=>{setDecision('rejected');setReason('');setError('');}}>Rədd et</Button></div>}<DataTable headers={['', "Komanda", "Kapitan", 'WhatsApp', "Heyət", "Status", '']} rows={rows} /><MobileDataList items={filtered.map((team) => ({ title: <span className="team-cell"><TeamLogo name={team.name} size="sm" />{team.name}</span>, meta: `${team.captain.firstName} · ${team.roster.length} oyunçu`, value: <StatusBadge status={team.approvalStatus} />, details: <div className="mobile-row-actions"><Link className="button button--ghost" to={`/admin/teams/${team.id}`}><span>Yoxla</span></Link><Checkbox label="Seç" disabled={team.approvalStatus!=='pending'||busy} checked={selected.includes(team.id)} onChange={() => toggle(team.id)} /></div> }))} /><Modal open={!!decision} title={decision==='approved'?'Seçilmiş komandaları təsdiqlə':'Seçilmiş komandaları rədd et'} onClose={()=>{if(!busy)setDecision(undefined);}} footer={<Button loading={busy} disabled={selected.length>50||decision==='rejected'&&reason.trim().length<10} onClick={()=>void review()}>Yoxlamanı tamamla</Button>}><p>{selected.length} komanda seçilib. Yalnız gözləyən müraciətlər dəyişdirilir.</p>{selected.length>50&&<p role="alert">Bir əməliyyatda ən çox 50 komanda seçin.</p>}<Textarea label="Səbəb" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} required={decision==='rejected'}/>{error&&<p role="alert">{error}</p>}</Modal></>;
}
