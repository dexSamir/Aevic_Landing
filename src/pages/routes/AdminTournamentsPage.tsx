import {
ArrowRight,
Plus,
Search
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
EmptyState,
PageHeader,
Select,
StatusBadge
} from '../../components/common/primitives';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { selectAdminOperations } from '../../utils/adminOperations';
import { formatEventDate } from '../../utils/calendar';

export function AdminTournamentsPage() {
  const snapshot = useAdminPlatformData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const labels: Record<string, string> = { 'registration-open': 'Qeydiyyat açıqdır', completed: 'Tamamlanıb', published: 'Dərc edilib', draft: 'Qaralama', cancelled: 'Ləğv edilib', live: 'Canlı' };
  const filtered = snapshot.tournaments.filter((item) => (status === 'all' || item.status === status) && item.name.toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az')));
  return <><PageHeader eyebrow="Turnir portfeli" title="Turnirlər" description="Qaralamadan tamamlanmaya qədər status, tutum və nəticə gedişatı." actions={<Link className="button button--secondary" to="/admin/tournaments/new"><Plus size={18} /><span>Yeni turnir</span></Link>} />
    <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Turnir axtar" placeholder="Turnir adına görə axtar" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select label="Status filtri" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Bütün statuslar</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <div className="admin-tournament-table">{filtered.map((tournament) => { const metrics = selectAdminOperations(snapshot, tournament); return <article key={tournament.id}><div className="admin-tournament-table__identity"><span>{formatEventDate(tournament.startsAt)}</span><div><strong>{tournament.name}</strong><small>{tournament.days} gün · {tournament.roundsPerDay * tournament.days} raund</small></div></div><StatusBadge status={tournament.status === 'registration-open' ? 'open' : tournament.status === 'completed' ? 'completed' : 'draft'}>{labels[tournament.status] ?? tournament.status}</StatusBadge><div><span>Tutum</span><strong>{metrics.capacity.total ? metrics.capacity.occupied + '/' + metrics.capacity.total : 'Mənbə yoxdur'}</strong></div><div><span>Mükafat</span><strong>{tournament.prizePool} {tournament.prizeCurrency}</strong></div><Link to={'/admin/tournaments/' + tournament.id}>İdarə et <ArrowRight size={16} /></Link></article>; })}</div>
    {!filtered.length && <EmptyState title="Uyğun turnir yoxdur" body="Axtarış və status filtrini dəyişin." />}
  </>;
}
