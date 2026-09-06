import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveTeamForm, deriveTeamSpecialization, summarizeMapPerformance } from '../.test-build/utils/competitionAnalytics.js';
import { duplicatePubgIds, normalizePubgId } from '../.test-build/utils/registration.js';
import { deriveWrappedSummary, yearPeriod } from '../.test-build/utils/wrapped.js';
import { buildCalendarEvent, eventDateKey } from '../.test-build/utils/calendar.js';
import { organizationTeamPath, safeInternalPath, tournamentById } from '../.test-build/utils/routes.js';
import { deriveTournamentResultBreakdown } from '../.test-build/utils/resultBreakdown.js';
import { resolveTournamentJoinState } from '../.test-build/utils/tournamentJoin.js';
import { isDisputeWindowOpen, normalizeSocialUrl, passwordRequirements, reviewRoundResults } from '../.test-build/utils/lifecycle.js';

const matches = [
  { id: 'm1', tournamentId: 't1', tournamentName: 'Final', playedAt: '2025-08-01T18:00:00Z', stageLabel: 'Final R1', map: 'Erangel', placement: 1, finishes: 10, points: 25, wwcd: true },
  { id: 'm2', tournamentId: 't1', tournamentName: 'Final', playedAt: '2025-08-01T19:00:00Z', stageLabel: 'Final R2', map: 'Erangel', placement: 3, finishes: 6, points: 16, wwcd: false },
  { id: 'm3', tournamentId: 't1', tournamentName: 'Final', playedAt: '2025-08-01T20:00:00Z', stageLabel: 'Final R3', map: 'Erangel', placement: 2, finishes: 8, points: 20, wwcd: false },
  { id: 'm4', tournamentId: 't2', tournamentName: 'Cup', playedAt: '2026-02-01T18:00:00Z', stageLabel: 'Group R1', map: 'Miramar', placement: 8, finishes: 2, points: 4, wwcd: false },
];
const team = { id: 'team-1', name: 'Caspian Wolves', slug: 'caspian-wolves', captain: { id: 'u1', firstName: 'A', lastName: 'B', email: 'safe@example.test', role: 'captain' }, roster: [], approvalStatus: 'approved', registeredAt: '2024-01-01', profileComplete: true };

test('PUBG ID normalization and duplicate detection use the same canonical value', () => {
  assert.equal(normalizePubgId('51 234-567_890'), '51234567890');
  const duplicates = duplicatePubgIds([{ ign: 'A', uid: '51234567890', role: 'captain' }, { ign: 'B', uid: '51234567890', role: 'starter' }]);
  assert.deepEqual([...duplicates], ['51234567890']);
});

test('team form is newest-first and marks one newest result', () => {
  const form = deriveTeamForm(matches);
  assert.equal(form[0].matchId, 'm4');
  assert.equal(form.filter((item) => item.newest).length, 1);
  assert.equal(form.length, 4);
  const twelve = Array.from({ length: 12 }, (_, index) => ({ ...matches[index % matches.length], id: `recent-${index}`, playedAt: `2026-04-${String(index + 1).padStart(2, '0')}T18:00:00Z` }));
  const latestTen = deriveTeamForm(twelve);
  assert.equal(latestTen.length, 10);
  assert.equal(latestTen[0].matchId, 'recent-11');
  assert.equal(latestTen.at(-1).matchId, 'recent-2');
});

test('team specialization requires eight matches and combines multiple signals', () => {
  assert.equal(deriveTeamSpecialization(matches), undefined);
  const podiumHistory = Array.from({ length: 10 }, (_, index) => ({ ...matches[index % matches.length], id: `special-${index}`, playedAt: `2026-01-${String(index + 1).padStart(2, '0')}T18:00:00Z`, placement: index < 6 ? (index % 3) + 1 : 7, wwcd: index === 0 || index === 3, finishes: 5 }));
  const result = deriveTeamSpecialization(podiumHistory);
  assert.equal(result?.type, 'top_three');
  assert.equal(result?.sampleSize, 10);
  assert.match(result?.evidence ?? '', /6 \/ 10 Top-3/);
});

