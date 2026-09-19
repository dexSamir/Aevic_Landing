import { Hono } from 'hono';
import { z } from 'zod';
import sharp, { type Sharp, type Metadata } from 'sharp';
import type { Env } from '../types';
import { authenticate,requireTeam,managers,requireAdmin } from '../auth/session';
import { client } from '../db';
import { body,id,paramId,text } from '../validation/input';
import { ServiceError,dbError } from '../errors';
import { rateLimit } from './auth';
const app=new Hono<Env>();
const metadata=z.object({ownerType:z.literal('team'),ownerId:id,assetType:z.enum(['logo','banner']),fileName:text(1,200),mimeType:z.enum(['image/png','image/jpeg','image/webp']),sizeBytes:z.number().int().min(1).max(6000000),width:z.number().int().min(1).max(16384),height:z.number().int().min(1).max(16384)});
app.post('/media/validate',async c=>{const input=await body(c,metadata);await requireTeam(c,input.ownerId,managers);return c.json({ok:input.width>=(input.assetType==='logo'?512:960)&&input.height>=(input.assetType==='logo'?512:300),reason:'Şəkil ölçüləri minimum tələblərə uyğun deyil.'});});
export async function processImage(bytes:Buffer,kind:'logo'|'banner'|'evidence',mime:string) {
 if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new ServiceError(422,'INVALID_FILE_TYPE');
 let image:Sharp;let info:Metadata;
 try{image=sharp(bytes,{limitInputPixels:40_000_000,animated:false,failOn:'warning'});info=await image.metadata();}catch{throw new ServiceError(422,'INVALID_IMAGE');}
 if(!['png','jpeg','webp'].includes(info.format??'') || (info.pages??1)>1 || !info.width || !info.height)throw new ServiceError(422,'INVALID_IMAGE');
 const expected={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[info.format as 'png'|'jpeg'|'webp'];if(expected!==mime)throw new ServiceError(422,'MIME_MISMATCH');
 if(kind==='logo'&&(info.width<512||info.height<512)||kind==='banner'&&(info.width<960||info.height<300))throw new ServiceError(422,'IMAGE_TOO_SMALL');
 return image.rotate().resize({width:kind==='logo'?1024:kind==='banner'?2400:2048,height:kind==='logo'?1024:undefined,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
}
app.post('/media/uploads',async c=>{
 await authenticate(c);await rateLimit(c,'upload',10);
 let form:FormData;try{form=await c.req.formData();}catch{throw new ServiceError(400,'INVALID_UPLOAD');}
 const teamId=id.parse(form.get('ownerId')),kind=z.enum(['logo','banner','evidence']).parse(form.get('assetType'));
 await requireTeam(c,teamId,managers);
 const file=form.get('file');if(!(file instanceof File))throw new ServiceError(422,'FILE_REQUIRED');
 if(!file.size||file.size>4_000_000)throw new ServiceError(413,'FILE_TOO_LARGE');
 // Evidence is image-only until a document scanning pipeline is configured.
 // Reject PDFs here rather than storing active content with only a signature check.
 const processed=await processImage(Buffer.from(await file.arrayBuffer()),kind,file.type);
 if(processed.length>4_000_000)throw new ServiceError(413,'FILE_TOO_LARGE');
 const bucket=kind==='logo'?'team-logos':kind==='banner'?'team-banners':'dispute-evidence';const mediaId=crypto.randomUUID();const objectPath=`${teamId}/${mediaId}.webp`;const admin=client(c.get('config'),undefined,true);
 const upload=await admin.storage.from(bucket).upload(objectPath,processed,{contentType:'image/webp',upsert:false,cacheControl:kind==='evidence'?'0':'31536000'});dbError(upload.error);
 try{
  const {error}=await admin.from('media').insert({id:mediaId,team_id:teamId,uploaded_by:c.get('user')!.id,kind,bucket,object_path:objectPath,file_name:file.name.replace(/[\x00-\x1f/\\]/g,'_').slice(0,200),mime_type:'image/webp',size_bytes:processed.length});dbError(error);
  if(kind==='evidence')return c.json({id:mediaId,fileName:file.name,status:'uploaded'},201);
  const url=admin.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  // Old objects remain available for immutable published links; deletion is explicit.
  const update=await admin.from('teams').update({[kind==='logo'?'logo_url':'banner_url']:url}).eq('id',teamId);dbError(update.error);
  return c.json({id:mediaId,previewUrl:url,status:'uploaded'},201);
 }catch(error){await admin.storage.from(bucket).remove([objectPath]);await admin.from('media').delete().eq('id',mediaId);throw error;}
});
app.get('/media/:id/access',async c=>{
 const mediaId=paramId(c);await authenticate(c);const {data,error}=await c.get('db').from('media').select('*').eq('id',mediaId).maybeSingle();dbError(error);
 if(!data)throw new ServiceError(404,'MEDIA_NOT_FOUND');
 if(data.kind!=='evidence')throw new ServiceError(422,'NOT_PRIVATE_EVIDENCE');
 const admin=client(c.get('config'),undefined,true);const signed=await admin.storage.from('dispute-evidence').createSignedUrl(data.object_path,60,{download:data.file_name});dbError(signed.error);
 return c.json({url:signed.data!.signedUrl,expiresIn:60});
});
app.delete('/media/teams/:id/:kind',async c=>{
 const teamId=paramId(c),kind=z.enum(['logo','banner']).parse(c.req.param('kind'));await requireTeam(c,teamId,managers);
 const admin=client(c.get('config'),undefined,true);const column=kind==='logo'?'logo_url':'banner_url';
 const {error}=await admin.from('teams').update({[column]:null}).eq('id',teamId);dbError(error);
 const rows=await admin.from('media').select('id,object_path,bucket').eq('team_id',teamId).eq('kind',kind);dbError(rows.error);
 for(const asset of rows.data??[]){const removed=await admin.storage.from(asset.bucket).remove([asset.object_path]);dbError(removed.error);const deleted=await admin.from('media').delete().eq('id',asset.id);dbError(deleted.error);}
 return c.body(null,204);
});
export default app;
