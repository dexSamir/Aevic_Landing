import { act, cleanup, renderHook, waitFor, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { tournaments, currentTeam, matchHistory } from '../src/mocks/data';
import { selectActiveTournament, selectNextTournament, selectPrimaryCompetition, selectDisputeDeadline, selectCurrentRound } from '../src/utils/competitionSelectors';
import { IMAGE_UPLOAD_TYPES, EVIDENCE_UPLOAD_TYPES, validateUpload } from '../src/utils/fileValidation';
import { REGISTER_DRAFT_TTL, registrationDraftPayload, parseRegistrationDraft } from '../src/utils/registrationDraft';
import { clearQueryCache, synchronizeSessionCache, usePlatformQuery } from '../src/services/queryCache';
import { ApiError, apiErrorFromResponse } from '../src/services/apiError';
import { requestJson } from '../src/services/requestJson';
import { deriveTournamentResultBreakdown } from '../src/utils/resultBreakdown';
import { SharecardGenerator } from '../src/components/competition/SharecardGenerator';
import { deduplicateCompetitionEvents, type CompetitionAwarenessEvent } from '../src/components/team/CompetitionAwareness';
import type { TeamRegistrationDraft } from '../src/types/domain';

afterEach(() => { cleanup(); clearQueryCache('all'); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('central competition authority', () => {
  const base = tournaments[0];
  it('is independent of source array order', () => {
    for (const items of [tournaments, [...tournaments].reverse()]) {
      expect(selectPrimaryCompetition(items, new Date('2026-08-04T12:00:00+04:00'))?.id).toBe(base.id);
      expect(selectActiveTournament(items, new Date('2027-01-01'))).toBeUndefined();
      expect(selectPrimaryCompetition(items, new Date('2027-01-01'))?.id).not.toBeUndefined();
    }
  });
  it('chooses nearest future event, never an arbitrary first row', () => {
    const late = { ...base, id: 'later', startsAt: '2030-06-04', endsAt: '2030-06-05' };
    const early = { ...late, id: 'early', startsAt: '2030-06-02', endsAt: '2030-06-03' };
    expect(selectNextTournament([late, early], new Date('2030-06-01'))?.id).toBe('early');
    expect(selectPrimaryCompetition([], new Date())).toBeUndefined();
  });
  it.each([
    ['2026-08-04T08:00:00+04:00', false],
    ['2026-08-04T12:00:00+04:00', true],
    ['2026-08-04T20:20:00+04:00', true],
    ['2026-08-04T20:50:00+04:00', false],
    ['2026-08-04T21:20:00+04:00', true],
    ['2026-08-05T01:00:00+04:00', false],
  ])('respects clock %s', (at, active) => {
    expect(Boolean(selectActiveTournament([base], new Date(at)))).toBe(active);
  });
  it('does not select a round from another tournament or a stale live event', () => {
    const rounds = [{ id: 'other', tournamentId: 'other', stage: 'final' as const, day: 1, lobby: 'A', round: 1, map: 'Erangel', startsAt: base.startsAt, status: 'live' as const }];
    expect(selectCurrentRound(rounds, base, new Date(base.startsAt))).toBeUndefined();
    expect(selectCurrentRound([{ ...rounds[0], tournamentId: base.id }], base, new Date('2027-01-01'))).toBeUndefined();
  });
  it('requires a real publication clock or supplied deadline', () => {
    expect(selectDisputeDeadline({}, { disputeDurationMinutes: 30 })).toBeUndefined();
    expect(selectDisputeDeadline({ publishedAt: '2026-08-04T12:00:00Z' }, { disputeDurationMinutes: 30 })).toBe('2026-08-04T12:30:00.000Z');
    expect(selectDisputeDeadline({ disputeDeadlineAt: '2026-08-04T13:00:00Z' }, {})).toBe('2026-08-04T13:00:00Z');
  });
});

describe('file contract', () => {
  const options = { accept: IMAGE_UPLOAD_TYPES, maxBytes: 1024 };
  const png = () => new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'valid.png', { type: 'image/png' });
  it('accepts PNG signature and explicit PDF evidence', async () => {
    expect(await validateUpload([png()], options)).toBeUndefined();
    expect(await validateUpload([new File(['%PDF-1.7'], 'evidence.pdf', { type: 'application/pdf' })], { ...options, accept: EVIDENCE_UPLOAD_TYPES })).toBeUndefined();
  });
  it('rejects SVG, wrong extension/signature, empty, oversized, and multiple files', async () => {
    for (const files of [
      [new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' })],
      [new File(['not an image'], 'bad.png', { type: 'image/png' })],
      [new File(['%PDF-'], 'bad.png', { type: 'application/pdf' })],
      [new File([], 'empty.png', { type: 'image/png' })],
      [new File([new Uint8Array(1025)], 'big.png', { type: 'image/png' })],
      [png(), png()],
    ]) expect(await validateUpload(files, options)).toBeTruthy();
  });
  it('awaits custom domain validators', async () => {
    expect(await validateUpload([png()], { ...options, validators: [async () => 'Wrong dimensions'] })).toBe('Wrong dimensions');
  });
});

describe('registration draft privacy', () => {
  const draft = { teamName: 'Example', tag: 'EX', firstName: 'Test', lastName: 'User', phone: '', email: 'test@example.test', players: currentTeam.roster.map(({ ign, uid, role }) => ({ ign, uid, role })), password: 'not-a-real-password', extra: 'discard' } as TeamRegistrationDraft;
  it('projects only allowed fields and expires after one day', () => {
    const payload = registrationDraftPayload(draft, 2, 1000);
    const encoded = JSON.stringify(payload);
    expect(encoded).not.toContain('password'); expect(encoded).not.toContain('discard');
    expect(parseRegistrationDraft(encoded, 1001)?.step).toBe(2);
    expect(parseRegistrationDraft(encoded, 1001 + REGISTER_DRAFT_TTL)).toBeUndefined();
    expect(parseRegistrationDraft(encoded, 999)).toBeUndefined();
    expect(parseRegistrationDraft('{"version":1}', 1001)).toBeUndefined();
    expect(parseRegistrationDraft('broken', 1001)).toBeUndefined();
  });
});

describe('session cache isolation', () => {
  it('never renders A data after identity changes, while preserving public cache', async () => {
    synchronizeSessionCache('A:team');
    let owner = 'A';
    const query = vi.fn(async () => owner);
    const publicQuery = vi.fn(async () => 'public');
    const privateView = renderHook(() => usePlatformQuery({ key: 'account', query }));
    const publicView = renderHook(() => usePlatformQuery({ key: 'catalogue', scope: 'public', query: publicQuery }));
    await waitFor(() => expect(privateView.result.current.data).toBe('A'));
    await waitFor(() => expect(publicView.result.current.data).toBe('public'));
    owner = 'B';
    act(() => synchronizeSessionCache('B:admin'));
    expect(privateView.result.current.data).not.toBe('A');
    await waitFor(() => expect(privateView.result.current.data).toBe('B'));
    expect(publicView.result.current.data).toBe('public'); expect(publicQuery).toHaveBeenCalledTimes(1);
  });
  it('hides data synchronously when the resource key changes', async () => {
    const view = renderHook(({ id }) => usePlatformQuery({ key: id, query: async () => id }), { initialProps: { id: 'one' } });
    await waitFor(() => expect(view.result.current.data).toBe('one'));
    view.rerender({ id: 'two' });
    expect(view.result.current.data).not.toBe('one');
    await waitFor(() => expect(view.result.current.data).toBe('two'));
  });
  it('aborts orphaned requests and rejects their late cache writes', async () => {
    let signal: AbortSignal | undefined;
    let finish: ((value: string) => void) | undefined;
    const view = renderHook(() => usePlatformQuery({ key: 'late', query: (s) => { signal = s; return new Promise<string>((resolve) => { finish = resolve; }); } }));
    await waitFor(() => expect(signal).toBeDefined());
    view.unmount(); expect(signal?.aborted).toBe(true);
    finish?.('private-old');
    const fresh = renderHook(() => usePlatformQuery({ key: 'late', query: async () => 'new' }));
    await waitFor(() => expect(fresh.result.current.data).toBe('new'));
  });
});

describe('network boundary', () => {
  it('aborts the actual request on timeout and caller cancellation', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      signals.push(options.signal); options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const timed = expect(requestJson('/test', {}, [], 20)).rejects.toMatchObject({ kind: 'timeout', retryable: true });
    await vi.advanceTimersByTimeAsync(21); await timed; expect(signals[0].aborted).toBe(true);
    const controller = new AbortController();
    const cancelled = expect(requestJson('/test', { signal: controller.signal })).rejects.toMatchObject({ kind: 'abort', retryable: false });
    controller.abort(); await cancelled;
  });
  it('does not echo server details or malformed request IDs', async () => {
    const error = await apiErrorFromResponse(new Response(JSON.stringify({ message: 'SQL password internals', code: 'raw-detail', requestId: '<script>', fieldErrors: { email: 'private' } }), { status: 500, headers: { 'Content-Type': 'application/json', 'x-request-id': 'safe-123' } }));
    expect(error.message).not.toContain('SQL'); expect(error.fieldErrors).toBeUndefined();
    expect(error.requestId).toBe('safe-123'); expect(error.retryable).toBe(true);
    expect(new ApiError({ status: 403, kind: 'forbidden' }).retryable).toBe(false);
  });
});

describe('cross-source provenance', () => {
  const result = deriveTournamentResultBreakdown({ tournamentId: matchHistory[0].tournamentId, teamId: currentTeam.id, placement: 1, matches: matchHistory, formula: tournaments[0].pointFormula });
  it('excludes other tournament rounds at the calculation boundary', () => {
    expect(result.maps.length).toBe(matchHistory.filter((m) => m.tournamentId === result.tournamentId).length);
  });
  it('blocks a result carrying another tournament identity', () => {
    render(<MemoryRouter><SharecardGenerator tournamentId="other" tournamentName="Other" teamName="Test" result={result} standings={[]} provenance={{ tournamentId: 'other', occurredAt: '2026-08-04', stageLabel: 'Final', sourceLabel: 'Published' }} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /PNG yüklə/i })).toBeDisabled();
    expect(screen.queryByText('AEVIC OFFICIAL RESULT')).toBeNull();
  });
  it('deduplicates the same domain event across different links and text', () => {
    const event: CompetitionAwarenessEvent = { id: 'n1', sourceId: 'n1', sourceType: 'notification', eventType: 'check-in', entityType: 'tournament', entityId: 'cup', priority: 'important', title: 'First', body: '', occurredAt: '2026-08-04T10:00:00Z', readState: 'read', actionTarget: '/team/notifications' };
    const duplicate = { ...event, id: 'a1', sourceId: 'a1', sourceType: 'announcement' as const, title: 'Different wording', occurredAt: '2026-08-04T14:00:00+04:00', readState: 'unread' as const, actionTarget: '/team/tournaments/cup' };
    const merged = deduplicateCompetitionEvents([event, duplicate]);
    expect(merged).toHaveLength(1); expect(merged[0].readState).toBe('unread');
    expect(deduplicateCompetitionEvents([event, { ...duplicate, entityId: 'other' }])).toHaveLength(2);
  });
});
