import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { az } from 'react-day-picker/locale';
import { bakuInput, bakuInstant } from '../../utils/tournamentWizard';
import { calendarDateFromKey, calendarDateKey, formatEventDate } from '../../utils/calendar';
import '../../styles/schedule-picker.css';

const wallValue = (value: string) => (value ? bakuInput(bakuInstant(value)) : '');
const dateLabel = (key: string) => formatEventDate(calendarDateFromKey(key), { timeZone: 'UTC' });

/** Retains Baku wall-clock values. The existing payload serializer owns UTC conversion. */
export function ScheduleDateTimePicker({
  id,
  name,
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  error,
  required = false,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const display = wallValue(value),
    low = wallValue(min ?? ''),
    high = wallValue(max ?? '');
  const [time, setTime] = useState(display.slice(11) || '20:00');
  useEffect(() => setTime(display.slice(11) || '20:00'), [display]);
  const rangeValid = !low || !high || low <= high;
  const clamp = (candidate: string) =>
    low && candidate < low ? low : high && candidate > high ? high : candidate;
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
  const timeError = !validTime
    ? 'Vaxtı 24 saat formatında daxil edin (SS:DD).'
    : display &&
        ((low && display.slice(0, 10) + 'T' + time < low) || (high && display.slice(0, 10) + 'T' + time > high))
      ? 'Vaxt əlçatan aralıqda olmalıdır.'
      : undefined;
  const today = bakuInput(new Date().toISOString()).slice(0, 10);
  const date = display ? calendarDateFromKey(display.slice(0, 10)) : undefined;
  return (
    <div className={`field schedule-date-field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="schedule-date-controls">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            id={id}
            type="button"
            className="schedule-date-trigger"
            data-empty={!display}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={id + '-hint'}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span>{display ? dateLabel(display.slice(0, 10)) : 'Tarix seçin'}</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              aria-label={label}
              className="schedule-picker-popover"
              align="start"
              sideOffset={4}
              collisionPadding={8}
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <DayPicker
                mode="single"
                required
                locale={az}
                timeZone="UTC"
                today={calendarDateFromKey(today)}
                weekStartsOn={1}
                autoFocus
                selected={date}
                defaultMonth={date ?? calendarDateFromKey(low ? low.slice(0, 10) : today)}
                startMonth={rangeValid && low ? calendarDateFromKey(low.slice(0, 10)) : undefined}
                endMonth={rangeValid && high ? calendarDateFromKey(high.slice(0, 10)) : undefined}
                disabled={
                  !rangeValid
                    ? true
                    : [
                        ...(low ? [{ before: calendarDateFromKey(low.slice(0, 10)) }] : []),
                        ...(high ? [{ after: calendarDateFromKey(high.slice(0, 10)) }] : []),
                      ]
                }
                labels={{
                  labelPrevious: () => 'Əvvəlki ay',
                  labelNext: () => 'Növbəti ay',
                  labelDayButton: (day) => dateLabel(calendarDateKey(day)),
                }}
                onSelect={(day) => {
                  if (day && rangeValid) {
                    onChange(clamp(calendarDateKey(day) + 'T' + (validTime ? time : '20:00')));
                    setOpen(false);
                  }
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <input
          className="schedule-time-input"
          aria-label={label + ' · vaxt'}
          aria-describedby={id + '-hint'}
          aria-invalid={Boolean(timeError)}
          value={time}
          disabled={disabled}
          inputMode="numeric"
          placeholder="SS:DD"
          maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          onChange={(event) => {
            const next = event.target.value;
            setTime(next);
            if (display && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(next)) {
              const candidate = display.slice(0, 10) + 'T' + next;
              if (rangeValid && (!low || candidate >= low) && (!high || candidate <= high)) onChange(candidate);
            }
          }}
        />
      </div>
      <input type="hidden" name={name} value={value} />
      <span id={id + '-hint'} className="field__message" role={error || timeError ? 'alert' : undefined}>
        {error || timeError || `Bakı vaxtı · UTC+4${required ? ' · tələb olunur' : ''}`}
      </span>
    </div>
  );
}
