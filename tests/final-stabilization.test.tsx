import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ApiError, apiErrorFromResponse, apiErrorKind, retryAfterMilliseconds } from '../src/services/apiError';
import { queryRetryDelay, runReadQuery } from '../src/services/queryRetry';
import { loadPublicPlatformSnapshot } from '../netlify/functions/_shared/publicContext';
import publicContext from '../netlify/functions/public-context';
import { act, renderHook } from '@testing-library/react';
import { clearQueryCache, usePlatformQuery } from '../src/services/queryCache';

afterEach(() => { clearQueryCache('all'); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('bounded read retries', () => {
  it('keeps manual retry disabled until the server cooldown expires', async () => {
    vi.useFakeTimers(); const query=vi.fn().mockRejectedValueOnce(new ApiError({status:429,kind:'rate-limit',retryAfterMs:3000})).mockResolvedValue('ready');
    const hook=renderHook(()=>usePlatformQuery({key:'cooldown-test',query}));
    await act(async()=>{await vi.advanceTimersByTimeAsync(0);}); expect(hook.result.current.retryAfterSeconds).toBe(3);
    act(()=>hook.result.current.refetch()); expect(query).toHaveBeenCalledTimes(1);
    await act(async()=>{await vi.advanceTimersByTimeAsync(3000);}); expect(hook.result.current.retryAfterSeconds).toBe(0);
    await act(async()=>{hook.result.current.refetch();}); expect(query).toHaveBeenCalledTimes(2); expect(hook.result.current.data).toBe('ready'); hook.unmount();
  });
  it.each([400,401,403,404,409,422])('does not retry deterministic HTTP %i', async status => {
    const query=vi.fn().mockRejectedValue(new ApiError({status,kind:apiErrorKind(status)}));
    await expect(runReadQuery(query,new AbortController().signal)).rejects.toMatchObject({status});
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each([408,429,500,502,503,504])('backs off and retries HTTP %i only once by default', async status => {
    vi.useFakeTimers(); const query=vi.fn().mockRejectedValueOnce(new ApiError({status,kind:apiErrorKind(status)})).mockResolvedValue('ready');
    const pending=runReadQuery(query,new AbortController().signal);
    await vi.advanceTimersByTimeAsync(299); expect(query).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync(); await expect(pending).resolves.toBe('ready'); expect(query).toHaveBeenCalledTimes(2);
  });
  it('caps excessive retries and stops on cancellation during backoff', async () => {
    vi.useFakeTimers(); const controller=new AbortController();
    const query=vi.fn().mockRejectedValue(new ApiError({status:0,kind:'network'}));
    const pending=runReadQuery(query,controller.signal,100); const rejected=expect(pending).rejects.toMatchObject({kind:'abort'});
    await vi.advanceTimersByTimeAsync(10); controller.abort(); await rejected; await vi.runAllTimersAsync(); expect(query).toHaveBeenCalledTimes(1);
    const capped=runReadQuery(query,new AbortController().signal,100); const exhausted=expect(capped).rejects.toMatchObject({kind:'network'});
    await vi.runAllTimersAsync(); await exhausted; expect(query).toHaveBeenCalledTimes(4);
  });
  it('honors short Retry-After, yields long cooldowns to manual retry, and rejects malformed successes', async () => {
    expect(retryAfterMilliseconds('1')).toBe(1000); expect(retryAfterMilliseconds('invalid')).toBeUndefined();
    expect(retryAfterMilliseconds('Thu, 01 Jan 1970 00:00:02 GMT',1000)).toBe(1000);
    expect(queryRetryDelay(new ApiError({status:429,kind:'rate-limit',retryAfterMs:1000}),0,()=>0)).toBe(1000);
    expect(queryRetryDelay(new ApiError({status:429,kind:'rate-limit',retryAfterMs:5000}),0)).toBeUndefined();
    expect(queryRetryDelay(new ApiError({status:200,kind:'server',code:'SNAPSHOT_INVALID'}),0)).toBeUndefined();
    const error=await apiErrorFromResponse(new Response('{}',{status:502,headers:{'content-type':'application/json','x-retryable':'false','retry-after':'1'}}));
    expect(error.retryable).toBe(false); expect(error.retryAfterMs).toBe(1000);
  });
});
describe('public API diagnostics and finite abort', () => {
  const environment={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only'};
  it('times out both the fetch and body-read without leaking internals', async () => {
    vi.useFakeTimers();
    const fetcher=vi.fn((_input: unknown,init?: RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))));
    const pending=loadPublicPlatformSnapshot({environment,fetcher,timeoutMs:25});
    const rejected=expect(pending).rejects.toMatchObject({status:504,code:'SUPABASE_TIMEOUT',retryable:true});
    await vi.advanceTimersByTimeAsync(26); await rejected;
    const bodyFetcher=vi.fn(async (_input: unknown,init?: RequestInit)=>({ok:true,headers:new Headers({'content-type':'application/json'}),json:()=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))} as Response));
    const body=loadPublicPlatformSnapshot({environment,fetcher:bodyFetcher,timeoutMs:25});
    const bodyRejected=expect(body).rejects.toMatchObject({status:504,code:'SUPABASE_TIMEOUT'});
    await vi.advanceTimersByTimeAsync(26); await bodyRejected;
  });
  it.each([401,403,404,503])('keeps upstream %i sanitized and exposes retry classification', async upstream => {
    Object.entries(environment).forEach(([key,value])=>vi.stubEnv(key,value));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"private":"do not expose"}',{status:upstream,headers:{'retry-after':'1'}})));
    vi.spyOn(console,'error').mockImplementation(()=>{});
    const response=await publicContext(new Request('http://localhost/api/public/context',{headers:{'x-request-id':'stabilization-test'}}));
    expect(response.status).toBe(502); expect(response.headers.get('x-request-id')).toBe('stabilization-test');
    expect(response.headers.get('server-timing')).toMatch(/public-context;dur=\d/);
    expect(response.headers.get('x-retryable')).toBe(String(upstream>=500));
    expect(await response.text()).not.toContain('do not expose');
  });
});
describe('explicit style ownership', () => {
  it('requires both schedule consumers to import the owner, never another route', () => {
    for(const name of ['TournamentCalendar','TournamentJoinAction']) expect(readFileSync(`src/components/competition/${name}.tsx`,'utf8')).toContain("import './competition-schedule.css'");
    for(const name of ['public-pages','components']) expect(readFileSync(`src/styles/${name}.css`,'utf8')).not.toMatch(/\.tournament-calendar(?:\s|__|\s*\{)/);
    for(const name of ['primitives','FileUpload']) expect(readFileSync(`src/components/common/${name}.tsx`,'utf8')).toContain("import '../../styles/components.css'");
  });
});
