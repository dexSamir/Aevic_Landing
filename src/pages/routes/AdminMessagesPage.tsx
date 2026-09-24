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
  return <><PageHeader eyebrow="Komanda elanları" title="Mesaj mərkəzi" description="Bütün komandalar üçün tətbiqdaxili elan." />{notice && <p role="status">{notice}</p>}<div className="message-admin-layout"><form onSubmit={submit}><SectionHeading title="Yeni elan" /><Input label="Elan başlığı" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /><Textarea label="Elan mətni" value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={4000} required /><Button type="submit" loading={pending} disabled={!title.trim() || !body.trim()} icon={<Send size={17} />}>Elanı göndər</Button></form><section><SectionHeading title="Göndərilmiş elanlar" />{messages.map((message) => <article className="sent-message" key={message.id}><time>{formatEventDate(message.createdAt, { withTime: true })}</time><h3>{message.title}</h3><p>{message.body}</p></article>)}</section></div></>;
}
