import type { CalendarEventData } from '../types/domain';

export const AEVIC_EVENT_TIMEZONE = 'Asia/Baku';
const azerbaijaniMonths = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export function datePartsInTimeZone(value: string | Date, timeZone = AEVIC_EVENT_TIMEZONE): CalendarDateParts {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function eventDateKey(value: string | Date, timeZone = AEVIC_EVENT_TIMEZONE) {
  const { year, month, day } = datePartsInTimeZone(value, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calendarDateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function calendarDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export function formatEventTime(value: string, timeZone = AEVIC_EVENT_TIMEZONE) {
  return new Intl.DateTimeFormat('az-AZ', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(value));
}

export function formatEventDate(value: string | Date, options: { withTime?: boolean; includeYear?: boolean; timeZone?: string } = {}) {
  const { withTime = false, includeYear = true, timeZone = AEVIC_EVENT_TIMEZONE } = options;
  const { year, month, day } = datePartsInTimeZone(value, timeZone);
  const date = `${day} ${azerbaijaniMonths[month - 1]}${includeYear ? ` ${year}` : ''}`;
  return withTime ? `${date} · ${formatEventTime(value instanceof Date ? value.toISOString() : value, timeZone)}` : date;
}

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const utcStamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export function buildCalendarEvent(event: CalendarEventData) {
  const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString();
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AEVIC Esports//Competition Calendar//AZ', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${escapeIcs(event.id)}@aevic`, `DTSTAMP:${utcStamp(new Date().toISOString())}`,
    `DTSTART:${utcStamp(event.startsAt)}`, `DTEND:${utcStamp(end)}`, `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${event.description}\n${event.publicUrl}`)}`, `URL:${escapeIcs(event.publicUrl)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '', 'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function downloadICS(event: CalendarEventData) {
  const blob = new Blob([buildCalendarEvent(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `aevic-${event.id}.ics`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function buildGoogleCalendarUrl(event: CalendarEventData) {
  const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${utcStamp(event.startsAt)}/${utcStamp(end)}`, details: `${event.description}\n\n${event.publicUrl}`, location: event.location ?? '', ctz: event.timezone });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
