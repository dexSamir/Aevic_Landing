import {validateBrandAssetRequest} from '../../src/services/brandAssetValidation';
import {body} from '../validation/input';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Env} from '../types';
import {platform,ownTeam,actor} from './context';
import {transaction,audit} from './competition';
import {validateImage} from '../captain/media';
import {ServiceError} from '../errors';
import {createAttemptLimiter} from '../captain/limit';
const app=new Hono<Env>(),limit=createAttemptLimiter();
app.post('/media/validate',async c=>{
 const input=await body(c,z.object({ownerType:z.literal('team'),ownerId:z.string(),assetType:z.enum(['logo','banner']),fileName:z.string().min(1).max(200),mimeType:z.string().max(100),sizeBytes:z.number().int().positive(),width:z.number().int().positive(),height:z.number().int().positive()}).strict());
 ownTeam(c,input.ownerId);return c.json(validateBrandAssetRequest(input));
});
app.post('/media/uploads',async c=>{
 const form=await c.req.formData(),id=ownTeam(c,z.string().parse(form.get('ownerId'))),kind=z.enum(['logo','banner','player-photo','evidence']).parse(form.get('assetType'));
 limit('media-owner',id,20);
 const slot=kind==='player-photo'?z.coerce.number().int().min(1).max(5).parse(form.get('slot')):undefined;
 const file=form.get('file');if(!(file instanceof File)||file.size>4_000_000||!file.size)throw new ServiceError(422,'INVALID_IMAGE');
 const raw=Buffer.from(await file.arrayBuffer());await validateImage(raw,file.type);
 const {default:sharp}=await import('sharp');
 // Decode and re-encode to strip EXIF/location data and trailing payloads.
 const bytes=await sharp(raw,{limitInputPixels:20_000_000}).rotate().webp({quality:88}).toBuffer();
 if(bytes.length>4_000_000)throw new ServiceError(413,'FILE_TOO_LARGE');
 const mediaId=crypto.randomUUID(),url=`/api/media/${mediaId}`;
 await transaction(platform(c).sql,async tx=>{
  await tx`select id from public.teams where id=${id} for update`;
  await tx`insert into aevic_platform.media(id,team_id,file_name,mime_type,bytes,asset_type) values(${mediaId},${id},${file.name.slice(0,200)},'image/webp',${bytes},${kind})`;
  if(kind==='banner')await tx`insert into aevic_platform.team_details(team_id,banner_url) values(${id},${url}) on conflict(team_id) do update set banner_url=excluded.banner_url,updated_at=now()`;
  else if(kind!=='evidence')await tx`update public.teams set ${tx(kind==='logo'?'logo_url':`player${slot}_photo_url`)}=${url} where id=${id}`;
  await audit(tx,actor(c),'media.upload','media',mediaId,{kind});
 });return c.json({id:mediaId,previewUrl:url,status:'uploaded',fileName:file.name.slice(0,200)},201);
});
app.get('/media/:id/access',async c=>{
 const id=z.uuid().parse(c.req.param('id')),a=actor(c);
 const [row]=await platform(c).sql`select id from aevic_platform.media where id=${id} and (${Boolean(a.adminId)} or team_id=${a.teamId??null})`;
 if(!row)throw new ServiceError(404,'MEDIA_NOT_FOUND');return c.json({url:`/api/media/${id}`,expiresAt:new Date(Date.now()+300000).toISOString()});
});
app.get('/media/:id',async(c,next)=>{
 const id=z.uuid().parse(c.req.param('id')),r=platform(c);
 const [row]=await r.sql`select * from aevic_platform.media where id=${id}`;if(!row)return next();
 let allowed=Boolean(r.actor.adminId||r.actor.teamId===String(row.team_id));
 if(!allowed&&row.asset_type!=='evidence'){
  const url=`/api/media/${id}`;
  const found=await r.sql`select t.id from public.teams t left join aevic_platform.team_details d on d.team_id=t.id where t.id=${row.team_id} and t.status='approved' and d.archived_at is null and ${url} in (t.logo_url,t.player1_photo_url,t.player2_photo_url,t.player3_photo_url,t.player4_photo_url,t.player5_photo_url,d.banner_url)`;allowed=found.length>0;
 }
 if(!allowed)throw new ServiceError(404,'MEDIA_NOT_FOUND');
 return new Response(new Uint8Array(row.bytes).buffer,{headers:{'Content-Type':row.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
});
app.delete('/media/teams/:id/:kind',async c=>{
 const id=ownTeam(c,c.req.param('id')),kind=z.enum(['logo','banner']).parse(c.req.param('kind'));
 await transaction(platform(c).sql,async tx=>{if(kind==='logo')await tx`update public.teams set logo_url=null where id=${id}`;else await tx`update aevic_platform.team_details set banner_url=null,updated_at=now() where team_id=${id}`;await audit(tx,actor(c),'media.detach','team',id,{kind});});return c.body(null,204);
});
export default app;
