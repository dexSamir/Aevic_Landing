import { usePlatformQuery, invalidateQuery } from '../services/queryCache';
import '../app/workspaceStyles';
import './support-pages.css';
import { EVIDENCE_UPLOAD_TYPES } from '../utils/fileValidation';
import { ArrowLeft, ArrowRight, CircleHelp, LifeBuoy, MessageCircleQuestion, Search } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, FileUpload, Input, LoadingSkeleton, PageHeader, SectionHeading, Select, StatusBadge, Textarea, Toast } from '../components/common/primitives';
import { serviceCapabilities, services } from '../services';
import type { SupportTicket } from '../types/domain';

const faqs = [
  ['account', 'Şifrəmi necə bərpa edə bilərəm?', 'Giriş səhifəsində “Şifrəni unutmusunuz?” keçidini seçin və hesabınızın e-poçt ünvanını daxil edin.'],
  ['registration', 'Komanda qeydiyyatı nə vaxt təsdiqlənir?', 'Qeydiyyatdan sonra e-poçtu təsdiqləyin. Komanda məlumatları administrator tərəfindən yoxlanılır.'],
  ['pubg', 'PUBG ID ictimai görünür?', 'İctimai məlumat xidmətinə PUBG ID və şəxsi əlaqə məlumatları daxil edilmir.'],
  ['roster', 'Heyət dəyişiklikləri necə edilir?', 'Komanda iş sahəsində heyət dəyişikliyi sorğusu göndərin. Roster kilidi və administrator təsdiqi tətbiq olunur.'],
  ['check-in', 'Check-in vaxtını harada tapa bilərəm?', 'Turnir dərc edildikdə mövcud check-in vaxtı onun məlumatlarında göstərilir. Uyğun komanda göstərilən vaxtda iş sahəsindən check-in edə bilər.'],
  ['room', 'Room — otaq kodunu harada görəcəyəm?', 'Otaq kodları və şifrələri ictimai saytda göstərilmir. Otaq məlumatı yalnız check-in etmiş uyğun komandalara, açılış vaxtından sonra iş sahəsində görünür.'],
  ['results', 'Nəticəyə necə etiraz edə bilərəm?', 'Komanda iş sahəsində nəticəyə etiraz göndərin. Müddət və sübut şərtləri serverdə yoxlanılır.'],
  ['badges', 'Nişanlar necə verilir?', 'Nişanlar dərc edilmiş rəsmi nəticələrdən hesablanır; komanda sahibləri rəsmi nailiyyətləri dəyişə bilməz.'],
] as const;

export function SupportCenterPage() {
  const [query, setQuery] = useState(''); const visible = useMemo(() => faqs.filter((item) => `${item[1]} ${item[2]}`.toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az'))), [query]);
  return <section className="support-center page-section"><div className="container"><PageHeader eyebrow="Aydın və praktik kömək" title="Dəstək mərkəzi" description="İctimai buraxılışda mövcud xidmətlər və məhdudiyyətlər haqqında qısa cavablar." /><div className="support-search"><Search size={20} /><input aria-label="Dəstək mövzularında axtar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Check-in, roster, nəticə…" /></div><div className="support-layout"><section><SectionHeading title="Tez-tez verilən suallar" /><div className="faq-list">{visible.map(([id, question, answer]) => <details key={id}><summary>{question}</summary><p>{answer}</p></details>)}</div>{!visible.length && <EmptyState icon={<CircleHelp size={25} />} title="Uyğun cavab tapılmadı" body="Axtarışı sadələşdirin və ya əlaqə məlumatlarına baxın." />}</section><aside><LifeBuoy size={27} /><h2>Hələ də kömək lazımdır?</h2><p>{serviceCapabilities.publicSession ? 'Hesabınıza daxil olaraq sorğu yaradın və statusu izləyin.' : 'Hesab əsaslı dəstək sorğuları hələ əlçatan deyil. Mövcud əlaqə məlumatlarına baxın.'}</p>{serviceCapabilities.publicSession ? <><Link className="button button--primary" to="/account/support/tickets/new"><span>Ticket yarat</span><ArrowRight size={17} /></Link><Link to="/account/support/tickets">Mənim sorğularım</Link></> : <Link className="button button--secondary" to="/contact">Əlaqə məlumatları</Link>}</aside></div></div></section>;
}

export function SupportTicketsPage() {
  const [items, setItems] = useState<SupportTicket[]>(); useEffect(() => { services.support.listTickets().then(setItems); }, []);
  return <><PageHeader eyebrow="My support" title="Dəstək ticket-ləri" description="Account, registration, roster, tournament, results və technical sorğuların statusu." actions={<Link className="button button--primary" to="/account/support/tickets/new"><span>Yeni ticket</span></Link>} />{!items ? <LoadingSkeleton rows={5} /> : items.length ? <div className="request-ledger">{items.map((item) => <Link key={item.id} to={`/account/support/tickets/${item.id}`}><span><MessageCircleQuestion size={19} />{item.id}</span><div><strong>{item.subject}</strong><small>{item.category} · {new Date(item.updatedAt).toLocaleDateString('az-AZ')}</small></div><StatusBadge status={item.status === 'resolved' ? 'approved' : 'warning'}>{item.status}</StatusBadge><ArrowRight size={17} /></Link>)}</div> : <EmptyState title="Ticket yoxdur" body="Dəstək sorğusu yaratdıqda status burada görünəcək." />}</>;
}

export function NewSupportTicketPage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [evidence, setEvidence] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; const form = new FormData(event.currentTarget); setLoading(true); setError(''); try { const item = await services.support.createTicket({ category: form.get('category') as SupportTicket['category'], subject: String(form.get('subject')), description: `${String(form.get('description'))}${evidence ? `\nEvidence: ${evidence}` : ''}` }); navigate(`/account/support/tickets/${item.id}`); } catch { setError('Ticket yaradılmadı. Məlumatlarınızı qoruyub yenidən cəhd edin.'); } finally { setLoading(false); } };
  return <><PageHeader eyebrow="Dəstək sorğusu yarat" title="Problemi izah edin" description="Bir ticket, bir problem. Şifrə, room password və digər secret məlumatları əlavə etməyin." />{error && <Toast tone="error" title="Ticket tamamlanmadı" body={error} />}<form className="operation-form" onSubmit={submit}><Select name="category" label="Kateqoriya" defaultValue="account"><option value="account">Hesab</option><option value="registration">Qeydiyyat</option><option value="roster">Heyət</option><option value="tournament">Turnir</option><option value="results">Nəticələr</option><option value="technical">Texniki</option><option value="other">Digər</option></Select><Input name="subject" label="Mövzu" maxLength={100} required /><Textarea name="description" label="Təsvir" minLength={20} maxLength={2000} required /><FileUpload accept={EVIDENCE_UPLOAD_TYPES} maxBytes={4 * 1024 * 1024} label="Sübut əlavə et" hint="Optional · PNG, JPG və ya PDF; backend virus scan tələb olunur" onFile={(file) => setEvidence(file.name)} />{evidence && <p className="inline-status">{evidence}</p>}<Button type="submit" loading={loading}>Ticket yarat</Button></form></>;
}

