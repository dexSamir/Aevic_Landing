import type { TournamentCreation } from '../types/domain';
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
  dates.forEach((key,i)=>{if(!Number.isFinite(Date.parse(fields[key])))add(key,`${labels[i]} üçün tarix və vaxt seçin.`,2);});
  const comparisons = [['registrationOpensAt','registrationDeadline',false],['registrationDeadline','checkInOpensAt',true],['checkInOpensAt','checkInClosesAt',false],['checkInClosesAt','startsAt',true],['startsAt','endsAt',false]] as const;
  comparisons.forEach(([a,b,equal])=>{if(Number.isFinite(Date.parse(fields[a])) && Number.isFinite(Date.parse(fields[b])) && (equal ? Date.parse(fields[b])<Date.parse(fields[a]) : Date.parse(fields[b])<=Date.parse(fields[a])))add(b,'Tarix ardıcıllığını yoxlayın: qeydiyyat → check-in → yarış.',2);});
  const seen = new Set<number>();
  rounds.forEach((r,i)=>{const at=Date.parse(r.startsAt);if(!Number.isFinite(at))add(`round-${i}`,'Raundun başlama vaxtını seçin.',2);else if(seen.has(at))add(`round-${i}`,'Hər raundun başlama vaxtı fərqli olmalıdır.',2);else if(at<Date.parse(fields.startsAt) || at>=Date.parse(fields.endsAt))add(`round-${i}`,'Raund yarışın başlanğıcı ilə bitməsi arasında olmalıdır.',2);seen.add(at);});
  const rules=fields.rules.split('\n').map(r=>r.trim()).filter(Boolean);
  if(rules.length>50 || rules.some(r=>r.length>500))add('rules','Ən çox 50 qayda, hər qayda ən çox 500 simvol ola bilər.',3);
  return errors;
}
export function tournamentWizardPayload(fields: WizardFields, rounds: WizardRound[]): TournamentCreation {
  return {name:fields.name.trim(),shortName:fields.shortName.trim(),description:fields.description,maxSlots:Number(fields.maxSlots),startsAt:new Date(fields.startsAt).toISOString(),endsAt:new Date(fields.endsAt).toISOString(),registrationOpensAt:new Date(fields.registrationOpensAt).toISOString(),registrationDeadline:new Date(fields.registrationDeadline).toISOString(),checkInOpensAt:new Date(fields.checkInOpensAt).toISOString(),checkInClosesAt:new Date(fields.checkInClosesAt).toISOString(),rules:fields.rules.split('\n').map(s=>s.trim()).filter(Boolean),rounds:rounds.map(r=>({...r,startsAt:new Date(r.startsAt).toISOString()}))};
}
