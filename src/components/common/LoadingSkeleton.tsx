import './loading-skeleton.css';

export type SkeletonVariant = 'list'|'table'|'cards'|'stats'|'roster'|'form'|'profile'|'dashboard'|'media'|'tournament'|'rail';
const Bar = ({kind='line'}:{kind?:string}) => <span className={`loading-skeleton__block loading-skeleton__${kind}`} />;
function Shape({variant,rows}:{variant:SkeletonVariant;rows:number}) {
 if(variant==='media')return <Bar kind="media"/>;
 if(variant==='stats')return <div className="loading-skeleton__stats">{Array.from({length:4},(_,i)=><div className="loading-skeleton__panel" key={i}><Bar kind="short"/><Bar kind="value"/></div>)}</div>;
 if(variant==='cards'||variant==='roster')return <div className={`loading-skeleton__grid loading-skeleton__grid--${variant}`}>{Array.from({length:rows},(_,i)=><div className="loading-skeleton__panel" key={i}><Bar kind={variant==='roster'?'portrait':'artwork'}/><Bar kind="title"/><Bar kind="short"/>{variant==='cards'&&<Bar/>}</div>)}</div>;
 if(variant==='form')return <div className="loading-skeleton__form">{Array.from({length:rows},(_,i)=><div key={i}><Bar kind="label"/><Bar kind="input"/></div>)}<Bar kind="button"/></div>;
 if(variant==='profile'||variant==='tournament')return <><div className="loading-skeleton__hero"><Bar kind={variant==='profile'?'avatar':'artwork'}/><div><Bar kind="short"/><Bar kind="heading"/><Bar/><Bar kind="button"/></div></div><Shape variant="stats" rows={4}/><Shape variant={variant==='profile'?'roster':'table'} rows={5}/></>;
 if(variant==='dashboard')return <><div className="loading-skeleton__heading"><Bar kind="short"/><Bar kind="heading"/><Bar/></div><Shape variant="stats" rows={4}/><div className="loading-skeleton__columns"><Shape variant="table" rows={rows}/><Shape variant="list" rows={3}/></div></>;
 if(variant==='rail')return <div className="loading-skeleton__rail"><div><Bar kind="short"/><Bar kind="heading"/></div><Shape variant="stats" rows={4}/><Bar kind="button"/></div>;
 return <div className={`loading-skeleton__${variant}`}>{variant==='table'&&<div className="loading-skeleton__row"><Bar kind="short"/><Bar/><Bar/></div>}{Array.from({length:rows},(_,i)=><div className="loading-skeleton__row" key={i}><Bar kind={variant==='table'?'short':'avatar'}/><div><Bar/><Bar kind="short"/></div><Bar kind="short"/></div>)}</div>;
}
export function LoadingSkeleton({rows=3,variant='list',label='Məlumat yüklənir'}:{rows?:number;variant?:SkeletonVariant;label?:string}) {
 return <div className={`loading-skeleton loading-skeleton--${variant}`} role="status" aria-busy="true" aria-label={label}><div aria-hidden="true"><Shape variant={variant} rows={rows}/></div></div>;
}
export function skeletonForPath(path:string):SkeletonVariant {
 if(/\/(login|register|forgot-password|reset-password|settings|account)(\/|$)/.test(path))return 'form';
 if(/\/roster(\/|$)/.test(path))return 'roster';
 if(/^\/teams\/[^/]+/.test(path)||/\/profile$/.test(path))return 'profile';
 if(/^\/tournaments\/[^/]+/.test(path))return 'tournament';
 if(path==='/teams'||path==='/tournaments')return 'cards';
 if(/^\/(admin|team)(\/)?$/.test(path))return 'dashboard';
 return 'table';
}
export function RouteSkeleton({path}:{path:string}) {
 return <div className="route-data-loading"><LoadingSkeleton variant={skeletonForPath(path)} rows={path==='/teams'?6:5}/></div>;
}
export function RefreshIndicator({active}:{active?:boolean}) {
 return active?<span className="query-refresh" role="status">Yenilənir…</span>:null;
}
