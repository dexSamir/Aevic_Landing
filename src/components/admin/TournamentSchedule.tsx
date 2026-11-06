import { useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Input } from '../common/primitives';
import { bakuInstant, suggestSchedule, type ScheduleTemplate, type WizardFields, type WizardRound } from '../../utils/tournamentWizard';
import { formatEventDate } from '../../utils/calendar';
import '../../styles/tournament-editor.css';

export function TournamentSchedule({fields,rounds,onChange,error,template,locked=false,existing=false}:{fields:WizardFields;rounds:WizardRound[];onChange:(fields:WizardFields,rounds:WizardRound[])=>void;error?:(field:string)=>string|undefined;template?:ScheduleTemplate;locked?:boolean;existing?:boolean}) {
  const [manual,setManual]=useState(existing),[advanced,setAdvanced]=useState(false);
  const missing= !fields.endsAt || rounds.some(r=>!r.startsAt);
  const update=(key:keyof WizardFields,value:string)=>{
    const next={...fields,[key]:value};
    if(manual)onChange(next,rounds);
    else {const suggested=suggestSchedule(next,rounds,template);onChange(suggested.fields,suggested.rounds);}
  };
  const essentials=[['startsAt','Turnirin başlanğıcı'],['registrationOpensAt','Qeydiyyat açılır'],['registrationDeadline','Qeydiyyat bağlanır']] as const;
  const advancedError=['endsAt','checkInOpensAt','checkInClosesAt',...rounds.map((_,i)=>`round-${i}`)].some(key=>error?.(key));
  return <section className="schedule-editor" aria-label="Turnir cədvəli">
    <div className="schedule-editor__zone"><CalendarDays size={18}/><strong>Yarış cədvəli</strong><span>Asia/Baku · UTC+4</span></div>
    <div className="schedule-editor__essential">{essentials.map(([key,label])=><Input key={key} id={`wizard-${key}`} name={key} label={label} type="datetime-local" value={fields[key]} onChange={e=>update(key,e.target.value)} disabled={locked} required error={error?.(key)} max={key==='registrationDeadline'?fields.startsAt:undefined}/>)}</div>
    <div className="schedule-editor__summary" aria-live="polite"><Clock3 size={17}/><span>{fields.startsAt?formatEventDate(bakuInstant(fields.startsAt),{withTime:true}):'Başlanğıc vaxtını seçin'} · {rounds.length} raund{!manual&&template&&<small> · {template.name} cədvəli</small>}</span></div>
    <details className="admin-advanced" open={advanced||advancedError} onToggle={e=>setAdvanced(e.currentTarget.open)}><summary>Ətraflı cədvəl {missing&&<small>· tamamlanmalıdır</small>}</summary>
      <label className="schedule-editor__mode"><input type="checkbox" checked={!manual} disabled={locked} onChange={e=>{setManual(!e.target.checked);if(e.target.checked){const next=suggestSchedule(fields,rounds,template);onChange(next.fields,next.rounds);}}}/>Əlaqəli vaxtları avtomatik uyğunlaşdır</label>
      <p className="admin-field-hint">{!manual&&template?`Raund intervalları və müddət: ${template.name}. `:''}Check-in qeydiyyat bağlananda açılır, yarış başlayanda bağlanır.{missing?' Raund vaxtlarını və bitmə tarixini daxil edin.':''}</p>
      <div className="form-grid">{([['checkInOpensAt','Check-in açılır'],['checkInClosesAt','Check-in bağlanır'],['endsAt','Turnirin bitməsi']] as const).map(([key,label])=><Input key={key} id={`wizard-${key}`} name={key} label={label} type="datetime-local" value={fields[key]} disabled={locked} required error={error?.(key)} onChange={e=>{setManual(true);onChange({...fields,[key]:e.target.value},rounds);}}/>)}</div>
      {rounds.map((r,i)=><div className="admin-round-time" key={i}><span><b>{String(i+1).padStart(2,'0')}</b>{r.map}</span><Input id={`wizard-round-${i}`} name={`round-${i}`} label={`${i+1}. raund başlayır`} type="datetime-local" value={r.startsAt} min={fields.startsAt} max={fields.endsAt} required disabled={locked} error={error?.(`round-${i}`)} onChange={e=>{setManual(true);onChange(fields,rounds.map((r,n)=>n===i?{...r,startsAt:e.target.value}:r));}}/></div>)}
    </details>
  </section>;
}
