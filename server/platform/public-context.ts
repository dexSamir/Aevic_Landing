import type { PublicPlatformSnapshot, Team } from '../../src/types/domain';
import { ServiceError } from '../errors';
import { mapProductionTeam } from '../services/productionTeams';
import { PlatformRepository, normalize } from './repository';
import { summary } from '../services/data';
import { organizations } from '../services/identity';

// One anonymous snapshot per warm database pool. Never retain rejected reads.
const snapshots = new WeakMap<object, { expiresAt: number; pending: Promise<PublicPlatformSnapshot> }>();

export function invalidatePublicSnapshot(pool: object) { snapshots.delete(pool); }

/** Minimal, anonymous-only reads for the public snapshot, never private routes. */
export class PublicContextRepository extends PlatformRepository {
 async snapshot(): Promise<PublicPlatformSnapshot> {
  if (Object.keys(this.actor).length) throw new ServiceError(403, 'FORBIDDEN');
  const cached = snapshots.get(this.sql);
  if (cached && Date.now() < cached.expiresAt) return cached.pending;
  const entry = { expiresAt: Infinity, pending: Promise.resolve().then(async () => {
   const [tournaments, teams, leaderboard, publicOrganizations, teamComparisonRecords] = await Promise.all([
    this.tournaments(), this.teams(), this.standings(), organizations(this), this.comparisons(),
   ]);
   return { tournaments, teams: teams.map(summary), organizations: publicOrganizations, leaderboard,
    leaderboardTeams: leaderboard.map(row => teams.find(team => team.id === row.teamId)?.name ?? ''),
    playerPerformances: [], teamComparisonRecords, teamAchievements: [] };
  }) };
  snapshots.set(this.sql, entry);
  try {
   const value = await entry.pending;
   entry.expiresAt = Date.now() + 30_000;
   return value;
  } catch (error) {
   if (snapshots.get(this.sql) === entry) snapshots.delete(this.sql);
   throw error;
  }
 }

 private contextTeams?: Promise<Team[]>;
 private contextTournaments?: Promise<Record<string,unknown>[]>;

 override rows(table: string) {
  if (table === 'tournaments') return this.contextTournaments ??= (async () => normalize(await this.sql`
   select t.id,t.name,t.short_name,t.description,t.status,t.updated_at,t.starts_at,t.ends_at,
    t.registration_opens_at,t.registration_deadline,t.check_in_opens_at,t.check_in_closes_at,
    t.max_slots,t.days,t.rounds_per_day,t.map_rotation,t.point_formula,t.rules,t.featured,t.dispute_duration_minutes,
    coalesce(c.used_slots,0)::int as context_used_slots
   from aevic.tournaments t
   left join (select tournament_id,count(*) as used_slots from aevic_platform.tournament_registrations
    where status in ('pending','confirmed') group by tournament_id) c on c.tournament_id=t.id
   where t.status<>'draft' and t.archived_at is null order by t.starts_at,t.id limit 10000
  `))();
  // Capacity above is authoritative; public context does not return registrations.
  if (table === 'tournament_registrations') return Promise.resolve([]);
  return super.rows(table);
 }

 protected override async tournamentCapacity() {
  return (await this.rows('tournaments')).map(row => ({ tournament_id: String(row.id), used_slots: Number(row.context_used_slots) }));
 }

 override teams(privateData = false): Promise<Team[]> {
  if (privateData || Object.keys(this.actor).length) throw new ServiceError(403,'FORBIDDEN');
  return this.contextTeams ??= (async () => {
   // Snapshot consumers need identity, roster size and approval, not player IDs,
   // photos, contacts, full profiles or account metadata. Preserve bigint IDs.
   const started = performance.now();
   const rows = normalize(await this.sql`
    select t.id::text,t.team_name,t.logo_url,t.status,t.created_at,
     t.player1_ign,t.player2_ign,t.player3_ign,t.player4_ign,t.player5_ign,
     d.tag,d.country,d.legacy_history_incomplete,
     exists(select 1 from aevic_platform.verification_requests v where v.team_id=t.id and v.status='APPROVED') as verified
    from public.teams t left join aevic_platform.team_details d on d.team_id=t.id
    where t.status in ('pending','approved') and d.archived_at is null order by t.id::text
   `);
   this.metrics.teamQueries++;
   this.metrics.teamQueryMs += performance.now() - started;
   this.metrics.teamRows = rows.length;
   return rows.map(row => ({ ...mapProductionTeam(row), tag: row.tag ? String(row.tag) : undefined,
    country: row.country ? String(row.country) : undefined, gameKey: 'pubg-mobile',
    verificationLevel: row.verified ? 'verified' : undefined,
    legacyHistoryIncomplete: Boolean(row.legacy_history_incomplete ?? true),
   }));
  })();
 }
}
