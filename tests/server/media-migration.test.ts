import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { sha, resolveSource, decision, validateReference, inspectImage } from '../../scripts/media-migration/core.mjs';
import { copyAsset, updateReferences } from '../../scripts/media-migration/execute.mjs';
const origin='https://nmjjibifcuzjlsvfcaaz.supabase.co';
afterEach(()=>vi.unstubAllGlobals());
describe('migration planning safety',()=>{
 it('resolves legacy media only to one public source and excludes private files',()=>{
  const id='00000000-0000-4000-8000-000000000001';
  const item={id,bucket:'images',name:`${id}.png`,public:true};
  expect(resolveSource(`/api/media/${id}`,[item],[],origin)).toMatchObject({status:'storage',path:item.name});
  expect(resolveSource(`/api/media/${id}`,[item,{...item,id:'other'}],[],origin).status).toBe('ambiguous-media-id');
  expect(resolveSource(`/api/media/${id}`,[],[{id,asset_type:'evidence'}],origin).status).toBe('private-excluded');
  expect(resolveSource('https://evil.test/image.png',[],[],origin).status).toBe('external-excluded');
 });
 it('fails closed for unapproved table/column targets',()=>{
  expect(()=>validateReference({table:'public.teams',id:'2',column:'player1_ign',oldUrl:'old'})).toThrow('INVALID_REFERENCE');
  expect(()=>validateReference({table:'public.teams',id:'2',column:'logo_url',oldUrl:'old'})).not.toThrow();
 });
 it('distinguishes resume, apply, rollback and concurrent edits',()=>{
  expect(decision('old','old','new')).toBe('update');
  expect(decision('new','old','new')).toBe('already-done');
  expect(decision('edited','old','new')).toBe('conflict');
  expect(decision('new','old','new',true)).toBe('update');
  expect(decision('old','old','new',true)).toBe('already-done');
 });
 it('uses a content hash to deduplicate different references to identical original bytes',async()=>{
  const bytes=await sharp({create:{width:16,height:8,channels:4,background:'red'}}).png().toBuffer();
  const a=await inspectImage(bytes),b=await inspectImage(Buffer.from(bytes));
  expect(a.sha256).toBe(b.sha256);expect(a).toMatchObject({width:16,height:8,format:'png'});
 });
});
describe('immutable Cloudinary copy',()=>{
 it('uses overwrite=false and verifies byte-identical CDN content, including resume',async()=>{
  const bytes=await sharp({create:{width:16,height:8,channels:4,background:'blue'}}).png().toBuffer();
  const info=await inspectImage(bytes),publicId=`aevic/migrated/nmjjibifcuzjlsvfcaaz/${sha(bytes)}`;
  const url=`https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.png`;
  const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>{
   if(init?.method==='POST') { expect((init.body as FormData).get('overwrite')).toBe('false');expect((init.body as FormData).get('public_id')).toBe(publicId);return Response.json({public_id:publicId,resource_type:'image',version:1,secure_url:url}); }
   return new Response(bytes);
  });vi.stubGlobal('fetch',fetcher);
  const cloud={name:'fixture',key:'fixture',secret:'fixture'},asset={...info,publicId};
  expect(await copyAsset(cloud,asset,bytes)).toMatchObject({url,state:'verified'});
  expect(await copyAsset(cloud,asset,bytes)).toMatchObject({url,state:'verified'});
  expect(fetcher.mock.calls.every(([url])=>!url.includes('destroy'))).toBe(true);
 });
 it('rejects an image whose delivered original differs from the source',async()=>{
  const bytes=await sharp({create:{width:2,height:2,channels:4,background:'blue'}}).png().toBuffer();
  const info=await inspectImage(bytes),publicId=`aevic/migrated/nmjjibifcuzjlsvfcaaz/${sha(bytes)}`;
  vi.stubGlobal('fetch',vi.fn(async(_url,init)=>init?.method==='POST'?Response.json({public_id:publicId,resource_type:'image',version:1,secure_url:`https://res.cloudinary.com/fixture/image/upload/v1/${publicId}.png`}):new Response('wrong')));
  await expect(copyAsset({name:'fixture',key:'key',secret:'secret'},{...info,publicId},bytes)).rejects.toThrow('CDN_CONTENT_MISMATCH');
 });
});
function database(initial:Record<string,string>) {
 let rows={...initial};
 return {get rows(){return rows;},begin:async(_mode:string,work:Function)=>{
  const draft={...rows};
  const tx=Object.assign(async()=>[{id:'2',fingerprint:'roster-unchanged'}],{unsafe:async(query:string,values:string[])=>{
   if(query.startsWith('select')) return [{url:draft[values[0]]}];
   expect(query).toMatch(/^update public.teams set "logo_url"=/);
   const [url,id,expected]=values;if(draft[id]!==expected)return [];draft[id]=url;return [{id}];
  }});
  const result=await work(tx);rows=draft;return result;
 }};
}
describe('transactional URL replacement',()=>{
 const manifest={references:[{table:'public.teams',id:'2',column:'logo_url',oldUrl:'old',status:'ready',sha256:'hash'}],assets:{hash:{url:'new',state:'verified'}}};
 it('applies once, resumes safely and rolls back exactly the recorded URL',async()=>{
  const db=database({'2':'old'});
  expect(await updateReferences(db,manifest)).toMatchObject({updated:1});expect(db.rows['2']).toBe('new');
  expect(await updateReferences(db,manifest)).toMatchObject({alreadyDone:1});
  await updateReferences(db,manifest,true);expect(db.rows['2']).toBe('old');
 });
 it('does not replace a concurrent edit',async()=>{
  const db=database({'2':'newer-upload'});await expect(updateReferences(db,manifest)).rejects.toThrow('REFERENCE_CHANGED_SINCE_PLAN');expect(db.rows['2']).toBe('newer-upload');
 });
 it('rolls back earlier replacements when a later reference conflicts',async()=>{
  const db=database({'2':'old','7':'changed'});
  const plan={...manifest,references:[...manifest.references,{...manifest.references[0],id:'7'}]};
  await expect(updateReferences(db,plan)).rejects.toThrow('REFERENCE_CHANGED_SINCE_PLAN');
  expect(db.rows).toEqual({'2':'old','7':'changed'});
 });
 it('never updates an unverified asset',async()=>{
  const db=database({'2':'old'});await updateReferences(db,{...manifest,assets:{hash:{state:'planned'}}});expect(db.rows['2']).toBe('old');
 });
});