test('tournament result totals are derived from map PP and KP with penalties separate', () => {
  const formula = { placement: [{ placement: 1, points: 15 }, { placement: 2, points: 12 }, { placement: 3, points: 10 }, { placement: 8, points: 2 }], finishPointValue: 2, wwcdBonus: 0, defaultPenalty: 0, tieBreakRules: [] };
  const result = deriveTournamentResultBreakdown({ tournamentId: 't1', teamId: 'team-1', placement: 2, matches: matches.slice(0, 3), formula, penalties: 3 });
  assert.equal(result.placementPoints, 37);
  assert.equal(result.killPoints, 48);
  assert.equal(result.totalPoints, 82);
  assert.equal(result.maps.reduce((sum, map) => sum + map.totalPoints, 0), 85);
  assert.equal(result.maps.reduce((sum, map) => sum + map.kills, 0), result.kills);
  assert.equal(result.maps.reduce((sum, map) => sum + map.placementPoints, 0), result.placementPoints);
  assert.equal(result.maps.reduce((sum, map) => sum + map.killPoints, 0), result.killPoints);
  assert.equal(result.penalties, 3);
  assert.equal(result.maps[0].isWWCD, true);
});

test('tournament result breakdown preserves authoritative published map points', () => {
  const formula = { placement: [{ placement: 1, points: 15 }], finishPointValue: 1, wwcdBonus: 0, defaultPenalty: 0, tieBreakRules: [] };
  const published = [{ ...matches[0], placementPoints: 10, killPoints: 10, points: 20 }];
  const result = deriveTournamentResultBreakdown({ tournamentId: 't1', teamId: 'team-1', placement: 1, matches: published, formula });
  assert.equal(result.placementPoints, 10);
  assert.equal(result.killPoints, 10);
  assert.equal(result.totalPoints, 20);
  assert.equal(result.maps[0].totalPoints, published[0].points);
});

test('tournament join state covers auth, roster, eligibility, capacity and duplicate-safe progress', () => {
  const now = '2026-08-02T12:00:00Z';
  const tournament = { id: 't1', status: 'registration-open', registrationOpensAt: '2026-08-01T09:00:00Z', registrationDeadline: '2026-08-03T20:00:00Z', startsAt: '2026-08-04T18:00:00Z', endsAt: '2026-08-04T22:00:00Z', usedSlots: 4, maxSlots: 16 };
  assert.equal(resolveTournamentJoinState({ authenticated: false, tournament, now }), 'login');
  assert.equal(resolveTournamentJoinState({ authenticated: true, tournament, now }), 'create-team');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team, tournament, now }), 'roster-incomplete');
  const eligibleTeam = { ...team, roster: [
    { id: 'p1', ign: 'A', role: 'captain' }, { id: 'p2', ign: 'B', role: 'starter' },
    { id: 'p3', ign: 'C', role: 'starter' }, { id: 'p4', ign: 'D', role: 'starter' },
  ], profileComplete: true };
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament, now }), 'join');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament, registering: true, now }), 'registering');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament, participation: 'registered', now }), 'registered');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament: { ...tournament, usedSlots: 16 }, now }), 'full');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament: { ...tournament, status: 'published' }, now }), 'closed');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: { ...eligibleTeam, approvalStatus: 'pending' }, tournament, now }), 'ineligible');
  assert.equal(resolveTournamentJoinState({ authenticated: true, team: eligibleTeam, tournament, failureCode: 'FULL', now }), 'full');
});

test('map specialization requires the configured sample size', () => {
  const insufficient = summarizeMapPerformance('team-1', matches.slice(0, 2), 3);
  assert.equal(insufficient.status, 'insufficient-data');
  const ready = summarizeMapPerformance('team-1', matches.slice(0, 3), 3);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.bestMap?.map, 'Erangel');
});

