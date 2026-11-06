import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { services } from '../../services';
import { usePlatformQuery, invalidateQuery } from '../../services/queryCache';
import { pageForPath, sitePage, bannerPath, type SiteDocument } from '../../content/siteManagement';
import '../../styles/site-management.css';

const Context=createContext<{pages:Record<string,SiteDocument>;pageId?:string;previewMedia?:Record<string,string>}>({pages:{}});
export function SiteContentProvider({children}:{children:ReactNode}){
 const location=useLocation(),preview=new URLSearchParams(location.search).get('sitePreview');
 const published=usePlatformQuery({key:'site-content:published',scope:'public',query:signal=>services.siteContent.published(signal),staleTime:0,refetchOnFocus:true});
 const draft=usePlatformQuery({key:'site-content:preview',query:()=>services.siteContent.admin(),enabled:Boolean(preview),staleTime:0});
 useEffect(()=>{if(typeof BroadcastChannel==='undefined')return;const channel=new BroadcastChannel('aevic-site-content');channel.onmessage=()=>invalidateQuery('site-content:');return()=>channel.close();},[]);
 useEffect(()=>{invalidateQuery('site-content:published','public');},[location.pathname]);
 const [previewMedia,setPreviewMedia]=useState<Record<string,string>>({});
 useEffect(()=>{const controller=new AbortController(),urls:string[]=[];setPreviewMedia({});if(preview&&draft.data?.[preview]){const ids=Object.entries(draft.data[preview].draft.fields).filter(([key,value])=>key.endsWith('.media')&&typeof value==='string').map(([,value])=>value as string);void Promise.all(ids.map(async id=>{try{const blob=await services.tournaments.bannerPreview(id,controller.signal);if(controller.signal.aborted)return;const url=URL.createObjectURL(blob);urls.push(url);setPreviewMedia(current=>({...current,[id]:url}));}catch{/* Show existing fallback until authenticated preview is available. */}}));}return()=>{controller.abort();urls.forEach(URL.revokeObjectURL);};},[preview,draft.data]);
 const pages={...published.data};if(preview&&draft.data?.[preview])pages[preview]=draft.data[preview].draft;
 return <Context.Provider value={{pages,previewMedia,pageId:pageForPath(location.pathname)?.id}}>{preview&&<aside className="site-preview-notice" role="status">{draft.data?.[preview]?'Qaralama önbaxışı · dərc edilməyib':draft.loading?'Önbaxış yoxlanılır…':'Qaralama önbaxışı üçün baş administrator sessiyası tələb olunur.'}<Link to={location.pathname}>Önbaxışı bağla</Link></aside>}{children}</Context.Provider>;
}
export function useSiteContent(id:string){
 const context=useContext(Context),document=context.pages[id];
 return {document,text:(key:string,fallback:string)=>typeof document?.fields[key]==='string'?document.fields[key] as string:fallback,
 visible:(key:string,fallback=true)=>typeof document?.fields[key]==='boolean'?document.fields[key] as boolean:fallback,
 media:(key:string)=>typeof document?.fields[key]==='string'?context.previewMedia?.[document.fields[key] as string]??bannerPath(document.fields[key] as string):undefined,
 order:(ids:string[])=>[...(document?.order??[]).filter(id=>ids.includes(id)),...ids.filter(id=>!document?.order.includes(id))]};
}
export function useSiteHeader(){const {pages,pageId}=useContext(Context);return pageId&&(sitePage(pageId)?.header||pageId==='home')?pages[pageId]?.fields:undefined;}
export function SiteGuidance(){const content=useSiteContent('team-guide');if(!content.visible('visible',false))return null;return <aside className="site-guidance"><strong>{content.text('title','Yarışa hazırlıq')}</strong><p>{content.text('body','Turnir qaydalarını nəzərdən keçirin, heyətinizi yoxlayın və check-in vaxtını qaçırmayın.')}</p><a href={content.text('href','/regulations')}>{content.text('cta','Qaydalara bax')}</a></aside>;}
export function notifySitePublication(){invalidateQuery('site-content:');if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('aevic-site-content');channel.postMessage('published');channel.close();}}

export function useSiteNavigation(items:{to:string;label:string;end:boolean}[]){const content=useSiteContent('global');const byId=Object.fromEntries(items.map(item=>[item.to==='/'?'home':item.to.slice(1),item]));return content.order(Object.keys(byId).map(id=>`nav-${id}`)).map(key=>key.slice(4)).filter(id=>content.visible(`nav.${id}.visible`)).map(id=>({...byId[id],to:content.text(`nav.${id}.href`,byId[id].to)||byId[id].to,label:content.text(`nav.${id}.label`,byId[id].label)}));}
