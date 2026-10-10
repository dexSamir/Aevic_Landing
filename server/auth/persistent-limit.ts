import type {ApiContext} from '../types';
import type {Sql} from 'postgres';
import {digest} from '../captain/crypto';
import {ServiceError} from '../errors';
import {tokensEnabled} from './platform-tokens';
/** Independent committed counter: failed logins cannot roll back their attempts. */
export async function persistentLimit(c:ApiContext,sql:Sql,category:string,identity:string,max:number,force=false){
 if(!force&&!tokensEnabled(c))return;
 const key=digest(c.get('config').sessionSecret??'','rate-limit-v2',category+'\0'+identity);
 const [row]=await sql`insert into aevic_platform.authentication_limits(key,hits) values(${key},1) on conflict(key) do update set hits=case when aevic_platform.authentication_limits.window_at<clock_timestamp()-interval '1 minute' then 1 else aevic_platform.authentication_limits.hits+1 end,window_at=case when aevic_platform.authentication_limits.window_at<clock_timestamp()-interval '1 minute' then clock_timestamp() else aevic_platform.authentication_limits.window_at end returning hits`;
 await sql`delete from aevic_platform.authentication_limits where key in (select key from aevic_platform.authentication_limits where window_at<clock_timestamp()-interval '1 day' limit 25)`;
 if(row.hits>max){c.header('Retry-After','60');throw new ServiceError(429,'RATE_LIMITED');}
}
