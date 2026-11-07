import { useEffect, useId, useState } from 'react';
import { Check, ChevronsUpDown, Search, Trophy } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import type { Tournament } from '../../types/domain';
import { formatEventDate } from '../../utils/calendar';
import { adminTournamentStatuses } from '../../utils/adminTournamentStatus';

export function AdminTournamentSelect({tournaments,value,onChange,disabled,recipientCounts}:{tournaments:Tournament[];value:string;onChange:(id:string)=>void;disabled:boolean;recipientCounts?:Record<string,number>}) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[active,setActive]=useState(0);
  const id=useId(),selected=tournaments.find(t=>t.id===value);
  const filtered=tournaments.filter(t=>`${t.name} ${t.shortName}`.toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az')));
  useEffect(()=>{if(open)document.getElementById(`${id}-${active}`)?.scrollIntoView?.({block:'nearest'});},[active,id,open,search]);
  const choose=(value:string)=>{onChange(value);setOpen(false);};
  return <Popover.Root open={open} onOpenChange={next=>{setOpen(next);setSearch('');setActive(0);}}><Popover.Trigger className="results-tournament-select" disabled={disabled} aria-label={selected?`Turnir: ${selected.name}`:'Turnir seçin'}><Trophy size={20}/><span><small>TURNİR</small><strong>{selected?.name??'Turnir seçin'}</strong>{selected&&<span>{formatEventDate(selected.startsAt)} · {adminTournamentStatuses[selected.status]}</span>}</span><ChevronsUpDown size={17}/></Popover.Trigger>
    <Popover.Portal><Popover.Content className="results-tournament-popover" align="start" sideOffset={8} collisionPadding={12} aria-label="Turnir seçimi">
      <div className="results-selector-search"><Search size={17}/><input autoFocus aria-label="Turnir axtar" placeholder="Ad və ya qısa adla axtar…" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={id} aria-activedescendant={filtered[active]?`${id}-${active}`:undefined} value={search} onChange={e=>{setSearch(e.target.value);setActive(0);}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,Math.min(filtered.length-1,i+(e.key==='ArrowDown'?1:-1))));}else if(e.key==='Enter'&&filtered[active]){e.preventDefault();choose(filtered[active].id);}}}/></div>
      <div role="listbox" id={id} aria-label="Turnirlər" className="results-selector-options">{filtered.map((t,i)=><button role="option" tabIndex={-1} id={`${id}-${i}`} aria-selected={value===t.id} data-active={i===active} key={t.id} onMouseEnter={()=>setActive(i)} onClick={()=>choose(t.id)}><span><strong>{t.name}</strong><small>{formatEventDate(t.startsAt)} · {adminTournamentStatuses[t.status]}{recipientCounts&&` · ${recipientCounts[t.id]??0} komanda`}</small></span>{value===t.id&&<Check size={16}/>}</button>)}{!filtered.length&&<p>Uyğun turnir yoxdur.</p>}</div>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
