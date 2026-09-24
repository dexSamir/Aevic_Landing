import {StrictMode} from 'react';
import {act,render,screen,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {clearQueryCache,synchronizeSessionCache,usePlatformQuery} from '../src/services/queryCache';
import {LoadingSkeleton} from '../src/components/common/LoadingSkeleton';
import {ApiError} from '../src/services/apiError';
const deferred=()=>{let resolve!:(v:string)=>void, reject!:(e:unknown)=>void;const promise=new Promise<string>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function Probe({query,id='example',scope='public'}:{query:(signal:AbortSignal)=>Promise<string>;id?:string;scope?:'public'|'private'}) {
 const state=usePlatformQuery({key:id,scope,query,retry:0,staleTime:60000});
 return <>{state.loading?<LoadingSkeleton variant="cards" rows={2}/>:<p>{state.data??'empty'}</p>}{state.refreshing&&<span>refreshing</span>}{state.error&&<span>failed</span>}<button onClick={state.refetch}>refresh</button></>;
}
beforeEach(()=>clearQueryCache('all'));
afterEach(()=>{cleanup();clearQueryCache('all');});
it('shares a real pending read across StrictMode and simultaneous consumers',async()=>{
 const d=deferred(),query=vi.fn(()=>d.promise);
 render(<StrictMode><Probe query={query}/><Probe query={query}/></StrictMode>);
 expect(screen.getAllByRole('status')).toHaveLength(2);
 await waitFor(()=>expect(query).toHaveBeenCalledTimes(1));
 await act(async()=>d.resolve('real team'));
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
 expect(screen.getAllByText('real team')).toHaveLength(2);
});
it('uses warm cache immediately on back navigation without a loading flash or new read',async()=>{
 const query=vi.fn(async()=>'cached team');
 const first=render(<Probe query={query}/>);await screen.findByText('cached team');first.unmount();
 render(<Probe query={query}/>);
 expect(screen.getByText('cached team')).toBeInTheDocument();expect(screen.queryByRole('status')).not.toBeInTheDocument();expect(query).toHaveBeenCalledTimes(1);
});
it('retains content throughout refresh and terminal background failure',async()=>{
 const d=deferred(),query=vi.fn().mockResolvedValueOnce('last good data').mockImplementationOnce(()=>d.promise);
 render(<Probe query={query}/>);await screen.findByText('last good data');
 act(()=>screen.getByText('refresh').click());await screen.findByText('refreshing');
 expect(screen.getByText('last good data')).toBeInTheDocument();expect(screen.queryByRole('status')).not.toBeInTheDocument();
 await act(async()=>d.reject(new Error('offline')));
 expect(screen.getByText('last good data')).toBeInTheDocument();expect(screen.getByText('failed')).toBeInTheDocument();expect(screen.queryByText('refreshing')).not.toBeInTheDocument();
});
it('ends cold loading on failure and retries on demand',async()=>{
 const query=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('recovered');
 render(<Probe query={query}/>);await screen.findByText('failed');expect(screen.queryByRole('status')).not.toBeInTheDocument();
 act(()=>screen.getByText('refresh').click());await screen.findByText('recovered');
});
it('hides old private data immediately when session identity changes',async()=>{
 synchronizeSessionCache('captain:16');const d=deferred();const query=vi.fn().mockResolvedValueOnce('team 16 only').mockImplementationOnce(()=>d.promise);
 render(<Probe scope="private" query={query}/>);await screen.findByText('team 16 only');
 act(()=>synchronizeSessionCache('captain:other'));
 expect(screen.queryByText('team 16 only')).not.toBeInTheDocument();expect(screen.getByRole('status')).toBeInTheDocument();
 await act(async()=>d.resolve('other team'));
});
it('does not retain private data after permission denial during refresh',async()=>{
 const query=vi.fn().mockResolvedValueOnce('private').mockRejectedValueOnce(new ApiError({status:403,kind:'http'}));
 render(<Probe scope="private" query={query}/>);await screen.findByText('private');act(()=>screen.getByText('refresh').click());await screen.findByText('failed');expect(screen.queryByText('private')).not.toBeInTheDocument();
});
it('never shows the previous route data while a new uncached key is loading',async()=>{
 const first=vi.fn(async()=>'first team'),next=deferred();const r=render(<Probe id="first" query={first}/>);await screen.findByText('first team');
 r.rerender(<Probe id="next" query={()=>next.promise}/>);expect(screen.queryByText('first team')).not.toBeInTheDocument();expect(screen.getByRole('status')).toBeInTheDocument();await act(async()=>next.resolve('next team'));
});
