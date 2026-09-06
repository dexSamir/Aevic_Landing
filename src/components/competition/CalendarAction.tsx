import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { CalendarEventData } from '../../types/domain';
import { buildGoogleCalendarUrl, downloadICS } from '../../utils/calendar';
import { Button, Modal } from '../common/primitives';

export function CalendarAction({ event, compact = false }: { event: CalendarEventData; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="ghost" className={compact ? 'calendar-action--compact' : ''} icon={<CalendarPlus size={17} />} onClick={() => setOpen(true)}>Təqvimə əlavə et</Button><Modal open={open} title="Təqvimə əlavə et" onClose={() => setOpen(false)}><div className="calendar-options"><header><span>{event.timezone}</span><strong>{event.title}</strong><time dateTime={event.startsAt}>{new Date(event.startsAt).toLocaleString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: event.timezone })}</time></header><a className="button button--secondary" href={buildGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /><span>Google Calendar</span></a><Button icon={<Download size={17} />} onClick={() => downloadICS(event)}>ICS yüklə</Button><p>Event yalnız public turnir məlumatlarını ehtiva edir; room ID və şifrə daxil edilmir.</p></div></Modal></>;
}
