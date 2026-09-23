// Read-only shape inspection. Never prints strings, credentials, contacts or row contents.
const origin='https://nmjjibifcuzjlsvfcaaz.supabase.co';
if(process.env.SUPABASE_URL!==origin)throw new Error('Original project required');
function shape(value,depth=0) {
 if(value===null)return 'null';
 if(depth>8)return typeof value;
 if(Array.isArray(value))return {type:'array',length:value.length,items:value.length?shape(value[0],depth+1):undefined};
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key, /password|token|secret|email|contact|session|hash/i.test(key)?'redacted':shape(v,depth+1)]));
 return typeof value;
}
const r=await fetch(origin+'/rest/v1/tournament_state?select=*&limit=1',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(15000)});
const data=await r.json();console.log(JSON.stringify({status:r.status,...(r.ok?{shape:shape(data)}:{code:data.code})},null,2));
