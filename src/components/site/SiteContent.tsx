import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { services } from '../../services';
import { usePlatformQuery, invalidateQuery } from '../../services/queryCache';
import { pageForPath, sitePage, bannerPath, type SiteDocument } from '../../content/publishedSiteContent';
import '../../styles/published-site-content.css';

const Context=createContext<{pages:Record<string,SiteDocument>;pageId?:string}>({pages:{}});
export function SiteContentProvider({children}:{children:ReactNode}){
 const location=useLocation();
 const published=usePlatformQuery({key:'site-content:published',scope:'public',query:signal=>services.siteContent.published(signal),staleTime:0,refetchOnFocus:true});
 useEffect(()=>{invalidateQuery('site-content:published','public');},[location.pathname]);
 return <Context.Provider value={{pages:published.data??{},pageId:pageForPath(location.pathname)?.id}}>{children}</Context.Provider>;
}
export function useSiteContent(id:string){
 const context=useContext(Context),document=context.pages[id];
 return {document,text:(key:string,fallback:string)=>typeof document?.fields[key]==='string'?document.fields[key] as string:fallback,
 visible:(key:string,fallback=true)=>typeof document?.fields[key]==='boolean'?document.fields[key] as boolean:fallback,
 media:(key:string)=>typeof document?.fields[key]==='string'?bannerPath(document.fields[key] as string):undefined,
 order:(ids:string[])=>[...(document?.order??[]).filter(id=>ids.includes(id)),...ids.filter(id=>!document?.order.includes(id))]};
}
export function useSiteHeader(){const {pages,pageId}=useContext(Context);return pageId&&(sitePage(pageId)?.header||pageId==='home')?pages[pageId]?.fields:undefined;}
export function SiteGuidance(){const content=useSiteContent('team-guide');if(!content.visible('visible',false))return null;return <aside className="site-guidance"><strong>{content.text('title','Yarışa hazırlıq')}</strong><p>{content.text('body','Turnir qaydalarını nəzərdən keçirin, heyətinizi yoxlayın və check-in vaxtını qaçırmayın.')}</p><a href={content.text('href','/regulations')}>{content.text('cta','Qaydalara bax')}</a></aside>;}
export function useSiteNavigation(items:{to:string;label:string;end:boolean}[]){const content=useSiteContent('global');const byId=Object.fromEntries(items.map(item=>[item.to==='/'?'home':item.to.slice(1),item]));return content.order(Object.keys(byId).map(id=>`nav-${id}`)).map(key=>key.slice(4)).filter(id=>content.visible(`nav.${id}.visible`)).map(id=>({...byId[id],to:content.text(`nav.${id}.href`,byId[id].to)||byId[id].to,label:content.text(`nav.${id}.label`,byId[id].label)}));}
