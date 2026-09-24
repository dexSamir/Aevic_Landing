import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
import type {ServerConfig} from '../config';
import {ServiceError} from '../errors';
export interface CaptainMedia {
 upload(teamId:string,file:File):Promise<{url:string;id:string}>;
 read(bucket:string,name:string):Promise<{bytes:Uint8Array;type:string}>;
}
const types={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'} as const;
export async function validateImage(bytes:Uint8Array, claimed?:string) {
 if(!bytes.length||bytes.length>4_000_000)throw new ServiceError(413,'FILE_TOO_LARGE');
 try{
  const image=sharp(bytes,{limitInputPixels:20_000_000,animated:false,failOn:'warning'});const info=await image.metadata();
  if(!info.format||!(info.format in types)||(info.pages??1)>1||!info.width||!info.height)throw new Error('format');
  const type=types[info.format as keyof typeof types];if(claimed&&claimed!==type)throw new Error('mime');
  await image.resize(1,1).toBuffer(); // Decode-check; store/serve original bytes and aspect ratio.
  return {type,extension:info.format==='jpeg'?'jpg':info.format};
 }catch{throw new ServiceError(422,'INVALID_IMAGE');}
}
export class SupabaseCaptainMedia implements CaptainMedia {
 constructor(private config:ServerConfig){}
 async upload(teamId:string,file:File) {
  const {storageKey,mediaBucket,supabaseUrl}=this.config;
  let serviceKey=storageKey?.startsWith('sb_secret_');
  if(storageKey?.startsWith('eyJ')){try{serviceKey=JSON.parse(Buffer.from(storageKey.split('.')[1],'base64url').toString()).role==='service_role';}catch{}}
  if(!serviceKey||!storageKey||!mediaBucket)throw new ServiceError(503,'MEDIA_UPLOAD_NOT_CONFIGURED');
  const bytes=new Uint8Array(await file.arrayBuffer()),image=await validateImage(bytes,file.type);
  const storage=createClient(supabaseUrl,storageKey,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
  const bucket=await storage.getBucket(mediaBucket);
  // Never create buckets or change their visibility. No private bucket is made public.
  if(bucket.error||bucket.data?.public!==true)throw new ServiceError(503,'PUBLIC_MEDIA_BUCKET_UNAVAILABLE');
  const id=crypto.randomUUID(),path=`teams/${teamId}/${id}.${image.extension}`;
  const result=await storage.from(mediaBucket).upload(path,bytes,{contentType:image.type,upsert:false,cacheControl:'31536000'});
  if(result.error)throw new ServiceError(503,'MEDIA_UPLOAD_FAILED');
  return {id,url:storage.from(mediaBucket).getPublicUrl(path).data.publicUrl};
 }
 async read(bucket:string,name:string) {
  const segments=[bucket,...name.split('/')];
  if(segments.some(s=>!s||s==='.'||s==='..'||s.includes('\\')))throw new ServiceError(404,'MEDIA_NOT_FOUND');
  const response=await fetch(`${this.config.supabaseUrl}/storage/v1/object/public/${segments.map(encodeURIComponent).join('/')}`,{redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new ServiceError(404,'MEDIA_NOT_FOUND');
  const chunks:Uint8Array[]=[];let size=0;const reader=response.body?.getReader();if(!reader)throw new ServiceError(404,'MEDIA_NOT_FOUND');
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000){await reader.cancel();throw new ServiceError(413,'FILE_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(Buffer.concat(chunks));const {type}=await validateImage(bytes);return {bytes,type};
 }
}
