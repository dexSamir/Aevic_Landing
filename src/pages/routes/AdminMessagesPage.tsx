import { EmptyState } from '../../components/common/primitives';
import { AdminSearch, filterAdminItems } from '../../components/admin/AdminPrimitives';
import {
Send
} from 'lucide-react';
import { type FormEvent,useState } from 'react';
import {
Button,
Input,
PageHeader,
SectionHeading,
Textarea
} from '../../components/common/primitives';
import { services } from '../../services';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { formatEventDate } from '../../utils/calendar';

export function AdminMessagesPage() {
  const { adminMessages } = useAdminPlatformData();
  const [search,setSearch]=useState('');
  const [messages, setMessages] = useState(adminMessages);
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [pending, setPending] = useState(false); const [notice, setNotice] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending || !title.trim() || !body.trim()) return;
    setPending(true); setNotice('');
    try {
      await services.admin.sendMessage({ title: title.trim(), body: body.trim(), severity: 'info', audience: 'all' });
      const snapshot = await services.snapshots.admin();
      setMessages(snapshot.adminMessages); setTitle(''); setBody('');
      setNotice('Elan komanda mesajlarına əlavə edildi.');
    } catch { setNotice('Elan göndərilmədi. Yenidən yoxlayın.'); }
    finally { setPending(false); }
  };
  const visible=filterAdminItems(messages,search,m=>m.title+' '+m.body,'recent',m=>m.createdAt);
  return <><PageHeader eyebrow="Komanda elanları" title="Mesaj mərkəzi" description="Bütün komandalar üçün tətbiqdaxili elan." />{notice && <p role="status">{notice}</p>}<div className="message-admin-layout"><form onSubmit={submit}><SectionHeading title="Yeni elan" /><div className="admin-message-audience"><span>Auditoriya</span><strong>Bütün komandalar</strong><small>Tətbiqdaxili elan</small></div><Input label="Elan başlığı" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /><Textarea label="Elan mətni" value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={4000} required /><details className="admin-advanced"><summary>Göndərilmədən əvvəl önbaxış</summary><h3>{title||'Elan başlığı'}</h3><p style={{whiteSpace:'pre-wrap'}}>{body||'Elan mətni'}</p></details><Button type="submit" loading={pending} disabled={!title.trim() || !body.trim()} icon={<Send size={17} />}>Elanı göndər</Button></form><section><SectionHeading title="Göndərilmiş elanlar" /><AdminSearch value={search} onChange={setSearch} label="Elan axtar"/>{!visible.length&&<EmptyState title="Elan tapılmadı" body="Göndərilmiş elanlar burada görünəcək."/>}{visible.map((message) => <article className="sent-message" key={message.id}><time>{formatEventDate(message.createdAt, { withTime: true })}</time><h3>{message.title}</h3><p>{message.body}</p></article>)}</section></div></>;
}
