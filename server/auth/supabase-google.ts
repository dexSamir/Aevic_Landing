import type {ServerConfig} from '../config';
import {ServiceError} from '../errors';
import {pkceChallenge} from './google-provider';

export function supabaseGoogleUrl(config:ServerConfig,state:string,verifier:string){
 const callback=new URL(config.siteUrl+'/api/auth/google/callback');callback.searchParams.set('state',state);
 const url=new URL('/auth/v1/authorize',config.supabaseUrl);
 url.search=new URLSearchParams({provider:'google',redirect_to:callback.href,code_challenge:pkceChallenge(verifier),code_challenge_method:'s256',scopes:'openid email profile',prompt:'select_account'}).toString();
 return url;
}
// Only the backend exchanges PKCE and obtains the provider identity from Auth.
// Keep Google's subject as the mapping key; a Supabase user UUID is NOT an AEVIC account ID.
export async function exchangeSupabaseGoogle(config:ServerConfig,code:string,verifier:string){
 const headers={apikey:config.publishableKey,'Content-Type':'application/json'};
 const response=await fetch(new URL('/auth/v1/token?grant_type=pkce',config.supabaseUrl),{method:'POST',headers,body:JSON.stringify({auth_code:code,code_verifier:verifier}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new ServiceError(401,'GOOGLE_EXCHANGE_FAILED');
 const session=await response.json() as {access_token?:string};
 if(typeof session.access_token!=='string')throw new ServiceError(401,'GOOGLE_IDENTITY_INVALID');
 const verified=await fetch(new URL('/auth/v1/user',config.supabaseUrl),{headers:{...headers,Authorization:`Bearer ${session.access_token}`},signal:AbortSignal.timeout(8000)});
 if(!verified.ok)throw new ServiceError(401,'GOOGLE_IDENTITY_INVALID');
 const user=await verified.json() as {email?:string;email_confirmed_at?:string;identities?:{provider:string;identity_data?:Record<string,unknown>}[]};
 const identities=user.identities?.filter(i=>i.provider==='google')??[];
 const identity=identities.length===1?identities[0].identity_data:undefined;
 if(!identity||typeof identity.sub!=='string'||!identity.sub||identity.sub.length>255||identity.email_verified!==true||typeof identity.email!=='string'||!/^\S+@\S+\.\S+$/.test(identity.email)||identity.email.length>254||!user.email_confirmed_at||identity.email.toLowerCase()!==user.email?.toLowerCase())throw new ServiceError(401,'GOOGLE_IDENTITY_INVALID');
 return {subject:identity.sub,email:identity.email.trim().toLowerCase(),firstName:typeof identity.given_name==='string'?identity.given_name.slice(0,80):'',lastName:typeof identity.family_name==='string'?identity.family_name.slice(0,80):''};
}
