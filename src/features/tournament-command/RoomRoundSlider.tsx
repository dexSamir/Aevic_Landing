import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MatchScheduleItem } from '../../types/domain';
import { mapArtwork } from '../../assets/maps';
import '../../styles/room-round-slider.css';

export function RoomRoundSlider({matches,selectedId,onSelect}:{matches:MatchScheduleItem[];selectedId?:string;onSelect:(id:string)=>void}) {
 const rail=useRef<HTMLDivElement>(null),gesture=useRef({x:0,left:0,dragged:false});
 const [edges,setEdges]=useState({start:true,end:true});
 const scroll=(direction:number)=>{const node=rail.current;if(node)node.scrollBy({left:direction*node.clientWidth*.8,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 useEffect(()=>{
  const node=rail.current;if(!node)return;
  const measure=()=>setEdges({start:node.scrollLeft<=4,end:node.scrollLeft>=node.scrollWidth-node.clientWidth-4});
  const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);observer?.observe(node);measure();node.addEventListener('scroll',measure,{passive:true});
  return()=>{observer?.disconnect();node.removeEventListener('scroll',measure);};
 },[matches]);
 useEffect(()=>{const node=rail.current,selected=node?.querySelector<HTMLElement>('[aria-pressed="true"]');if(node&&selected){const left=selected.offsetLeft-node.offsetLeft;if(left<node.scrollLeft||left+selected.offsetWidth>node.scrollLeft+node.clientWidth)node.scrollTo({left:Math.max(0,left-node.clientWidth/2+selected.offsetWidth/2),behavior:'instant'});}},[selectedId]);
 if(!matches.length)return null;
 return <div className="room-round-slider"><header><span>RAUND SEÇİMİ</span>{!(edges.start&&edges.end)&&<div><button type="button" aria-label="Əvvəlki raundlar" disabled={edges.start} onClick={()=>scroll(-1)}><ArrowLeft size={16}/></button><button type="button" aria-label="Növbəti raundlar" disabled={edges.end} onClick={()=>scroll(1)}><ArrowRight size={16}/></button></div>}</header>
 <div ref={rail} className="room-round-rail" role="group" aria-label="Raund" tabIndex={0} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();scroll(event.key==='ArrowLeft'?-1:1);}if(event.key==='Home'||event.key==='End'){event.preventDefault();event.currentTarget.scrollTo({left:event.key==='Home'?0:event.currentTarget.scrollWidth,behavior:'instant'});}}}
 onPointerDown={event=>{gesture.current={x:event.clientX,left:event.currentTarget.scrollLeft,dragged:false};}}
 onPointerMove={event=>{if(event.pointerType!=='mouse'||event.buttons!==1)return;const delta=event.clientX-gesture.current.x;if(Math.abs(delta)>6){gesture.current.dragged=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.scrollLeft=gesture.current.left-delta;}}}
 onClickCapture={event=>{if(event.detail>0&&gesture.current.dragged){event.preventDefault();event.stopPropagation();gesture.current.dragged=false;}}}>
 {matches.map(match=><button type="button" key={match.id} data-round-id={match.id} aria-label={`R${match.round} · ${match.map}`} aria-pressed={selectedId===match.id} onClick={()=>onSelect(match.id)}><span>R{match.round}</span><strong>{match.map}</strong>{mapArtwork[match.map.toLowerCase()]&&<img draggable={false} src={mapArtwork[match.map.toLowerCase()].src} alt="" loading="lazy"/>}</button>)}
 </div></div>;
}
