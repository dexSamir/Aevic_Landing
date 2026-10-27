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

it('retains access credentials across a refresh outage and recovers without logging in again',async()=>{
 let rotations=0,reads=0;
 const authorization:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
  if(url.endsWith('/auth/refresh')){rotations++;return rotations===2?Response.json({code:'SERVICE_UNAVAILABLE'},{status:503}):Response.json(envelope());}
  reads++;authorization.push(new Headers(options.headers).get('authorization')??'');
  return reads<=2?Response.json({code:'ACCESS_EXPIRED'},{status:401}):Response.json({ok:true});
 }));
 const transport=createTokenTransport('/api');
 await expect(transport.request('/me/session')).rejects.toMatchObject({status:503});
 await expect(transport.request('/me/session')).resolves.toEqual({ok:true});
 expect(rotations).toBe(3);expect(authorization).toEqual(Array(3).fill('Bearer fixture-memory-token'));
 transport.dispose();
});
it('omits cookies and bearer tokens on anonymous public reads without affecting private authorization',async()=>{
 const fetcher=vi.fn(async(url:string,options:RequestInit)=>url.endsWith('/auth/refresh')?Response.json(envelope()):Response.json({authorization:new Headers(options.headers).get('authorization'),credentials:options.credentials}));
 vi.stubGlobal('fetch',fetcher);const transport=createTokenTransport('/api');
 await transport.request('/me/account');
 for(const path of ['/public/context','/public/teams/16','/tournaments/1/slots','/teams/16/wrapped?year=2026'])expect(await transport.request(path)).toEqual({authorization:null,credentials:'omit'});
 expect(await transport.request('/me/sessions')).toEqual({authorization:'Bearer fixture-memory-token',credentials:'include'});
 expect(fetcher.mock.calls.filter(([url])=>url.endsWith('/auth/refresh'))).toHaveLength(1);
 transport.dispose();
});
it('keeps the current in-memory token after an authenticated password change',async()=>{
 let refreshes=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
  if(url.endsWith('/auth/refresh')){refreshes++;return Response.json(envelope());}
  if(url.endsWith('/me/account/password'))return new Response(null,{status:204});
  return Response.json({authorization:new Headers(options.headers).get('authorization')});
 }));
 const transport=createTokenTransport('/api');
 await transport.request('/me/account');
 await transport.request('/me/account/password',{method:'PUT'});
 expect(await transport.request('/me/account')).toEqual({authorization:'Bearer fixture-memory-token'});
 expect(refreshes).toBe(1);transport.dispose();
});