test('Wrapped is period-bound and derives only supported facts', () => {
  const period = yearPeriod(2025);
  const summary = deriveWrappedSummary({ team, period, matches });
  assert.match(period.startDate, /\+04:00$/);
  assert.equal(new Date(period.startDate).toISOString(), '2024-12-31T20:00:00.000Z');
  assert.equal(summary.matches, 3);
  assert.equal(summary.kills, 24);
  assert.equal(summary.wwcd, 1);
  assert.equal(summary.podiums, 3);
  assert.equal(summary.biggestKillGame?.matchId, 'm1');
  assert.equal(summary.bestMap?.map, 'Erangel');
  assert.equal(summary.available, true);
});

test('calendar serialization excludes private room fields by contract', () => {
  const ics = buildCalendarEvent({ id: 'public-match', title: 'AEVIC Final', description: 'Public schedule', startsAt: '2026-08-12T18:00:00Z', timezone: 'Asia/Baku', publicUrl: 'https://aevic.example/matches/public-match' });
  assert.match(ics, /SUMMARY:AEVIC Final/);
  assert.doesNotMatch(ics, /password|room id/i);
});

test('calendar groups UTC timestamps by authoritative Baku competition day', () => {
  assert.equal(eventDateKey('2026-08-31T20:30:00Z'), '2026-09-01');
  assert.equal(eventDateKey('2026-12-31T20:00:00Z'), '2027-01-01');
  assert.equal(eventDateKey('2026-01-01T19:59:59Z'), '2026-01-01');
});

test('organization navigation uses the owned team slug', () => {
  assert.equal(organizationTeamPath({ slug: 'individual-team' }), '/teams/individual-team');
});

test('invalid tournament routes never substitute another tournament', () => {
  const tournaments = [{ id: 'real-event' }];
  assert.equal(tournamentById(tournaments, 'missing-event'), undefined);
  assert.equal(tournamentById(tournaments, 'real-event')?.id, 'real-event');
});

test('backend-provided search routes cannot navigate to external or backslash paths', () => {
  assert.equal(safeInternalPath('/teams/caspian-wolves?q=1'), '/teams/caspian-wolves?q=1');
  assert.equal(safeInternalPath('//evil.example/path'), null);
  assert.equal(safeInternalPath('/\\evil.example/path'), null);
  assert.equal(safeInternalPath('https://evil.example/path'), null);
});

test('auth password requirements stay deterministic across reset and account flows', () => {
  assert.deepEqual(passwordRequirements('Weak'), { minimumLength: false, uppercase: true, number: false });
  assert.deepEqual(passwordRequirements('AEVICsafe9'), { minimumLength: true, uppercase: true, number: true });
});

test('social URL normalization rejects unrelated platform hosts and insecure protocols', () => {
  assert.equal(normalizeSocialUrl('instagram', 'instagram.com/aevic').ok, true);
  assert.equal(normalizeSocialUrl('instagram', 'https://example.com/aevic').ok, false);
  assert.equal(normalizeSocialUrl('website', 'http://example.com').ok, false);
});

test('result smart review catches duplicate placements and inconsistent totals', () => {
  const formula = { placement: [{ placement: 1, points: 15 }, { placement: 2, points: 12 }], finishPointValue: 1, wwcdBonus: 10, defaultPenalty: 0, tieBreakRules: [] };
  const review = reviewRoundResults([{ teamId: 'a', placement: 1, finishes: 5, penalty: 0, total: 30 }, { teamId: 'b', placement: 1, finishes: 2, penalty: 0, total: 2 }], formula);
  assert.equal(review.valid, false);
  assert.equal(review.issues.some((issue) => issue.includes('Təkrarlanan')), true);
  assert.equal(review.issues.some((issue) => issue.includes('uyğun gəlmir')), true);
});

test('dispute deadline is backend-time compatible and closes after the boundary', () => {
  assert.equal(isDisputeWindowOpen('2026-08-15T20:00:00Z', Date.parse('2026-08-15T19:59:59Z')), true);
  assert.equal(isDisputeWindowOpen('2026-08-15T20:00:00Z', Date.parse('2026-08-15T20:00:01Z')), false);
});
