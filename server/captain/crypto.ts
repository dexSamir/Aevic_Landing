import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceError } from '../errors';

// New passwords only. Never interpret or try to verify legacy password_hash values.
// OWASP scrypt profile: N=2^17, r=8, p=1 (~128 MiB). Bounded concurrency avoids OOM.
const prefix = 'aevic-scrypt-v1';
let hashing = 0;
const b64 = (bytes: Buffer) => bytes.toString('base64url');
export const nonce = () => b64(randomBytes(32));
export const digest = (secret: string, purpose: string, value: string) => createHmac('sha256', secret).update(purpose).update('\0').update(value).digest('base64url');
export function same(a: string, b: string) { const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y); }
async function derive(password: string, salt: string) {
 if(hashing>=2)throw new ServiceError(429,'RATE_LIMITED');hashing++;
 try { return await new Promise<Buffer>((resolve,reject)=>scrypt(password,Buffer.from(salt,'base64url'),64,{N:131072,r:8,p:1,maxmem:160*1024*1024},(error,key)=>error?reject(error):resolve(key))); }
 finally { hashing--; }
}
export function passwordParts(value: unknown) {
 if(typeof value!=='string')return undefined;
 const match=/^aevic-scrypt-v1\$([A-Za-z0-9_-]{43})\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{86})$/.exec(value);
 return match?{epoch:match[1],salt:match[2],key:match[3]}:undefined;
}
export async function hashPassword(password: string) {
 const salt=b64(randomBytes(16));return `${prefix}$${nonce()}$${salt}$${b64(await derive(password,salt))}`;
}
export async function verifyPassword(password: string, hash: unknown) {
 const parts=passwordParts(hash);
 // Do comparable work for missing and legacy accounts; errors remain generic.
 const salt=parts?.salt??'AAAAAAAAAAAAAAAAAAAAAA';
 const derived=b64(await derive(password,salt));return Boolean(parts&&same(derived,parts.key));
}
export function revokeHashSessions(hash: string) {
 const p=passwordParts(hash);if(!p)throw new ServiceError(401,'UNAUTHORIZED');
 return `${prefix}$${nonce()}$${p.salt}$${p.key}`;
}
export function makeSession(teamId: string, hash: string, secret: string, seconds: number, now=Date.now()) {
 const payload=`${teamId}.${Math.floor(now/1000)+seconds}.${nonce()}`;
 return `${payload}.${digest(secret,'session',`${payload}\0${hash}`)}`;
}
export function sessionIdentity(cookie: string, now=Date.now()) {
 const parts=/^([1-9]\d{0,18})\.(\d{10})\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(cookie);
 if(!parts||BigInt(parts[1])>9223372036854775807n||Number(parts[2])*1000<=now||Number(parts[2])*1000>now+31*86400000)return undefined;
 return {teamId:parts[1],payload:`${parts[1]}.${parts[2]}.${parts[3]}`,signature:parts[4]};
}
export function checkSession(cookie: string, teamId: string, hash: string, secret: string, now=Date.now()) {
 const p=sessionIdentity(cookie,now);return Boolean(p&&p.teamId===teamId&&passwordParts(hash)&&same(p.signature,digest(secret,'session',`${p.payload}\0${hash}`)));
}
export type ResetRecord = {digest:string;expires:number;issued:number};
export function resetRecord(rawToken: string, secret: string, now=Date.now()) {
 return `aevic-reset-v1$${Math.floor(now/1000)}$${Math.floor(now/1000)+1800}$${digest(secret,'reset',rawToken)}`;
}
export function parseReset(value: unknown): ResetRecord | undefined {
 if(typeof value!=='string')return undefined;
 const p=/^aevic-reset-v1\$(\d{10})\$(\d{10})\$([A-Za-z0-9_-]{43})$/.exec(value);
 return p?{issued:Number(p[1]),expires:Number(p[2]),digest:p[3]}:undefined;
}
export function resetIdentity(token: string) {const id=/^([1-9]\d{0,18})\.([A-Za-z0-9_-]{43})$/.exec(token)?.[1];return id&&BigInt(id)<=9223372036854775807n?id:undefined;}
export function checkReset(token: string, stored: unknown, secret: string, now=Date.now()) {
 const record=parseReset(stored);return Boolean(resetIdentity(token)&&record&&record.expires*1000>now&&record.issued*1000<=now&&same(record.digest,digest(secret,'reset',token)));
}
