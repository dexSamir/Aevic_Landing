import { CalendarDays, Check, ChevronDown, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../utils/calendar';
import { Link } from 'react-router-dom';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';

const statuses: Record<string,string> = { ongoing:'Aktiv turnir', completed:'Tamamlanıb', cancelled:'Ləğv edilib', 'registration-open':'Qeydiyyat açıqdır', 'registration-closed':'Qeydiyyat bağlanıb', published:'Elan edilib', draft:'Qaralama' };
export const tournamentDates = (start:string,end:string) => {
 const format=(date:string)=>Number.isFinite(Date.parse(date))?formatEventDate(date):'Tarix gözlənilir';
 return `${format(start)} – ${format(end)}`;
};
export function TournamentSelector({context,all,game}:{context:TeamCompetitionContext;all:TeamCompetitionContext[];game?:string}) {
 const [open,setOpen]=useState(false), root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  root.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')?.focus();
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 const tournament=context.tournament;
 return <div className="command-selector" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}
  if(open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const links=[...root.current!.querySelectorAll<HTMLAnchorElement>('nav a')];const index=links.indexOf(document.activeElement as HTMLAnchorElement);
   links[event.key==='Home'?0:event.key==='End'?links.length-1:(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();
  }
 }}>
  <button ref={trigger} className="command-selector-trigger" type="button" aria-expanded={open} aria-controls="command-tournament-options" onClick={()=>setOpen(value=>!value)}>
   <Trophy aria-hidden="true"/><strong>{tournament.name}</strong><span className="command-selector-status">{statuses[tournament.status]}</span>
   {game&&<span className="command-selector-extra">{game}</span>}<span className="command-selector-extra command-selector-date"><CalendarDays size={15}/>{tournamentDates(tournament.startsAt,tournament.endsAt)}</span><small>{all.length} turnir</small><ChevronDown size={17} aria-hidden="true"/>
  </button>
  {open&&<nav id="command-tournament-options" className="command-selector-options" aria-label="Turnir seçimi">{all.map(({tournament:t})=><Link key={t.id} to={`/team/tournaments/${encodeURIComponent(t.id)}`} aria-current={t.id===tournament.id?'page':undefined} onClick={()=>setOpen(false)}><span><strong>{t.name}</strong><small>{statuses[t.status]} · {tournamentDates(t.startsAt,t.endsAt)}</small></span>{t.id===tournament.id&&<Check size={18}/>}</Link>)}</nav>}
 </div>;
}
