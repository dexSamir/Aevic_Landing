import type { TournamentCreation } from '../types/domain';
// datetime-local is a wall clock. Never interpret it in the administrator's device zone.
export const bakuInstant = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}${value.length===16?':00':''}+04:00`;
export function bakuInput(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(Date.parse(value) + 4 * 60 * 60_000).toISOString().slice(0,16);
}
const instant = (value: string) => Date.parse(bakuInstant(value));
export type WizardFields = Record<'name'|'shortName'|'description'|'maxSlots'|'startsAt'|'endsAt'|'registrationOpensAt'|'registrationDeadline'|'checkInOpensAt'|'checkInClosesAt'|'rules', string>;
export type WizardRound = TournamentCreation['rounds'][number];
export interface WizardIssue { field: string; message: string; step: number }
export function validateTournamentWizard(fields: WizardFields, rounds: WizardRound[]): WizardIssue[] {
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
  const rules=fields.rules.split('\n').map(r=>r.trim()).filter(Boolean);
  if(rules.length>50 || rules.some(r=>r.length>500))add('rules','Ən çox 50 qayda, hər qayda ən çox 500 simvol ola bilər.',3);
  return errors;
}
export function tournamentWizardPayload(fields: WizardFields, rounds: WizardRound[]): TournamentCreation {
  return {name:fields.name.trim(),shortName:fields.shortName.trim(),description:fields.description,maxSlots:Number(fields.maxSlots),startsAt:new Date(bakuInstant(fields.startsAt)).toISOString(),endsAt:new Date(bakuInstant(fields.endsAt)).toISOString(),registrationOpensAt:new Date(bakuInstant(fields.registrationOpensAt)).toISOString(),registrationDeadline:new Date(bakuInstant(fields.registrationDeadline)).toISOString(),checkInOpensAt:new Date(bakuInstant(fields.checkInOpensAt)).toISOString(),checkInClosesAt:new Date(bakuInstant(fields.checkInClosesAt)).toISOString(),rules:fields.rules.split('\n').map(s=>s.trim()).filter(Boolean),rounds:rounds.map(r=>({...r,startsAt:new Date(bakuInstant(r.startsAt)).toISOString()}))};
}

export interface ScheduleTemplate { name: string; startsAt: string; endsAt: string; rounds: Array<{map:string;startsAt:string}> }
/** Reuse an actual tournament's relative round times; no made-up duration preset. */
export function suggestSchedule(fields: WizardFields, rounds: WizardRound[], template?: ScheduleTemplate) {
  const start=instant(fields.startsAt);
  const next={...fields,checkInOpensAt:fields.registrationDeadline,checkInClosesAt:fields.startsAt};
  if (!Number.isFinite(start)) return {fields:next,rounds};
  const sourceStart=template ? Date.parse(template.startsAt) : NaN;
  const usable=template && template.rounds.length===rounds.length && Date.parse(template.endsAt)>sourceStart && template.rounds.every(r=>Date.parse(r.startsAt)>=sourceStart && Date.parse(r.startsAt)<Date.parse(template.endsAt));
  if(usable){
    const shift=(value:string)=>bakuInput(new Date(start+Date.parse(value)-sourceStart).toISOString());
    next.endsAt=shift(template.endsAt);
    return {fields:next,rounds:rounds.map((r,i)=>({...r,startsAt:shift(template.rounds[i].startsAt)}))};
  }
  return {fields:next,rounds:rounds.map((r,i)=>i===0?{...r,startsAt:fields.startsAt}:r)};
}
