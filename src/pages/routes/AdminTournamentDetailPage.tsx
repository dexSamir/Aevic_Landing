import {
ClipboardCheck,
Filter,
MoreHorizontal,
Plus,
Search
} from 'lucide-react';
import { useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import {
Button,
Checkbox,
EmptyState,
PageHeader,
ProgressBar,
StatusBadge
} from '../../components/common/primitives';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { selectAdminOperations } from '../../utils/adminOperations';
import { formatEventDate } from '../../utils/calendar';
import { tournamentById } from '../../utils/routes';
import { TournamentEditForm,TournamentOperations } from '../AdminCompetitionForms';

export function AdminTournamentDetailPage() {
  const snapshot = useAdminPlatformData();
  const { tournaments, teams } = snapshot;
  const { tournamentId } = useParams();
  const tournament = tournamentById(tournaments, tournamentId);
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const toggle = (slot: number) => setSelected((values) => values.includes(slot) ? values.filter((value) => value !== slot) : [...values, slot]);
  if (!tournament) return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title="Turnir tapılmadı" /><EmptyState title="Yanlış turnir ünvanı" body="İdarəetmə paneli başqa turnirin məlumatını göstərmədi. Siyahıdan etibarlı turnir seçin." action={<Link className="button button--secondary" to="/admin/tournaments"><span>Turnir siyahısına qayıt</span></Link>} /></>;
  const { slots: tournamentSlots, capacity } = selectAdminOperations(snapshot, tournament);
  const visibleSlots = tournamentSlots.filter((slot) => `${slot.number} ${teams.find((team) => team.id === slot.teamId)?.name ?? ''}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
  return <><PageHeader eyebrow="Slot və check-in əməliyyatları" title={tournament.name} description={`${capacity.occupied}/${capacity.total} doludur · check-in ${formatEventDate(tournament.checkInOpensAt, { withTime: true })} AZT`} actions={<><Link className="button button--secondary" to={`/admin/tournaments/${tournament.id}/lifecycle`}><span>Həyat dövrü</span></Link><Button disabled variant="secondary" icon={<ClipboardCheck size={17} />}>Check-in düzəlişi</Button><Button disabled icon={<Plus size={17} />}>Komanda təyin et</Button></>} /><section className="slot-admin-summary"><div><span>Dolu</span><strong>{capacity.occupied}</strong></div><div><span>Boş</span><strong>{capacity.available}</strong></div><div><span>Rezerv</span><strong>{capacity.reserved}</strong></div><div><span>Cəmi</span><strong>{capacity.total}</strong></div><ProgressBar value={capacity.occupied + capacity.reserved} max={capacity.total} /></section><div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Komanda və slot axtar" placeholder="Komanda və ya slot axtar" /></div><Button disabled variant="ghost" icon={<Filter size={17} />}>Filtr</Button>{selected.length > 0 && <span className="selection-count">{selected.length} seçilib</span>}</div><div className="slot-management-grid">{visibleSlots.map((slot) => <article className={`slot-management-item slot-management-item--${slot.state} ${selected.includes(slot.number) ? 'selected' : ''}`} key={slot.number}><Checkbox aria-label={`Slot ${slot.number} seç`} checked={selected.includes(slot.number)} onChange={() => toggle(slot.number)} label={<span className="sr-only">Slotu seç</span>} /><span className="slot-management-item__number">{String(slot.number).padStart(2, '0')}</span><div><strong>{slot.state === 'occupied' ? (teams.find((team) => team.id === slot.teamId)?.name ?? 'Kimliyi mənbədə yoxdur') : slot.state === 'reserved' ? 'Rezerv slot' : 'Boş'}</strong><small>{slot.state === 'occupied' ? 'Təsdiqlənmiş qeydiyyat' : slot.state === 'reserved' ? 'rezerv' : 'boş'}</small></div>{slot.state === 'occupied' ? <StatusBadge status={snapshot.checkIns?.some(c=>c.tournamentId===tournament.id&&c.teamId===slot.teamId&&c.status==='checked-in')?'checked-in':'warning'}>{snapshot.checkIns?.find(c=>c.tournamentId===tournament.id&&c.teamId===slot.teamId)?.status??'pending'}</StatusBadge> : <StatusBadge status={slot.state === 'reserved' ? 'locked' : 'approved'}>{slot.state === 'reserved' ? 'Rezerv' : 'Boş'}</StatusBadge>}<Button disabled variant="ghost" aria-label={`Slot ${slot.number} əməliyyatları`}><MoreHorizontal size={17} /></Button></article>)}</div><TournamentEditForm tournamentId={tournament.id}/><TournamentOperations tournamentId={tournament.id}/></>;
}
