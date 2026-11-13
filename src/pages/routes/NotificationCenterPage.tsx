import { ArrowUpRight, Bell, CheckCheck, Layers, Mail, MailOpen, Search, Star, Trophy } from 'lucide-react';
import { useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, EmptyState, Modal, PageHeader, Toast } from '../../components/common/primitives';
import { NotificationOverlayContext } from '../../layouts/NotificationOverlayContext';
import { services } from '../../services';
import { useTeamPlatformData } from '../../services/PlatformDataContext';
import { updateCachedQuery } from '../../services/queryCache';
import type { Notification, TeamPlatformSnapshot } from '../../types/domain';
import { sanitizeInternalPath, sanitizeOutboundUrl } from '../../utils/outboundUrl';
import { notificationTime, notificationVisual } from './notificationVisuals';
import './notification-center.css';

const mediaQuery = '(max-width: 1023px)';
const subscribeWidth = (notify: () => void) => {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const isMobile = () => window.matchMedia(mediaQuery).matches;
const filters = { all: 'Hamısı', unread: 'Oxunmamış', important: 'Vacib' };
type Filter = keyof typeof filters;
type Patch = (item: Notification) => Notification;

export function NotificationCenterPage() {
  const snapshot = useTeamPlatformData();
  return <NotificationInbox key={snapshot.currentTeam.id + ':' + (snapshot.accountId ?? '')}
    initialItems={snapshot.notifications} initialCursor={snapshot.notifications.length >= 10000 ? String(snapshot.notifications.length) : undefined} onUpdate={patch => updateCachedQuery<TeamPlatformSnapshot>('snapshot:team',
      value => ({ ...value, notifications: value.notifications.map(patch) }))} />;
}

function CategoryIcon({ item }: { item: Notification }) {
  const { icon: Icon, tone } = notificationVisual(item);
  return <span className="inbox-category-icon" data-tone={tone} title={notificationVisual(item).label}><span className="sr-only">{notificationVisual(item).label}</span><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>;
}

function NotificationDetail({ item, busy, read, star }: { item: Notification; busy: boolean; read: () => void; star: () => void }) {
  const internal = sanitizeInternalPath(item.actionHref);
  const external = internal ? undefined : sanitizeOutboundUrl(item.actionHref);
  const label = item.actionLabel ?? (item.eventType === 'champion' || item.eventType === 'map-result' ? 'Nəticələrə bax' : 'Ətraflı bax');
  const action = <>{label}<ArrowUpRight size={16} aria-hidden="true" /></>;
  return <article className="inbox-detail" data-champion={item.eventType === 'champion' || undefined}>
    <div className="inbox-detail__category"><CategoryIcon item={item}/><div><strong>{item.senderAlias || 'AEVIC Admin'} · {notificationVisual(item).label}</strong>
      <time dateTime={item.createdAt}>{notificationTime(item.createdAt, Date.now()).full} · Bakı</time></div></div>
    <h2>{item.title}</h2>
    {item.tournamentName && <div className="inbox-detail__context"><Trophy size={16} aria-hidden="true"/>{item.tournamentName}</div>}
    <p className="inbox-detail__body">{item.body}</p>
    {internal ? <Link className="inbox-detail__link" to={internal}>{action}</Link> : external && <a className="inbox-detail__link" href={external} target="_blank" rel="noopener noreferrer">{action}</a>}
    <footer><Button variant="ghost" disabled={busy} onClick={read} icon={item.read ? <Mail size={16}/> : <MailOpen size={16}/>}>{item.read ? 'Oxunmamış et' : 'Oxunmuş et'}</Button>
      <Button variant="ghost" disabled={busy} aria-pressed={Boolean(item.important)} onClick={star} icon={<Star size={16} fill={item.important ? 'currentColor' : 'none'}/>}>Vacib</Button></footer>
  </article>;
}

export function NotificationInbox({ initialItems, initialCursor, onUpdate }: {
  initialItems: Notification[]; initialCursor?: string; onUpdate?: (patch: Patch) => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [extraItems, setExtraItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const active = useRef(true);
  const mobile = useSyncExternalStore(subscribeWidth, isMobile, () => false);
  const setOverlay = useContext(NotificationOverlayContext);
  const navigate = useNavigate();
  const location = useLocation();
  const sheetId: string | undefined = location.state?.notificationSheet;
  const dragStart = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const knownIds = new Set(items.map(item => item.id));
  const all = [...items, ...extraItems.filter(item => !knownIds.has(item.id))];
  const unread = all.filter(item => !item.read).length;
  const term = search.trim().toLocaleLowerCase('az');
  const visible = all.filter(item => (filter === 'all' || (filter === 'unread' ? !item.read : item.important)) &&
    [item.title, item.body, item.tournamentName, item.senderAlias || 'AEVIC Admin', notificationVisual(item).label].join(' ').toLocaleLowerCase('az').includes(term));
  const selected = mobile ? all.find(item => item.id === (sheetId ?? selectedId)) : visible.find(item => item.id === selectedId) ?? visible[0];
  const sheetOpen = Boolean(mobile && sheetId && selected);
  const now = Date.now();

  useEffect(() => setItems(initialItems), [initialItems]);
  useLayoutEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useLayoutEffect(() => {
    if (!sheetOpen) return;
    setOverlay(true);
    return () => {
      setOverlay(false);
      queueMicrotask(() => { if (active.current && !triggerRef.current?.isConnected) searchRef.current?.focus({ preventScroll: true }); });
    };
  }, [sheetOpen, setOverlay]);

  async function mutate(write: () => Promise<void>, patch: Patch, message?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await write();
      if (!active.current) return;
      setItems(current => current.map(patch));
      setExtraItems(current => current.map(patch));
      onUpdate?.(patch);
      setNotice(message ?? '');
    } catch {
      if (active.current) setNotice('Bildirişlər yenilənmədi. Yenidən cəhd edin.');
    } finally { if (active.current) setBusy(false); }
  }
  async function loadMore() {
    setLoading(true);
    try {
      const page = await services.notifications.page(cursor);
      setExtraItems(current => [...current, ...page.items.filter(item => !current.some(n => n.id === item.id))]);
      setCursor(page.nextCursor);
      setDisplayLimit(limit => limit + 50);
    } catch { setNotice('Əlavə bildirişlər yüklənmədi.'); }
    finally { setLoading(false); }
  }
  function select(item: Notification, trigger: HTMLButtonElement) {
    setSelectedId(item.id);
    if (mobile) {
      triggerRef.current = trigger;
      trigger.focus({ preventScroll: true });
      navigate(location.pathname + location.search + location.hash, { state: { ...location.state, notificationSheet: item.id }, preventScrollReset: true });
    }
  }
  const close = () => { if (sheetId) navigate(-1); };
  const detail = selected && <NotificationDetail item={selected} busy={busy}
    read={() => void mutate(() => services.notifications.markRead(selected.id, !selected.read), n => n.id === selected.id ? { ...n, read: !selected.read } : n)}
    star={() => void mutate(() => services.notifications.setImportant(selected.id, !selected.important), n => n.id === selected.id ? { ...n, important: !selected.important } : n)} />;
  const groups = new Map<string, Notification[]>();
  for (const item of visible.slice(0, displayLimit)) {
    const group = notificationTime(item.createdAt, now).group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }
  return <>
    <PageHeader className="notification-heading" title="Bildiriş mərkəzi" description="Hesabınız, komandanız və turnirləriniz haqqında rəsmi bildirişlər." />
    {notice && !sheetOpen && <Toast title={notice} onClose={() => setNotice('')} />}
    <div className="notification-overview">
      <div className="notification-metric"><Bell size={21} aria-hidden="true"/><div><strong>{unread}</strong><span>{cursor ? 'Yüklənmiş oxunmamış' : 'Oxunmamış'}</span></div></div>
      <div className="notification-metric"><Layers size={21} aria-hidden="true"/><div><strong>{all.length}</strong><span>{cursor ? 'Yüklənmiş bildiriş' : 'Bildiriş'}</span></div></div>
      <Button variant="secondary" icon={<CheckCheck size={17}/>} disabled={busy || !unread}
        onClick={() => void mutate(() => services.notifications.markAllRead(), n => ({ ...n, read: true }), 'Bütün bildirişlər oxunmuş kimi işarələndi.')}>Hamısını oxunmuş et</Button>
    </div>
    <div className="notification-feed__tools">
      <div className="notification-filters" aria-label="Filtrlər" role="group">{(Object.keys(filters) as Filter[]).map(key =>
        <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{filters[key]}{key === 'important' && <Star size={13} aria-hidden="true"/>}</button>)}</div>
      <label className="notification-search"><Search size={17} aria-hidden="true"/><input ref={searchRef} type="search" aria-label="Bildirişlərdə axtar" placeholder="Bildirişlərdə axtar" value={search} onChange={e => setSearch(e.target.value)}/></label>
    </div>
    <div className="notification-workspace">
      <section className="notification-feed" aria-label="Bildirişlər">
        {[...groups].map(([name, rows]) => <section className="notification-day" key={name}><h2>{name}</h2>
          {rows.map(item => <button key={item.id} className="notification-row" data-unread={!item.read || undefined}
            aria-current={!mobile && selected?.id === item.id || undefined} aria-haspopup={mobile ? 'dialog' : undefined} onClick={e => select(item, e.currentTarget)}>
            <CategoryIcon item={item}/>
            <span className="notification-row__copy"><strong>{item.title}</strong>
              <span className="notification-row__sender">{item.senderAlias || 'AEVIC Admin'} · {notificationVisual(item).label}</span>
              <span className="notification-row__preview">{item.tournamentName && <>{item.tournamentName} · </>}{item.body}</span></span>
            <span className="notification-row__trailing"><time dateTime={item.createdAt}>{notificationTime(item.createdAt, now).short}</time>
              {!item.read && <span className="notification-dot" aria-label="Oxunmamış"/>}{item.important && <Star size={12} aria-label="Vacib" fill="currentColor"/>}</span>
          </button>)}</section>)}
        {!visible.length && <EmptyState icon={<Bell size={22}/>} title={all.length ? 'Uyğun bildiriş yoxdur' : 'Yeni bildiriş yoxdur'} body={all.length ? 'Axtarışı və ya filtri dəyişin.' : 'Bildirişləriniz burada görünəcək.'}/>}
        {(visible.length > displayLimit || cursor) && <Button className="notification-more" loading={loading} variant="ghost" onClick={() => visible.length > displayLimit ? setDisplayLimit(limit => limit + 50) : void loadMore()}>Daha çox göstər</Button>}
      </section>
      {!mobile && <section className="notification-reader" aria-label="Bildirişin məzmunu">{detail ?? <Bell size={36} aria-hidden="true"/>}</section>}
    </div>
    <Modal open={sheetOpen} title={selected?.title ?? 'Bildiriş'} customHeading className="notification-sheet" onClose={close}>
      <div className="notification-sheet__grip" aria-hidden="true" onPointerDown={e => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerCancel={() => { dragStart.current = undefined; }}
        onPointerUp={e => { if (dragStart.current !== undefined && e.clientY - dragStart.current >= 48) close(); dragStart.current = undefined; }}><span/></div>
      {detail}{notice && <p className="notification-sheet__notice" role="status">{notice}</p>}
    </Modal>
  </>;
}
