import {
ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
EmptyState,
PageHeader
} from '../../components/common/primitives';
import { useAdminPlatformData } from '../../services/PlatformDataContext';

export function AdminBlacklistPage() {
  const { blacklist } = useAdminPlatformData();
  return <><PageHeader eyebrow="İştirak məhdudiyyətləri" title="Qara siyahı" description="Bloklanmış komanda hesabları. Müddətli sanksiyalar dəstəklənmir; status komandanın yoxlama səhifəsində idarə olunur." />
    {blacklist.length ? <div className="blacklist-list">{blacklist.map(entry => <article key={entry.id}><ShieldAlert size={20}/><div><strong>{entry.teamName}</strong><p>{entry.reason}</p></div><Link to={`/admin/teams/${entry.teamId}`} className="button button--secondary">Komandanı yoxla</Link></article>)}</div> : <EmptyState title="Bloklanmış komanda yoxdur" body="Cari komanda statuslarına əsasən məhdudiyyət qeydi yoxdur."/>}
  </>;
}
