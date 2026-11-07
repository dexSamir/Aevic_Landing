import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Button, ConfirmDialog, Input } from '../common/primitives';
import { ScheduleDateTimePicker } from './ScheduleDateTimePicker';
import { bakuInput, bakuInstant, suggestSchedule, newScheduleAutomation, type ScheduleAutomation, type WizardFields, type WizardRound } from '../../utils/tournamentWizard';
import { defaultScheduleOptions, mapInterval, minimumMapInterval, MATCH_TIMING_SOURCE, type ScheduleOptions } from '../../utils/matchScheduling';
import { formatEventDate } from '../../utils/calendar';
import '../../styles/tournament-editor.css';

function PlanningNumberInput({label,value,min,max,disabled,onChange}:{label:string;value:number;min:number;max:number;disabled:boolean;onChange:(value:number)=>void}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  const valid=draft.trim()!==''&&Number.isInteger(Number(draft))&&Number(draft)>=min&&Number(draft)<=max;
  return <Input label={label} type="number" min={min} max={max} step={1} value={draft} disabled={disabled}
    error={!valid?`${min}–${max} aralığında tam ədəd daxil edin.`:undefined}
    onChange={e=>{const next=e.target.value;setDraft(next);const n=Number(next);if(next!==''&&Number.isInteger(n)&&n>=min&&n<=max)onChange(n);}}
    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}
    onBlur={()=>{if(!valid){const next=Math.max(min,Math.min(max,Math.round(Number(draft)||value)));setDraft(String(next));onChange(next);}}}/>;
}

