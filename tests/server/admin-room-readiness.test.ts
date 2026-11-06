import { expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import routes from '../../server/platform/routes';
import type { Actor, PlatformRepository } from '../../server/platform/repository';
import type { Env } from '../../server/types';
import { ServiceError } from '../../server/errors';
function appFor(actor:Actor){const sql=vi.fn().mockResolvedValue([{id:'round',ready:true,room_id:'must-not-leak',password:'must-not-leak'}]);const app=new Hono<Env>();app.use('*',async(c,next)=>{c.set('platform',{actor,sql} as unknown as PlatformRepository);await next();});app.route('/',routes);app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'VALIDATION_ERROR'},e instanceof ServiceError?e.status:400));return {app,sql};}
const path='/admin/tournaments/11111111-1111-4111-8111-111111111111/room-readiness';
it('denies room readiness to team accounts and unrelated admin roles before querying',async()=>{for(const actor of [{teamId:'1'},{adminId:'1',role:'support-moderator'}]){const {app,sql}=appFor(actor);expect((await app.request(path)).status).toBe(403);expect(sql).not.toHaveBeenCalled();}});
it('returns only readiness, scopes by tournament, and never returns credentials',async()=>{const {app,sql}=appFor({adminId:'1',role:'tournament-manager'});const response=await app.request(path);expect(response.status).toBe(200);expect(await response.json()).toEqual([{id:'round',ready:true}]);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(sql).toHaveBeenCalledTimes(1);expect(sql.mock.calls[0][1]).toBe('11111111-1111-4111-8111-111111111111');});
