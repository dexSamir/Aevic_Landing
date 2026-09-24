// Read-only checks. No private rows, reset links, password hashes or keys are printed.
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(new URL(base).hostname!=='nmjjibifcuzjlsvfcaaz.supabase.co')throw Error('Wrong project');
for(const columns of ['password_hash','reset_token','email,captain_contact,room_password']){
 const response=await fetch(`${base}/rest/v1/teams?select=${columns}&limit=0`,{headers:{apikey:key}});
 console.log(JSON.stringify({probe:'zero-row column permission',columns,status:response.status}));
}
const response=await fetch(`${base}/storage/v1/bucket`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
const data=await response.json();console.log(JSON.stringify({probe:'bucket inventory',status:response.status,buckets:Array.isArray(data)?data.map(b=>({id:b.id,public:b.public})):undefined}));
console.log(JSON.stringify({privateDatabaseConfigured:Boolean(process.env.AEVIC_DATABASE_URL),storageServiceKeyConfigured:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),mediaBucketConfigured:Boolean(process.env.TEAM_MEDIA_BUCKET)}));
const teamsResponse=await fetch(`${base}/rest/v1/teams?select=id::text,logo_url,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url&order=id`,{headers:{apikey:key}});
if(teamsResponse.ok){const teams=await teamsResponse.json();console.log(JSON.stringify({publicMediaReferences:teams.map(t=>({id:t.id,logo:t.logo_url,playerPhotoCount:[1,2,3,4,5].filter(i=>Boolean(t[`player${i}_photo_url`])).length}))}));}
