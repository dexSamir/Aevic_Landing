import { TournamentJoinAction } from '../src/components/competition/TournamentJoinAction';
import { tournaments } from './fixtures/platform-data';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { bakuInstant, bakuInput, suggestSchedule, validateTournamentWizard, tournamentWizardPayload, type WizardFields } from '../src/utils/tournamentWizard';
import { TournamentSchedule } from '../src/components/admin/TournamentSchedule';
import { RegisterPage } from '../src/pages/routes/RegisterPage';
import { OnboardingReminder } from '../src/components/auth/OnboardingReminder';
import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { services, invalidateVerifiedSession } from '../src/services';
const fields:WizardFields={name:'Tournament',shortName:'Cup',description:'',maxSlots:'20',rules:'',startsAt:'2026-12-01T20:00',endsAt:'',registrationOpensAt:'2026-11-30T20:00',registrationDeadline:'2026-12-01T19:00',checkInOpensAt:'',checkInClosesAt:''};
const rounds=[{map:'Erangel' as const,startsAt:''},{map:'Miramar' as const,startsAt:''}];
const template={name:'Existing Cup',startsAt:'2026-10-01T20:00:00+04:00',endsAt:'2026-10-01T21:20:00+04:00',rounds:[{map:'Erangel',startsAt:'2026-10-01T20:00:00+04:00'},{map:'Miramar',startsAt:'2026-10-01T20:40:00+04:00'}]};
afterEach(()=>{vi.restoreAllMocks();invalidateVerifiedSession();});
it('converts Baku wall-clock values independently of the device zone and preserves explicit offsets',()=>{
 expect(new Date(bakuInstant('2026-12-01T20:00')).toISOString()).toBe('2026-12-01T16:00:00.000Z');
 expect(bakuInstant('2026-12-01T20:00:30')).toBe('2026-12-01T20:00:30+04:00');
 expect(bakuInstant('2026-12-01T16:00:00Z')).toBe('2026-12-01T16:00:00Z');
 expect(bakuInput('2026-12-01T16:00:00Z')).toBe('2026-12-01T20:00');
});
it('derives check-in boundaries and reuses actual configured round intervals without arbitrary offsets',()=>{
 const next=suggestSchedule(fields,rounds,template);expect(next.fields).toMatchObject({checkInOpensAt:fields.registrationDeadline,checkInClosesAt:fields.startsAt,endsAt:'2026-12-01T21:20'});
 expect(next.rounds[1].startsAt).toBe('2026-12-01T20:40');expect(validateTournamentWizard(next.fields,next.rounds)).toEqual([]);
 expect(tournamentWizardPayload(next.fields,next.rounds)).toMatchObject({startsAt:'2026-12-01T16:00:00.000Z',endsAt:'2026-12-01T17:20:00.000Z'});
});
it('requires explicit unsupported timing instead of inventing round durations',()=>{
 const next=suggestSchedule(fields,rounds);expect(next.fields.endsAt).toBe('');expect(next.rounds[0].startsAt).toBe(fields.startsAt);expect(next.rounds[1].startsAt).toBe('');
 expect(validateTournamentWizard(next.fields,next.rounds).map(x=>x.field)).toEqual(expect.arrayContaining(['endsAt','round-1']));
});
it('rejects chronological errors, duplicate round instants and out-of-bounds rounds',()=>{
 const next=suggestSchedule(fields,rounds,template);
 expect(validateTournamentWizard({...next.fields,registrationDeadline:fields.startsAt},next.rounds)).not.toHaveLength(0);
 expect(validateTournamentWizard(next.fields,next.rounds.map(r=>({...r,startsAt:fields.startsAt})))).toEqual(expect.arrayContaining([expect.objectContaining({field:'round-1'})]));
 expect(validateTournamentWizard(next.fields,[{map:'Erangel',startsAt:'2026-12-01T19:59'}])).toEqual(expect.arrayContaining([expect.objectContaining({field:'round-0'})]));
});
it('shows three default date controls and keeps advanced overrides when essential fields change',()=>{
 function Demo(){const [data,setData]=useState(suggestSchedule(fields,rounds,template));return <TournamentSchedule fields={data.fields} rounds={data.rounds} template={template} onChange={(fields,rounds)=>setData({fields,rounds})}/>;}
 const view=render(<Demo/>);
 expect(view.container.querySelectorAll('.schedule-editor__essential input[type=datetime-local]')).toHaveLength(3);
 expect(screen.getByText('Asia/Baku · UTC+4')).toBeInTheDocument();
 fireEvent.click(screen.getByText('Ətraflı cədvəl'));
 fireEvent.change(screen.getByLabelText('Turnirin bitməsi'),{target:{value:'2026-12-01T23:00'}});
 fireEvent.change(screen.getByLabelText('Qeydiyyat açılır'),{target:{value:'2026-11-29T20:00'}});
 expect(screen.getByLabelText('Turnirin bitməsi')).toHaveValue('2026-12-01T23:00');
});
it('registers a spectator account through the new account endpoint without a dummy team',async()=>{
 const save=vi.spyOn(services.auth,'registerAccount').mockResolvedValue({role:'visitor',user:{id:'1',firstName:'Viewer',lastName:'Name',email:'viewer@example.invalid',role:'visitor'}});
 render(<MemoryRouter><RegisterPage/></MemoryRouter>);
 fireEvent.click(screen.getByLabelText(/İzləyici kimi davam et/));
 for(const [label,value] of [['Ad','Viewer'],['Soyad','Name'],['E-poçt','viewer@example.invalid'],['Şifrə','ValidPassword1'],['Şifrəni təkrarla','ValidPassword1']])fireEvent.change(screen.getByLabelText(label,{exact:true}),{target:{value}});
 fireEvent.click(screen.getByLabelText(/İstifadə şərtlərini/));fireEvent.click(screen.getByRole('button',{name:'Hesab yarat'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({purpose:'spectator',email:'viewer@example.invalid'})));
 expect(save.mock.calls[0][0]).not.toHaveProperty('teamName');
});
it('shows a persistent action only for incomplete team intent and removes it immediately on completion',async()=>{
 vi.spyOn(services.auth,'getSession').mockResolvedValue({role:'visitor',user:{id:'pending',firstName:'Name',lastName:'',email:'v@example.invalid',role:'visitor',onboarding:{purpose:'team',status:'team'}}});
 render(<MemoryRouter><PublicSessionProvider><OnboardingReminder/></PublicSessionProvider></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Komanda quruluşunu tamamla'})).toHaveAttribute('href','/team/setup');
 window.dispatchEvent(new Event('aevic:onboarding-complete'));
 await waitFor(()=>expect(screen.queryByRole('link',{name:'Komanda quruluşunu tamamla'})).not.toBeInTheDocument());
});
it('does not show setup reminders to spectators or legacy-complete accounts',async()=>{
 vi.spyOn(services.auth,'getSession').mockResolvedValue({role:'visitor',user:{id:'spectator',firstName:'Name',lastName:'',email:'v@example.invalid',role:'visitor',onboarding:{purpose:'spectator',status:'complete'}}});
 const view=render(<MemoryRouter><PublicSessionProvider><OnboardingReminder/></PublicSessionProvider></MemoryRouter>);
 await waitFor(()=>expect(services.auth.getSession).toHaveBeenCalled());expect(view.container.querySelector('.onboarding-reminder')).toBeNull();
});

it('offers authenticated spectators team setup without sending them through login or registration again',async()=>{
 vi.spyOn(services.auth,'getSession').mockResolvedValue({role:'visitor',user:{id:'spectator-join',firstName:'Viewer',lastName:'Name',email:'v@example.invalid',role:'visitor'}});
 const team=vi.spyOn(services.teams,'current');
 render(<MemoryRouter><PublicSessionProvider><TournamentJoinAction tournament={tournaments[0]} currentTime={new Date(Date.parse(tournaments[0].registrationOpensAt)+60000)}/></PublicSessionProvider></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Komanda yarat'})).toHaveAttribute('href','/team/setup');expect(team).not.toHaveBeenCalled();
});
