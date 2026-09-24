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
PageHeader,
StatusBadge,
Tabs,
TeamLogo,
Toast
} from '../../components/common/primitives';
import { serviceCapabilities } from '../../services';
import { useAdminPlatformData } from '../../services/PlatformDataContext';

export function AdminTeamsPage() {
  const { teams } = useAdminPlatformData();
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const filtered = teams.filter((team) => (status === 'all' || team.approvalStatus === status) && `${team.name} ${team.captain.firstName} ${team.captain.lastName} ${team.captain.email} ${team.captain.phone}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  const toggle = (id: string) => setSelected((values) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const rows = filtered.map((team) => [<Checkbox key={team.id} aria-label={`${team.name} seç`} checked={selected.includes(team.id)} onChange={() => toggle(team.id)} label={<span className="sr-only">Seç</span>} />, <span className="team-cell"><TeamLogo name={team.name} size="sm" /><strong>{team.name}</strong></span>, `${team.captain.firstName} ${team.captain.lastName}`, team.captain.phone, team.roster.length, <StatusBadge status={team.approvalStatus} />, <Link className="button button--ghost" key="action" to={`/admin/teams/${team.id}`}><span>Detallar</span></Link>]);
  return <><PageHeader eyebrow="Təsdiq əməliyyatları" title="Komandalar" description="Təqdim edilmiş heyətlərin təsdiqi, rəddi və bloklanma vəziyyəti." actions={<Link className="button button--secondary" to="/admin/legacy-claims">Əvvəlki komandaların sahibliyi</Link>} />{toast && <Toast title={toast} body="Dəyişiklik saxlanıldı." onClose={() => setToast('')} />}<div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda axtar" placeholder="Komanda, kapitan, e-poçt və ya telefon" /></div><Tabs active={status} onChange={setStatus} items={[{ id: 'all', label: 'Hamısı', count: teams.length }, { id: 'pending', label: 'Gözləyir', count: teams.filter((team) => team.approvalStatus === 'pending').length }, { id: 'approved', label: 'Təsdiqlənib', count: teams.filter((team) => team.approvalStatus === 'approved').length }, { id: 'rejected', label: 'Rədd edilib', count: teams.filter((team) => team.approvalStatus === 'rejected').length }, { id: 'banned', label: 'Bloklanıb', count: teams.filter((team) => team.approvalStatus === 'banned').length }]} /></div>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} komanda seçilib</strong><Button variant="secondary" icon={<UserCheck size={17} />} disabled={!serviceCapabilities.bulkApproval}>Təsdiqlə</Button><Button variant="danger" icon={<XCircle size={17} />} disabled={!serviceCapabilities.bulkApproval}>Rədd et</Button></div>}<DataTable headers={['', "Komanda", "Kapitan", 'WhatsApp', "Heyət", "Status", '']} rows={rows} /><MobileDataList items={filtered.map((team) => ({ title: <span className="team-cell"><TeamLogo name={team.name} size="sm" />{team.name}</span>, meta: `${team.captain.firstName} · ${team.roster.length} oyunçu`, value: <StatusBadge status={team.approvalStatus} />, details: <div className="mobile-row-actions"><Link className="button button--ghost" to={`/admin/teams/${team.id}`}><span>Yoxla</span></Link><Checkbox label="Seç" checked={selected.includes(team.id)} onChange={() => toggle(team.id)} /></div> }))} /></>;
}