export interface SchedulePlan { options: ScheduleOptions; automation: ScheduleAutomation }
export const newSchedulePlan=(existing=false):SchedulePlan=>({options:{...defaultScheduleOptions},automation:newScheduleAutomation(existing)});
export function TournamentSchedule({fields,rounds,onChange,error,locked=false,existing=false,plan:providedPlan,onPlanChange}:{fields:WizardFields;rounds:WizardRound[];onChange:(fields:WizardFields,rounds:WizardRound[])=>void;error?:(field:string)=>string|undefined;locked?:boolean;existing?:boolean;plan?:SchedulePlan;onPlanChange?:(plan:SchedulePlan)=>void}) {
  const [localPlan,setLocalPlan]=useState(()=>newSchedulePlan(existing)),[advanced,setAdvanced]=useState(false),[confirm,setConfirm]=useState(false);
  const plan=providedPlan??localPlan,{options,automation}=plan;
  const changePlan=(next:SchedulePlan)=>{setLocalPlan(next);onPlanChange?.(next);};
  useEffect(()=>{
    if(locked||!automation.automatic)return;
    const next=suggestSchedule(fields,rounds,options,automation);
    if(JSON.stringify(next)!==JSON.stringify({fields,rounds}))onChange(next.fields,next.rounds);
  },[fields,rounds,options,automation,locked,onChange]);
  const update=(key:keyof WizardFields,value:string)=>onChange({...fields,[key]:value},rounds);
  const adjust=(key:keyof ScheduleOptions,value:number)=>{
    if(!Number.isFinite(value))return;
    const next={...options,[key]:value};
    next.intervalMinutes=mapInterval(next);
    changePlan({...plan,options:next});
  };
  const regenerate=()=>{const next=newSchedulePlan();next.options=options;changePlan(next);const result=suggestSchedule(fields,rounds,options);onChange(result.fields,result.rounds);setConfirm(false);};
  const essentials=[['startsAt','Turnirin başlanğıcı'],['registrationOpensAt','Qeydiyyat açılır'],['registrationDeadline','Qeydiyyat bağlanır']] as const;
  const offset=(value:string,minutes:number)=>value&&Number.isFinite(Date.parse(bakuInstant(value)))?bakuInput(new Date(Date.parse(bakuInstant(value))+minutes*60_000).toISOString()):undefined;
  const bounds:Partial<Record<keyof WizardFields,{min?:string;max?:string}>>={
    registrationOpensAt:{max:offset(fields.registrationDeadline,-1)},
    registrationDeadline:{min:offset(fields.registrationOpensAt,1),max:automation.checkInManual||!automation.automatic?fields.checkInOpensAt||fields.startsAt||undefined:offset(fields.startsAt,-1)},
    startsAt:{min:automation.checkInManual||!automation.automatic?fields.checkInClosesAt||undefined:offset(fields.registrationDeadline,1)},
    checkInOpensAt:{min:fields.registrationDeadline||undefined,max:offset(fields.checkInClosesAt,-1)},
    checkInClosesAt:{min:offset(fields.checkInOpensAt,1),max:fields.startsAt||undefined},
    endsAt:{min:offset(rounds[rounds.length-1]?.startsAt||fields.startsAt,1)},
  };
  const advancedError=['endsAt','checkInOpensAt','checkInClosesAt'].some(key=>error?.(key));
  return <section className="schedule-editor" aria-label="Turnir cədvəli">
    <div className="schedule-editor__zone"><CalendarDays size={18}/><strong>Yarış cədvəli</strong><span>Asia/Baku · UTC+4</span></div>
    <div className="schedule-editor__essential">{essentials.map(([key,label])=><ScheduleDateTimePicker key={key} id={`wizard-${key}`} name={key} label={label} value={fields[key]} onChange={value=>update(key,value)} disabled={locked} required error={error?.(key)} {...bounds[key]}/>)}</div>
    <div className="schedule-editor__summary" aria-live="polite"><Clock3 size={17}/><span>{fields.startsAt?formatEventDate(bakuInstant(fields.startsAt),{withTime:true}):'Başlanğıc vaxtını seçin'} · {rounds.length} raund</span></div>
    <div className="schedule-plan-controls"><PlanningNumberInput label="Başlanğıclar arası interval (dəq.)" min={minimumMapInterval(options)} max={1440} value={options.intervalMinutes} disabled={locked} onChange={value=>adjust('intervalMinutes',value)}/><PlanningNumberInput label="Oyun müddəti təxmini (dəq.)" min={35} max={240} value={options.matchMinutes} disabled={locked} onChange={value=>adjust('matchMinutes',value)}/><PlanningNumberInput label="Otaq hazırlığı (dəq.)" min={5} max={10} value={options.preparationMinutes} disabled={locked} onChange={value=>adjust('preparationMinutes',value)}/></div>
    <p className="admin-field-hint"><a href={MATCH_TIMING_SOURCE} target="_blank" rel="noreferrer">PMWC 2026 · §4.4</a>: Erangel, Miramar və Rondo üçün 31 dəq. 40 san. baza; planlama üçün 35 dəqiqəyə yuvarlaqlaşdırılır. {options.matchMinutes} dəq. oyun + {options.preparationMinutes} dəq. otaq hazırlığı + {mapInterval(options)-options.matchMinutes-options.preparationMinutes} dəq. ehtiyat = {mapInterval(options)} dəq. interval. Minimum 45 dəqiqə. Fərqli zona/otaq parametrlərində oyun təxminini artırın.</p>
    <div className="schedule-plan-actions"><label className="schedule-editor__mode"><input type="checkbox" checked={automation.automatic} disabled={locked} onChange={e=>{if(existing&&e.target.checked)setConfirm(true);else changePlan({...plan,automation:{...automation,automatic:e.target.checked}});}}/>Sonrakı raundları avtomatik uyğunlaşdır</label><Button variant="secondary" disabled={locked||!fields.startsAt} onClick={()=>{if(existing||automation.overrides.length||automation.endManual||automation.checkInManual)setConfirm(true);else regenerate();}}>Cədvəli yenidən yarat</Button></div>
    <p className="admin-field-hint">{!automation.automatic?'Mövcud vaxtlar qorunur. Avtomatik uyğunlaşdırmanı açın və ya cədvəli yenidən yaradın. ':''}Əl ilə dəyişdirdiyiniz vaxtlar qorunur; sonrakı avtomatik raundlar həmin vaxtdan hesablanır.</p>
    <ol className="schedule-map-list" aria-label="Xəritələrin başlama vaxtları">{rounds.map((r,i)=>{
      const spacing=i>0?(Date.parse(bakuInstant(r.startsAt))-Date.parse(bakuInstant(rounds[i-1].startsAt)))/60_000:NaN;
      const timingError=Number.isFinite(spacing)&&spacing<minimumMapInterval(options)?`Əvvəlki raunddan ən azı ${minimumMapInterval(options)} dəqiqə sonra başlamalıdır.`:undefined;
      return <li key={i}><div className="schedule-map-list__identity"><strong>{i+1}. {r.map}</strong><small>{options.matchMinutes} dəq. oyun · {options.preparationMinutes} dəq. hazırlıq{automation.overrides.includes(i)?' · əl ilə':''}</small></div><ScheduleDateTimePicker id={`wizard-round-${i}`} name={`round-${i}`} label={`${i+1}. raund başlayır`} value={r.startsAt} min={i?offset(rounds[i-1].startsAt,minimumMapInterval(options)):fields.startsAt||undefined} max={automation.automatic&&!automation.endManual?undefined:offset(fields.endsAt,-1)} required disabled={locked} error={timingError||error?.(`round-${i}`)} onChange={value=>{changePlan({...plan,automation:{...automation,overrides:[...new Set([...automation.overrides,i])]}});onChange(fields,rounds.map((r,n)=>n===i?{...r,startsAt:value}:r));}}/></li>;
    })}</ol>
    <details className="admin-advanced" open={advanced||advancedError} onToggle={e=>setAdvanced(e.currentTarget.open)}><summary>Ətraflı cədvəl</summary><p className="admin-field-hint">Check-in qeydiyyat bağlananda açılır, yarış başlayanda bağlanır. Buradakı əl ilə dəyişikliklər avtomatik hesablamadan qorunur.</p><div className="form-grid">{([['checkInOpensAt','Check-in açılır'],['checkInClosesAt','Check-in bağlanır'],['endsAt','Turnirin bitməsi']] as const).map(([key,label])=><ScheduleDateTimePicker key={key} id={`wizard-${key}`} name={key} label={label} value={fields[key]} disabled={locked} required error={error?.(key)} {...bounds[key]} onChange={value=>{changePlan({...plan,automation:{...automation,[key==='endsAt'?'endManual':'checkInManual']:true}});update(key,value);}}/>)}</div></details>
    <ConfirmDialog open={confirm} title="Cədvəl yenidən yaradılsın?" body="Bütün raund vaxtları və əl ilə edilmiş cədvəl dəyişiklikləri başlanğıcdan yenidən hesablanacaq. Saxlanmış turnir yalnız dəyişiklikləri saxlayanda yenilənir." confirmLabel="Vaxtları yenidən hesabla" tone="primary" onConfirm={regenerate} onClose={()=>setConfirm(false)}/>
  </section>;
}
