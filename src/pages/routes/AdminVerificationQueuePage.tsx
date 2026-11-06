import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { Button, EmptyState, LoadingSkeleton, PageHeader, Select, StatusBadge } from '../../components/common/primitives';
import { AdminCollectionBar, filterAdminItems } from '../../components/admin/AdminPrimitives';
import { services } from '../../services';
import { useAdminQueue } from '../../services/useAdminQueue';
import { statusLabel } from '../../utils/statusLabels';
import type { VerificationStatus } from '../../types/domain';
export function AdminVerificationQueuePage() {
  const [filter,setFilter]=useState<VerificationStatus>('PENDING'),[search,setSearch]=useState('');
  const query=useAdminQueue(`admin:verifications:${filter}`,cursor=>services.verifications.page(filter,cursor));
  const visible=filterAdminItems(query.items,search,i=>`${i.entityName} ${i.representativeName}`);
  return <><PageHeader eyebrow="Etibar və kimlik" title="Təsdiq sorğuları" description="Təqdim edilmiş sübutları yoxlayın, qərarı və səbəbini qeyd edin."/><div className="admin-toolbar"><Select label="Müraciət statusu" value={filter} onChange={e=>{setFilter(e.target.value as VerificationStatus);setSearch('');}}>{(['PENDING','APPROVED','REJECTED','REVOKED'] as const).map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</Select></div><AdminCollectionBar loaded query={search} onQuery={setSearch} count={visible.length} total={query.items?.length??0}/>
  {query.error&&!query.items?<EmptyState title="Müraciətlər yüklənmədi" body="Bağlantını və giriş icazənizi yoxlayın." action={<Button onClick={query.refetch}>Yenidən yoxla</Button>}/>:!query.items?<LoadingSkeleton variant="table" rows={5}/>:visible.length?<div className="review-ledger">{visible.map(i=><article key={i.id}><BadgeCheck size={19}/><div><strong>{i.entityName}</strong><small>{i.representativeName}</small></div><StatusBadge status={i.status==='APPROVED'?'approved':i.status==='PENDING'?'pending':'rejected'}>{statusLabel(i.status)}</StatusBadge><Link to={`/admin/verifications/${i.id}`}>Yoxla <ArrowRight size={16}/></Link></article>)}</div>:<EmptyState title="Uyğun müraciət yoxdur" body="Axtarışı və status filtrini dəyişin."/>}
  {query.moreError&&<p role="alert">{query.moreError}</p>}{query.hasMore&&<Button variant="secondary" loading={query.loadingMore} onClick={()=>void query.loadMore()}>Daha çox göstər</Button>}</>;
}
