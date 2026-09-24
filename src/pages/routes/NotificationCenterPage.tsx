import { Bell } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Button,EmptyState,NotificationItem,PageHeader,Tabs,Toast } from '../../components/common/primitives';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { updateCachedQuery } from '../../services/queryCache';
import type { Notification,TeamPlatformSnapshot } from '../../types/domain';

export function NotificationCenterPage() {
  const snapshot = useTeamPlatformData();
  const [items, setItems] = useState<Notification[]>(snapshot.notifications); const [filter, setFilter] = useState('all'); const [notice, setNotice] = useState(''); const [nextCursor, setNextCursor] = useState<string>(); const [loadingMore, setLoadingMore] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(()=>setItems(current=>[...snapshot.notifications,...current.filter(n=>!snapshot.notifications.some(next=>next.id===n.id))]),[snapshot.notifications]);

  const visible = filter === 'unread' ? items.filter((item) => !item.read) : items;
  const markRead = async (id: string) => { try { await services.notifications.markRead(id); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, notifications: value.notifications.map(item => item.id === id ? { ...item, read: true } : item) })); setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)); } catch { setNotice('Bildiriş yenilənmədi. Yenidən cəhd edin.'); } };
  const markAll = async () => { try { await services.notifications.markAllRead(); updateCachedQuery<TeamPlatformSnapshot>('snapshot:team', value => ({ ...value, notifications: value.notifications.map(item => ({ ...item, read: true })) })); setItems((current) => current.map((item) => ({ ...item, read: true }))); setNotice('Bütün bildirişlər oxunmuş kimi işarələndi.'); } catch { setNotice('Bildirişlər yenilənmədi. Yenidən cəhd edin.'); } };
  const loadMore = async () => { if (historyLoaded && !nextCursor) return; setLoadingMore(true); try { const page = await services.notifications.page(nextCursor); setItems((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))]); setNextCursor(page.nextCursor); setHistoryLoaded(true); } catch { setNotice('Əlavə bildirişlər yüklənmədi.'); } finally { setLoadingMore(false); } };
  return <><PageHeader eyebrow="// SİSTEM HADİSƏLƏRİ" title="Bildiriş mərkəzi" description="Qeydiyyat, check-in, room, nəticə və roster hadisələri. Admin mesajları ayrıca inbox-dadır." actions={<Button variant="secondary" onClick={() => void markAll()} disabled={!items.some((item) => !item.read)}>Hamısını oxunmuş et</Button>} />{notice && <Toast title={notice} onClose={() => setNotice('')} />}<Tabs active={filter} onChange={setFilter} items={[{ id: 'all', label: 'Hamısı', count: items.length }, { id: 'unread', label: 'Oxunmamış', count: items.filter((item) => !item.read).length }]} />{visible.length ? <><div className="notification-center-list">{visible.map((item) => <div key={item.id} ><NotificationItem item={item} />{!item.read && <Button variant="ghost" onClick={() => void markRead(item.id)}>Oxunmuş et</Button>}</div>)}</div>{(!historyLoaded || nextCursor) && <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Daha çox göstər</Button>}</> : <EmptyState icon={<Bell size={26} />} title="Yeni bildiriş yoxdur" body={filter === 'unread' ? 'Bütün bildirişlər oxunub.' : 'Sistem hadisələri yarandıqda burada görünəcək.'} />}</>;
}
