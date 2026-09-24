import {
ArrowRight,
Bell
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
NotificationItem,
PageHeader,
Tabs
} from '../../components/common/primitives';
import { useTeamPlatformData } from '../../services/PlatformDataContext';

export function TeamMessagesPage() {
  const { adminMessages } = useTeamPlatformData();
  const [filter, setFilter] = useState('all');
  return <><PageHeader eyebrow="Rəsmi elanlar" title="Mesajlar" description="Bu bölmə admin-komanda elanları üçündür; söhbət funksiyası deyil." /><Tabs active={filter} onChange={setFilter} items={[{ id: 'all', label: 'Hamısı', count: adminMessages.length }, { id: 'unread', label: 'Oxunmamış', count: adminMessages.filter((item) => !item.read).length }, { id: 'important', label: 'Vacib' }]} /><div className="inbox-layout"><div className="inbox-list">{adminMessages.filter((item) => filter === 'all' || (filter === 'unread' && !item.read) || (filter === 'important' && item.severity === 'critical')).map((message) => <NotificationItem key={message.id} item={message} />)}</div><aside><Bell size={22} /><h2>Bildiriş kanalları</h2><p>Tətbiqdaxili bildiriş aktivdir. Email və push çatdırılması provayder inteqrasiyasından sonra işləyəcək.</p><Link to="/team/settings">Tərcihlər <ArrowRight size={16} /></Link></aside></div></>;
}
