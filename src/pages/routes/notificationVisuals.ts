import { BellRing, CalendarClock, ChartColumn, CircleAlert, CircleCheck, CircleX, ClipboardList, DoorOpen, Footprints, Hand, Hourglass, Info, Megaphone, Timer, Trophy, UsersRound, type LucideIcon } from 'lucide-react';
import type { CompetitionEventType, Notification } from '../../types/domain';

type Visual = { label: string; icon: LucideIcon; tone?: 'gold' | 'green' | 'blue' | 'amber' };
const visuals: Partial<Record<CompetitionEventType, Visual>> = {
  welcome: { label: 'Xoş gəlmisiniz', icon: Hand, tone: 'gold' },
  'welcome-back': { label: 'Yenidən xoş gəlmisiniz', icon: DoorOpen, tone: 'gold' },
  'team-welcome': { label: 'Yeni komanda', icon: UsersRound, tone: 'gold' },
  registration: { label: 'Qeydiyyat', icon: ClipboardList },
  'registration-received': { label: 'Müraciət', icon: ClipboardList, tone: 'blue' },
  'registration-approved': { label: 'Təsdiq', icon: CircleCheck, tone: 'green' },
  'registration-rejected': { label: 'Qeydiyyat qərarı', icon: CircleX, tone: 'amber' },
  'registration-withdrawn': { label: 'Geri çəkilmə', icon: Footprints },
  'check-in': { label: 'İştirak təsdiqi', icon: CircleAlert, tone: 'amber' },
  deadline: { label: 'Son tarix', icon: Hourglass, tone: 'amber' },
  'tournament-starting': { label: 'Turnir başlayır', icon: Timer, tone: 'gold' },
  schedule: { label: 'Yarış cədvəli', icon: CalendarClock },
  'map-result': { label: 'Raund nəticəsi', icon: ChartColumn, tone: 'blue' },
  'tournament-result': { label: 'Turnir nəticəsi', icon: ChartColumn, tone: 'blue' },
  champion: { label: 'Çempionluq', icon: Trophy, tone: 'gold' },
  'admin-message': { label: 'Rəsmi elan', icon: Megaphone, tone: 'gold' },
  room: { label: 'Otaq məlumatı', icon: BellRing },
};
const general: Visual = { label: 'Sistem məlumatı', icon: Info };
export const notificationVisual = (item: Notification) => item.eventType && Object.prototype.hasOwnProperty.call(visuals, item.eventType) ? visuals[item.eventType]! : general;

const zone = 'Asia/Baku';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('de-DE', { timeZone: zone, day: '2-digit', month: '2-digit' });
const full = new Intl.DateTimeFormat('de-DE', { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' });

export function notificationTime(value: string, now: number) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return { group: 'Daha əvvəl', short: '', full: '' };
  const key = day.format(timestamp);
  const group = key === day.format(now) ? 'Bu gün' : key === day.format(now - 86_400_000) ? 'Dünən' : 'Daha əvvəl';
  return { group, short: group === 'Daha əvvəl' ? date.format(timestamp) : time.format(timestamp), full: full.format(timestamp) + ' · ' + time.format(timestamp) };
}
