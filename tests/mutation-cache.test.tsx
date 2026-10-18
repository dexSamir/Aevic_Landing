import {render,screen,act,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {clearQueryCache,usePlatformQuery} from '../src/services/queryCache';
import {invalidateMutation} from '../src/services/mutationInvalidation';
import {ApiError} from '../src/services/apiError';
beforeEach(()=>clearQueryCache('all'));
function Probe({id,read}:{id:string;read:()=>Promise<string>}) {const q=usePlatformQuery({key:id,scope:'public',query:read,retry:0});return <span>{q.data??'empty'}{q.error?'failed':''}</span>;}
it('support mutations leave public reads warm; tournament writes refresh only the affected tournament',async()=>{
 const first=vi.fn(async()=>'cup one'),second=vi.fn(async()=>'cup two');render(<><Probe id="tournament:one:standings" read={first}/><Probe id="tournament:two:standings" read={second}/></>);
 await screen.findByText('cup one');await screen.findByText('cup two');
 act(()=>invalidateMutation('/me/support/tickets/1'));expect(first).toHaveBeenCalledTimes(1);expect(second).toHaveBeenCalledTimes(1);
 act(()=>invalidateMutation('/admin/tournaments/one'));await waitFor(()=>expect(first).toHaveBeenCalledTimes(2));expect(second).toHaveBeenCalledTimes(1);
});
it('confirmed public denial removes previously cached content',async()=>{
 const read=vi.fn().mockResolvedValueOnce('visible').mockRejectedValueOnce(new ApiError({status:403,kind:'forbidden'}));render(<Probe id="profile:one" read={read}/>);await screen.findByText('visible');
 act(()=>invalidateMutation('/teams/one'));await screen.findByText('emptyfailed');expect(screen.queryByText('visible')).toBeNull();
});

it('team writes invalidate the matching slug, leaving other profiles warm',async()=>{
 const first=vi.fn(async()=>({team:{id:'1'},name:'first'})),second=vi.fn(async()=>({team:{id:'2'},name:'second'}));
 function Profiles(){const a=usePlatformQuery({key:'profile:alpha',scope:'public',query:first});const b=usePlatformQuery({key:'profile:beta',scope:'public',query:second});return <p>{a.data?.name} {b.data?.name}</p>;}
 render(<Profiles/>);await screen.findByText('first second');act(()=>invalidateMutation('/teams/1'));await waitFor(()=>expect(first).toHaveBeenCalledTimes(2));expect(second).toHaveBeenCalledTimes(1);
});
