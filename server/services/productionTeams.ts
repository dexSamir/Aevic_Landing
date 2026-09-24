import type { DbClient } from '../db';
import { ServiceError, dbError } from '../errors';
import type { Team, PublicTeamProfile, PublicTeamSummary } from '../../src/types/domain';
import { deriveTeamForm, summarizeMapPerformance } from '../../src/utils/competitionAnalytics';

// Cast in Postgres BEFORE JSON serialization: bigint must never pass through a JS number.
export const PUBLIC_TEAM_COLUMNS = 'id::text,team_name,logo_url,tier,status,created_at,player1_ign,player2_ign,player3_ign,player4_ign,player5_ign,player1_photo_url,player2_photo_url,player3_photo_url,player4_photo_url,player5_photo_url,match_results';
export const PUBLIC_DIRECTORY_COLUMNS = 'id::text,team_name,logo_url,tier,status,created_at,player1_ign,player2_ign,player3_ign,player4_ign,player5_ign,match_results';
type Row = Record<string, unknown>;
export function originalTeamId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new ServiceError(422, 'INVALID_TEAM_ID');
  return value;
}
const text = (value: unknown) => typeof value === 'string' ? value : '';
function media(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  if (/^\/api\/media\/[0-9a-f-]{36}$/i.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function mapProductionTeam(row: Row): Team {
  const id = originalTeamId(row.id);
  const status = text(row.status);
  // Keep the original status and tier; they are not verification levels or account roles.
  return {
    id, slug: id, name: text(row.team_name), logoUrl: media(row.logo_url),
    tier: text(row.tier), sourceStatus: status,
    approvalStatus: (['pending','approved','rejected','banned'].includes(status) ? status : 'pending') as Team['approvalStatus'],
    registeredAt: text(row.created_at), legacyHistoryIncomplete: true,
    captain: { id: '', firstName: '', lastName: '', email: '', role: 'captain' },
    roster: [1,2,3,4,5].flatMap(slot => {
      const ign = text(row[`player${slot}_ign`]);
      return ign.trim() ? [{ id: `${id}:player${slot}`, ign, photoUrl: media(row[`player${slot}_photo_url`]), role: (slot === 5 ? 'substitute' : 'starter') as Team['roster'][number]['role'], joinedAt: text(row.created_at) }] : [];
    }),
    profileComplete: [1,2,3,4].every(slot => Boolean(text(row[`player${slot}_ign`]).trim())),
  };
}
export function productionSummary(team: Team): PublicTeamSummary {
  return { id: team.id, slug: team.id, name: team.name, logoUrl: team.logoUrl, rosterSize: team.roster.length, tier: team.tier, sourceStatus: team.sourceStatus, legacyHistoryIncomplete: true };
}
export class ProductionTeams {
  private pending?: Promise<Row[]>;
  private details = new Map<string, Promise<Row>>();
  constructor(private readonly db: DbClient) {}
  private rows() {
    return this.pending ??= (async () => {
      const rows: Row[] = [];
      for (let offset = 0; offset < 100000; offset += 1000) {
        const { data, error } = await this.db.from('teams').select(PUBLIC_DIRECTORY_COLUMNS).order('id').range(offset, offset + 999);
        dbError(error);
        if (!Array.isArray(data)) throw new ServiceError(503, 'DATA_UNAVAILABLE');
        rows.push(...data as unknown as Row[]);
        if (data.length < 1000) return rows;
      }
      throw new ServiceError(503, 'DATASET_TOO_LARGE');
    })();
  }
  async teams() { return (await this.rows()).map(mapProductionTeam); }
  async summaries(): Promise<PublicTeamSummary[]> {
    return (await this.rows()).map(row => ({ ...productionSummary(mapProductionTeam(row)), form: [], historyAvailable: Array.isArray(row.match_results) && row.match_results.length === 0 }));
  }
  private row(id: string) {
    originalTeamId(id);
    let pending = this.details.get(id);
    if (!pending) {
      pending = (async () => {
        const { data, error } = await this.db.from('teams').select(PUBLIC_TEAM_COLUMNS).eq('id', id).limit(1);
        dbError(error);
        const row = (data as unknown as Row[] | null)?.find(row => row.id === id);
        if (!row) throw new ServiceError(404, 'TEAM_NOT_FOUND');
        return row;
      })();
      this.details.set(id, pending);
    }
    return pending;
  }
  async team(id: string) { return mapProductionTeam(await this.row(id)); }
  async history(id: string): Promise<[]> {
    const value = (await this.row(id)).match_results;
    // The supplied production audit examined all seven arrays and found them empty.
    // Unknown/nonempty formats must not silently become an invented empty history.
    if (!Array.isArray(value) || value.length !== 0) throw new ServiceError(501, 'MATCH_RESULTS_CONTRACT_UNAVAILABLE');
    return [];
  }
  async profile(id: string): Promise<PublicTeamProfile> {
    return productionProfile(await this.row(id));
  }
}

/** Shared by public reads and an already authenticated captain row. */
export function productionProfile(row: Row): PublicTeamProfile {
    const team = mapProductionTeam(row);
    // Identity remains usable even if a newly populated result format requires mapping.
    const history: [] = [];
    const historyAvailable = Array.isArray(row.match_results) && row.match_results.length === 0;
    return { team, historyAvailable, historyScope: 'public.teams.match_results', achievements: [], featuredAchievementIds: [],
      legacy: { foundedAt: team.registeredAt, tournaments: 0, wins: 0, topPlacements: 0, finishes: 0, unlockedAchievements: 0 },
      recentResults: [], recentMatches: history, form: deriveTeamForm(history), mapSpecialization: summarizeMapPerformance(team.id, history) };
}
