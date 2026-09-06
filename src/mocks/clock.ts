export const MOCK_COMPETITION_NOW_ISO = '2026-08-04T12:00:00+04:00';
export function mockCompetitionNow() {
  const scenario = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('scenario');
  return new Date(scenario === 'room-ready' ? '2026-08-04T20:55:00+04:00' : scenario === 'check-in-open' ? '2026-08-04T20:20:00+04:00' : MOCK_COMPETITION_NOW_ISO);
}
