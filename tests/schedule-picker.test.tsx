import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ScheduleDateTimePicker } from '../src/components/admin/ScheduleDateTimePicker';
import { TournamentSchedule, newSchedulePlan } from '../src/components/admin/TournamentSchedule';
import { suggestSchedule, type WizardFields } from '../src/utils/tournamentWizard';
const fields:WizardFields={name:'Cup',shortName:'Cup',description:'',maxSlots:'20',rules:'',startsAt:'2026-12-01T20:00',endsAt:'',registrationOpensAt:'2026-11-30T20:00',registrationDeadline:'2026-12-01T19:00',checkInOpensAt:'',checkInClosesAt:''};
const rounds=[{map:'Erangel' as const,startsAt:''},{map:'Miramar' as const,startsAt:''},{map:'Rondo' as const,startsAt:''}];
it('opens the compact calendar, disables out-of-range days and selects immediately',async()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="date" label="Başlanğıc" value="2026-12-01T20:00" min="2026-12-01T19:30" max="2026-12-20T22:00" onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Başlanğıc',{exact:true}));
 const dialog=screen.getByRole('dialog',{name:'Başlanğıc'});
 expect(within(dialog).getByRole('button',{name:/21 dekabr 2026/})).toBeDisabled();
 fireEvent.click(within(dialog).getByRole('button',{name:/^2 dekabr 2026/}));
 expect(change).toHaveBeenCalledWith('2026-12-02T20:00');
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
 render(<Demo/>);fireEvent.change(screen.getByLabelText('2. raund başlayır · vaxt'),{target:{value:'22:50'}});
 expect(screen.getByLabelText('2. raund başlayır · vaxt')).toHaveValue('22:50');expect(screen.getByLabelText('3. raund başlayır · vaxt')).toHaveValue('23:40');
 fireEvent.change(screen.getByLabelText('Başlanğıclar arası interval (dəq.)'),{target:{value:'60'}});
 expect(screen.getByLabelText('2. raund başlayır · vaxt')).toHaveValue('22:50');expect(screen.getByLabelText('3. raund başlayır · vaxt')).toHaveValue('23:50');
 fireEvent.click(screen.getByRole('button',{name:'Cədvəli yenidən yarat'}));expect(screen.getByRole('dialog',{name:'Cədvəl yenidən yaradılsın?'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Vaxtları yenidən hesabla'}));expect(screen.getByLabelText('2. raund başlayır · vaxt')).toHaveValue('21:00');
});
it('does not reflow existing tournament times when interval configuration changes',()=>{
 const data=suggestSchedule(fields,rounds),change=vi.fn();render(<TournamentSchedule fields={data.fields} rounds={data.rounds} existing onChange={change}/>);
 fireEvent.change(screen.getByLabelText('Başlanğıclar arası interval (dəq.)'),{target:{value:'70'}});expect(change).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox'));expect(change).not.toHaveBeenCalled();expect(screen.getByRole('dialog',{name:'Cədvəl yenidən yaradılsın?'})).toBeInTheDocument();
});

it('preserves precise minutes and normalizes explicit UTC values to Baku',()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="precise" label="Dəqiq vaxt" value="2026-12-01T16:07:00Z" onChange={change}/>);
 const time=screen.getByLabelText('Dəqiq vaxt · vaxt');expect(time).toHaveValue('20:07');
 fireEvent.change(time,{target:{value:'20:17'}});
 expect(change).toHaveBeenCalledWith('2026-12-01T20:17');
 fireEvent.change(time,{target:{value:'25:00'}});expect(change).toHaveBeenCalledTimes(1);expect(time).toHaveAttribute('aria-invalid','true');
});
it('keeps conflicting bounds unavailable without committing a value',()=>{
 const change=vi.fn();render(<ScheduleDateTimePicker id="bounds" label="Aralıq" value="2026-12-01T20:00" min="2026-12-02T20:00" max="2026-12-01T20:00" onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Aralıq',{exact:true}));expect(within(screen.getByRole('grid')).getAllByRole('button').every(button=>(button as HTMLButtonElement).disabled)).toBe(true);expect(change).not.toHaveBeenCalled();
});
