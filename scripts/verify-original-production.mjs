// Explicitly read-only. Uses the same production API implementation as Netlify.
import { createServer } from 'vite';
const server = await createServer({ server: {middlewareMode:true}, appType:'custom' });
try {
 const {createApp} = await server.ssrLoadModule('/server/app.ts');
 const app=createApp();
 const contextResponse=await app.request('/api/public/context');
 const context=await contextResponse.json();
 if(contextResponse.status!==200) { console.log({contextStatus:contextResponse.status,code:context.code});process.exitCode=1; }
 else {
  const checks=[];
  for(const team of context.teams) {
   const profile=await app.request(`/api/public/teams/${team.id}`);
   const matches=await app.request(`/api/public/teams/${team.id}/matches`);
   const detail=await profile.json();const history=await matches.json();
   checks.push({id:team.id,profileStatus:profile.status,identityMatches:detail.team?.id===team.id,rosterSize:detail.team?.roster.length,photoCount:detail.team?.roster.filter(p=>p.photoUrl).length,logoPresent:Boolean(detail.team?.logoUrl),historyStatus:matches.status,historyEntries:Array.isArray(history)?history.length:undefined});
  }
  console.log(JSON.stringify({contextStatus:contextResponse.status,source:context.dataSource,teamCount:context.teams.length,checks},null,2));
  if(checks.some(c=>c.profileStatus!==200||c.historyStatus!==200||!c.identityMatches))process.exitCode=1;
 }
} finally { await server.close(); }
const mediaResponse=await fetch(process.env.SUPABASE_URL+'/rest/v1/teams?select=logo_url,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(15000)});
if(mediaResponse.ok){const rows=await mediaResponse.json();const kinds={};for(const row of rows)for(const v of Object.values(row)){const kind=!v?'empty':typeof v!=='string'?'non-string':v.startsWith('data:image/')?'embedded-image':v.startsWith('https://')?'https':v.startsWith('http://')?'http':'other';kinds[kind]=(kinds[kind]??0)+1;}console.log({sourceMediaKinds:kinds,otherMedia:rows.map(r=>r.logo_url).filter(v=>v&&!v.startsWith("https://")&&!v.startsWith("data:")).map(v=>({length:v.length,prefix:v.slice(0,100).split("?")[0]}))});}
