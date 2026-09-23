// Read-only public Data API inspection. No service key, SQL, mutations or private team columns.
const origin = 'https://nmjjibifcuzjlsvfcaaz.supabase.co';
if (process.env.SUPABASE_URL !== origin) throw new Error('Original project required');
const headers = { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Accept: 'application/openapi+json' };
const response = await fetch(`${origin}/rest/v1/`, {headers, signal: AbortSignal.timeout(15000)});
if (!response.ok) { const error = await response.json(); console.log({status:response.status,code:error.code,message:error.message}); process.exitCode=1; }
else {
 const spec = await response.json();
 console.log(JSON.stringify({tables:Object.fromEntries(Object.entries(spec.definitions??{}).map(([name,def])=>[name,Object.fromEntries(Object.entries(def.properties??{}).map(([column,p])=>[column,{type:p.type,format:p.format}]))])),paths:Object.keys(spec.paths??{})},null,2));
}
