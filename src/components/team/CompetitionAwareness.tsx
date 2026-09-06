import { sanitizeInternalPath } from '../../utils/outboundUrl';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ChevronRight, CircleDot, KeyRound, MessageSquare, Swords, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { competitionNow } from '../../services';
import type { AdminMessage, CompetitionEventEntityType, CompetitionEventPriority, CompetitionEventType, Notification, TeamAnnouncement } from '../../types/domain';

export interface CompetitionAwarenessEvent {
  id: string;
  eventId?: string;
  targetTeamId?: string;
  revisionId?: string;
  sourceId: string;
  sourceType: 'notification' | 'admin-message' | 'announcement';
  eventType: CompetitionEventType;
  entityType?: CompetitionEventEntityType;
  entityId?: string;
  priority: CompetitionEventPriority;
  title: string;
  body: string;
  occurredAt: string;
  readState: 'read' | 'unread' | 'unknown';
  actionTarget?: string;
  actionLabel?: string;
}

const priorityWeight: Record<CompetitionEventPriority, number> = { critical: 3, important: 2, informational: 1 };
const priorityLabel: Record<CompetitionEventPriority, string> = { critical: 'TƏCİLİ', important: 'VACİB', informational: 'MƏLUMAT' };

function priorityFromSeverity(severity: Notification['severity']): CompetitionEventPriority {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'important';
  return 'informational';
}

