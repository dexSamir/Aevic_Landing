import { type FormEvent,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../app/workspaceStyles';
import { Button,FileUpload,Input,PageHeader,Select,Textarea,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import type { SupportTicket } from '../../types/domain';
import { EVIDENCE_UPLOAD_TYPES } from '../../utils/fileValidation';
import '../support-pages.css';

export function NewSupportTicketPage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [evidence, setEvidence] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (loading) return; const form = new FormData(event.currentTarget); setLoading(true); setError(''); try { const item = await services.support.createTicket({ category: form.get('category') as SupportTicket['category'], subject: String(form.get('subject')), description: `${String(form.get('description'))}${evidence ? `\nEvidence: ${evidence}` : ''}` }); navigate(`/account/support/tickets/${item.id}`); } catch { setError('Ticket yaradılmadı. Məlumatlarınızı qoruyub yenidən cəhd edin.'); } finally { setLoading(false); } };
  return <><PageHeader eyebrow="Dəstək sorğusu yarat" title="Problemi izah edin" description="Bir ticket, bir problem. Şifrə, room password və digər secret məlumatları əlavə etməyin." />{error && <Toast tone="error" title="Ticket tamamlanmadı" body={error} />}<form className="operation-form" onSubmit={submit}><Select name="category" label="Kateqoriya" defaultValue="account"><option value="account">Hesab</option><option value="registration">Qeydiyyat</option><option value="roster">Heyət</option><option value="tournament">Turnir</option><option value="results">Nəticələr</option><option value="technical">Texniki</option><option value="other">Digər</option></Select><Input name="subject" label="Mövzu" maxLength={100} required /><Textarea name="description" label="Təsvir" minLength={20} maxLength={2000} required /><FileUpload accept={EVIDENCE_UPLOAD_TYPES} maxBytes={4 * 1024 * 1024} label="Sübut əlavə et" hint="Optional · PNG, JPG və ya PDF; backend virus scan tələb olunur" onFile={(file) => setEvidence(file.name)} />{evidence && <p className="inline-status">{evidence}</p>}<Button type="submit" loading={loading}>Ticket yarat</Button></form></>;
}
