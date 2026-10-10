import {createPublicKey,verify,randomBytes,createHash} from 'node:crypto';
import {ServiceError} from '../errors';
export const randomToken=()=>randomBytes(32).toString('base64url');
export const pkceChallenge=(verifier:string)=>createHash('sha256').update(verifier).digest('base64url');
export type GoogleConfig={clientId:string;clientSecret:string};
type Jwk=JsonWebKey & {kid?:string};
let cache:{keys:Jwk[];until:number}|undefined;
async function keys():Promise<Jwk[]>{
 if(cache&&cache.until>Date.now())return cache.keys;
 const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new ServiceError(503,'GOOGLE_UNAVAILABLE');
 const value=await response.json() as {keys:Jwk[]};
 if(!Array.isArray(value.keys))throw new ServiceError(503,'GOOGLE_UNAVAILABLE');
 cache={keys:value.keys,until:Date.now()+300_000};return value.keys;
}
export function validateGoogleToken(token:string,clientId:string,nonce:string,jwks:Jwk[],now=Date.now()){
 try{
  if(token.length>20000)throw Error();
  const parts=token.split('.');if(parts.length!==3)throw Error();
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
  const key=jwks.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
  if(header.alg!=='RS256'||!key||!verify('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),createPublicKey({key:key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();
  if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||(claims.azp&&claims.azp!==clientId)||claims.nonce!==nonce||typeof claims.exp!=='number'||claims.exp*1000<=now||typeof claims.iat!=='number'||claims.iat*1000>now+60_000||claims.email_verified!==true||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||typeof claims.email!=='string'||!/^\S+@\S+\.\S+$/.test(claims.email)||claims.email.length>254)throw Error();
  return {subject:claims.sub,email:claims.email.trim().toLowerCase(),firstName:typeof claims.given_name==='string'?claims.given_name.slice(0,80):'',lastName:typeof claims.family_name==='string'?claims.family_name.slice(0,80):''};
 }catch{throw new ServiceError(401,'GOOGLE_IDENTITY_INVALID');}
}
export async function exchangeGoogleCode(config:GoogleConfig,code:string,verifier:string,nonce:string,redirectUri:string){
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:verifier,redirect_uri:redirectUri})});
 if(!response.ok)throw new ServiceError(401,'GOOGLE_EXCHANGE_FAILED');
 const data=await response.json() as {id_token?:string};if(typeof data.id_token!=='string')throw new ServiceError(401,'GOOGLE_IDENTITY_INVALID');
 return validateGoogleToken(data.id_token,config.clientId,nonce,await keys());
}
