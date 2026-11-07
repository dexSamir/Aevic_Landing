import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Modal } from '../common/primitives';
import { bakuInput, bakuInstant } from '../../utils/tournamentWizard';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const dayDate = (key: string) => new Date(`${key}T12:00:00Z`);
const dateLabel = (key: string, options: Intl.DateTimeFormatOptions) => dayDate(key).toLocaleDateString('az-AZ', { ...options, timeZone: 'UTC' });
const wallValue = (value: string) => value ? bakuInput(bakuInstant(value)) : '';
const weekdays = ['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'];

/** A wall-clock picker. Only the existing payload serializer converts it to UTC. */
export function ScheduleDateTimePicker({id,name,label,value,onChange,min,max,disabled=false,error,required=false}:{id:string;name?:string;label:string;value:string;onChange:(value:string)=>void;min?:string;max?:string;disabled?:boolean;error?:string;required?:boolean}) {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[month,setMonth]=useState('');
  const calendar=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null),wasOpen=useRef(false);
  useEffect(()=>{
    if(open){wasOpen.current=true;return;}
    if(!wasOpen.current)return;
    wasOpen.current=false;
    // Outside mousedown dismisses before the browser performs its default focus
    // action. Restore on the next frame so that action cannot steal focus back.
    const frame=requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));
    return()=>cancelAnimationFrame(frame);
  },[open]);
  const low=wallValue(min??''),high=wallValue(max??'');
  const clamp=(candidate:string)=>low&&candidate<low?low:high&&candidate>high?high:candidate;
  const unavailable=(key:string)=>(!!low&&key<low.slice(0,10))||(!!high&&key>high.slice(0,10));
  const show=()=>{const initial=wallValue(value)||clamp(bakuInput(new Date().toISOString()));setDraft(initial);setMonth(initial.slice(0,7));setOpen(true);};
  const selectDay=(key:string,focus=false)=>{
    if(unavailable(key))return;
    const next=clamp(`${key}T${draft.slice(11)||'20:00'}`);setDraft(next);setMonth(next.slice(0,7));
    if(focus)requestAnimationFrame(()=>calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${next.slice(0,10)}"]`)?.focus());
  };
  const moveMonth=(amount:number,focus=false)=>{
    const selected=dayDate(draft.slice(0,10));
    const target=new Date(Date.UTC(selected.getUTCFullYear(),selected.getUTCMonth()+amount,1,12));
    target.setUTCDate(Math.min(selected.getUTCDate(),new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate()));
    selectDay(clamp(`${dayKey(target)}T${draft.slice(11)}`).slice(0,10),focus);
  };
  const keyboard=(event:KeyboardEvent<HTMLButtonElement>,key:string)=>{
    const date=dayDate(key),weekday=(date.getUTCDay()+6)%7;
    const offset:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekday,End:6-weekday};
    if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();moveMonth((event.key==='PageUp'?-1:1)*(event.shiftKey?12:1),true);}
    else if(event.key in offset){event.preventDefault();date.setUTCDate(date.getUTCDate()+offset[event.key]);const next=clamp(`${dayKey(date)}T${draft.slice(11)}`);selectDay(next.slice(0,10),true);}
  };
  const first=month?dayDate(`${month}-01`):null,days=first?new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate():0;
  const leading=first?(first.getUTCDay()+6)%7:0;
  const selected=draft.slice(0,10),valid=!!draft&&(!low||draft>=low)&&(!high||draft<=high)&&(!low||!high||low<=high);
  const previousMonth=first?dayKey(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),0))).slice(0,7):'';
  const nextMonth=first?dayKey(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,1))).slice(0,7):'';
  const display=wallValue(value);
  return <div className={`field schedule-date-field ${error?'field--error':''}`}>
    <label className="field__label" htmlFor={id}>{label}</label>
    <button ref={trigger} type="button" id={id} className="schedule-date-trigger" aria-haspopup="dialog" aria-expanded={open} aria-describedby={`${id}-hint`} aria-invalid={!!error} disabled={disabled} onClick={show}>
      <span>{display?`${dateLabel(display.slice(0,10),{day:'numeric',month:'short',year:'numeric'})} · ${display.slice(11)}`:'Tarix və vaxt seçin'}</span><CalendarDays size={18} aria-hidden="true"/>
    </button>
    <input type="hidden" name={name} value={value}/>
    <span id={`${id}-hint`} className="field__message" role={error?'alert':undefined}>{error||`Bakı vaxtı · UTC+4${required?' · tələb olunur':''}`}</span>
    <Modal open={open} title={label} onClose={()=>setOpen(false)} className="schedule-date-dialog" footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>Ləğv et</Button><Button disabled={!valid} onClick={()=>{onChange(draft);setOpen(false);}}>Tarixi tətbiq et</Button></>}>
      <p className="schedule-date-zone">Asia/Baku · UTC+4</p>
      {first&&<>
        <div className="schedule-calendar-heading"><button type="button" aria-label="Əvvəlki ay" disabled={!!low&&previousMonth<low.slice(0,7)} onClick={()=>moveMonth(-1)}><ChevronLeft size={20}/></button><strong id={`${id}-month`} aria-live="polite">{dateLabel(`${month}-01`,{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Növbəti ay" disabled={!!high&&nextMonth>high.slice(0,7)} onClick={()=>moveMonth(1)}><ChevronRight size={20}/></button></div>
        <div ref={calendar} role="grid" aria-labelledby={`${id}-month`} className="schedule-calendar">
          <div role="row">{weekdays.map(day=><span role="columnheader" key={day}>{day}</span>)}</div>
          {Array.from({length:Math.ceil((leading+days)/7)},(_,week)=><div role="row" key={week}>{Array.from({length:7},(_,weekday)=>{const day=week*7+weekday-leading+1,key=`${month}-${String(day).padStart(2,'0')}`;return <div role="gridcell" aria-selected={key===selected} key={weekday}>{day>0&&day<=days&&<button type="button" data-day={key} data-autofocus={key===selected?true:undefined} tabIndex={key===selected?0:-1} disabled={unavailable(key)} aria-label={dateLabel(key,{day:'numeric',month:'long',year:'numeric',weekday:'long'})} aria-current={key===bakuInput(new Date().toISOString()).slice(0,10)?'date':undefined} onClick={()=>selectDay(key)} onKeyDown={e=>keyboard(e,key)}>{day}</button>}</div>;})}</div>)}
        </div>
        <div className="schedule-clock"><label>Saat<select aria-label={`${label} · saat`} value={draft.slice(11,13)} onChange={e=>setDraft(clamp(`${selected}T${e.target.value}:${draft.slice(14,16)}`))}>{Array.from({length:24},(_,h)=>{const hour=String(h).padStart(2,'0');return <option key={h} disabled={(!!low&&`${selected}T${hour}:59`<low)||(!!high&&`${selected}T${hour}:00`>high)}>{hour}</option>;})}</select></label><span aria-hidden="true">:</span><label>Dəqiqə<select aria-label={`${label} · dəqiqə`} value={draft.slice(14,16)} onChange={e=>setDraft(`${selected}T${draft.slice(11,13)}:${e.target.value}`)}>{Array.from({length:60},(_,m)=>{const minute=String(m).padStart(2,'0'),candidate=`${selected}T${draft.slice(11,13)}:${minute}`;return <option key={m} disabled={(!!low&&candidate<low)||(!!high&&candidate>high)}>{minute}</option>;})}</select></label></div>
        <p className="admin-field-hint">Günlər: ox düymələri · Ay: Page Up / Page Down · Seç: Enter</p>
        {!valid&&<p role="alert">Bu aralıqda əlçatan vaxt yoxdur. Əlaqəli tarixləri yoxlayın.</p>}
      </>}
    </Modal>
  </div>;
}