export function buildCompetitionAwareness({ notifications, adminMessages, announcements }: { notifications: Notification[]; adminMessages: AdminMessage[]; announcements: TeamAnnouncement[] }) {
  const systemEvents: CompetitionAwarenessEvent[] = notifications.map((item) => ({
    id: item.eventId ?? `notification-${item.id}`,
    eventId: item.eventId,
    sourceId: item.id,
    sourceType: 'notification',
    eventType: item.eventType ?? 'system',
    entityType: item.entityRef?.type,
    entityId: item.entityRef?.id,
    priority: item.priority ?? priorityFromSeverity(item.severity),
    title: item.title,
    body: item.body,
    occurredAt: item.createdAt,
    readState: item.read ? 'read' : 'unread',
    actionTarget: item.eventType === 'room' && item.entityRef?.type === 'tournament' ? `/team/tournaments/${item.entityRef.id}#room` : item.actionHref ?? '/team/notifications',
    actionLabel: item.actionLabel ?? 'Bildirişə bax',
  }));
  const messageEvents: CompetitionAwarenessEvent[] = adminMessages.map((item) => ({
    id: item.eventId ?? `message-${item.id}`,
    eventId: item.eventId,
    sourceId: item.id,
    sourceType: 'admin-message',
    eventType: item.eventType ?? 'admin-message',
    entityType: item.entityRef?.type,
    entityId: item.entityRef?.id,
    priority: item.priority ?? priorityFromSeverity(item.severity),
    title: item.title,
    body: item.body,
    occurredAt: item.createdAt,
    readState: item.read ? 'read' : 'unread',
    actionTarget: item.actionHref ?? '/team/messages',
    actionLabel: item.actionLabel ?? 'Mesaja bax',
  }));
  const announcementEvents: CompetitionAwarenessEvent[] = announcements.map((item) => ({
    id: item.eventId ?? `announcement-${item.id}`,
    eventId: item.eventId,
    sourceId: item.id,
    sourceType: 'announcement',
    eventType: item.kind === 'schedule' ? 'schedule' : 'admin-message',
    entityType: item.entityRef?.type,
    entityId: item.entityRef?.id,
    priority: item.kind === 'warning' ? 'critical' : item.kind === 'important' || item.kind === 'schedule' ? 'important' : 'informational',
    title: item.title,
    body: item.body.replace(' Bu, fictional demo elanıdır.', ''),
    occurredAt: item.createdAt,
    readState: 'unknown',
    actionTarget: item.actionHref,
    actionLabel: item.actionLabel,
  }));
  return deduplicateCompetitionEvents([...systemEvents, ...messageEvents, ...announcementEvents]).sort((left, right) => {
    const priorityDelta = priorityWeight[right.priority] - priorityWeight[left.priority];
    if (priorityDelta) return priorityDelta;
    if (left.readState !== right.readState) return left.readState === 'unread' ? -1 : 1;
    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
}

function eventIdentity(event: CompetitionAwarenessEvent) {
  if (event.eventId) return `event:${event.eventId}`;
  if (event.entityType && event.entityId) return `tuple:${event.eventType}:${event.entityType}:${event.entityId}:${event.revisionId ?? (Number.isFinite(Date.parse(event.occurredAt)) ? new Date(event.occurredAt).toISOString() : event.occurredAt)}:${event.targetTeamId ?? ''}`;
  return `source:${event.sourceType}:${event.sourceId}`;
}

export function deduplicateCompetitionEvents(events: CompetitionAwarenessEvent[]) {
  const unique = new Map<string, CompetitionAwarenessEvent>();
  events.forEach((event) => {
    const identity = eventIdentity(event);
    const existing = unique.get(identity);
    if (!existing) { unique.set(identity, event); return; }
    const primary = priorityWeight[event.priority] > priorityWeight[existing.priority] ? event : existing;
    unique.set(identity, { ...primary, id: existing.id, readState: existing.readState === 'unread' || event.readState === 'unread' ? 'unread' : existing.readState === 'read' || event.readState === 'read' ? 'read' : 'unknown' });
  });
  return [...unique.values()];
}

function eventIcon(type: CompetitionEventType) {
  if (type === 'admin-message') return MessageSquare;
  if (type === 'room') return KeyRound;
  if (type === 'match' || type === 'check-in') return Swords;
  if (type === 'map-result' || type === 'tournament-result' || type === 'placement') return Trophy;
  if (type === 'schedule' || type === 'tournament') return CalendarClock;
  if (type === 'registration' || type === 'roster') return CheckCircle2;
  return Bell;
}

function temporalContext(value: string) {
  const timestamp = new Date(value);
  const deltaMinutes = Math.round((competitionNow().getTime() - timestamp.getTime()) / 60_000);
  const exact = timestamp.toLocaleString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Baku' });
  const magnitude = Math.abs(deltaMinutes);
  const relative = magnitude < 1 ? 'indi' : magnitude < 60 ? `${magnitude} dəq ${deltaMinutes >= 0 ? 'əvvəl' : 'sonra'}` : magnitude < 1_440 ? `${Math.round(magnitude / 60)} saat ${deltaMinutes >= 0 ? 'əvvəl' : 'sonra'}` : `${Math.round(magnitude / 1_440)} gün ${deltaMinutes >= 0 ? 'əvvəl' : 'sonra'}`;
  return { exact, relative };
}

function EventAction({ event, compact = false }: { event: CompetitionAwarenessEvent; compact?: boolean }) {
  const target = sanitizeInternalPath(event.actionTarget);
  if (!target) return null;
  return <Link className={compact ? 'competition-awareness__compact-action' : 'competition-awareness__action'} to={target} aria-label={`${event.actionLabel ?? 'Yeniliyə bax'}: ${event.title}`}><span>{compact ? 'Aç' : event.actionLabel ?? 'Yeniliyə bax'}</span><ChevronRight size={16} aria-hidden="true" /></Link>;
}

export function CompetitionAwareness({ events }: { events: CompetitionAwarenessEvent[] }) {
  const primary = events[0];
  const secondary = events.slice(1, 3);
  const unread = events.filter((event) => event.readState === 'unread').length;
  if (!primary) return <section className="competition-awareness competition-awareness--empty" aria-labelledby="competition-awareness-title"><div className="competition-awareness__status"><CheckCircle2 size={20} aria-hidden="true" /><div><span id="competition-awareness-title">ƏMƏLİYYAT YENİLİKLƏRİ</span><strong>Yeni dəyişiklik yoxdur</strong><p>Komandanın yarış vəziyyəti aşağıdakı cari məlumatlarla eynidir.</p></div></div><Link to="/team/notifications">Bildiriş tarixçəsi <ChevronRight size={16} aria-hidden="true" /></Link></section>;
  const Icon = eventIcon(primary.eventType);
  const time = temporalContext(primary.occurredAt);
  return <section className={`competition-awareness competition-awareness--${primary.priority}`} aria-labelledby="competition-awareness-title" data-unread-count={unread}>
    <div className="competition-awareness__masthead"><span id="competition-awareness-title">ƏMƏLİYYAT YENİLİKLƏRİ</span><span>{unread ? `${unread} görülməmiş` : 'Hamısı görülüb'}</span></div>
    <div className="competition-awareness__primary">
      <span className="competition-awareness__icon"><Icon size={21} aria-hidden="true" /></span>
      <div className="competition-awareness__copy"><div><span className="competition-awareness__priority"><AlertTriangle size={13} aria-hidden="true" />{priorityLabel[primary.priority]}</span>{primary.readState === 'unread' && <span className="competition-awareness__new"><CircleDot size={13} aria-hidden="true" />YENİ</span>}</div><h2>{primary.title}</h2><p>{primary.body}</p><time dateTime={primary.occurredAt}>{time.relative} · {time.exact}</time></div>
      <EventAction event={primary} />
    </div>
    {secondary.length > 0 && <ol className="competition-awareness__secondary" aria-label="Digər vacib yeniliklər">{secondary.map((event) => { const eventTime = temporalContext(event.occurredAt); return <li key={event.id} data-seen={event.readState === 'unread' ? 'false' : 'true'}><span>{priorityLabel[event.priority]}</span><strong>{event.title}</strong><time dateTime={event.occurredAt}>{eventTime.relative}</time><EventAction event={event} compact /></li>; })}</ol>}
    {events.length > 3 && <Link className="competition-awareness__all" to="/team/notifications">Daha {events.length - 3} yenilik <ChevronRight size={15} aria-hidden="true" /></Link>}
    {events.length > 1 && <Link className="competition-awareness__mobile-all" to="/team/notifications">Bütün {events.length} yeniliyə bax <ChevronRight size={15} aria-hidden="true" /></Link>}
  </section>;
}
