import {afterEach,expect,it,vi} from 'vitest';
import {createApiServices} from '../src/services/apiAdapter';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('allows a slow captain login beyond ten seconds without sending a duplicate',async()=>{
 vi.useFakeTimers();
 const fetcher=vi.fn((_url:string,options:RequestInit)=>new Promise<Response>((resolve,reject)=>{
  const timer=setTimeout(()=>resolve(new Response(JSON.stringify({role:'captain'}),{headers:{'content-type':'application/json'}})),15000);
  options.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));});
 }));vi.stubGlobal('fetch',fetcher);
 const result=createApiServices('/api').auth.login('fixture@example.invalid','Fixture42');
 await vi.advanceTimersByTimeAsync(15000);
 await expect(result).resolves.toMatchObject({role:'captain'});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('still terminates a stalled login at thirty seconds',async()=>{
 vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn((_url:string,options:RequestInit)=>new Promise((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))));
 const result=expect(createApiServices('/api').auth.login('fixture@example.invalid','Fixture42')).rejects.toMatchObject({kind:'timeout'});
 await vi.advanceTimersByTimeAsync(30000);await result;
});
