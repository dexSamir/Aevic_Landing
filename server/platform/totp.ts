import {createHmac,createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
import {ServiceError} from '../errors';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes:Uint8Array){let accumulator=0,bits=0,result='';for(const byte of bytes){accumulator=(accumulator<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+=alphabet[(accumulator>>>bits)&31];}}if(bits)result+=alphabet[(accumulator<<(5-bits))&31];return result;}
export function fromBase32(value:string){if(!/^[A-Z2-7]+$/.test(value))throw new Error('Invalid secret');let accumulator=0,bits=0;const bytes:number[]=[];for(const char of value){accumulator=(accumulator<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bits-=8;bytes.push((accumulator>>>bits)&255);}}return Buffer.from(bytes);}
/** RFC 6238 / RFC 4226, SHA-1 with a 30-second step. */
export function totp(secret:Uint8Array,step:number,digits=6){
 if(!Number.isSafeInteger(step)||step<0||![6,8].includes(digits))throw new Error('Invalid TOTP parameters');
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const mac=createHmac('sha1',secret).update(counter).digest();const offset=mac[mac.length-1]&15;
 return String((mac.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export function acceptedStep(secret:Uint8Array,code:string,lastStep:number,now=Date.now()){
 if(!/^\d{6}$/.test(code))return undefined;const current=Math.floor(now/30000);let accepted:number|undefined;
 for(const step of [current-1,current,current+1])if(step>=0&&step>lastStep&&timingSafeEqual(Buffer.from(totp(secret,step)),Buffer.from(code)))accepted=step;
 return accepted;
}
function key(master:string){if(master.length<32)throw new ServiceError(503,'MFA_KEY_UNAVAILABLE');return createHmac('sha256',master).update('aevic-mfa-encryption-v1').digest();}
export function sealSecret(secret:Uint8Array,master:string,identity:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(master),iv);cipher.setAAD(Buffer.from(identity));const ciphertext=Buffer.concat([cipher.update(secret),cipher.final()]);return ['v1',iv.toString('base64url'),ciphertext.toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');
}
export function openSecret(value:string,master:string,identity:string){
 try{const [version,iv,encrypted,tag,...rest]=value.split('.');if(version!=='v1'||rest.length||!iv||!encrypted||!tag)throw new Error('format');const decipher=createDecipheriv('aes-256-gcm',key(master),Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from(identity));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')),decipher.final()]);}catch{throw new ServiceError(503,'MFA_SECRET_UNAVAILABLE');}
}
export function recoveryDigest(code:string,master:string,identity:string){return createHmac('sha256',key(master)).update('recovery\0'+identity+'\0'+code.toUpperCase().replace(/[\s-]/g,'')).digest('hex');}
export function generateRecovery(master:string,identity:string){const codes=Array.from({length:10},()=>randomBytes(10).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'));return{codes,digests:codes.map(code=>recoveryDigest(code,master,identity))};}
