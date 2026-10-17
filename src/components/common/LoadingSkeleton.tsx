import './loading-skeleton.css';

export type SkeletonVariant = 'list'|'table'|'cards'|'stats'|'roster'|'profile'|'form'|'dashboard'|'media'|'tournament'|'rail'|'team-rail'|'navigation'|'teams'|'team-cards'|'tournament-index'|'calendar'|'matches'|'records'|'organization'|'studio'|'recap'|'search'|'map-cards'|'feature'|'participants'|'player'|'record-board'|'comparison';
export const SkeletonBlock = ({className = ''}:{className?:string}) => <span className={`loading-skeleton__block ${className}`} />;
const Bar = ({kind='line'}:{kind?:string}) => <SkeletonBlock className={`loading-skeleton__${kind}`} />;
const repeat = (count:number, render:(index:number)=>React.ReactNode) => Array.from({length:count},(_,i)=><div key={i}>{render(i)}</div>);
const Heading = () => <div className="loading-skeleton__page-heading"><Bar kind="short"/><Bar kind="heading"/><Bar/></div>;
const Controls = () => <div className="loading-skeleton__controls"><Bar kind="input"/><Bar kind="button"/><Bar kind="button"/></div>;
function Shape({variant,rows}:{variant:SkeletonVariant;rows:number}) {
 if(variant==='navigation')return <div className="loading-skeleton__navigation"><Bar kind="avatar"/><Bar kind="short"/></div>;
 if(variant==='team-rail')return <div className="loading-skeleton__team-rail">{repeat(rows,()=> <><Bar kind="avatar"/><Bar kind="title"/><Bar kind="short"/></>)}</div>;
 if(variant==='feature')return <div className="loading-skeleton__feature"><div><Bar kind="pill"/><Bar kind="heading"/><Bar/><Bar/><Bar kind="button"/></div><div className="loading-skeleton__mini-stats">{repeat(4,()=> <><Bar kind="short"/><Bar kind="label"/></>)}</div></div>;
 if(variant==='media')return <Bar kind="media"/>;
 if(variant==='stats')return <div className="loading-skeleton__stats">{repeat(4,()=> <div className="loading-skeleton__panel"><Bar kind="short"/><Bar kind="value"/></div>)}</div>;
 if(variant==='cards'||variant==='roster'||variant==='map-cards')return <div className={`loading-skeleton__grid loading-skeleton__grid--${variant}`}>{repeat(rows,()=> <div className="loading-skeleton__panel"><Bar kind={variant==='roster'?'portrait':'artwork'}/><Bar kind="title"/><Bar kind="short"/>{variant==='cards'&&<Bar/>}</div>)}</div>;
 if(variant==='participants')return <div className="loading-skeleton__participants">{repeat(rows,()=> <div className="loading-skeleton__panel"><Bar kind="avatar"/><Bar kind="title"/><Bar kind="short"/></div>)}</div>;
 if(variant==='team-cards')return <div className="loading-skeleton__grid loading-skeleton__grid--teams">{repeat(rows,()=> <div className="loading-skeleton__panel loading-skeleton__directory-card"><div className="loading-skeleton__identity"><Bar kind="avatar"/><div><Bar kind="title"/><Bar kind="short"/></div></div><div className="loading-skeleton__mini-stats"><Bar kind="value"/><Bar kind="value"/><Bar kind="value"/></div><Bar/><div className="loading-skeleton__controls"><Bar kind="pill"/><Bar kind="pill"/></div></div>)}</div>;
 if(variant==='teams')return <><div className="loading-skeleton__directory-hero"><Heading/><Bar kind="heading"/><Bar/></div><div className="loading-skeleton__page-width"><Controls/><Shape variant="team-cards" rows={6}/></div></>;
 if(variant==='form')return <div className="loading-skeleton__form">{repeat(rows,()=> <><Bar kind="label"/><Bar kind="input"/></>)}<Bar kind="button"/></div>;
 if(variant==='profile')return <><div className="loading-skeleton__profile-hero loading-skeleton__page-width"><div><Heading/><Bar/><Bar/><div className="loading-skeleton__controls"><Bar kind="pill"/><Bar kind="pill"/><Bar kind="pill"/></div></div><div className="loading-skeleton__profile-brand"><Bar kind="avatar"/><div className="loading-skeleton__controls"><Bar kind="pill"/><Bar kind="pill"/></div></div></div><div className="loading-skeleton__page-width"><div className="loading-skeleton__profile-overview"><div className="loading-skeleton__index"><Bar kind="label"/>{repeat(5,()=> <Bar/>)}</div><div><Bar kind="title"/><div className="loading-skeleton__career">{repeat(5,()=> <><Bar kind="value"/><Bar kind="short"/></>)}</div></div><div><Bar kind="title"/><Bar kind="artwork"/></div></div><Bar kind="title"/><Shape variant="roster" rows={5}/><Bar kind="title"/><Shape variant="table" rows={5}/><Bar kind="heading"/><div className="loading-skeleton__map-composition"><Bar kind="media"/><div><Bar kind="media"/><Bar kind="media"/></div></div></div></>;
 if(variant==='tournament')return <><div className="loading-skeleton__tournament-hero"><Heading/><div className="loading-skeleton__panel"><Bar kind="title"/><Bar kind="value"/><Bar kind="button"/></div></div><div className="loading-skeleton__page-width"><Controls/><Shape variant="stats" rows={4}/><Bar kind="title"/><Shape variant="map-cards" rows={4}/><Bar kind="title"/><Shape variant="participants" rows={10}/><Shape variant="table" rows={5}/></div></>;
 if(variant==='calendar')return <div className="loading-skeleton__calendar"><div className="loading-skeleton__panel"><div className="loading-skeleton__controls"><Bar kind="title"/><Bar kind="pill"/><Bar kind="pill"/></div><div className="loading-skeleton__dates">{repeat(7,()=> <Bar kind="label"/>)}{repeat(42,()=> <Bar kind="date"/>)}</div></div><div className="loading-skeleton__panel"><Bar kind="short"/><Bar kind="title"/><div className="loading-skeleton__mini-stats">{repeat(4,()=> <><Bar kind="value"/><Bar kind="short"/></>)}</div><div className="loading-skeleton__controls"><Bar kind="button"/><Bar kind="button"/></div></div></div>;
 if(variant==='tournament-index')return <><Heading/><div className="loading-skeleton__planning-feature"><Shape variant="feature" rows={1}/><div className="loading-skeleton__panel"><Bar kind="title"/><Bar kind="value"/>{repeat(3,()=> <><Bar kind="label"/><Bar kind="title"/></>)}</div></div><div className="loading-skeleton__planning-ledger"><Shape variant="calendar" rows={1}/><div><Heading/><Controls/><Shape variant="matches" rows={3}/></div></div></>;
 if(variant==='matches')return <div className="loading-skeleton__matches">{repeat(rows,()=> <div className="loading-skeleton__panel loading-skeleton__match"><Bar kind="short"/><div><Bar kind="title"/><Bar/></div><Bar kind="pill"/><Bar kind="button"/></div>)}</div>;
 if(variant==='record-board')return <div className="loading-skeleton__record-board"><div className="loading-skeleton__index"><Bar kind="label"/><Bar kind="value"/>{repeat(5,()=> <Bar kind="button"/>)}</div><div><div className="loading-skeleton__columns"><Shape variant="feature" rows={1}/><Shape variant="records" rows={2}/></div><Shape variant="table" rows={rows}/></div></div>;
 if(variant==='comparison')return <><Heading/><div className="loading-skeleton__comparison">{repeat(2,()=> <div className="loading-skeleton__panel"><Bar kind="avatar"/><Bar kind="title"/><Bar kind="input"/><Shape variant="table" rows={5}/></div>)}</div></>;
 if(variant==='records')return <div className="loading-skeleton__records">{repeat(rows,()=> <div className="loading-skeleton__panel"><Bar kind="label"/><Bar kind="title"/><Bar kind="value"/><div className="loading-skeleton__identity"><Bar kind="avatar"/><div><Bar/><Bar kind="short"/></div></div></div>)}</div>;
 if(variant==='organization')return <><Bar kind="media"/><div className="loading-skeleton__hero"><Bar kind="avatar"/><Heading/></div><Controls/><Shape variant="team-cards" rows={3}/></>;
 if(variant==='studio')return <><Heading/><div className="loading-skeleton__columns"><Bar kind="portrait"/><Shape variant="form" rows={4}/></div></>;
 if(variant==='recap')return <><Heading/><Shape variant="stats" rows={4}/><Shape variant="team-cards" rows={3}/><Shape variant="table" rows={5}/></>;
 if(variant==='search')return <div>{repeat(rows,()=> <div className="loading-skeleton__search-row"><div><Bar kind="title"/><Bar/></div><Bar kind="pill"/></div>)}</div>;
 if(variant==='player')return <><Heading/><div className="loading-skeleton__columns"><Shape variant="table" rows={3}/><div className="loading-skeleton__panel"><Bar kind="title"/><Bar/><Bar kind="pill"/></div></div><Bar kind="title"/><Shape variant="table" rows={rows}/></>;
 if(variant==='dashboard')return <><Heading/><Shape variant="stats" rows={4}/><div className="loading-skeleton__columns"><Shape variant="table" rows={rows}/><Shape variant="list" rows={3}/></div></>;
 if(variant==='rail')return <div className="loading-skeleton__rail"><div><Bar kind="short"/><Bar kind="heading"/></div><Shape variant="stats" rows={4}/><Bar kind="button"/></div>;
 return <div className={`loading-skeleton__${variant}`}>{variant==='table'&&<div className="loading-skeleton__row"><Bar kind="short"/><Bar/><Bar/></div>}{repeat(rows,()=> <div className="loading-skeleton__row"><Bar kind={variant==='table'?'short':'avatar'}/><div><Bar/><Bar kind="short"/></div><Bar kind="short"/></div>)}</div>;
}
export function LoadingSkeleton({rows=3,variant='list',label='Məlumat yüklənir'}:{rows?:number;variant?:SkeletonVariant;label?:string}) {
 return <div className={`loading-skeleton loading-skeleton--${variant}`} role="status" aria-busy="true" aria-label={label}><div aria-hidden="true"><Shape variant={variant} rows={rows}/></div></div>;
}
export function skeletonForPath(path:string):SkeletonVariant {
 if(/\/card$|\/sharecards$/.test(path))return 'studio';
 if(/\/recap$/.test(path))return 'recap';
 if(/^\/teams\/compare/.test(path))return 'comparison';
 if(/^\/teams\/[^/]+/.test(path))return 'profile';
 if(/^\/organizations\/[^/]+/.test(path))return 'organization';
 if(/^\/tournaments\/[^/]+/.test(path))return 'tournament';
 if(path==='/teams')return 'teams';
 if(path==='/tournaments')return 'tournament-index';
 if(path==='/matches')return 'matches';
 if(path==='/records')return 'record-board';
 if(path==='/organizations')return 'team-cards';
 if(path==='/search')return 'search';
 if(/\/(sessions|invitations|notifications|support|disputes|requests)(\/|$)/.test(path))return 'list';
 if(/\/(login|register|forgot-password|reset-password|settings|account)(\/|$)/.test(path)||/\/team\/profile$/.test(path))return 'form';
 if(/\/roster(\/|$)/.test(path))return 'roster';
 if(/^\/(admin|team)(\/)?$/.test(path))return 'dashboard';
 return 'table';
}
export function RouteSkeleton({path}:{path:string}) {
 const variant=skeletonForPath(path);
 const full= ['profile','teams','tournament'].includes(variant);
 return <div className={full?'route-data-loading route-data-loading--full':'route-data-loading'}>{['matches','form','list','table','roster','records','record-board','team-cards'].includes(variant)&&<Heading/>}<LoadingSkeleton variant={variant} rows={path==='/teams'?6:5}/></div>;
}
export function RefreshIndicator({active}:{active?:boolean}) {
 return active?<span className="query-refresh" role="status">Yenilənir…</span>:null;
}
