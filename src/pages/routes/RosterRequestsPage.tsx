import { ArrowRight,FileClock } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState,LoadingSkeleton,PageHeader,StatusBadge } from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import type { RosterChangeRequest } from '../../types/domain';
import { requestStatus } from './TeamOperationsPagesShared';
export function RosterRequestsPage() {
  const { currentTeam } = useTeamPlatformData(); const [items, setItems] = useState<RosterChangeRequest[]>(); const [loadError, setLoadError] = useState(false);
  useEffect(() => { services.rosterRequests.list(currentTeam.id).then(setItems).catch(() => setLoadError(true)); }, [currentTeam.id]);
  return <><PageHeader eyebrow="// HEYƏT NƏZARƏTİ" title="Heyət dəyişiklik sorğuları" description="Kilidli dövrdə heyət səssizcə dəyişmir. Hər sorğu səbəb, status və admin qeydi saxlayır." actions={<Link className="button button--primary" to="/team/roster"><span>Yeni sorğu</span></Link>} />{loadError ? <EmptyState title="Məlumat yüklənmədi" body="Sorğu xidməti cavab vermir. Səhifəni yeniləyib cəhd edin." /> : !items ? <LoadingSkeleton variant="list" rows={5} /> : items.length ? <div className="request-ledger">{items.map((item) => <Link to={`/team/roster-requests/${item.id}`} key={item.id}><span><FileClock size={19} />{item.id}</span><div><strong>{item.outgoing.ign} → {item.incoming.ign}</strong><small>{item.tournamentName ?? 'Ümumi roster'} · {new Date(item.submittedAt).toLocaleDateString('az-AZ')}</small></div><StatusBadge status={requestStatus(item.status)}>{item.status}</StatusBadge><ArrowRight size={17} /></Link>)}</div> : <EmptyState title="Roster sorğusu yoxdur" body="Kilidli roster üçün dəyişiklik başladıqda sorğu burada görünəcək." />}</>;
}
