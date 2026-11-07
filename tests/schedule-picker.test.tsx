import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ScheduleDateTimePicker } from '../src/components/admin/ScheduleDateTimePicker';
import { TournamentSchedule, newSchedulePlan } from '../src/components/admin/TournamentSchedule';
import { suggestSchedule, type WizardFields } from '../src/utils/tournamentWizard';
const fields:WizardFields={name:'Cup',shortName:'Cup',description:'',maxSlots:'20',rules:'',startsAt:'2026-12-01T20:00',endsAt:'',registrationOpensAt:'2026-11-30T20:00',registrationDeadline:'2026-12-01T19:00',checkInOpensAt:'',checkInClosesAt:''};
const rounds=[{map:'Erangel' as const,startsAt:''},{map:'Miramar' as const,startsAt:''},{map:'Rondo' as const,startsAt:''}];
it('uses a labeled calendar dialog, disables unavailable days and times, commits only on Apply',async()=>{
 const change=vi.fn();const view=render(<ScheduleDateTimePicker id="date" label="Başlanğıc" value="2026-12-01T20:00" min="2026-12-01T19:30" max="2026-12-20T22:00" onChange={change}/>);
 expect(view.container.querySelector('input[type="datetime-local"],input[type="date"],input[type="time"]')).toBeNull();
 fireEvent.click(screen.getByLabelText('Başlanğıc',{exact:true}));
 const dialog=screen.getByRole('dialog',{name:'Başlanğıc'});expect(within(dialog).getByRole('grid')).toBeInTheDocument();
 expect(within(dialog).getByRole('button',{name:'Əvvəlki ay'})).toHaveAttribute('aria-disabled','true');
 expect(within(dialog).getByRole('button',{name:/21 dekabr 2026/})).toBeDisabled();
 expect(within(dialog).getAllByRole('option').find(o=>o.textContent==='18')).toBeDisabled();
 fireEvent.change(within(dialog).getByLabelText('Başlanğıc · saat'),{target:{value:'21'}});
 expect(change).not.toHaveBeenCalled();fireEvent.click(within(dialog).getByRole('button',{name:'Tarixi tətbiq et'}));expect(change).toHaveBeenCalledWith('2026-12-01T21:00');
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('supports arrow/week/month keys and Escape without saving',async()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="date" label="Başlanğıc" value="2026-12-01T20:00" onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Başlanğıc',{exact:true}));let day=screen.getByRole('button',{name:/^1 dekabr 2026/});
 day.focus();fireEvent.keyDown(day,{key:'ArrowRight'});await waitFor(()=>expect(screen.getByRole('button',{name:/^2 dekabr 2026/})).toHaveFocus());expect(screen.getByRole('gridcell',{selected:true})).toHaveTextContent('1');
 day=screen.getByRole('button',{name:/^2 dekabr 2026/});fireEvent.keyDown(day,{key:'PageDown'});await waitFor(()=>expect(screen.getByRole('button',{name:/^2 yanvar 2027/})).toHaveFocus());
 fireEvent.keyDown(document,{key:'Escape'});expect(change).not.toHaveBeenCalled();await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('protects manually overridden times and asks before regenerating them',async()=>{
 function Demo(){const [data,setData]=useState(()=>suggestSchedule(fields,rounds));const [plan,setPlan]=useState(newSchedulePlan);return <TournamentSchedule fields={data.fields} rounds={data.rounds} plan={plan} onPlanChange={setPlan} onChange={(fields,rounds)=>setData({fields,rounds})}/>;}
 render(<Demo/>);fireEvent.click(screen.getByRole('button',{name:'2. raund başlayır',exact:true}));
 fireEvent.change(screen.getByLabelText('2. raund başlayır · saat'),{target:{value:'22'}});fireEvent.click(screen.getByRole('button',{name:'Tarixi tətbiq et'}));
 expect(screen.getByRole('button',{name:'2. raund başlayır',exact:true})).toHaveTextContent('22:50');expect(screen.getByRole('button',{name:'3. raund başlayır',exact:true})).toHaveTextContent('23:40');
 fireEvent.change(screen.getByLabelText('Başlanğıclar arası interval (dəq.)'),{target:{value:'60'}});
 expect(screen.getByRole('button',{name:'2. raund başlayır',exact:true})).toHaveTextContent('22:50');expect(screen.getByRole('button',{name:'3. raund başlayır',exact:true})).toHaveTextContent('23:50');
 fireEvent.click(screen.getByRole('button',{name:'Cədvəli yenidən yarat'}));expect(screen.getByRole('dialog',{name:'Cədvəl yenidən yaradılsın?'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Vaxtları yenidən hesabla'}));expect(screen.getByRole('button',{name:'2. raund başlayır',exact:true})).toHaveTextContent('21:00');
});
it('does not reflow existing tournament times when interval configuration changes',()=>{
 const data=suggestSchedule(fields,rounds),change=vi.fn();render(<TournamentSchedule fields={data.fields} rounds={data.rounds} existing onChange={change}/>);
 fireEvent.change(screen.getByLabelText('Başlanğıclar arası interval (dəq.)'),{target:{value:'70'}});expect(change).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox'));expect(change).not.toHaveBeenCalled();expect(screen.getByRole('dialog',{name:'Cədvəl yenidən yaradılsın?'})).toBeInTheDocument();
});

it('preserves precise minutes, offers 5-minute steps and normalizes explicit UTC values to Baku',()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="precise" label="Dəqiq vaxt" value="2026-12-01T16:07:00Z" onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Dəqiq vaxt',{exact:true}));
 const minute=screen.getByLabelText('Dəqiq vaxt · dəqiqə');expect(minute).toHaveValue('07');
 fireEvent.keyDown(minute,{key:'ArrowUp'});expect(minute).toHaveValue('12');
 fireEvent.change(minute,{target:{value:'17'}});fireEvent.click(screen.getByRole('button',{name:'Tarixi tətbiq et'}));
 expect(change).toHaveBeenCalledWith('2026-12-01T20:17');
});
it('keeps conflicting bounds unavailable without committing a value',()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="bounds" label="Aralıq" value="2026-12-01T20:00" min="2026-12-02T20:00" max="2026-12-01T20:00" onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Aralıq',{exact:true}));expect(screen.getByRole('button',{name:'Tarixi tətbiq et'})).toBeDisabled();expect(change).not.toHaveBeenCalled();
});
