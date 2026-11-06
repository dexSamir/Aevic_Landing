import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, EmptyState, LoadingSkeleton, PageHeader, Select, StatusBadge } from '../../components/common/primitives';
import { AdminCollectionBar, filterAdminItems } from '../../components/admin/AdminPrimitives';
import { services } from '../../services';
import { useAdminQueue } from '../../services/useAdminQueue';
import { statusLabel } from '../../utils/statusLabels';
import { formatEventDate } from '../../utils/calendar';
import type { SupportTicket } from '../../types/domain';
export function AdminSupportQueuePage() {
  const [filter,setFilter]=useState<SupportTicket['status']|''>(''),[search,setSearch]=useState(''),[order,setOrder]=useState('recent');
  const query=useAdminQueue(`support:admin:${filter}`,cursor=>services.support.adminPage(cursor,filter||undefined));
  const visible=filterAdminItems(query.items,search,i=>`${i.subject} ${i.id} ${i.category}`,order,i=>i.updatedAt);
  return <><PageHeader eyebrow="Dəstək masası" title="Dəstək sorğuları" description="Açıq müraciətləri prioritetləşdirin, cavab verin və həllini izləyin."/><div className="admin-toolbar"><Select label="Müraciət statusu" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="">Hamısı</option>{['open','waiting-for-user','under-review','resolved','closed'].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</Select></div><AdminCollectionBar loaded query={search} onQuery={setSearch} count={visible.length} total={query.items?.length??0} order={order} onOrder={setOrder}/>
  {query.error&&!query.items?<EmptyState title="Sorğular yüklənmədi" body="Bağlantını və giriş icazənizi yoxlayın." action={<Button onClick={query.refetch}>Yenidən yoxla</Button>}/>:!query.items?<LoadingSkeleton variant="table" rows={5}/>:visible.length?<div className="request-ledger">{visible.map(i=><Link key={i.id} to={`/account/support/tickets/${i.id}?view=admin`}><span>{i.id.length>16?i.id.slice(0,8)+'…':i.id}</span><div><strong>{i.subject}</strong><small>{formatEventDate(i.updatedAt,{withTime:true})} AZT</small></div><StatusBadge status={i.status==='resolved'||i.status==='closed'?'completed':i.status==='open'?'open':'warning'}>{statusLabel(i.status)}</StatusBadge><ArrowRight size={16}/></Link>)}</div>:<EmptyState title="Uyğun sorğu yoxdur" body="Axtarışı və status filtrini dəyişin."/>}
  {query.moreError&&<p role="alert">{query.moreError}</p>}{query.hasMore&&<Button variant="secondary" loading={query.loadingMore} onClick={()=>void query.loadMore()}>Daha çox göstər</Button>}</>;
}
