import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createApiServices} from '../src/services/apiAdapter';
import {createServiceCapabilities} from '../src/services/capabilities';
import {clearQueryCache,usePlatformQuery} from '../src/services/queryCache';
import {render,screen,waitFor} from '@testing-library/react';
const api=createApiServices('/api');
afterEach(()=>{vi.unstubAllGlobals();clearQueryCache('all');});
describe('API-only application contract',()=>{
 it('has no application fixture dependency or source selector',()=>{
  const visit=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?visit(join(dir,entry.name)):/\.(ts|tsx)$/.test(entry.name)?[join(dir,entry.name)]:[]);
  for(const file of visit('src')){const source=readFileSync(file,'utf8');expect(source).not.toMatch(/VITE_DATA_SOURCE|VITE_DEMO_MODE|mockPreview|mockAdapter|src\/mocks/);expect(source).not.toMatch(/(?:from\s*|import\()['"][^'"]*(?:tests\/fixtures|mocks\/)/);}
  expect(existsSync('src/services/mockAdapter.ts')).toBe(false);expect(createServiceCapabilities()).not.toHaveProperty('mockPreview');
 });
 it('preserves backend failures instead of returning fixture records',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{"code":"SERVICE_UNAVAILABLE"}',{status:503,headers:{'Content-Type':'application/json'}})));
  await expect(api.tournaments.list()).rejects.toMatchObject({status:503});await expect(api.snapshots.public()).rejects.toMatchObject({status:503});
 });
 it('refreshes mounted dependent data after an acknowledged mutation',async()=>{
  let revision=0;vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{if(init.method==='PATCH'){revision++;return new Response('{}',{headers:{'Content-Type':'application/json'}});}return new Response(JSON.stringify([{id:'entry',revision}]),{headers:{'Content-Type':'application/json'}});}));
  function View(){const q=usePlatformQuery({key:'tournament:test',query:()=>api.tournaments.entries('test')});return <div>{q.data?JSON.stringify(q.data):'loading'}</div>;}
  render(<View/>);await screen.findByText(/"revision":0/);await api.teams.setApproval('team','approved');await waitFor(()=>expect(screen.getByText(/"revision":1/)).toBeInTheDocument());
 });
 it('sends a coordinated tournament update with cookies and version',async()=>{
  const fetch=vi.fn(async()=>new Response('{}',{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetch);
  await api.tournaments.update('cup',{expectedUpdatedAt:'2026-01-01T00:00:00Z'} as never);expect(fetch).toHaveBeenCalledWith('/api/admin/tournaments/cup',expect.objectContaining({method:'PATCH',credentials:'include',body:JSON.stringify({expectedUpdatedAt:'2026-01-01T00:00:00Z'})}));
 });
});
