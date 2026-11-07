import { useRef, useState, type FormEvent } from 'react';
import { Button, Input, Select, Textarea } from '../../components/common/primitives';
import { TournamentSchedule, newSchedulePlan } from '../../components/admin/TournamentSchedule';
import { TournamentBannerEditor } from '../../components/admin/TournamentBannerEditor';
import { services } from '../../services';
import { invalidateQuery } from '../../services/queryCache';
import { useAdminPlatformData } from '../../services/PlatformDataContext';
import { bakuInput, tournamentWizardPayload, validateTournamentWizard, type WizardFields, type WizardRound } from '../../utils/tournamentWizard';
import type { MatchScheduleItem, Tournament } from '../../types/domain';
import '../../styles/lifecycle.css';

export function TournamentEditForm({tournamentId}:{tournamentId:string}) {
 const snapshot=useAdminPlatformData(),tournament=snapshot.tournaments.find(t=>t.id===tournamentId);
 if(!tournament)return null;
 return <Editor key={tournament.updatedAt} tournament={tournament} matches={(snapshot.matchSchedule??[]).filter(m=>m.tournamentId===tournamentId).sort((a,b)=>a.round-b.round)}/>;
}
function Editor({tournament:t,matches}:{tournament:Tournament;matches:MatchScheduleItem[]}) {
 const [fields,setFields]=useState<WizardFields>(()=>({name:t.name,shortName:t.shortName,description:t.description,maxSlots:String(t.maxSlots),rules:t.rules.join('\n'),...Object.fromEntries((['startsAt','endsAt','registrationOpensAt','registrationDeadline','checkInOpensAt','checkInClosesAt'] as const).map(k=>[k,bakuInput(t[k])]))} as WizardFields));
 // Match identity is taken only from the authoritative snapshot, never from a form.
 const [times,setTimes]=useState<WizardRound[]|null>(null),rounds=times??matches.map(m=>({map:m.map as WizardRound['map'],startsAt:bakuInput(m.startsAt)}));
 const [status,setStatus]=useState(t.status),[banner,setBanner]=useState<string|null>(t.bannerMediaId??null),[uploading,setUploading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[validated,setValidated]=useState(false);
 const pending=useRef(false);
 const [schedulePlan,setSchedulePlan]=useState(()=>newSchedulePlan(true));
 const scheduleChanged=rounds.some((r,i)=>r.map!==matches[i]?.map||r.startsAt!==bakuInput(matches[i]?.startsAt??''))||fields.startsAt!==bakuInput(t.startsAt)||fields.endsAt!==bakuInput(t.endsAt);
 const locked=Date.now()>=Date.parse(t.registrationDeadline)||['ongoing','completed','cancelled'].includes(t.status),terminal=['completed','cancelled'].includes(t.status);
 const ready=matches.length===t.days*t.roundsPerDay&&matches.length>0;
 const issues=validateTournamentWizard(fields,rounds,schedulePlan.options,scheduleChanged),error=(key:string)=>validated?issues.find(i=>i.field===key)?.message:undefined;
 const set=(key:keyof WizardFields,value:string)=>setFields(f=>({...f,[key]:value}));
 const statuses:Record<string,string[]>={draft:['draft','published'],published:['published','registration-open'],'registration-open':['registration-open','ongoing'],ongoing:['ongoing','completed'],completed:['completed'],cancelled:['cancelled']};
 const labels:Record<string,string>={draft:'Qaralama',published:'Dərc edilib','registration-open':'Qeydiyyat açıqdır',ongoing:'Davam edir',completed:'Tamamlandı',cancelled:'Ləğv edildi'};
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(pending.current||uploading||terminal||!ready||!t.updatedAt)return;setValidated(true);
  if(issues.length){setNotice(issues[0].message);return;}
  pending.current=true;setBusy(true);setNotice('');
  try{const payload=tournamentWizardPayload(fields,rounds);for(const k of ['startsAt','endsAt','registrationOpensAt','registrationDeadline','checkInOpensAt','checkInClosesAt'] as const)if(fields[k]===bakuInput(t[k]))payload[k]=t[k];payload.rounds=payload.rounds.map((r,i)=>({...r,startsAt:rounds[i].startsAt===bakuInput(matches[i].startsAt)?matches[i].startsAt:r.startsAt}));if(locked){for(const k of ['startsAt','endsAt','registrationOpensAt','registrationDeadline','checkInOpensAt','checkInClosesAt'] as const)payload[k]=t[k];payload.rounds=matches.map(m=>({map:m.map as WizardRound['map'],startsAt:m.startsAt}));}await services.tournaments.update(t.id,{...payload,bannerMediaId:banner,status,expectedUpdatedAt:t.updatedAt,rounds:payload.rounds.map((r,i)=>({...r,id:matches[i].id}))});invalidateQuery('snapshot:admin');invalidateQuery('snapshot:public');setNotice('Turnir yeniləndi.');}
  catch(e){setNotice(e instanceof Error?e.message:'Dəyişiklik saxlanılmadı.');}finally{pending.current=false;setBusy(false);}
 };
 return <details className="operation-form"><summary>Turniri redaktə et</summary>{!ready&&<p role="status">Raund cədvəli yüklənir…</p>}{notice&&<p role="status">{notice}</p>}<form onSubmit={submit} noValidate><fieldset className="admin-wizard-fields" disabled={busy||terminal}>
  <section className="admin-field-group"><h3>Turnirin kimliyi</h3><div className="form-grid"><Input label="Turnir adı" value={fields.name} required maxLength={120} onChange={e=>set('name',e.target.value)} error={error('name')}/><Input label="Qısa ad" value={fields.shortName} required maxLength={50} onChange={e=>set('shortName',e.target.value)} error={error('shortName')}/></div><Textarea label="Təsvir" value={fields.description} maxLength={3000} onChange={e=>set('description',e.target.value)}/><TournamentBannerEditor value={banner} onChange={setBanner} onBusy={setUploading}/></section>
  <section className="admin-field-group"><Select label="Nəşr statusu" value={status} onChange={e=>setStatus(e.target.value as typeof status)}>{(statuses[t.status]??[t.status]).map(s=><option key={s} value={s}>{labels[s]}</option>)}</Select>{locked&&<p className="admin-field-hint">Cədvəl və tutum kilidlənib.</p>}</section>
  <TournamentSchedule fields={fields} rounds={rounds} onChange={(f,r)=>{setFields(f);setTimes(r);}} error={error} locked={locked} existing plan={schedulePlan} onPlanChange={setSchedulePlan}/>
  <section className="admin-field-group"><Input label="Maksimum komanda sayı" type="number" min={1} max={100} required value={fields.maxSlots} onChange={e=>set('maxSlots',e.target.value)} disabled={locked} error={error('maxSlots')}/>{rounds.map((r,i)=><Select key={matches[i]?.id??i} label={`${i+1}. raund xəritəsi`} value={r.map} disabled={locked} onChange={e=>setTimes(rounds.map((r,n)=>n===i?{...r,map:e.target.value as WizardRound['map']}:r))}>{['Erangel','Miramar','Rondo'].map(map=><option key={map}>{map}</option>)}</Select>)}</section>
  <Textarea label="Qaydalar — hər sətirdə bir qayda" value={fields.rules} onChange={e=>set('rules',e.target.value)} error={error('rules')}/>
  <Button type="submit" loading={busy} disabled={!t.updatedAt||!ready||uploading}>Dəyişiklikləri saxla</Button>
 </fieldset></form></details>;
}
