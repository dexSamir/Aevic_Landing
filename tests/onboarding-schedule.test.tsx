import { TournamentJoinAction } from '../src/components/competition/TournamentJoinAction';
import { tournaments } from './fixtures/platform-data';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, afterEach } from 'vitest';
import { bakuInstant, bakuInput, suggestSchedule, newScheduleAutomation, validateTournamentWizard, tournamentWizardPayload, type WizardFields } from '../src/utils/tournamentWizard';
import { defaultScheduleOptions, mapInterval } from '../src/utils/matchScheduling';
import { RegisterPage } from '../src/pages/routes/RegisterPage';
import { OnboardingReminder } from '../src/components/auth/OnboardingReminder';
import { PublicSessionProvider } from '../src/services/PublicSessionContext';
import { services, invalidateVerifiedSession } from '../src/services';
const fields:WizardFields={name:'Tournament',shortName:'Cup',description:'',maxSlots:'20',rules:'',startsAt:'2026-12-01T20:00',endsAt:'',registrationOpensAt:'2026-11-30T20:00',registrationDeadline:'2026-12-01T19:00',checkInOpensAt:'',checkInClosesAt:''};
const rounds=[{map:'Erangel' as const,startsAt:''},{map:'Miramar' as const,startsAt:''}];
afterEach(()=>{vi.restoreAllMocks();invalidateVerifiedSession();});
it('converts Baku wall-clock values independently of the device zone and preserves explicit offsets',()=>{
 expect(new Date(bakuInstant('2026-12-01T20:00')).toISOString()).toBe('2026-12-01T16:00:00.000Z');
 expect(bakuInstant('2026-12-01T20:00:30')).toBe('2026-12-01T20:00:30+04:00');
 expect(bakuInstant('2026-12-01T16:00:00Z')).toBe('2026-12-01T16:00:00Z');
 expect(bakuInput('2026-12-01T16:00:00Z')).toBe('2026-12-01T20:00');
});
it('generates 50-minute starts from the first map and serializes Baku times',()=>{
 const next=suggestSchedule(fields,rounds);expect(next.fields).toMatchObject({checkInOpensAt:fields.registrationDeadline,checkInClosesAt:fields.startsAt,endsAt:'2026-12-01T21:25'});
 expect(next.rounds[1].startsAt).toBe('2026-12-01T20:50');expect(validateTournamentWizard(next.fields,next.rounds)).toEqual([]);
 expect(tournamentWizardPayload(next.fields,next.rounds)).toMatchObject({startsAt:'2026-12-01T16:00:00.000Z',endsAt:'2026-12-01T17:25:00.000Z'});
});
it('handles midnight, larger tournament-specific estimates and the 45-minute floor',()=>{
 const next=suggestSchedule({...fields,startsAt:'2026-12-31T23:40'},[...rounds,{map:'Rondo',startsAt:''}]);
 expect(next.rounds.map(r=>r.startsAt)).toEqual(['2026-12-31T23:40','2027-01-01T00:30','2027-01-01T01:20']);
 expect(mapInterval({...defaultScheduleOptions,intervalMinutes:10})).toBe(45);
 expect(mapInterval({...defaultScheduleOptions,matchMinutes:55,preparationMinutes:10})).toBe(65);
 expect(suggestSchedule(fields,rounds,{...defaultScheduleOptions,intervalMinutes:75}).rounds[1].startsAt).toBe('2026-12-01T21:15');
});
it('preserves manual anchors, recomputes downstream rounds and leaves existing schedules unchanged',()=>{
 const automation={...newScheduleAutomation(),overrides:[1],endManual:true};
 const manual=[{map:'Erangel' as const,startsAt:fields.startsAt},{map:'Miramar' as const,startsAt:'2026-12-01T22:00'},{map:'Rondo' as const,startsAt:''}];
 const next=suggestSchedule({...fields,endsAt:'2026-12-02T01:00'},manual,defaultScheduleOptions,automation);
 expect(next.rounds.map(r=>r.startsAt)).toEqual([fields.startsAt,'2026-12-01T22:00','2026-12-01T22:50']);expect(next.fields.endsAt).toBe('2026-12-02T01:00');
 expect(suggestSchedule(fields,manual,defaultScheduleOptions,newScheduleAutomation(true))).toEqual({fields,rounds:manual});
});
it('rejects reversed, overlapping, too-close and out-of-bounds rounds while allowing unchanged legacy edits',()=>{
 const next=suggestSchedule(fields,rounds);
 expect(validateTournamentWizard({...next.fields,registrationDeadline:fields.startsAt},next.rounds)).not.toHaveLength(0);
 for(const at of ['2026-12-01T19:59','2026-12-01T20:00','2026-12-01T20:44'])expect(validateTournamentWizard(next.fields,[next.rounds[0],{...next.rounds[1],startsAt:at}])).toEqual(expect.arrayContaining([expect.objectContaining({field:'round-1'})]));
 const legacy=[next.rounds[0],{...next.rounds[1],startsAt:'2026-12-01T20:30'}];
 expect(validateTournamentWizard(next.fields,legacy,defaultScheduleOptions,false)).toEqual([]);
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
