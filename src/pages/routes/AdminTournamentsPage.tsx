import {
ArrowRight,
Plus,
Search
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminListSummary } from '../../components/admin/AdminPrimitives';
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
  const [params,setParams]=useSearchParams();
  const status=params.get('status')??'all';
  const setStatus=(value:string)=>setParams(value==='all'?{}:{status:value});
  const [order,setOrder]=useState('recent');
  const labels: Record<string, string> = { 'registration-open': 'Qeydiyyat açıqdır', completed: 'Tamamlanıb', published: 'Dərc edilib', draft: 'Qaralama', cancelled: 'Ləğv edilib', ongoing: 'Davam edir', live: 'Canlı' };
  const filtered = snapshot.tournaments.filter((item) => (status === 'all' || (status==='active' ? ['published','registration-open','ongoing'].includes(item.status) : item.status === status)) && item.name.toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az'))).sort((a,b)=>order==='name'?a.name.localeCompare(b.name,'az'):(order==='oldest'?1:-1)*(Date.parse(a.startsAt)-Date.parse(b.startsAt)));
  return <><PageHeader eyebrow="Turnir portfeli" title="Turnirlər" description="Qaralamadan tamamlanmaya qədər status, tutum və nəticə gedişatı." actions={<Link className="button button--secondary" to="/admin/tournaments/new"><Plus size={18} /><span>Yeni turnir</span></Link>} />
    <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Turnir axtar" placeholder="Turnir adına görə axtar" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select label="Status filtri" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Bütün statuslar</option><option value="active">Aktiv və qarşıdakı</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <AdminListSummary count={filtered.length} total={snapshot.tournaments.length}><Select label="Sıralama" value={order} onChange={e=>setOrder(e.target.value)}><option value="recent">Əvvəlcə ən yeni</option><option value="oldest">Əvvəlcə ən köhnə</option><option value="name">Ada görə A–Z</option></Select></AdminListSummary><div className="admin-tournament-table">{filtered.map((tournament) => { const metrics = selectAdminOperations(snapshot, tournament); return <article key={tournament.id}><div className="admin-tournament-table__identity"><span>{formatEventDate(tournament.startsAt)}</span><div><strong>{tournament.name}</strong><small>{tournament.days} gün · {tournament.roundsPerDay * tournament.days} raund</small></div></div><StatusBadge status={tournament.status === 'registration-open' ? 'open' : tournament.status === 'completed' ? 'completed' : tournament.status === 'ongoing' ? 'live' : tournament.status === 'cancelled' ? 'rejected' : 'draft'}>{labels[tournament.status] ?? tournament.status}</StatusBadge><div><span>Tutum</span><strong>{metrics.capacity.total ? metrics.capacity.occupied + '/' + metrics.capacity.total : 'Mənbə yoxdur'}</strong></div><div><span>Mükafat</span><strong>{tournament.prizePool} {tournament.prizeCurrency}</strong></div><Link to={'/admin/tournaments/' + tournament.id}>İdarə et <ArrowRight size={16} /></Link></article>; })}</div>
    {!filtered.length && <EmptyState title="Uyğun turnir yoxdur" body="Axtarış və status filtrini dəyişin." />}
  </>;
}
