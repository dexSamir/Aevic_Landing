/** Planning baseline, not a claim about a room's live configuration.
 * PMWC at EWC 2026 Player Handbook v1.0, §4.4 (p15): all three supported
 * maps have a 31m40s game time. Round up to a five-minute planning block.
 * https://cdn.esportsworldcup.com/resources/uploads/PUBG_MOBILE_World_Cup_at_EWC_26_Player_Handbook_2c30c6fd59.pdf
 * AEVIC stores map/order/start times, not blue-zone settings. Longer custom
 * room timings are entered as a planning estimate; the API contract is unchanged.
 */
export const MATCH_TIMING_SOURCE = 'https://resources.esportsworldcup.com/en/competitive-ops/rulebooks/pubg-mobile';
export const COMPETITIVE_GAME_SECONDS = 31 * 60 + 40;
export const DEFAULT_MATCH_MINUTES = Math.ceil(COMPETITIVE_GAME_SECONDS / 60 / 5) * 5;
export const MIN_MAP_INTERVAL_MINUTES = 45;
export interface ScheduleOptions { intervalMinutes: number; matchMinutes: number; preparationMinutes: number }
export const defaultScheduleOptions: ScheduleOptions = { intervalMinutes: 50, matchMinutes: DEFAULT_MATCH_MINUTES, preparationMinutes: 10 };
export function minimumMapInterval(options: ScheduleOptions = defaultScheduleOptions) {
  return Math.max(MIN_MAP_INTERVAL_MINUTES, options.matchMinutes + options.preparationMinutes);
}
export function mapInterval(options: ScheduleOptions = defaultScheduleOptions) {
  return Math.max(minimumMapInterval(options), options.intervalMinutes);
}
export function roundsTooClose(rounds: ReadonlyArray<{ startsAt: string }>, minimumMinutes = MIN_MAP_INTERVAL_MINUTES) {
  return rounds.flatMap((r, i) => i > 0 && Date.parse(r.startsAt) - Date.parse(rounds[i - 1].startsAt) < minimumMinutes * 60_000 ? [i] : []);
}
