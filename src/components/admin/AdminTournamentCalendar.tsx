import { adminTournamentStatuses, tournamentStatusTone } from '../../utils/adminTournamentStatus';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Modal, StatusBadge } from '../common/primitives';
import { competitionNow, serviceCapabilities } from '../../services';
import type { Tournament } from '../../types/domain';
import { calendarDateFromKey, calendarDateKey, calendarMonthDays, eventDateKey, formatEventDate, formatEventTime } from '../../utils/calendar';
import '../../styles/admin-calendar.css';

const weekdays=['B.e.','Ç.a.','Ç.','C.a.','C.','Ş.','B.'];

type Event={tournament:Tournament;kind:'competition'|'registration-open'|'registration-close'};
const kindLabel={competition:'Yarış','registration-open':'Qeydiyyat açılır','registration-close':'Qeydiyyat bağlanır'};
const dayLabel=(key:string)=>formatEventDate(calendarDateFromKey(key),{timeZone:'UTC'});

export function AdminTournamentCalendar({tournaments}:{tournaments:Tournament[]}) {
  const today=eventDateKey(competitionNow());
  const [selected,setSelected]=useState(today),[anchor,setAnchor]=useState(today),[view,setView]=useState<'month'|'week'>('month'),[dialog,setDialog]=useState('');
  const calendar=useRef<HTMLDivElement>(null);
  const date=calendarDateFromKey(anchor);
  const days=useMemo(()=>{
    if(view==='month')return calendarMonthDays(date.getUTCFullYear(),date.getUTCMonth());
    const start=calendarDateFromKey(anchor);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
    return Array.from({length:7},(_,i)=>{const day=new Date(start);day.setUTCDate(day.getUTCDate()+i);return day;});
  },[anchor,view]);
  const byDay=useMemo(()=>{
    const grouped=new Map<string,Event[]>();
    for(const day of days){
      const key=calendarDateKey(day),events:Event[]=[];
      for(const t of tournaments){
        if(key>=eventDateKey(t.startsAt)&&key<=eventDateKey(t.endsAt))events.push({tournament:t,kind:'competition'});
        if(t.registrationOpensAt&&key===eventDateKey(t.registrationOpensAt))events.push({tournament:t,kind:'registration-open'});
        if(t.registrationDeadline&&key===eventDateKey(t.registrationDeadline))events.push({tournament:t,kind:'registration-close'});
      }
      grouped.set(key,events);
    }
    return grouped;
  },[tournaments,days]);
  const move=(direction:number)=>{
    const next=calendarDateFromKey(anchor);
    if(view==='month'){next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+direction);}else next.setUTCDate(next.getUTCDate()+direction*7);
    const key=calendarDateKey(next);setAnchor(key);setSelected(key);
  };
  const keyboard=(e:KeyboardEvent<HTMLButtonElement>,key:string)=>{
    const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-(calendarDateFromKey(key).getUTCDay()+6)%7,End:6-(calendarDateFromKey(key).getUTCDay()+6)%7};
    if(!(e.key in offsets))return;e.preventDefault();const next=calendarDateFromKey(key);next.setUTCDate(next.getUTCDate()+offsets[e.key]);const nextKey=calendarDateKey(next);setSelected(nextKey);setAnchor(nextKey);
    requestAnimationFrame(()=>calendar.current?.querySelector<HTMLButtonElement>(`[data-admin-day="${nextKey}"]`)?.focus());
  };
  const events=byDay.get(selected)??[];
  const dateEvents=byDay.get(dialog)??[];
  return <section className="admin-calendar" aria-label="Turnir təqvimi">
    <header className="admin-calendar-toolbar"><div><CalendarDays size={19}/><h2 aria-live="polite">{view==='month'?dayLabel(calendarDateKey(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1,12)))).replace(/^1 /,''):`${dayLabel(calendarDateKey(days[0]))} – ${days[6].getUTCDate()}`}</h2></div>
      <div><div className="admin-view-switch" aria-label="Təqvim görünüşü"><button aria-pressed={view==='month'} onClick={()=>setView('month')}>Ay</button><button aria-pressed={view==='week'} onClick={()=>setView('week')}>Həftə</button></div><Button variant="ghost" onClick={()=>{setAnchor(today);setSelected(today);}}>Bu gün</Button><button className="icon-button" aria-label="Əvvəlki dövr" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Növbəti dövr" onClick={()=>move(1)}><ChevronRight size={18}/></button></div>
    </header>
    <div ref={calendar} className={`admin-calendar-grid admin-calendar-grid--${view}`} role="group" aria-label="Tarixlər · Bakı vaxtı">
      {weekdays.map(d=><span className="admin-calendar-weekday" key={d}>{d}</span>)}
      {days.map(day=>{const key=calendarDateKey(day),items=byDay.get(key)??[];return <div className="admin-calendar-day" data-outside={day.getUTCMonth()!==date.getUTCMonth()} data-selected={key===selected} key={key}>
        <button className="admin-calendar-date" data-admin-day={key} tabIndex={key===selected?0:-1} aria-current={key===today?'date':undefined} aria-label={`${dayLabel(key)} · ${items.length} hadisə`} onKeyDown={e=>keyboard(e,key)} onClick={()=>{setSelected(key);setDialog(key);}}><span className="admin-calendar-number">{day.getUTCDate()}</span><span className="sr-only"> · Turnir yarat</span></button>
        <div className="admin-calendar-events">{items.slice(0,3).map(({tournament:t,kind})=><Link key={`${t.id}-${kind}`} className="admin-calendar-event" data-status={tournamentStatusTone(t.status)} data-kind={kind} to={`/admin/tournaments/${t.id}`} title={`${t.name} · ${kindLabel[kind]} · ${adminTournamentStatuses[t.status]}`}><i aria-hidden="true"/><span>{kind==='competition'?t.name:`${kindLabel[kind]} · ${t.shortName||t.name}`}</span></Link>)}{items.length>3&&<button onClick={()=>{setSelected(key);setDialog(key);}}>+{items.length-3} hadisə</button>}</div>
        {items.length>0&&<span className="admin-calendar-dots" aria-hidden="true">{items.slice(0,3).map((item,i)=><i key={i} data-status={item.tournament.status}/>)}</span>}
      </div>;})}
    </div>
    <footer className="admin-calendar-legend"><span><i/>Yarış</span><span><i/>Qeydiyyat tarixləri</span><small>Asia/Baku · UTC+4</small></footer>
    <div className="admin-calendar-agenda"><header><h3>{dayLabel(selected)}</h3><Button variant="ghost" icon={<Plus size={16}/>} onClick={()=>setDialog(selected)}>Turnir yarat</Button></header>
      {events.length?events.map(({tournament:t,kind})=><Link className="admin-agenda-event" key={`${t.id}-${kind}`} to={`/admin/tournaments/${t.id}`}><CalendarDays size={18}/><div><strong>{t.name}</strong><small>{kindLabel[kind]} · {formatEventTime(kind==='registration-open'?t.registrationOpensAt:kind==='registration-close'?t.registrationDeadline:t.startsAt)} · {adminTournamentStatuses[t.status]}</small></div><ArrowUpRight size={16}/></Link>):<p>Bu tarixdə planlanmış hadisə yoxdur.</p>}
    </div>
    <Modal open={!!dialog} title={dialog?dayLabel(dialog):'Tarix'} onClose={()=>setDialog('')} footer={serviceCapabilities.tournamentCreation&&<Link className="button button--primary" to={`/admin/tournaments/new?date=${dialog}`}><Plus size={17}/>Turnir yarat</Link>}>
      <p className="admin-field-hint">Bakı vaxtı · Seçilmiş tarix turnirin başlanğıcına əlavə ediləcək.</p>
      {dateEvents.map(({tournament:t,kind})=><div className="admin-calendar-dialog-event" key={`${t.id}-${kind}`}><strong>{t.name}</strong><StatusBadge status={tournamentStatusTone(t.status)}>{adminTournamentStatuses[t.status]}</StatusBadge><p>{kindLabel[kind]} · {formatEventDate(t.startsAt,{withTime:true})}</p><p>Qeydiyyat: {formatEventDate(t.registrationOpensAt,{withTime:true})} – {formatEventDate(t.registrationDeadline,{withTime:true})}</p><Link to={`/admin/tournaments/${t.id}`}>Turniri idarə et <ArrowUpRight size={15}/></Link></div>)}
      {!dateEvents.length&&<p>Bu tarix üçün yeni turnir planlayın.</p>}
    </Modal>
  </section>;
}
