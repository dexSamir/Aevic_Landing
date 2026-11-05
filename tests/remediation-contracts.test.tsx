import {afterEach,expect,it,vi} from 'vitest';
import {createApiServices} from '../src/services/apiAdapter';
import {resolveTournamentJoinState} from '../src/utils/tournamentJoin';
import {statusLabel} from '../src/utils/statusLabels';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TeamComparison} from '../src/components/team/TeamExperience';
import type {TeamComparisonRecord,Tournament} from '../src/types/domain';
afterEach(()=>vi.unstubAllGlobals());
it.each(['completed','cancelled','ongoing','draft'])('does not invite anonymous registration for %s tournaments',status=>{
 const tournament={status,usedSlots:0,maxSlots:16,registrationOpensAt:'2020-01-01T00:00:00Z',registrationDeadline:'2030-01-01T00:00:00Z'} as Tournament;
 expect(resolveTournamentJoinState({authenticated:false,tournament})).toBe('closed');
});
it('formats only display precision and preserves missing/zero comparison values',()=>{
 const records=[{teamId:'1',teamName:'Alpha',averagePoints:239/31,matches:31},{teamId:'2',teamName:'Beta',averagePoints:0,matches:0}] as TeamComparisonRecord[];
 render(<MemoryRouter><TeamComparison records={records} initialLeftId="1" initialRightId="2"/></MemoryRouter>);
 expect(screen.getByText('7.7')).toBeInTheDocument();expect(screen.getByText('0.0')).toBeInTheDocument();expect(records[0].averagePoints).toBe(239/31);
});
it.each([['APPROVED','Təsdiqlənib'],['ongoing','Davam edir'],['pending','Gözləyir'],['rejected','Rədd edilib']])('localizes %s', (input,label)=>expect(statusLabel(input)).toBe(label));
it('retains an edit idempotency key after a lost response and never reports a definite failure',async()=>{
 const calls:RequestInit[]=[];let attempt=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{if(_url.endsWith('/auth/refresh'))return Response.json({sessionMode:'legacy'});calls.push(options);if(attempt++===0)throw new TypeError('Lost response');return Response.json({id:'cup'});}));
 const api=createApiServices('/remediation-api');const body={} as Parameters<typeof api.tournaments.update>[1];
 await expect(api.tournaments.update('cup',body)).rejects.toThrow('saxlanmış ola bilər');
 await expect(api.tournaments.update('cup',body)).resolves.toMatchObject({id:'cup'});
 expect(new Headers(calls[0].headers).get('Idempotency-Key')).toBeTruthy();expect(new Headers(calls[0].headers).get('Idempotency-Key')).toBe(new Headers(calls[1].headers).get('Idempotency-Key'));
});
