import {setTimeout as delay} from 'node:timers/promises';
import type {CaptainRow,CaptainStore,TeamPatch} from './store';
import {ServiceError} from '../errors';
import {same,checkReset,checkSession,digest,hashPassword,makeSession,nonce,parseReset,passwordParts,resetIdentity,resetRecord,revokeHashSessions,sessionIdentity,verifyPassword} from './crypto';
import {mapProductionTeam} from '../services/productionTeams';
import type {Team} from '../../src/types/domain';
export interface ResetMailer {send(to:string,link:string):Promise<void>}
export function privateTeam(row:CaptainRow):Team {
 const team=mapProductionTeam(row);const name=String(row.captain_name??'').trim().split(/\s+/);
 return {...team,captain:{id:row.id,teamId:row.id,firstName:name.shift()??'',lastName:name.join(' '),email:row.email,phone:String(row.captain_contact??''),role:'captain'},rejectionReason:typeof row.rejection_reason==='string'?row.rejection_reason:undefined};
}
export class CaptainService {
 constructor(readonly store:CaptainStore,private secret:string,private site:string,private mailer:ResetMailer,private now=()=>Date.now(),private resetResponseFloorMs=2000) {}
 async ready(){if(this.secret.length<32)throw new ServiceError(503,'CAPTAIN_AUTH_NOT_CONFIGURED');await this.store.ready();}
 async login(email:string,password:string,remember:boolean) {
  await this.ready();const row=await this.store.byEmail(email);
  if(!await verifyPassword(password,row?.password_hash)||!row)throw new ServiceError(401,'LOGIN_FAILED_RESET_AVAILABLE');
  if(row.status==='banned')throw new ServiceError(403,'TEAM_UNAVAILABLE');
  // Re-read to close reset/logout races during the expensive password verification.
  const current=await this.store.byId(row.id);
  if(!current||current.password_hash!==row.password_hash)throw new ServiceError(401,'LOGIN_FAILED_RESET_AVAILABLE');
  return {row:current,cookie:makeSession(row.id,row.password_hash,this.secret,remember?30*86400:8*3600,this.now())};
 }
 async authenticate(cookie:string|undefined) {
  if(!cookie)throw new ServiceError(401,'UNAUTHORIZED');
  const identity=sessionIdentity(cookie,this.now());if(!identity)throw new ServiceError(401,'UNAUTHORIZED');
  await this.ready();const row=await this.store.byId(identity.teamId);
  if(!row||row.status==='banned'||!checkSession(cookie,row.id,row.password_hash,this.secret,this.now()))throw new ServiceError(401,'UNAUTHORIZED');return row;
 }
 async requestReset(email:string) {
  const started=performance.now();
  try {
  await this.ready();const row=await this.store.byEmail(email);if(!row)return;
  const previous=parseReset(row.reset_token);
  if(previous&&this.now()/1000-previous.issued<60)return;
  const token=`${row.id}.${nonce()}`,record=resetRecord(token,this.secret,this.now());
  if(!await this.store.issueReset(row,record))return;
  const link=new URL('/reset-password',this.site);link.hash=new URLSearchParams({token}).toString();
  // Both missing-account and failed-delivery requests have the same public receipt.
  try {await this.mailer.send(row.email,link.href);}catch{console.warn('AEVIC_RESET_DELIVERY_FAILED');}
  } finally {await delay(Math.max(0,this.resetResponseFloorMs-(performance.now()-started)));}
 }
 async inspectReset(token:string):Promise<'valid'|'invalid'|'expired'> {
  await this.ready();const id=resetIdentity(token);if(!id)return 'invalid';
  const row=await this.store.byId(id);const record=parseReset(row?.reset_token);
  if(!record||!same(record.digest,digest(this.secret,'reset',token)))return 'invalid';
  return record.expires*1000<=this.now()?'expired':checkReset(token,row?.reset_token,this.secret,this.now())?'valid':'invalid';
 }
 async resetPassword(token:string,password:string) {
  await this.ready();const id=resetIdentity(token);if(!id)throw new ServiceError(422,'INVALID_RECOVERY_TOKEN');
  const row=await this.store.byId(id);
  if(!row||!checkReset(token,row.reset_token,this.secret,this.now()))throw new ServiceError(422,'INVALID_RECOVERY_TOKEN');
  const hash=await hashPassword(password);
  if(!checkReset(token,row.reset_token,this.secret,this.now())||!await this.store.consumeReset(id,row.reset_token!,hash,parseReset(row.reset_token)!.expires))throw new ServiceError(422,'INVALID_RECOVERY_TOKEN');
 }
 async logout(cookie:string|undefined) {
  if(!cookie)return;
  let row:CaptainRow;try{row=await this.authenticate(cookie);}catch(error){if(error instanceof ServiceError&&error.status===401)return;throw error;}
  // Rotate only the session epoch; retain the modern salt/key. All old signed cookies fail.
  await this.store.changeHash(row.id,row.password_hash,revokeHashSessions(row.password_hash));
 }
 async revokeOthers(cookie:string|undefined) {
  const row=await this.authenticate(cookie),hash=revokeHashSessions(row.password_hash);
  if(!await this.store.changeHash(row.id,row.password_hash,hash))throw new ServiceError(401,'UNAUTHORIZED');
  return this.sessionCookie({...row,password_hash:hash});
 }
 async update(cookie:string|undefined,id:string,patch:TeamPatch) {
  const row=await this.authenticate(cookie);if(row.id!==id)throw new ServiceError(403,'FORBIDDEN');
  return this.store.update(row.id,row.password_hash,patch);
 }
 async changePassword(cookie:string|undefined,current:string,next:string) {
  const row=await this.authenticate(cookie);
  if(!await verifyPassword(current,row.password_hash))throw new ServiceError(401,'LOGIN_FAILED_RESET_AVAILABLE');
  if(!await this.store.changeHash(row.id,row.password_hash,await hashPassword(next)))throw new ServiceError(401,'UNAUTHORIZED');
 }
 async register(values:TeamPatch,password:string) {
  await this.ready();return this.store.register({...values,password_hash:await hashPassword(password),status:'pending',tier:'entry'});
 }
 sessionCookie(row:CaptainRow){return makeSession(row.id,row.password_hash,this.secret,8*3600,this.now());}
 sessionView(row:CaptainRow) {return {user:privateTeam(row).captain,role:'captain' as const};}
 modern(row:CaptainRow){return Boolean(passwordParts(row.password_hash));}
}
