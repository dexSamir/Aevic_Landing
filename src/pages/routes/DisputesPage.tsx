import { ArrowRight,Gavel } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState,LoadingSkeleton,PageHeader,StatusBadge } from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import type { ResultDispute } from '../../types/domain';
import { disputeStatus } from './TeamOperationsPagesShared';
export function DisputesPage() {
  const { currentTeam } = useTeamPlatformData(); const [items, setItems] = useState<ResultDispute[]>(); const [loadError, setLoadError] = useState(false);
  useEffect(() => { services.disputes.list(currentTeam.id).then(setItems).catch(() => setLoadError(true)); }, [currentTeam.id]);
  return <><PageHeader eyebrow="// RƏSMİ NƏTİCƏ YOXLAMASI" title="Nəticə etirazları" description="Etiraz müddətində göndərilən etirazlar sübut və qərar tarixçəsi ilə izlənir." actions={<Link className="button button--primary" to="/team/disputes/new"><span>Nəticəyə etiraz et</span></Link>} />{loadError ? <EmptyState title="Məlumat yüklənmədi" body="Sorğu xidməti cavab vermir. Səhifəni yeniləyib cəhd edin." /> : !items ? <LoadingSkeleton variant="list" rows={5} /> : items.length ? <div className="request-ledger">{items.map((item) => <Link to={`/team/disputes/${item.id}`} key={item.id}><span><Gavel size={19} />{item.id}</span><div><strong>{item.tournamentName} · {item.roundLabel}</strong><small>{item.issueType} · {new Date(item.submittedAt).toLocaleDateString('az-AZ')}</small></div><StatusBadge status={disputeStatus(item.status)}>{item.status}</StatusBadge><ArrowRight size={17} /></Link>)}</div> : <EmptyState icon={<Gavel size={26} />} title="Etiraz yoxdur" body="Dərc edilmiş nəticə ilə bağlı etiraz göndərdikdə burada görünəcək." />}</>;
}
