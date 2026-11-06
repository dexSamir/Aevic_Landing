import { routeManifest } from '../../src/app/routeManifest';
import { normalizeSocialUrl } from '../../src/utils/lifecycle';
import { Hono } from 'hono';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Env } from '../types';
import { body } from '../validation/input';
import { admin, actor, platform } from './context';
import { audit, transaction } from './competition';
import { ServiceError } from '../errors';
import { sitePage, sitePages, emptyDocument, type SiteDocument, type SiteRecord } from '../../src/content/siteManagement';

const app=new Hono<Env>();
const documentSchema=z.object({fields:z.record(z.string().max(100),z.union([z.string().max(10000),z.boolean(),z.null()])),order:z.array(z.string().max(80)).max(100)}).strict();
const inputSchema=z.object({revision:z.number().int().nonnegative(),document:documentSchema,action:z.enum(['save','publish','unpublish'])}).strict();
export function validContentLink(value:string){
 if(!value)return true;
 if(/[\s\\\u0000-\u001f\u007f]/.test(value))return false;
 if(value.startsWith('/')&&!value.startsWith('//'))return !/%(?:2f|5c|0[ad])/i.test(value);
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function validateSiteDocument(id:string,document:SiteDocument){
 const page=sitePage(id);if(!page)throw new ServiceError(404,'NOT_FOUND');
 const fields=new Map(page.sections.flatMap(s=>s.fields.map(f=>[f.id,f] as const)));
 for(const [key,value] of Object.entries(document.fields)){
  const field=fields.get(key);if(!field)throw new ServiceError(422,'INVALID_CONTENT_FIELD');
  if(key.startsWith('nav.')&&key.endsWith('.href')&&value!==''&&!routeManifest.some(r=>r.family==='PUBLIC'&&!r.path.includes(':')&&r.path===value))throw new ServiceError(422,'INVALID_CONTENT_FIELD');
  if(key.startsWith('social.')&&typeof value==='string'&&value&&!normalizeSocialUrl(key.slice(7) as 'instagram',value).ok)throw new ServiceError(422,'INVALID_CONTENT_FIELD');
  if(field.kind==='toggle'){if(typeof value!=='boolean')throw new ServiceError(422,'INVALID_CONTENT_FIELD');}
  else if(field.kind==='media'){if(value!==null&&!z.uuid().safeParse(value).success)throw new ServiceError(422,'INVALID_CONTENT_MEDIA');}
  else if(typeof value!=='string'||value.length>(field.max??240)||field.kind==='link'&&!validContentLink(value))throw new ServiceError(422,'INVALID_CONTENT_FIELD');
 }
 const allowed=page.reorder?(page.orderable??page.sections.filter(s=>!['seo','header','hero'].includes(s.id)).map(s=>s.id)):[];
 if(new Set(document.order).size!==document.order.length||document.order.some(key=>!allowed.includes(key)))throw new ServiceError(422,'INVALID_CONTENT_ORDER');
 if(JSON.stringify(document).length>150000)throw new ServiceError(422,'CONTENT_TOO_LARGE');
 return document;
}
const blank=():SiteRecord=>({revision:0,draft:emptyDocument(),published:null,publishedAt:null,history:[]});
app.get('/public/site-content',async c=>{
 // One batch read. No process/edge TTL: publication is visible across warm runtimes immediately.
 const rows=await platform(c).sql`select substring(key from 6) as id,value->'published' as document from aevic_platform.settings where key like 'site:%' and value->'published' is not null and value->'published'<>'null'::jsonb order by key`;
 const pages=Object.fromEntries(rows.filter(r=>sitePage(r.id)).map(r=>[r.id,r.document]));
 const payload=JSON.stringify(pages),etag='"'+createHash('sha256').update(payload).digest('hex')+'"';
 c.header('Cache-Control','public, max-age=0, must-revalidate');c.header('ETag',etag);
 if(c.req.header('if-none-match')===etag)return c.body(null,304);
 return c.json(pages);
});
app.get('/admin/site-content',async c=>{
 admin(c,['super-admin']);c.header('Cache-Control','private, no-store');
 const rows=await platform(c).sql`select substring(key from 6) as id,value from aevic_platform.settings where key like 'site:%'`;
 return c.json(Object.fromEntries(sitePages.map(page=>[page.id,rows.find(r=>r.id===page.id)?.value??blank()])));
});
app.get('/admin/site-content-media',async c=>{admin(c,['super-admin']);c.header('Cache-Control','private, no-store');const rows=await platform(c).sql`select id,file_name as name,created_at as "createdAt" from aevic_platform.tournament_banners order by created_at desc limit 100`;return c.json(rows);});
app.put('/admin/site-content/:id',async c=>{
 const owner=admin(c,['super-admin']),id=c.req.param('id'),input=await body(c,inputSchema);
 validateSiteDocument(id,input.document);
 const result=await transaction(platform(c).sql,async tx=>{
  const key=`site:${id}`;
  await tx`select pg_advisory_xact_lock(hashtextextended(${key},0))`;
  const [row]=await tx`select value from aevic_platform.settings where key=${key} for update`;
  const current:SiteRecord=row?.value??blank();
  if(current.revision!==input.revision)throw new ServiceError(409,'STALE_VERSION');
  const page=sitePage(id)!;
  const mediaIds=page.sections.flatMap(s=>s.fields).filter(f=>f.kind==='media').map(f=>input.document.fields[f.id]).filter((v):v is string=>typeof v==='string');
  if(mediaIds.length){const media=await tx`select id from aevic_platform.tournament_banners where id=any(${tx.array(mediaIds)}::uuid[])`;if(new Set(mediaIds).size!==media.length)throw new ServiceError(422,'INVALID_CONTENT_MEDIA');}
  const at=new Date().toISOString(),revision=current.revision+1;
  const next:SiteRecord={revision,draft:input.document,published:input.action==='publish'?input.document:input.action==='unpublish'?null:current.published,publishedAt:input.action==='publish'?at:input.action==='unpublish'?null:current.publishedAt,
   history:[{revision,action:input.action,at,by:owner,document:input.document},...current.history].slice(0,20)};
  await tx`insert into aevic_platform.settings(key,value) values(${key},${tx.json(JSON.parse(JSON.stringify(next)))}) on conflict(key) do update set value=excluded.value,updated_at=now()`;
  await audit(tx,actor(c),`site-content.${input.action}`,'site-page',id,{revision});
  return next;
 });
 c.header('Cache-Control','private, no-store');return c.json(result);
});
export default app;
