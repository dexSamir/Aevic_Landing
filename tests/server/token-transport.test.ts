import {afterEach,expect,it,vi} from 'vitest';
import {createTokenTransport} from '../../src/services/tokenSession';
import {accessIdentity,signAccess} from '../../server/auth/platform-tokens';
afterEach(()=>vi.unstubAllGlobals());
const envelope=()=>({sessionMode:'tokens',accessToken:'fixture-memory-token',accessExpiresAt:Date.now()+600000});
it('validates access signatures, expiry, audience version and future lifetime',()=>{
 const id='11111111-1111-4111-8111-111111111111',key='fixture-key';const value=signAccess(id,key,1000000000000);
 expect(accessIdentity(value.accessToken,key,1000000000001)).toBe(id);
 for(const [token,secret,now] of [[value.accessToken+'x',key,1000000000001],[value.accessToken,'wrong',1000000000001],[value.accessToken,key,1000000600000],[value.accessToken,key,999999000000]] as const)expect(()=>accessIdentity(token,secret,now)).toThrow();
});
it('restores once for concurrent requests, attaches only memory access and includes cookies',async()=>{
 const fetcher=vi.fn(async(url:string,options:RequestInit)=>url.endsWith('/auth/refresh')?Response.json(envelope()):Response.json({authorization:new Headers(options.headers).get('authorization')}));vi.stubGlobal('fetch',fetcher);
 const transport=createTokenTransport('/api');
 const results=await Promise.all([transport.request('/me/account'),transport.request('/me/sessions')]);
 expect(fetcher.mock.calls.filter(([url])=>url.endsWith('/auth/refresh'))).toHaveLength(1);
 expect(results).toEqual([{authorization:'Bearer fixture-memory-token'},{authorization:'Bearer fixture-memory-token'}]);
 expect(fetcher.mock.calls.every(([,options])=>options.credentials==='include')).toBe(true);
});
it('refreshes and replays an expired GET once',async()=>{
 let reads=0,rotations=0;vi.stubGlobal('fetch',vi.fn(async(url:string)=>{if(url.endsWith('/auth/refresh')){rotations++;return Response.json(envelope());}reads++;return reads===1?Response.json({code:'ACCESS_EXPIRED'},{status:401}):Response.json({ok:true});}));
 expect(await createTokenTransport('/api').request('/me/account')).toEqual({ok:true});expect(reads).toBe(2);expect(rotations).toBe(2);
});
it.each(['POST','PUT','PATCH','DELETE'])('never replays an expired %s',async method=>{
 let writes=0;vi.stubGlobal('fetch',vi.fn(async(url:string)=>{if(url.endsWith('/auth/refresh'))return Response.json(envelope());writes++;return Response.json({code:'ACCESS_EXPIRED'},{status:401});}));
 await expect(createTokenTransport('/api').request('/me/account',{method})).rejects.toMatchObject({code:'ACCESS_EXPIRED'});expect(writes).toBe(1);
});
it('bounds simultaneous refresh conflicts and never loops on an expired refresh cookie',async()=>{
 const busy=vi.fn(async()=>Response.json({code:'REFRESH_BUSY'},{status:409}));vi.stubGlobal('fetch',busy);
 await expect(createTokenTransport('/api').request('/me/account')).rejects.toMatchObject({code:'REFRESH_BUSY'});expect(busy).toHaveBeenCalledTimes(3);
 const denied=vi.fn(async()=>Response.json({code:'UNAUTHORIZED'},{status:401}));vi.stubGlobal('fetch',denied);
 await expect(createTokenTransport('/api').request('/me/session',{},[401])).resolves.toBeUndefined();expect(denied).toHaveBeenCalledTimes(2);
});

it('does not send an already cancelled mutation or leak credentials on public protocol errors',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const controller=new AbortController();controller.abort();
 await expect(createTokenTransport('/api').request('/media/uploads',{method:'POST',signal:controller.signal})).rejects.toMatchObject({kind:'abort'});expect(fetcher).not.toHaveBeenCalled();
});
