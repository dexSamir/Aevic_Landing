import { informationDefaults } from './information';
import { faqs } from './support';
import { routeManifest } from '../app/routeManifest';
import { regulationSections, rulebookVersion } from './regulations';

export type ContentValue = string | boolean | null;
export interface SiteDocument { fields: Record<string, ContentValue>; order: string[] }
export interface SiteRevision { revision: number; action: string; at: string; by: string; document: SiteDocument }
export interface SiteRecord { revision: number; draft: SiteDocument; published: SiteDocument | null; publishedAt: string | null; history: SiteRevision[] }
export interface SiteField { id: string; label: string; kind: 'text'|'paragraph'|'link'|'media'|'toggle'; fallback: ContentValue; max?: number }
export interface SiteSection { id: string; label: string; fields: SiteField[] }
export interface SitePage { id: string; title: string; path: string; group: string; sections: SiteSection[]; editor?: string; reorder?: boolean; orderable?: string[]; header?: boolean }
const text = (id:string,label:string,fallback='',max=240):SiteField=>({id,label,kind:'text',fallback,max});
const paragraph = (id:string,label:string,fallback=''):SiteField=>({id,label,kind:'paragraph',fallback,max:10000});
const link = (id:string,label:string,fallback:string):SiteField=>({id,label,kind:'link',fallback,max:500});
const toggle = (id:string,label:string,fallback=true):SiteField=>({id,label,kind:'toggle',fallback});
const media = (id:string,label:string):SiteField=>({id,label,kind:'media',fallback:null});
const section=(id:string,label:string,fields:SiteField[]):SiteSection=>({id,label,fields});
const seo=section('seo','Axtarış və paylaşım',[text('seoTitle','SEO başlığı','',160),paragraph('seoDescription','SEO təsviri')]);
const header=section('header','Səhifə girişi',[text('title','Başlıq'),paragraph('description','Giriş mətni')]);
export const sitePages: SitePage[] = [
 {id:'global',title:'Naviqasiya və altlıq',path:'/',group:'Ümumi',reorder:true,orderable:['nav-home','nav-tournaments','nav-teams','nav-matches'],sections:[
  ...[['home','Ana səhifə'],['tournaments','Turnirlər'],['teams','Komandalar'],['matches','Matçlar']].map(([id,label])=>section(`nav-${id}`,label,[text(`nav.${id}.label`,`${label} · ad`,label,40),link(`nav.${id}.href`,`${label} · keçid`,id==='home'?'/':`/${id}`),toggle(`nav.${id}.visible`,`${label} · göstər`)])),
  section('footer','Altlıq',[text('nav.rules','Qaydalar keçidi','Qaydalar',40),paragraph('footer.column1','Altlıq · birinci mətn','Turnirlər.\nKomandalar.\nOyunçular.'),paragraph('footer.column2','Altlıq · ikinci mətn','Rəqabətin\nyeni səhnəsi.'),paragraph('footer.column3','Altlıq · üçüncü mətn','Azərbaycandan\ndünya səhnəsinə.'),text('footer.statement','Dəvət','Gəlin e-sportun gələcəyini birlikdə quraq.'),text('footer.motto','Şüar','AD AETERNAM VICTORIAM'),
   ...['instagram','tiktok','linkedin','x'].map(id=>link(`social.${id}`,id,'')),toggle('footer.cta','Qoşulma bölməsini göstər'),text('footer.ctaTitle','Qoşulma başlığı','RƏQABƏTƏ QOŞUL.'),text('footer.ctaLabel','Qoşulma düyməsi','Komanda yarat',60)]),
 ]},
 {id:'home',title:'Ana səhifə',path:'/',group:'Səhifələr',reorder:true,sections:[
  section('hero','Əsas səhnə',[text('hero.eyebrow','Üst yazı','AZƏRBAYCAN · PUBG MOBILE · AEVIC'),text('hero.title','Başlıq','Rəqabətin'),text('hero.accent','Vurğu','yeni səhnəsi.'),paragraph('hero.body','Təsvir','Turnirlər, komandalar, oyunçular və daha böyük bir e-sport ekosistemi.'),text('hero.cta','Düymə','Turnirləri kəşf et',60),link('hero.href','Düymə keçidi','/tournaments'),media('hero.media','Səhnə şəkli')]),
  section('calendar','Turnir təqvimi',[toggle('calendar.visible','Göstər'),text('calendar.title','Başlıq','Yaxın turnirlər.'),paragraph('calendar.body','Təsvir','Növbəti vacib turnirləri qaçırma.')]),
  section('maps','Xəritələr',[toggle('maps.visible','Göstər'),text('maps.title','Başlıq','Hər xəritə, yeni hekayə.'),paragraph('maps.body','Təsvir','Fərqli arenalarda fərqli sınaqlar.')]),
  section('teams','Komandalar',[toggle('teams.visible','Göstər'),text('teams.title','Başlıq','Səhnədəki güclər.')]),
  section('join','Qoşulma',[toggle('join.visible','Göstər'),text('join.title','Başlıq','Burada oyun daha böyükdür.'),paragraph('join.body','Təsvir','E-sport tək oyun deyil, bir icma, bir səhnə, bir mirasdır.'),text('join.cta','Düymə','Rəqabətin bir hissəsi ol',80),media('join.media','Qoşulma şəkli')]),seo
 ]},
 ...routeManifest.filter(r=>['tournaments','leaderboard','teams','matches','organizations','records','archive','contact','privacy','terms','support','regulations'].includes(r.id)).map(r=>({id:r.id,title:r.title,path:r.path,group:['contact','privacy','terms','support','regulations'].includes(r.id)?'Məlumat və qaydalar':'Səhifələr',header:true,sections:[header,seo],editor:r.id==='tournaments'?'/admin/tournaments':r.id==='teams'?'/admin/teams':r.id==='organizations'?'/admin/organizations':r.id==='leaderboard'||r.id==='records'?'/admin/results':undefined})),
 {id:'team-guide',title:'Komanda paneli · bələdçi',path:'/team',group:'Komanda paneli',sections:[section('guide','Platforma bələdçisi',[toggle('visible','Bələdçini göstər',false),text('title','Başlıq','Yarışa hazırlıq'),paragraph('body','Təlimat','Turnir qaydalarını nəzərdən keçirin, heyətinizi yoxlayın və check-in vaxtını qaçırmayın.'),text('cta','Keçid adı','Qaydalara bax',60),link('href','Keçid','/regulations')])]},
];
const rules=sitePages.find(p=>p.id==='regulations')!;
rules.sections.push(section('version','Versiya',[text('version','Reqlament versiyası',rulebookVersion),paragraph('disclosure','Status mətni','Təsdiq üçün layihə. Yaş, mükafat, media icazələri, məlumat siyasəti və qüvvəyə minmə tarixi sahibin təsdiqini gözləyir. Bu sənəd milli qanunvericilik deyil.')]));
for(const rule of regulationSections)rules.sections.push(section(rule.id,`${rule.letter}. ${rule.title}`,[text(`${rule.id}.title`,'Bölmə başlığı',rule.title),...rule.subsections.flatMap((s,i)=>[text(`${rule.id}.${i}.title`,'Yarımbölmə başlığı',s.title),paragraph(`${rule.id}.${i}.body`,'Mətn',s.body)])]));
export const sitePage=(id:string)=>sitePages.find(p=>p.id===id);
export const emptyDocument=():SiteDocument=>({fields:{},order:[]});
export function contentValue(document:SiteDocument|undefined,key:string,fallback:ContentValue):ContentValue { return document?.fields[key] ?? fallback; }
export const bannerPath=(id:string)=>`/api/media/tournament-banners/${id}`;
export const pageForPath=(path:string)=>sitePages.find(p=>p.id!=='global'&&p.path===path);

for(const [id,question,answer] of faqs)sitePages.find(p=>p.id==='support')!.sections.push(section(id,question,[text(`${id}.question`,'Sual',question),paragraph(`${id}.answer`,'Cavab',answer),toggle(`${id}.visible`,'Göstər')]));

for(const [id,entries] of Object.entries(informationDefaults)){const page=sitePage(id)!;page.reorder=true;entries.forEach(([heading,body],i)=>page.sections.push(section(`section-${i}`,heading,[text(`section-${i}.title`,'Başlıq',heading),paragraph(`section-${i}.body`,'Mətn',body),toggle(`section-${i}.visible`,'Göstər')])));}
