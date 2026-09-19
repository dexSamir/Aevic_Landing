import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { requestJson } from './requestJson';
import { invalidateQuery } from './queryCache';

/** Loaded only inside an authenticated workspace. Tokens remain in memory. */
export async function subscribeTeam(teamId:string,signal:AbortSignal) {
 const root=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
 const credentials=await requestJson<{url:string;key:string;accessToken:string;userId:string}>(`${root}/me/realtime`,{credentials:'include',signal});
 if(signal.aborted)return;
 const db=createClient(credentials.url,credentials.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 await db.realtime.setAuth(credentials.accessToken);
 let debounce:ReturnType<typeof setTimeout>|undefined;
 const refresh=()=>{if(signal.aborted)return;clearTimeout(debounce);debounce=setTimeout(()=>{invalidateQuery('snapshot:team');invalidateQuery('notifications:');invalidateQuery('disputes:');},250);};
 const channel:RealtimeChannel=db.channel(`team-${teamId}-${crypto.randomUUID()}`)
 .on('postgres_changes',{event:'*',schema:'aevic',table:'notifications',filter:`recipient_id=eq.${credentials.userId}`},refresh)
 .on('postgres_changes',{event:'*',schema:'aevic',table:'check_ins',filter:`team_id=eq.${teamId}`},refresh)
 .on('postgres_changes',{event:'INSERT',schema:'aevic',table:'messages',filter:`team_id=eq.${teamId}`},refresh)
 .on('postgres_changes',{event:'UPDATE',schema:'aevic',table:'matches'},()=>{refresh();invalidateQuery('snapshot:public');})
 .subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
 // Safe read recovery for timed room release, missed events, global announcements and reconnect.
 const refreshAuth=setInterval(()=>{void requestJson<typeof credentials>(`${root}/me/realtime`,{credentials:'include',signal}).then(c=>{if(!signal.aborted)void db.realtime.setAuth(c.accessToken);}).catch(()=>{/* Keep read polling; session expiry is handled by the next API response. */});},4*60_000);
 const onOnline=()=>refresh();window.addEventListener('online',onOnline);
 const cleanup=()=>{clearTimeout(debounce);clearInterval(refreshAuth);window.removeEventListener('online',onOnline);void db.removeChannel(channel);void db.removeAllChannels();db.realtime.disconnect();};
 if(signal.aborted)cleanup();else signal.addEventListener('abort',cleanup,{once:true});
}
