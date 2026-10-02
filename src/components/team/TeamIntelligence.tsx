import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock3, KeyRound, Pause, Play, Trophy, Users, Bell } from 'lucide-react';
import { useTeamCompetitionContexts, useTeamPlatformData } from '../../services/PlatformDataContext';
import { competitionNow, services } from '../../services';
import { usePlatformQuery } from '../../services/queryCache';
import { bakuTime, overviewDate } from '../../utils/teamOverview';
import '../../styles/team-insights.css';
export function countdown(until:string,now:number){const minutes=Math.max(0,Math.floor((Date.parse(until)-now)/60000));return `${Math.floor(minutes/1440)}g ${String(Math.floor(minutes/60)%24).padStart(2,'0')}s ${String(minutes%60).padStart(2,'0')}d`;}
export function TeamIntelligence(){
 const data=useTeamPlatformData(),{all,current}=useTeamCompetitionContexts();
 const [now,setNow]=useState(()=>competitionNow().getTime());
 const [paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
 const rail=useRef<HTMLDivElement>(null),hovered=useRef(false),focused=useRef(false),holdUntil=useRef(0);
 const room=current?.room;
 const roomQuery=usePlatformQuery({key:`intelligence-room:${data.currentTeam.id}:${current?.tournament.id}:${room?.roundId}`,query:()=>services.rooms.getForEligibleTeam(current!.tournament.id,room!.roundId),enabled:room?.status==='released',staleTime:15_000,retry:0});
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(!document.hidden){setNow(competitionNow().getTime());if(room?.status==='released')roomQuery.refetch();}},30_000);return()=>clearInterval(timer);},[room?.status,room?.roundId,roomQuery.refetch]);
 useEffect(()=>{
  if(paused||reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let frame=0,last=0,position=rail.current?.scrollLeft??0;
  const move=(time:number)=>{
   const elapsed=last?Math.min(time-last,50):0;last=time;const node=rail.current;
   if(node){
    if(!document.hidden&&!hovered.current&&!focused.current&&Date.now()>holdUntil.current){
     // Accumulate subpixels: browsers that round scrollLeft still advance slowly.
     position=Math.min(node.scrollWidth-node.clientWidth,position+elapsed*.018);
     node.scrollLeft=position;
    }else position=node.scrollLeft;
   }
   frame=requestAnimationFrame(move);
  };
  frame=requestAnimationFrame(move);return()=>cancelAnimationFrame(frame);
 },[paused,reduced]);
 const cards:Array<{id:string;label:string;value:string;detail:string;href:string;priority:number;icon:typeof Clock3}>=[];
 const add=(card:typeof cards[number])=>cards.push(card);
 if(room?.status==='released'&&current){const credentials=!roomQuery.error?roomQuery.data:undefined;add({id:'room',label:'OTAQ',value:credentials?.status==='released'&&credentials.roomId?credentials.roomId:'Otaq məlumatını aç',detail:`${current.tournament.shortName} · ${current.nextMatch?bakuTime(current.nextMatch.startsAt):'Otaq açılıb'}`,href:`/team/tournaments/${current.tournament.id}#room`,priority:0,icon:KeyRound});}
 if(current?.checkIn?.status==='open')add({id:'check-in',label:'İŞTİRAKI TƏSDİQLƏ',value:countdown(current.checkIn.closesAt,now),detail:current.tournament.name,href:`/team/tournaments/${current.tournament.id}`,priority:1,icon:Clock3});
 for(const event of data.notifications.filter(n=>!n.read&&n.actionHref).slice(0,3))add({id:event.id,label:'YENİ BİLDİRİŞ',value:event.title,detail:event.body,href:event.actionHref!,priority:event.priority==='critical'||event.priority==='important'?1:6,icon:Bell});
 const roster=data.currentTeam.roster.filter(p=>p.role!=='substitute'&&p.ign.trim()).length;
 if(roster<4)add({id:'roster',label:'HEYƏTİ TAMAMLA',value:`${roster}/4 oyunçu`,detail:'Əsas heyətdə boş yerlər var',href:'/team/roster',priority:2,icon:Users});
 if(current?.nextMatch){const match=current.nextMatch;add({id:match.id,label:'NÖVBƏTİ MATÇ',value:match.map,detail:`${overviewDate(match.startsAt)} · ${bakuTime(match.startsAt)} · ${countdown(match.startsAt,now)}`,href:`/team/tournaments/${current.tournament.id}`,priority:3,icon:Clock3});}
 for(const context of all.filter(c=>c.lifecycle==='current'||c.lifecycle==='upcoming').slice(0,3)){
  add({id:`entry:${context.tournament.id}`,label:'TURNİR İŞTİRAKI',value:context.participation.status==='confirmed'?'Təsdiqlənib':context.participation.status==='pending'?'Gözləyir':context.participation.status,detail:context.tournament.name,href:`/team/tournaments/${context.tournament.id}`,priority:5,icon:Trophy});
 }
 const deadline=data.tournaments.filter(t=>t.status==='registration-open'&&Date.parse(t.registrationDeadline)>now&&!data.participations.some(p=>p.tournamentId===t.id&&['pending','confirmed'].includes(p.status))).sort((a,b)=>Date.parse(a.registrationDeadline)-Date.parse(b.registrationDeadline))[0];
 if(deadline)add({id:'deadline',label:'QEYDİYYAT BİTİR',value:countdown(deadline.registrationDeadline,now),detail:deadline.name,href:`/tournaments/${deadline.id}`,priority:4,icon:Clock3});
 const latest=[...data.matchHistory].sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt))[0];
 if(latest)add({id:'result',label:'SON RƏSMİ NƏTİCƏ',value:`#${latest.placement} · ${latest.finishes} kill`,detail:`${latest.map} · ${latest.points} xal · ${overviewDate(latest.playedAt)}`,href:'/team/history',priority:7,icon:Trophy});
 if(!cards.length)return null;
 const stop=()=>{holdUntil.current=Date.now()+15_000;};
 const scroll=(direction:number)=>{stop();rail.current?.scrollBy({left:direction*280,behavior:reduced?'instant':'smooth'});};
 return <section className="team-intelligence" aria-label="Komandanın vacib məlumatları"><header><span>KOMANDA RADARI</span><div><button aria-label="Sola sürüşdür" onClick={()=>scroll(-1)}><ArrowLeft size={16}/></button><button aria-label="Sağa sürüşdür" onClick={()=>scroll(1)}><ArrowRight size={16}/></button>{!reduced&&<button aria-label={paused?'Avtomatik hərəkəti başlat':'Avtomatik hərəkəti dayandır'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}</div></header>
  <div ref={rail} className="intelligence-rail" tabIndex={0} aria-label="Kartları üfüqi sürüşdürün" onPointerEnter={event=>{if(event.pointerType==='mouse')hovered.current=true;}} onPointerLeave={()=>{hovered.current=false;}} onFocusCapture={()=>{focused.current=true;}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget)){focused.current=false;stop();}}} onTouchStart={stop} onWheel={stop} onKeyDown={stop}>
   {cards.sort((a,b)=>a.priority-b.priority).map(({id,label,value,detail,href,icon:Icon})=><Link className="intelligence-card" key={id} to={href}><span><Icon size={17} aria-hidden="true"/>{label}</span><strong>{value}</strong><p>{detail}</p></Link>)}
  </div>
 </section>;
}
