/** Match the production project restriction in server/config.ts, not arbitrary Supabase tenants. */
export function googleOAuthRedirect(value:unknown):string {
 if(typeof value!=='string')throw new Error('Invalid Google redirect');
 const target=new URL(value);
 const direct=target.origin==='https://accounts.google.com'&&target.pathname==='/o/oauth2/v2/auth';
 const supabase=target.origin==='https://nmjjibifcuzjlsvfcaaz.supabase.co'&&target.pathname==='/auth/v1/authorize'&&target.searchParams.getAll('provider').length===1&&target.searchParams.get('provider')==='google';
 if(target.username||target.password||target.hash||(!direct&&!supabase))throw new Error('Invalid Google redirect');
 return target.href;
}
export function navigateGoogleOAuth(value:unknown){window.location.assign(googleOAuthRedirect(value));}
