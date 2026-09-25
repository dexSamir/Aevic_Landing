import {getCookie} from 'hono/cookie';
import {createHash} from 'node:crypto';
import type {ApiContext} from '../types';
import type {Actor} from './repository';
import {ServiceError} from '../errors';
export const tokenDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const adminCookieName=(c:ApiContext)=>c.get('config').secureCookies?'__Host-aevic-admin':'aevic-admin';
export const captainCookieName=(c:ApiContext)=>c.get('config').secureCookies?'__Host-aevic-captain':'aevic-captain';
export const currentCaptainCookie=(c:ApiContext)=>getCookie(c,captainCookieName(c));
export function platform(c:ApiContext){const repository=c.get('platform');if(!repository)throw new ServiceError(503,'PLATFORM_NOT_CONFIGURED');return repository;}
export function actor(c:ApiContext):Actor{const a=platform(c).actor;if(!a.teamId&&!a.accountId&&!a.adminId)throw new ServiceError(401,'UNAUTHORIZED');return a;}
export function captain(c:ApiContext){const a=actor(c);if(!a.teamId)throw new ServiceError(403,'CAPTAIN_REQUIRED');return a.teamId;}
export function admin(c:ApiContext,roles:string[]=[]){const a=actor(c);if(!a.adminId||roles.length&&a.role!=='super-admin'&&!roles.includes(a.role??''))throw new ServiceError(403,'FORBIDDEN');return a.adminId;}
export function ownTeam(c:ApiContext,id:string){if(captain(c)!==id)throw new ServiceError(403,'FORBIDDEN');return id;}

export function account(c:ApiContext){const a=actor(c);const id=a.accountId??a.teamId;if(!id)throw new ServiceError(403,'ACCOUNT_REQUIRED');return id;}
