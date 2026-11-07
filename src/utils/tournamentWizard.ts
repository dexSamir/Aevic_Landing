import type { TournamentCreation } from '../types/domain';
import { defaultScheduleOptions, mapInterval, minimumMapInterval, roundsTooClose, type ScheduleOptions } from './matchScheduling';
// Scheduling values are Baku wall clocks. Never interpret it in the administrator's device zone.
export const bakuInstant = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}${value.length===16?':00':''}+04:00`;
export function bakuInput(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(Date.parse(value) + 4 * 60 * 60_000).toISOString().slice(0,16);
}
const instant = (value: string) => Date.parse(bakuInstant(value));
export type WizardFields = Record<'name'|'shortName'|'description'|'maxSlots'|'startsAt'|'endsAt'|'registrationOpensAt'|'registrationDeadline'|'checkInOpensAt'|'checkInClosesAt'|'rules', string>;
export type WizardRound = TournamentCreation['rounds'][number];
export interface WizardIssue { field: string; message: string; step: number }
export function validateTournamentWizard(fields: WizardFields, rounds: WizardRound[], options: ScheduleOptions = defaultScheduleOptions, enforceSpacing = true): WizardIssue[] {
  const errors: WizardIssue[] = [];
  const add = (field: string, message: string, step: number) => errors.push({field,message,step});
  if(fields.name.trim().length<2 || fields.name.trim().length>120)add('name','Turnir adı 2–120 simvol olmalıdır.',0);
  if(fields.shortName.trim().length<2 || fields.shortName.trim().length>50)add('shortName','Qısa ad 2–50 simvol olmalıdır.',0);
  if(fields.description.length>3000)add('description','Təsvir ən çox 3000 simvol ola bilər.',0);
  if(!Number.isInteger(Number(fields.maxSlots)) || Number(fields.maxSlots)<1 || Number(fields.maxSlots)>100)add('maxSlots','Komanda sayı 1–100 aralığında tam ədəd olmalıdır.',1);
  if(rounds.length<1 || rounds.length>20)add('rounds','1–20 raund əlavə edin.',1);
  const dates = ['registrationOpensAt','registrationDeadline','checkInOpensAt','checkInClosesAt','startsAt','endsAt'] as const;
  const labels = ['Qeydiyyatın açılışı','Qeydiyyatın bağlanışı','Check-in açılışı','Check-in bağlanışı','Turnirin başlanğıcı','Turnirin bitməsi'];
  dates.forEach((key,i)=>{if(!fields[key] || !Number.isFinite(instant(fields[key])))add(key,`${labels[i]} üçün tarix və vaxt seçin.`,2);});
  const comparisons = [['registrationOpensAt','registrationDeadline',false],['registrationDeadline','checkInOpensAt',true],['checkInOpensAt','checkInClosesAt',false],['checkInClosesAt','startsAt',true],['startsAt','endsAt',false]] as const;
  comparisons.forEach(([a,b,equal])=>{if(Number.isFinite(instant(fields[a])) && Number.isFinite(instant(fields[b])) && (equal ? instant(fields[b])<instant(fields[a]) : instant(fields[b])<=instant(fields[a])))add(b,'Tarix ardıcıllığını yoxlayın: qeydiyyat → check-in → yarış.',2);});
  const seen = new Set<number>();
  rounds.forEach((r,i)=>{const at=instant(r.startsAt);if(!Number.isFinite(at))add(`round-${i}`,'Raundun başlama vaxtını seçin.',2);else if(seen.has(at))add(`round-${i}`,'Hər raundun başlama vaxtı fərqli olmalıdır.',2);else if(at<instant(fields.startsAt) || at>=instant(fields.endsAt))add(`round-${i}`,'Raund yarışın başlanğıcı ilə bitməsi arasında olmalıdır.',2);seen.add(at);});
  if(enforceSpacing)roundsTooClose(rounds.map(r=>({startsAt:bakuInstant(r.startsAt)})), minimumMapInterval(options)).forEach(i=>add(`round-${i}`,`Raund başlanğıcları arasında ən azı ${minimumMapInterval(options)} dəqiqə olmalıdır.`,2));
  const rules=fields.rules.split('\n').map(r=>r.trim()).filter(Boolean);
  if(rules.length>50 || rules.some(r=>r.length>500))add('rules','Ən çox 50 qayda, hər qayda ən çox 500 simvol ola bilər.',3);
  return errors;
}
export function tournamentWizardPayload(fields: WizardFields, rounds: WizardRound[]): TournamentCreation {
  return {name:fields.name.trim(),shortName:fields.shortName.trim(),description:fields.description,maxSlots:Number(fields.maxSlots),startsAt:new Date(bakuInstant(fields.startsAt)).toISOString(),endsAt:new Date(bakuInstant(fields.endsAt)).toISOString(),registrationOpensAt:new Date(bakuInstant(fields.registrationOpensAt)).toISOString(),registrationDeadline:new Date(bakuInstant(fields.registrationDeadline)).toISOString(),checkInOpensAt:new Date(bakuInstant(fields.checkInOpensAt)).toISOString(),checkInClosesAt:new Date(bakuInstant(fields.checkInClosesAt)).toISOString(),rules:fields.rules.split('\n').map(s=>s.trim()).filter(Boolean),rounds:rounds.map(r=>({...r,startsAt:new Date(bakuInstant(r.startsAt)).toISOString()}))};
}

export interface ScheduleAutomation {
  automatic: boolean;
  overrides: number[];
  endManual: boolean;
  checkInManual: boolean;
}
export const newScheduleAutomation = (existing = false): ScheduleAutomation => ({automatic:!existing,overrides:[],endManual:false,checkInManual:false});
/** Reflow only generated times; explicit overrides become anchors for later rounds. */
export function suggestSchedule(fields: WizardFields, rounds: WizardRound[], options: ScheduleOptions = defaultScheduleOptions, automation: ScheduleAutomation = newScheduleAutomation()) {
  if(!automation.automatic)return {fields,rounds};
  const next={...fields};
  if(!automation.checkInManual){next.checkInOpensAt=fields.registrationDeadline;next.checkInClosesAt=fields.startsAt;}
  const start=instant(fields.startsAt);
  if(!Number.isFinite(start))return {fields:next,rounds};
  let previous=start;
  const generated=rounds.map((r,i)=>{
    const at=automation.overrides.includes(i)?instant(r.startsAt):i===0?start:previous+mapInterval(options)*60_000;
    previous=at;
    return {...r,startsAt:automation.overrides.includes(i)?r.startsAt:Number.isFinite(at)?bakuInput(new Date(at).toISOString()):''};
  });
  if(!automation.endManual&&Number.isFinite(previous))next.endsAt=bakuInput(new Date(previous+options.matchMinutes*60_000).toISOString());
  return {fields:next,rounds:generated};
}
