import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { CalendarDays } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { DayButton, DayPicker } from 'react-day-picker';
import { az } from 'react-day-picker/locale';
import { Button, Modal } from '../common/primitives';
import { bakuInput, bakuInstant } from '../../utils/tournamentWizard';
import { calendarDateFromKey, calendarDateKey, formatEventDate } from '../../utils/calendar';
import '../../styles/schedule-picker.css';

const wallValue = (value: string) => value ? bakuInput(bakuInstant(value)) : '';
const dateLabel = (key: string) => formatEventDate(calendarDateFromKey(key),{timeZone:'UTC'});

function ScheduleDayButton(props: ComponentProps<typeof DayButton>) {
  return <DayButton {...props} data-autofocus={props.modifiers.selected?true:undefined}/>;
}

/** Dates stay as Baku wall-clock strings; the existing payload serializer owns UTC conversion. */
export function ScheduleDateTimePicker({id,name,label,value,onChange,min,max,disabled=false,error,required=false}:{id:string;name?:string;label:string;value:string;onChange:(value:string)=>void;min?:string;max?:string;disabled?:boolean;error?:string;required?:boolean}) {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[month,setMonth]=useState<Date>();
  const [mobile,setMobile]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia('(max-width: 600px)').matches);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const media=matchMedia('(max-width: 600px)');const update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const low=wallValue(min??''),high=wallValue(max??'');
  const clamp=(candidate:string)=>low&&candidate<low?low:high&&candidate>high?high:candidate;
  const changeOpen=(next:boolean)=>{
    if(next){const initial=wallValue(value)||clamp(bakuInput(new Date().toISOString()));setDraft(initial);setMonth(calendarDateFromKey(initial.slice(0,10)));}
    setOpen(next);
  };
  const rangeValid=!low||!high||low<=high;
  const selected=draft.slice(0,10),minute=draft.slice(14),hour=draft.slice(11,13);
  const valid=rangeValid&&!!selected&&/^\d{2}:\d{2}$/.test(draft.slice(11))&&Number(hour)<24&&Number(minute)<60&&(!low||draft>=low)&&(!high||draft<=high);
  const apply=()=>{if(valid){onChange(draft);setOpen(false);}};
  const controls=<>
    <DayPicker mode="single" required locale={az} timeZone="UTC" today={calendarDateFromKey(bakuInput(new Date().toISOString()).slice(0,10))} weekStartsOn={1} autoFocus={!mobile} components={{DayButton:ScheduleDayButton}}
      selected={selected?calendarDateFromKey(selected):undefined} month={month} onMonthChange={setMonth}
      startMonth={rangeValid&&low?calendarDateFromKey(low.slice(0,10)):undefined} endMonth={rangeValid&&high?calendarDateFromKey(high.slice(0,10)):undefined}
      disabled={!rangeValid?true:[...(low?[{before:calendarDateFromKey(low.slice(0,10))}]:[]),...(high?[{after:calendarDateFromKey(high.slice(0,10))}]:[])]}
      labels={{labelPrevious:()=> 'Əvvəlki ay',labelNext:()=> 'Növbəti ay',labelDayButton:date=>dateLabel(calendarDateKey(date))}}
      onSelect={date=>{if(date)setDraft(clamp(`${calendarDateKey(date)}T${hour}:${minute}`));}} />
    <div className="schedule-time-row"><span>Vaxt <small>24 saat · Bakı</small></span><div>
      <select aria-label={`${label} · saat`} value={hour} onChange={e=>setDraft(clamp(`${selected}T${e.target.value}:${/^\d{2}$/.test(minute)?minute:'00'}`))}>
        {Array.from({length:24},(_,h)=>{const text=String(h).padStart(2,'0');return <option key={h} disabled={(!!low&&`${selected}T${text}:59`<low)||(!!high&&`${selected}T${text}:00`>high)}>{text}</option>;})}
      </select><span aria-hidden="true">:</span>
      <input aria-label={`${label} · dəqiqə`} inputMode="numeric" type="text" maxLength={2} list={`${id}-minutes`} value={minute}
        onChange={e=>{if(/^\d{0,2}$/.test(e.target.value))setDraft(`${selected}T${hour}:${e.target.value}`);}}
        onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const current=calendarDateFromKey(selected);current.setUTCHours(Number(hour),Number(minute)||0,0,0);current.setUTCMinutes(current.getUTCMinutes()+(e.key==='ArrowUp'?5:-5));const next=clamp(current.toISOString().slice(0,16));setDraft(next);setMonth(calendarDateFromKey(next.slice(0,10)));}}}
        onBlur={()=>{if(/^\d{1,2}$/.test(minute)&&Number(minute)<60)setDraft(`${selected}T${hour}:${minute.padStart(2,'0')}`);}} />
      <datalist id={`${id}-minutes`}>{Array.from({length:12},(_,m)=><option key={m} value={String(m*5).padStart(2,'0')}/>)}</datalist>
    </div></div>
    {!valid&&<p className="field__error" role="alert">Əlçatan tarix və 00–59 aralığında dəqiqə seçin.</p>}
  </>;
  const actions=<><Button variant="ghost" onClick={()=>setOpen(false)}>Ləğv et</Button><Button disabled={!valid} onClick={apply}>Tarixi tətbiq et</Button></>;
  const display=wallValue(value);
  const field=<button ref={trigger} type="button" id={id} className="schedule-date-trigger" aria-haspopup="dialog" aria-expanded={open} aria-describedby={`${id}-hint`} aria-invalid={!!error} disabled={disabled} onClick={mobile?()=>changeOpen(true):undefined}>
    <span>{display?`${dateLabel(display.slice(0,10))} · ${display.slice(11)}`:'Tarix və vaxt seçin'}</span><CalendarDays size={18} aria-hidden="true"/>
  </button>;
  return <div className={`field schedule-date-field ${error?'field--error':''}`}>
    <label className="field__label" htmlFor={id}>{label}</label>
    {mobile?field:<Popover.Root open={open} onOpenChange={changeOpen}><Popover.Trigger asChild>{field}</Popover.Trigger><Popover.Portal><Popover.Content aria-label={label} className="schedule-picker-popover" sideOffset={8} collisionPadding={12} align="start" onOpenAutoFocus={event=>event.preventDefault()}>{controls}<footer>{actions}</footer></Popover.Content></Popover.Portal></Popover.Root>}
    <input type="hidden" name={name} value={value}/>
    <span id={`${id}-hint`} className="field__message" role={error?'alert':undefined}>{error||`Bakı vaxtı · UTC+4${required?' · tələb olunur':''}`}</span>
    {mobile&&<Modal open={open} title={label} onClose={()=>{setOpen(false);trigger.current?.focus();}} className="schedule-date-dialog schedule-picker-sheet" footer={actions}>{controls}</Modal>}
  </div>;
}
