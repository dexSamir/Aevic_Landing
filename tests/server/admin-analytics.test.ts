import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { execFileSync } from 'node:child_process';
import analyticsRoutes, { readAdminAnalytics } from '../../server/platform/admin-analytics';
import type { Env } from '../../server/types';
import type { PlatformRepository, Actor } from '../../server/platform/repository';
import { ServiceError } from '../../server/errors';

function appFor(actor: Actor, sql = vi.fn().mockResolvedValue([{analytics:{}}])) {
  const app=new Hono<Env>();
  app.use('*',async(c,next)=>{c.set('platform',{actor,sql} as unknown as PlatformRepository);await next();});
  app.route('/',analyticsRoutes);
  app.onError((e,c)=>c.json({code:e instanceof ServiceError?e.code:'VALIDATION_ERROR'},e instanceof ServiceError?e.status:400));
  return {app,sql};
}
it('authorizes on the server before executing any analytics query',async()=>{
  for(const [actor,status] of [[{},401],[{teamId:'1'},403]] as const){const {app,sql}=appFor(actor);expect((await app.request('/admin/analytics')).status).toBe(status);expect(sql).not.toHaveBeenCalled();}
  const {app,sql}=appFor({adminId:'admin',role:'support-moderator'});
  const response=await app.request('/admin/analytics?range=7');
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(sql).toHaveBeenCalledTimes(1);
});
it('rejects unsupported ranges without executing SQL',async()=>{const {app,sql}=appFor({adminId:'admin'});expect((await app.request('/admin/analytics?range=10000')).status).toBe(400);expect(sql).not.toHaveBeenCalled();});

// Explicit opt-in. Creates a disposable database on the existing local-only QA server.
// No environment database URL, migration, policy, or production connection is used.
describe.skipIf(!process.env.AEVIC_ANALYTICS_LOCAL)('analytics against isolated PostgreSQL',()=>{
  const database=`aevic_analytics_${process.pid}`;
  const sql=postgres({host:'/tmp',port:55432,database,max:1,prepare:false,onnotice:()=>{}});
  const command=(name:string,args:string[])=>execFileSync(`/opt/homebrew/opt/postgresql@18/bin/${name}`,['-h','/tmp','-p','55432',...args],{stdio:'pipe'});
  beforeAll(async()=>{
    command('createdb',[database]);
    await sql.unsafe(`create schema aevic; create schema aevic_platform;
      create table public.teams(id bigint primary key,team_name text,status text,created_at timestamptz);
      create table aevic.tournaments(id uuid primary key,name text,status text,starts_at timestamptz,updated_at timestamptz,max_slots int,archived_at timestamptz,created_at timestamptz);
      create table aevic.matches(id uuid primary key,tournament_id uuid,status text,published_at timestamptz);
      create table aevic_platform.tournament_registrations(id uuid primary key,tournament_id uuid,team_id bigint,status text,created_at timestamptz);
      create table aevic_platform.team_match_results(id uuid primary key,match_id uuid,published boolean);
      create table aevic_platform.verification_requests(status text);
      create table aevic_platform.roster_change_requests(status text);
      create table aevic_platform.audit_events(id uuid primary key,entity_id text,entity_type text,action text,actor_id text,metadata jsonb,created_at timestamptz);`);
  });
  afterAll(async()=>{await sql.end();command('dropdb',['--force',database]);});
  it('handles a genuinely empty database with zero-filled Baku calendar days',async()=>{
    const result=await readAdminAnalytics(sql,'7');
    expect(result.series).toHaveLength(7);expect(result.totals.teams).toBe(0);expect(result.period.uniqueTeams).toBe(0);expect(result.lifecycle).toEqual([]);expect(result.upcoming).toEqual([]);expect(result.approvals).toEqual([]);
  });
  it('counts teams once, distinguishes participations, excludes unpublished results and honors date boundaries',async()=>{
    await sql.unsafe(`
      insert into public.teams values (1,'First','approved',now()-interval '1 day'),(2,'Second','pending',now()-interval '50 days');
      insert into aevic.tournaments values
        ('11111111-1111-4111-8111-111111111111','Recent','registration-open',now()+interval '2 days',now(),20,null,now()-interval '1 day'),
        ('22222222-2222-4222-8222-222222222222','Older','completed',now()-interval '20 days',now(),20,null,now()-interval '50 days'),
        ('33333333-3333-4333-8333-333333333333','Ongoing','ongoing',now()-interval '1 day',now(),20,null,now()-interval '10 days');
      insert into aevic_platform.tournament_registrations values
        ('11111111-aaaa-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',1,'pending',now()-interval '1 day'),
        ('22222222-aaaa-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',1,'confirmed',now()-interval '2 days'),
        ('33333333-aaaa-4333-8333-333333333333','33333333-3333-4333-8333-333333333333',2,'rejected',now()-interval '50 days');
      insert into aevic.matches values
        ('aaaaaaaa-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','completed',now()-interval '1 day'),
        ('bbbbbbbb-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','scheduled',null);
      insert into aevic_platform.team_match_results values
        ('aaaaaaaa-aaaa-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111',true),
        ('bbbbbbbb-bbbb-4222-8222-222222222222','bbbbbbbb-2222-4222-8222-222222222222',true);
      insert into aevic_platform.verification_requests values ('PENDING'),('APPROVED');
      insert into aevic_platform.roster_change_requests values ('under-review'),('approved');
      insert into aevic_platform.audit_events values
        ('aaaaaaaa-bbbb-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','tournament','tournament.update','admin:1','{"status":"completed","secret":"must not escape"}',now()-interval '1 day');
    `);
    const result=await readAdminAnalytics(sql,'7');
    expect(result.totals).toMatchObject({tournaments:3,completed:1,active:2,teams:2,registrations:3,playedRounds:1,publishedResults:1,pendingApprovals:4,pendingTeams:1,pendingRegistrations:1,pendingVerifications:1,pendingRosters:1});
    expect(result.period).toMatchObject({tournaments:1,completions:1,teams:1,registrations:2,uniqueTeams:1,publishedRounds:1,publishedResults:1});
    expect(result.series.reduce((sum,p)=>sum+p.registrations,0)).toBe(2);
    expect(result.upcoming).toHaveLength(1);expect(result.attention).toHaveLength(1);expect(result.completed).toHaveLength(1);expect(result.approvals).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('must not escape');expect(result.activity[0].href).toBe('/admin/tournaments/22222222-2222-4222-8222-222222222222');
    const all=await readAdminAnalytics(sql,'all');expect(all.period.registrations).toBe(3);expect(all.period.uniqueTeams).toBe(2);expect(all.granularity).toBe('month');
    const weekly=await readAdminAnalytics(sql,'90');expect(weekly.granularity).toBe('week');expect(weekly.series.length).toBeLessThanOrEqual(14);
  });
  it('uses inclusive local midnight and excludes future activity',async()=>{
    await sql.unsafe(`insert into public.teams values
      (3,'Boundary','approved',(date_trunc('day',now() at time zone 'Asia/Baku')-interval '6 days') at time zone 'Asia/Baku'),
      (4,'Before boundary','approved',((date_trunc('day',now() at time zone 'Asia/Baku')-interval '6 days') at time zone 'Asia/Baku')-interval '1 millisecond'),
      (5,'Future','approved',now()+interval '1 day');`);
    const result=await readAdminAnalytics(sql,'7');expect(result.totals.teams).toBe(5);expect(result.period.teams).toBe(2);expect(result.series[0].teams).toBe(1);
  });
});
