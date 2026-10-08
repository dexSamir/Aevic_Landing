import { expect, it, vi } from 'vitest';
import type { Sql } from 'postgres';
import type { DbClient } from '../../server/db';
import { createHttpApp } from '../../server/http';
import routes from '../../server/platform/routes';
import { PlatformRepository, type Actor } from '../../server/platform/repository';
import { workspaceRequest } from '../../server/platform/workspace';
const tournament='dac5d52c-817b-50cb-a65f-68a9307c3191';
const config={supabaseUrl:'https://nmjjibifcuzjlsvfcaaz.supabase.co',publishableKey:'fixture',siteUrl:'https://fixture.test',secureCookies:true};
function setup(actor:Actor={},registered=true,results=true){
 const sql=vi.fn(async(..._args:unknown[])=>registered?[{id:'registration'}]:[]);
 const repository=new PlatformRepository({} as DbClient,sql as unknown as Sql,actor);
 const standings=vi.spyOn(repository,'tournamentStandings').mockResolvedValue(results?[{teamId:'16',tournamentId:tournament,placement:1,matches:1,wwcd:1,finishes:5,placementPoints:10,finishPoints:5,penalties:0,totalPoints:15},{teamId:'10',tournamentId:tournament,placement:2,matches:1,wwcd:0,finishes:2,placementPoints:6,finishPoints:2,penalties:0,totalPoints:8}]:[]);
 const app=createHttpApp(config,{});app.use('*',async(c,next)=>{c.set('platform',repository);await next();});app.route('/',routes);
 return {app,sql,standings};
}
it.each([{}, {accountId:'viewer'}, {adminId:'admin'}])('denies guests/spectators without a team workspace: %j',async actor=>{
 const {app,sql}=setup(actor);const response=await app.request(`/api/team/tournaments/${tournament}/result-export`);
 expect([401,403]).toContain(response.status);expect(sql).not.toHaveBeenCalled();
});
it('returns only the verified workspace result and ignores a forged team selector',async()=>{
 const {app,sql}=setup({accountId:'7',teamId:'16',teamRole:'MANAGER'});
 const response=await app.request(`/api/team/tournaments/${tournament}/result-export?teamId=10`);
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({teamId:'16',result:{teamId:'16',totalPoints:15}});
 expect(sql.mock.calls[0].slice(1)).toEqual([tournament,'16']);
 const query=(sql.mock.calls[0][0] as unknown as TemplateStringsArray).join('?');
 expect(query).toContain("r.status='confirmed'");expect(query).toContain('t.archived_at is null');
 expect(workspaceRequest(`/api/team/tournaments/${tournament}/result-export`)).toBe(true);
});
it('denies nonparticipants without loading results',async()=>{
 const {app,standings}=setup({teamId:'16'},false);
 expect(await (await app.request(`/api/team/tournaments/${tournament}/result-export`)).json()).toEqual({teamId:'16',reason:'not-participant'});
 expect(standings).not.toHaveBeenCalled();
});
it('distinguishes no published result and propagates service failures',async()=>{
 const {app,sql}=setup({teamId:'16'},true,false);
 expect(await (await app.request(`/api/team/tournaments/${tournament}/result-export`)).json()).toEqual({teamId:'16',reason:'no-result'});
 sql.mockRejectedValueOnce(Object.assign(new Error('private upstream details'),{code:'XX000'}));
 const response=await app.request(`/api/team/tournaments/${tournament}/result-export`);
 expect(response.status).toBe(503);expect(await response.text()).not.toContain('private upstream');
});
