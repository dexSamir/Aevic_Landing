import { ArrowRight,MessageCircleQuestion } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import '../../app/workspaceStyles';
import { EmptyState,LoadingSkeleton,PageHeader,StatusBadge } from '../../components/common/primitives';
import { services } from '../../services';
import type { SupportTicket } from '../../types/domain';
import '../support-pages.css';

export function SupportTicketsPage() {
  const [items, setItems] = useState<SupportTicket[]>(); useEffect(() => { services.support.listTickets().then(setItems); }, []);
  return <><PageHeader eyebrow="My support" title="Dəstək ticket-ləri" description="Account, registration, roster, tournament, results və technical sorğuların statusu." actions={<Link className="button button--primary" to="/account/support/tickets/new"><span>Yeni ticket</span></Link>} />{!items ? <LoadingSkeleton variant="list" rows={5} /> : items.length ? <div className="request-ledger">{items.map((item) => <Link key={item.id} to={`/account/support/tickets/${item.id}`}><span><MessageCircleQuestion size={19} />{item.id}</span><div><strong>{item.subject}</strong><small>{item.category} · {new Date(item.updatedAt).toLocaleDateString('az-AZ')}</small></div><StatusBadge status={item.status === 'resolved' ? 'approved' : 'warning'}>{item.status}</StatusBadge><ArrowRight size={17} /></Link>)}</div> : <EmptyState title="Ticket yoxdur" body="Dəstək sorğusu yaratdıqda status burada görünəcək." />}</>;
}
