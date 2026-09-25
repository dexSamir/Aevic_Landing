import { type FormEvent,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import '../../app/workspaceStyles';
import { Button,FileUpload,Input,PageHeader,Select,Textarea,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import type { SupportTicket } from '../../types/domain';

import '../support-pages.css';

export function NewSupportTicketPage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [evidence, setEvidence] = useState<File>(); const [createdId,setCreatedId]=useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; const form = new FormData(event.currentTarget); setLoading(true); setError(''); try { let id=createdId;if(!id){const item = await services.support.createTicket({ category: form.get('category') as SupportTicket['category'], subject: String(form.get('subject')), description: String(form.get('description')) });id=item.id;setCreatedId(id);}if(evidence)await services.support.uploadAttachment(id,evidence);navigate(`/account/support/tickets/${id}`); } catch { setError('Sorğu və ya şəkil tam saxlanılmadı. Yenidən cəhd edin; yaradılmış sorğu təkrarlanmayacaq.'); } finally { setLoading(false); } };
  return <><PageHeader eyebrow="Dəstək sorğusu yarat" title="Problemi izah edin" description="Bir ticket, bir problem. Şifrə, room password və digər secret məlumatları əlavə etməyin." />{error && <Toast tone="error" title="Ticket tamamlanmadı" body={error} />}<form className="operation-form" onSubmit={submit}><Select disabled={!!createdId} name="category" label="Kateqoriya" defaultValue="account"><option value="account">Hesab</option><option value="registration">Qeydiyyat</option><option value="roster">Heyət</option><option value="tournament">Turnir</option><option value="results">Nəticələr</option><option value="technical">Texniki</option><option value="other">Digər</option></Select><Input disabled={!!createdId} name="subject" label="Mövzu" maxLength={100} required /><Textarea disabled={!!createdId} name="description" label="Təsvir" minLength={20} maxLength={2000} required /><FileUpload accept={['image/png','image/jpeg','image/webp']} maxBytes={4_000_000} label="Sübut əlavə et" hint="PNG, JPG və ya WebP · 4 MB · Yalnız siz və dəstək əməkdaşları görə bilər" onFile={setEvidence} />{evidence && <p className="inline-status">{evidence.name}</p>}<Button type="submit" loading={loading}>{createdId?'Şəkli yenidən göndər':'Ticket yarat'}</Button>{createdId&&<Link to={`/account/support/tickets/${createdId}`}>Yaradılmış sorğunu aç</Link>}</form></>;
}
