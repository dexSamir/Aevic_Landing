import { type FormEvent,useState } from 'react';
import { Link,useParams,useSearchParams } from 'react-router-dom';
import '../../app/workspaceStyles';
import { Button,EmptyState,LoadingSkeleton,PageHeader,Select,Textarea } from '../../components/common/primitives';
import { services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import type { SupportTicket } from '../../types/domain';
import '../support-pages.css';

export function SupportTicketDetailPage() {
 const {ticketId=''}=useParams();const[params]=useSearchParams();const admin=params.get('view')==='admin';
 const query=usePlatformQuery({key:`support:${admin?'admin':'own'}:${ticketId}`,query:()=>admin?services.support.adminTicket(ticketId):services.support.getTicket(ticketId)});
 const [reply,setReply]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const send=async(e:FormEvent)=>{e.preventDefault();if(busy||!reply.trim())return;setBusy(true);setNotice('');try{await (admin?services.support.adminReply(ticketId,{body:reply}):services.support.reply(ticketId,{body:reply}));setReply('');setNotice('Cavab saxlanıldı.');}catch{setNotice('Cavab saxlanılmadı. Mətniniz formadadır.');}finally{setBusy(false);}};
 const change=async(status:SupportTicket['status'])=>{if(busy)return;setBusy(true);try{await services.support.changeStatus(ticketId,status);setNotice('Status yeniləndi.');}catch{setNotice('Status yenilənmədi.');}finally{setBusy(false);}};
 if(query.loading&&!query.data)return <LoadingSkeleton variant="list" rows={5}/>;
 if(query.error)return <EmptyState title="Sorğu yüklənmədi" body="İcazəni və bağlantını yoxlayın." action={<Button onClick={query.refetch}>Yenidən yoxla</Button>}/>;
 const item=query.data;if(!item)return <EmptyState title="Sorğu tapılmadı" body="Bu sorğu mövcud deyil və ya onu görmək üçün icazəniz yoxdur."/>;
 return <><Link to={admin?'/admin/support':'/account/support/tickets'}>← Sorğulara qayıt</Link><PageHeader eyebrow={item.id} title={item.subject} description={`${item.category} · ${item.status}`}/>{notice&&<p role="status">{notice}</p>}<div className="ticket-thread"><article><strong>Müraciət</strong><p>{item.description}</p><time>{new Date(item.createdAt).toLocaleString('az-AZ')}</time></article>{item.messages.map(message=><article key={message.id} className={message.author==='support'?'is-support':''}><strong>{message.author==='support'?'AEVIC Support':'İstifadəçi'}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString('az-AZ')}</time></article>)}</div><form className="operation-form" onSubmit={send}><Textarea label="Cavabınız" value={reply} onChange={e=>setReply(e.target.value)} minLength={1} maxLength={6000} required/><Button type="submit" loading={busy}>Cavab göndər</Button></form>{admin&&<Select label="Sorğu statusu" value={item.status} disabled={busy} onChange={e=>void change(e.target.value as SupportTicket['status'])}>{['open','waiting-for-user','under-review','resolved','closed'].map(status=><option key={status}>{status}</option>)}</Select>}</>;
}
