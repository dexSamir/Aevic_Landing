import {
ArrowRight,
Bell
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import {
Button,EmptyState,NotificationItem,
PageHeader,
Tabs
} from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';

export function TeamMessagesPage() {
  const { adminMessages } = useTeamPlatformData();
  const [items,setItems]=useState(adminMessages);const [notice,setNotice]=useState('');const [busy,setBusy]=useState<string>();
  useEffect(()=>setItems(adminMessages),[adminMessages]);
  const markRead=async(id:string)=>{if(busy)return;setBusy(id);try{await services.notifications.markMessageRead(id);setItems(current=>current.map(item=>item.id===id?{...item,read:true}:item));}catch{setNotice('Mesaj yenilənmədi. Yenidən cəhd edin.');}finally{setBusy(undefined);}};
  const [filter, setFilter] = useState('all');
  const visible=items.filter(item=>filter==='all'||filter==='unread'&&!item.read||filter==='important'&&item.severity==='critical');
  return <><PageHeader eyebrow="Rəsmi elanlar" title="Mesajlar" description="Bu bölmə admin-komanda elanları üçündür; söhbət funksiyası deyil." />{notice&&<p role="alert">{notice}</p>}<Tabs active={filter} onChange={setFilter} items={[{ id: 'all', label: 'Hamısı', count: items.length }, { id: 'unread', label: 'Oxunmamış', count: items.filter((item) => !item.read).length }, { id: 'important', label: 'Vacib' }]} /><div className="inbox-layout"><div className="inbox-list">{visible.length ? visible.map((message) => <div key={message.id}><NotificationItem item={message} />{!message.read&&<Button variant="ghost" disabled={Boolean(busy)} onClick={()=>void markRead(message.id)}>Oxunmuş et</Button>}</div>) : <EmptyState title="Mesaj yoxdur" body={filter==='unread'?'Bütün elanlar oxunub.':'Bu filtrə uyğun elan yoxdur.'} />}</div><aside><Bell size={22} /><h2>Bildiriş kanalları</h2><p>Rəsmi elanlar bu bölmədə və tətbiqdaxili bildiriş mərkəzində saxlanır.</p><Link to="/team/settings">Tərcihlər <ArrowRight size={16} /></Link></aside></div></>;
}
