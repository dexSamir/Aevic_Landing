import { beforeEach, expect, it, vi } from 'vitest';
import { createHttpApp } from '../../server/http';
import routes from '../../server/routes/public';
import { invalidatePublicTags } from '../../server/platform/public-cache';
const config={supabaseUrl:'http://127.0.0.1:54321',publishableKey:'fixture',siteUrl:'http://localhost:8888',secureCookies:false};
const pool={};
const load=vi.fn(async(id:string)=>({team:{id},recentMatches:[],form:[],mapSpecialization:{metrics:[]}}));
const tournament=vi.fn(async(id:string)=>({id,maxSlots:16}));
const app=createHttpApp(config);
app.use('*',async(c,next)=>{c.set('platform',{sql:pool,profile:load,tournament} as any);await next();});app.route('/',routes);
beforeEach(()=>{invalidatePublicTags(pool,['profiles','competition']);load.mockClear();tournament.mockClear();});
it('shares a cold profile across simultaneous HTTP requests and derived subresources, then reuses it warm',async()=>{
 const paths=['/public/teams/16','/public/teams/16/form','/public/teams/16/map-specialization','/public/teams/16/map-performance'];
 const responses=await Promise.all(Array.from({length:50},(_,i)=>app.request('/api'+paths[i%paths.length])));
 expect(responses.every(r=>r.status===200)).toBe(true);expect(load).toHaveBeenCalledTimes(1);
 for(const path of paths)expect((await app.request('/api'+path)).status).toBe(200);
 expect(load).toHaveBeenCalledTimes(1);
 console.info('Public detail benchmark: 50 concurrent HTTP reads + 4 warm reads; 1 repository profile load. No production DB timing inferred.');
});
it('keeps unrelated tournament and profile reads warm after a team mutation',async()=>{
 await app.request('/api/public/teams/16');await app.request('/api/public/teams/17');await app.request('/api/tournaments/1');
 invalidatePublicTags(pool,['team:16','teams']);
 await app.request('/api/public/teams/16');await app.request('/api/public/teams/17');await app.request('/api/tournaments/1');
 expect(load.mock.calls.map(([id])=>id)).toEqual(['16','17','16']);expect(tournament).toHaveBeenCalledTimes(1);
});
it('does not cache failed loads and can recover on the next request',async()=>{
 load.mockRejectedValueOnce(Error('temporary outage'));
 expect((await app.request('/api/public/teams/16')).status).toBe(500);
 expect((await app.request('/api/public/teams/16')).status).toBe(200);expect(load).toHaveBeenCalledTimes(2);
});
