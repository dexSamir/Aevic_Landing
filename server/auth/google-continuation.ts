import {getCookie,deleteCookie} from 'hono/cookie';
import type {Sql,TransactionSql} from 'postgres';
import type {ApiContext} from '../types';
import {tokenDigest} from '../platform/context';
import {ServiceError} from '../errors';
export const googleCookie=(c:ApiContext)=>c.get('config').secureCookies?'__Host-aevic-google':'aevic-google';
export const googleBrowser=(c:ApiContext)=>getCookie(c,googleCookie(c));
export const clearGoogle=(c:ApiContext)=>deleteCookie(c,googleCookie(c),{path:'/',secure:c.get('config').secureCookies});
export async function continuation(sql:Sql|TransactionSql,browser:string,lock=false){
 const rows=lock?await sql`select * from aevic_platform.google_flows where browser_digest=${tokenDigest(browser)} and phase='continuation' and expires_at>clock_timestamp() for update`:await sql`select * from aevic_platform.google_flows where browser_digest=${tokenDigest(browser)} and phase='continuation' and expires_at>clock_timestamp()`;
 if(rows.length!==1)throw new ServiceError(401,'GOOGLE_CONTINUATION_EXPIRED');
 return rows[0];
}
export async function attachGoogleRegistration(tx:TransactionSql,browser:string,accountId:string,email:string){
 const flow=await continuation(tx,browser,true);
 if(flow.email!==email)throw new ServiceError(409,'GOOGLE_EMAIL_MISMATCH');
 await tx`insert into aevic_platform.google_identities(subject,account_id) values(${flow.subject},${accountId})`;
 await tx`update aevic_platform.google_flows set phase='consumed',verifier='',nonce='' where token_digest=${flow.token_digest}`;
}
