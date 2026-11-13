import type { NotificationPreferences } from '../types/domain';

export const notificationEventLabels: Record<string, string> = {
  registration: 'Qeydiyyat',
  'check-in': 'Check-in',
  room: 'Otaq məlumatları',
  results: 'Rəsmi nəticələr',
  roster: 'Heyət dəyişiklikləri',
  announcements: 'Sistem elanları',
  adminMessages: 'Admin mesajları',
};

export function normalizeNotificationPreferences(preferences: NotificationPreferences): NotificationPreferences {
  const { checkIn, roomRelease, ...saved } = preferences.events;
  const events = { ...saved };
  events['check-in'] = saved['check-in'] ?? checkIn ?? true;
  events.room = saved.room ?? roomRelease ?? true;
  for (const key of Object.keys(notificationEventLabels)) events[key] ??= true;
  return { ...preferences, events };
}
