import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import publicRoutes from '../../server/routes/public';
import type { Env } from '../../server/types';
import type { PlatformRepository } from '../../server/platform/repository';

describe('public search discovery', () => {
 it('groups real public team, roster, tournament and organization identities', async () => {
  let reads=0;
  const repository={
   teams:async()=>{reads++;return [{id:'7',slug:'7',name:'Caspian',roster:[{id:'7:player1',ign:'Caspian player'}]}];},
   tournaments:async()=>[{id:'cup',name:'Caspian cup'}],
   rows:async(table:string)=>table==='organizations'?[{id:'org',slug:'caspian',name:'Caspian organization',short_name:'CSP',description:'',country:'AZ'}]:[],
  };
  const app=new Hono<Env>();
  app.use('*',async(c,next)=>{c.set('platform',repository as unknown as PlatformRepository);await next();});
  app.route('/',publicRoutes);
  expect(await(await app.request('/search?q=a')).json()).toEqual({query:'a',groups:{}});
  expect(reads).toBe(0);
  const result=await(await app.request('/search?q=Caspian')).json();
  expect(Object.keys(result.groups)).toEqual(['team','player','tournament','organization']);
  expect(result.groups.player[0]).toMatchObject({title:'Caspian player',href:'/teams/7'});
  expect(result.groups.organization[0].href).toBe('/organizations/caspian');
 });
});
