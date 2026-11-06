import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { TournamentCreateForm } from '../src/pages/routes/TournamentCreateForm';
import { services } from '../src/services';
import { tournaments } from './fixtures/platform-data';
import { clearQueryCache, invalidateQuery, usePlatformQuery } from '../src/services/queryCache';
import { tournamentWizardPayload, validateTournamentWizard, type WizardFields } from '../src/utils/tournamentWizard';

const valid:WizardFields={name:'AEVIC Cup',shortName:'Cup',description:'',maxSlots:'20',registrationOpensAt:'2026-11-06T10:00',registrationDeadline:'2026-11-07T10:00',checkInOpensAt:'2026-11-07T10:00',checkInClosesAt:'2026-11-07T11:00',startsAt:'2026-11-07T11:00',endsAt:'2026-11-07T15:00',rules:'Rule one\nRule two'};
const rounds=[{map:'Erangel' as const,startsAt:'2026-11-07T11:30'}];
afterEach(()=>{clearQueryCache();vi.restoreAllMocks();});
it('matches authoritative timeline, capacity, rule and round limits without inventing supported options',()=>{
 expect(validateTournamentWizard(valid,rounds)).toEqual([]);
 expect(validateTournamentWizard({...valid,maxSlots:'1.5'},rounds)).toEqual(expect.arrayContaining([expect.objectContaining({field:'maxSlots'})]));
 expect(validateTournamentWizard({...valid,checkInOpensAt:'2026-11-07T09:00'},rounds)).toEqual(expect.arrayContaining([expect.objectContaining({field:'checkInOpensAt'})]));
 expect(validateTournamentWizard(valid,[...rounds,...rounds])).toEqual(expect.arrayContaining([expect.objectContaining({field:'round-1'})]));
 expect(validateTournamentWizard(valid,[{...rounds[0],startsAt:valid.endsAt}])).toEqual(expect.arrayContaining([expect.objectContaining({field:'round-0'})]));
 expect(validateTournamentWizard({...valid,rules:'x'.repeat(501)},rounds)).toEqual(expect.arrayContaining([expect.objectContaining({field:'rules'})]));
 const payload=tournamentWizardPayload(valid,rounds);expect(payload.rounds[0].startsAt).toBe(new Date(rounds[0].startsAt).toISOString());expect(payload.rules).toEqual(['Rule one','Rule two']);expect(payload).not.toHaveProperty('pointFormula');
});
it('focuses invalid fields, retains inputs and maps across steps, reviews and prevents duplicate submission',async()=>{
 const user=userEvent.setup();let resolve!:(value:typeof tournaments[number])=>void;
 const create=vi.spyOn(services.tournaments,'create').mockImplementation(()=>new Promise(done=>{resolve=done;}));
 render(<MemoryRouter initialEntries={['/admin/tournaments/new']}><Routes><Route path="/admin/tournaments/new" element={<TournamentCreateForm/>}/><Route path="/admin/tournaments/:id" element={<h1>Created detail</h1>}/></Routes></MemoryRouter>);
 await user.click(screen.getByRole('button',{name:'Davam et'}));await waitFor(()=>expect(screen.getByLabelText('Turnir adı')).toHaveFocus());expect(screen.getByText('Turnir adı 2–120 simvol olmalıdır.')).toBeInTheDocument();
 await user.type(screen.getByLabelText('Turnir adı'),'AEVIC Cup');await user.type(screen.getByLabelText('Qısa ad'),'Cup');await user.click(screen.getByRole('button',{name:'Davam et'}));
 fireEvent.change(screen.getByLabelText('Komanda tutumu'),{target:{value:'24'}});
 const maps=screen.getAllByRole('button',{name:'Rondo'});await user.click(maps[0]);
 await user.click(screen.getByRole('button',{name:'Geri'}));expect(screen.getByLabelText('Turnir adı')).toHaveValue('AEVIC Cup');await user.click(screen.getByRole('button',{name:'Davam et'}));expect(screen.getByLabelText('Komanda tutumu')).toHaveValue(24);expect(screen.getAllByRole('button',{name:'Rondo'})[0]).toHaveAttribute('aria-pressed','true');
 await user.click(screen.getByRole('button',{name:'Davam et'}));
 const labels:Record<string,string>={registrationOpensAt:'Qeydiyyat açılır',registrationDeadline:'Qeydiyyat bağlanır',checkInOpensAt:'Check-in açılır',checkInClosesAt:'Check-in bağlanır',startsAt:'Turnirin başlanğıcı',endsAt:'Turnirin bitməsi'};
 for(const [key,label] of Object.entries(labels))fireEvent.change(screen.getByLabelText(label),{target:{value:valid[key as keyof WizardFields]}});
 for(let i=0;i<4;i++)fireEvent.change(screen.getByLabelText(`${i+1}. raund başlayır`),{target:{value:`2026-11-07T${12+i%2}:${i<2?'00':'30'}`}});
 await user.click(screen.getByRole('button',{name:'Davam et'}));await user.type(screen.getByLabelText(/Turnir qaydaları/),'Rule one');await user.click(screen.getByRole('button',{name:'Davam et'}));
 expect(screen.getByText('Turnir yaratmağa hazırdır')).toBeInTheDocument();expect(create).not.toHaveBeenCalled();
 const form=screen.getByRole('button',{name:'Qaralama turnir yarat'}).closest('form')!;
 fireEvent.submit(form);fireEvent.submit(form);expect(create).toHaveBeenCalledTimes(1);expect(create.mock.calls[0][0]).toMatchObject({maxSlots:24,rounds:[{map:'Rondo'},{map:'Miramar'},{map:'Rondo'},{map:'Erangel'}]});
 await act(async()=>resolve({...tournaments[0],id:'created-cup'}));await screen.findByText('Created detail');
});
it('revalidates analytics on relevant snapshot mutations without touching session verification',async()=>{
 const read=vi.fn().mockResolvedValue({count:1});const session=vi.spyOn(services.auth,'getSession');
 function Probe(){const query=usePlatformQuery({key:'admin:analytics:30',query:read});return <span>{query.data?.count??'loading'}</span>;}
 render(<Probe/>);await screen.findByText('1');expect(read).toHaveBeenCalledTimes(1);
 read.mockResolvedValue({count:2});act(()=>invalidateQuery('snapshot:admin'));await screen.findByText('2');expect(read).toHaveBeenCalledTimes(2);expect(session).not.toHaveBeenCalled();
});