export function SupportTicketDetailPage() {
 const {ticketId=''}=useParams();const[params]=useSearchParams();const admin=params.get('view')==='admin';
 const query=usePlatformQuery({key:`support:${admin?'admin':'own'}:${ticketId}`,query:()=>admin?services.support.adminTicket(ticketId):services.support.getTicket(ticketId)});
 const [reply,setReply]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const send=async(e:FormEvent)=>{e.preventDefault();if(busy||!reply.trim())return;setBusy(true);setNotice('');try{await (admin?services.support.adminReply(ticketId,{body:reply}):services.support.reply(ticketId,{body:reply}));setReply('');setNotice('Cavab saxlanıldı.');}catch{setNotice('Cavab saxlanılmadı. Mətniniz formadadır.');}finally{setBusy(false);}};
 const change=async(status:SupportTicket['status'])=>{if(busy)return;setBusy(true);try{await services.support.changeStatus(ticketId,status);setNotice('Status yeniləndi.');}catch{setNotice('Status yenilənmədi.');}finally{setBusy(false);}};
 if(query.loading&&!query.data)return <LoadingSkeleton rows={5}/>;
 if(query.error)return <EmptyState title="Sorğu yüklənmədi" body="İcazəni və bağlantını yoxlayın." action={<Button onClick={query.refetch}>Yenidən yoxla</Button>}/>;
 const item=query.data;if(!item)return <EmptyState title="Sorğu tapılmadı" body="Bu sorğu mövcud deyil və ya onu görmək üçün icazəniz yoxdur."/>;
 return <><Link to={admin?'/admin/support':'/account/support/tickets'}>← Sorğulara qayıt</Link><PageHeader eyebrow={item.id} title={item.subject} description={`${item.category} · ${item.status}`}/>{notice&&<p role="status">{notice}</p>}<div className="ticket-thread"><article><strong>Müraciət</strong><p>{item.description}</p><time>{new Date(item.createdAt).toLocaleString('az-AZ')}</time></article>{item.messages.map(message=><article key={message.id} className={message.author==='support'?'is-support':''}><strong>{message.author==='support'?'AEVIC Support':'İstifadəçi'}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString('az-AZ')}</time></article>)}</div><form className="operation-form" onSubmit={send}><Textarea label="Cavabınız" value={reply} onChange={e=>setReply(e.target.value)} minLength={1} maxLength={6000} required/><Button type="submit" loading={busy}>Cavab göndər</Button></form>{admin&&<Select label="Sorğu statusu" value={item.status} disabled={busy} onChange={e=>void change(e.target.value as SupportTicket['status'])}>{['open','waiting-for-user','under-review','resolved','closed'].map(status=><option key={status}>{status}</option>)}</Select>}</>;
}
