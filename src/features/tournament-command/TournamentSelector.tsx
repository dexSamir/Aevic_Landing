import { ArrowRight, CalendarDays, Check, LayoutGrid, Trophy, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEventDate } from '../../utils/calendar';
import { mapArtwork } from '../../assets/maps';
import type { TeamCompetitionContext } from '../../utils/teamCompetitionContext';
import '../../styles/tournament-switcher.css';

const statuses: Record<string,string> = { ongoing:'Aktiv turnir', completed:'Tamamlanıb', cancelled:'Ləğv edilib', 'registration-open':'Qeydiyyat açıqdır', 'registration-closed':'Qeydiyyat bağlanıb', published:'Elan edilib', draft:'Qaralama' };
const dates = (start:string,end:string) => {
 const format=(date:string)=>Number.isFinite(Date.parse(date))?formatEventDate(date):'Tarix gözlənilir';
 return `${format(start)} – ${format(end)}`;
};
const artworkFor = (context:TeamCompetitionContext) => context.matches.map(match=>mapArtwork[match.map.toLowerCase()]).find(Boolean);

/** An inline card tray keeps tournament context visible without a menu or modal. */
export function TournamentSelector({context,all,game}:{context:TeamCompetitionContext;all:TeamCompetitionContext[];game?:string}) {
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null);
 const tournament=context.tournament,art=artworkFor(context);
 return <section className="tournament-switcher" aria-label="Turnir seçimi" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} className="tournament-switcher-launcher" type="button" aria-expanded={open} aria-controls="tournament-switcher-tray" onClick={()=>setOpen(value=>!value)}>
   {art&&<img className="tournament-switcher-art" src={art.src} srcSet={art.srcSet} sizes="(max-width:600px) 100vw, 900px" alt=""/>}
   <Trophy className="tournament-switcher-icon" aria-hidden="true"/>
   <span className="tournament-switcher-identity"><strong>{tournament.name}</strong><span className="tournament-switcher-status">{statuses[tournament.status]}</span></span>
   <span className="tournament-switcher-meta">{game&&<span>{game === 'pubg-mobile' ? 'PUBG Mobile' : game}</span>}<span><CalendarDays size={15}/>{dates(tournament.startsAt,tournament.endsAt)}</span></span>
   <span className="tournament-switcher-action"><span>{all.length} turnir</span>{open?<X size={18} aria-hidden="true"/>:<LayoutGrid size={18} aria-hidden="true"/>}<span className="sr-only">{open?'Turnir seçimini bağla':'Turniri dəyiş'}</span></span>
  </button>
  {open&&<div id="tournament-switcher-tray" className="tournament-switcher-tray"><header><div><span>YARIŞLARINIZ</span><h2>Turniri dəyiş</h2></div><small>{all.length} iştirak</small></header>
   <nav className="tournament-switcher-cards" aria-label="Qoşulduğunuz turnirlər">{all.map(item=>{const t=item.tournament,selected=t.id===tournament.id,art=artworkFor(item);return <Link key={t.id} to={`/team/tournaments/${encodeURIComponent(t.id)}`} aria-current={selected?'page':undefined} onClick={()=>setOpen(false)}>
    <span className="tournament-switcher-card-art">{art&&<img src={art.src} alt="" loading="lazy"/>}<span>{statuses[t.status]}</span>{selected&&<Check size={18} aria-label="Seçilmiş turnir"/>}</span>
    <span className="tournament-switcher-card-copy"><strong>{t.name}</strong><small>{dates(t.startsAt,t.endsAt)}</small><span>{selected?'Hazırda baxırsınız':'Turnirə keç'}<ArrowRight size={16}/></span></span>
   </Link>;})}</nav>
  </div>}
 </section>;
}
