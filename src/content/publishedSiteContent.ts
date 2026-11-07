import { routeManifest } from '../app/routeManifest';

// Compatibility projection for content already published in settings["site:…"].
// Drafts, revision history and the former editing schema are not exposed.
export type ContentValue = string | boolean | null;
export interface SiteDocument { fields: Record<string, ContentValue>; order: string[] }
const publicPageIds = new Set(['tournaments','leaderboard','teams','matches','organizations','records','archive','contact','privacy','terms','support','regulations']);
const pages = [{id:'global',path:'',header:false},{id:'home',path:'/',header:false},{id:'team-guide',path:'/team',header:false},...routeManifest.filter(r=>publicPageIds.has(r.id)).map(r=>({id:r.id,path:r.path,header:true}))];
export const sitePage = (id:string) => pages.find(p=>p.id===id);
export const pageForPath = (path:string) => pages.find(p=>p.path===path);
export const bannerPath = (id:string) => `/api/media/tournament-banners/${id}`;
export function validContentLink(value:string){
  if(!value)return true;
  if(/[\s\\\u0000-\u001f\u007f]/.test(value))return false;
  if(value.startsWith('/')&&!value.startsWith('//'))return !/%(?:2f|5c|0[ad])/i.test(value);
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function publishedDocument(value:unknown):SiteDocument|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  const {fields,order}=value as Partial<SiteDocument>;
  if(!fields||typeof fields!=='object'||Array.isArray(fields))return;
  return {fields:Object.fromEntries(Object.entries(fields).filter(([key,value])=>{
    if(value!==null&&typeof value!=='boolean'&&typeof value!=='string')return false;
    if(key.endsWith('.media'))return value===null||typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if((key==='href'||key.endsWith('.href')||key.startsWith('social.'))&&typeof value==='string')return validContentLink(value);
    return true;
  })),order:Array.isArray(order)?[...new Set(order.filter((key):key is string=>typeof key==='string'))]:[]};
}
