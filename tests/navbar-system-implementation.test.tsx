import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deduplicateCompetitionEvents, type CompetitionAwarenessEvent } from '../src/components/team/CompetitionAwareness';
import { mockServices } from '../src/services/mockAdapter';
import { deriveTeamCompetitionContexts } from '../src/utils/teamCompetitionContext';

const awarenessBase: CompetitionAwarenessEvent = {
  id: 'source-a', eventId: 'event-room-ready', sourceId: 'notification-a', sourceType: 'notification', eventType: 'room', entityType: 'match', entityId: 'round-1', priority: 'important', title: 'Otaq hazırdır', body: 'Otaq məlumatı açılıb.', occurredAt: '2026-08-04T20:52:00+04:00', readState: 'read', actionTarget: '/team/tournaments/daily-cup-24',
};

describe('approved navbar-system implementation contracts', () => {
  it('deduplicates the same stable event across sources and preserves unread state', () => {
    const duplicate = { ...awarenessBase, id: 'source-b', sourceId: 'message-b', sourceType: 'admin-message' as const, readState: 'unread' as const, priority: 'critical' as const };
    expect(deduplicateCompetitionEvents([awarenessBase, duplicate])).toEqual([expect.objectContaining({ id: 'source-a', eventId: 'event-room-ready', priority: 'critical', readState: 'unread' })]);
  });

  it('does not merge similar copy when stable identities differ', () => {
    const distinct = { ...awarenessBase, id: 'source-c', eventId: 'event-room-ready-next', sourceId: 'notification-c' };
    expect(deduplicateCompetitionEvents([awarenessBase, distinct])).toHaveLength(2);
  });

  it('selects the current competition deterministically when fixture arrays are reordered', async () => {
    const snapshot = await mockServices.snapshots.team();
    const first = deriveTeamCompetitionContexts(snapshot, new Date('2026-08-04T17:00:00Z')).current?.tournament.id;
    const reordered = { ...snapshot, tournaments: [...snapshot.tournaments].reverse(), participations: [...snapshot.participations].reverse(), matchSchedule: [...snapshot.matchSchedule].reverse(), matchHistory: [...snapshot.matchHistory].reverse() };
    expect(deriveTeamCompetitionContexts(reordered, new Date('2026-08-04T17:00:00Z')).current?.tournament.id).toBe(first);
    expect(first).toBe('daily-cup-24');
  });

  it('mounts a router-level hydration fallback and removes the public demo strip', () => {
    const router = readFileSync(`${process.cwd()}/src/app/router.tsx`, 'utf8');
    const layouts = readFileSync(`${process.cwd()}/src/layouts/layouts.tsx`, 'utf8');
    expect(router).toContain('HydrateFallback: AevicHydrationFallback');
    expect(layouts).not.toContain('mock-banner mock-banner--public');
  });
});
