import { sanitizeImageUrl } from '../../../src/utils/outboundUrl';
import type { PublicPlatformSnapshot, PublicTeamSummary } from '../../../src/types/domain';

const TEAM_SELECT_COLUMNS = [
  'id',
  'team_name',
  'logo_url',
  'status',
  'player1_ign',
  'player2_ign',
  'player3_ign',
  'player4_ign',
  'player5_ign',
] as const;

type PublicContextEnvironment = Partial<Record<
  | 'SUPABASE_URL'
  | 'SUPABASE_PUBLISHABLE_KEY'
  | 'VITE_SUPABASE_URL'
  | 'VITE_SUPABASE_PUBLISHABLE_KEY'
  | 'VITE_SUPABASE_ANON_KEY',
  string
>>;

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface LegacyTeamRow {
  id: string | number;
  team_name: string;
  logo_url?: string | null;
  status: string;
  player1_ign?: string | null;
  player2_ign?: string | null;
  player3_ign?: string | null;
  player4_ign?: string | null;
  player5_ign?: string | null;
}

export class PublicContextLoadError extends Error {
  readonly status: number;
  readonly code: string;
  readonly upstreamStatus?: number;
  readonly retryAfter?: string;
  get retryable() {
    return this.code === 'SUPABASE_TIMEOUT' || this.code === 'SUPABASE_UNREACHABLE'
      || (this.code === 'SUPABASE_REQUEST_FAILED' && (this.upstreamStatus === 408 || this.upstreamStatus === 429 || (this.upstreamStatus ?? 0) >= 500));
  }

  constructor(code: string, status: number, message: string, upstreamStatus?: number, retryAfter?: string) {
    super(message);
    this.name = 'PublicContextLoadError';
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
    this.retryAfter = retryAfter;
  }
}

function configuredValue(environment: PublicContextEnvironment, names: Array<keyof PublicContextEnvironment>) {
  for (const name of names) {
    const value = environment[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseConfiguration(environment: PublicContextEnvironment) {
  const rawUrl = configuredValue(environment, ['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const publishableKey = configuredValue(environment, [
    'SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
  ]);

  if (!rawUrl || !publishableKey) {
    throw new PublicContextLoadError('SUPABASE_CONFIGURATION_MISSING', 500, 'Supabase public API configuration is incomplete.');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicContextLoadError('SUPABASE_URL_INVALID', 500, 'Supabase URL is malformed.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new PublicContextLoadError('SUPABASE_URL_INVALID', 500, 'Supabase URL must be an HTTPS origin without credentials.');
  }

  return { url, publishableKey };
}

function publicSlug(name: string, id: string) {
  const normalized = name
    .replace(/[Əə]/g, 'e')
    .replace(/[Ğğ]/g, 'g')
    .replace(/[Çç]/g, 'c')
    .replace(/[Şş]/g, 's')
    .replace(/[Öö]/g, 'o')
    .replace(/[Üü]/g, 'u')
    .replace(/[İIı]/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${normalized || 'team'}-${id}`;
}

function isLegacyTeamRow(value: unknown): value is LegacyTeamRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (typeof row.id === 'string' || typeof row.id === 'number')
    && typeof row.team_name === 'string'
    && typeof row.status === 'string';
}

function transformTeam(value: unknown, origins: readonly string[]): PublicTeamSummary {
  if (!isLegacyTeamRow(value)) {
    throw new PublicContextLoadError('SUPABASE_RESPONSE_INVALID', 502, 'Supabase returned an invalid team row.');
  }
  const id = String(value.id).trim();
  const name = value.team_name.trim();
  if (!id || !name) {
    throw new PublicContextLoadError('SUPABASE_RESPONSE_INVALID', 502, 'Supabase returned a team without a public identity.');
  }

  const rosterSize = [value.player1_ign, value.player2_ign, value.player3_ign, value.player4_ign, value.player5_ign]
    .filter((player) => typeof player === 'string' && player.trim().length > 0)
    .length;
  const logoUrl = sanitizeImageUrl(value.logo_url, origins);

  return {
    id,
    slug: publicSlug(name, id),
    name,
    rosterSize,
    ...(logoUrl ? { logoUrl } : {}),
    gameKey: 'pubg-mobile',
  };
}

export function buildPublicPlatformSnapshot(teamRows: unknown, origins: readonly string[] = []): PublicPlatformSnapshot {
  if (!Array.isArray(teamRows)) {
    throw new PublicContextLoadError('SUPABASE_RESPONSE_INVALID', 502, 'Supabase returned an invalid teams collection.');
  }

  const teams = teamRows
    .filter((row) => isLegacyTeamRow(row) && row.status === 'approved')
    .map((row) => transformTeam(row, origins));

  if (!teamRows.every(isLegacyTeamRow) || new Set(teams.map((team) => team.id)).size !== teams.length) {
    throw new PublicContextLoadError('SUPABASE_RESPONSE_INVALID', 502, 'Supabase returned invalid or duplicate team identities.');
  }

  const snapshot: PublicPlatformSnapshot = {
    tournaments: [],
    teams,
    organizations: [],
    leaderboard: [],
    leaderboardTeams: [],
    playerPerformances: [],
    teamComparisonRecords: [],
    teamAchievements: [],
  };

  if (!Object.values(snapshot).every(Array.isArray)) {
    throw new PublicContextLoadError('PUBLIC_SNAPSHOT_INVALID', 500, 'The public snapshot is structurally invalid.');
  }
  return snapshot;
}

export async function loadPublicPlatformSnapshot(options: {
  environment?: PublicContextEnvironment;
  fetcher?: Fetcher;
  timeoutMs?: number;
  signal?: AbortSignal;
} = {}) {
  const environment = options.environment ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6_000;
  const { url, publishableKey } = supabaseConfiguration(environment);
  const endpoint = new URL('/rest/v1/teams', url);
  endpoint.searchParams.set('select', TEAM_SELECT_COLUMNS.join(','));
  endpoint.searchParams.set('status', 'eq.approved');
  endpoint.searchParams.set('order', 'created_at.asc,id.asc');

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    const code = timedOut ? 'SUPABASE_TIMEOUT' : controller.signal.aborted ? 'PUBLIC_CONTEXT_ABORTED' : 'SUPABASE_UNREACHABLE';
    throw new PublicContextLoadError(code, timedOut ? 504 : 502, 'Supabase public data could not be reached.');
  }

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const safeRetryAfter = retryAfter && retryAfter.length <= 64 && (/^\d+$/.test(retryAfter) || Number.isFinite(Date.parse(retryAfter))) ? retryAfter : undefined;
    throw new PublicContextLoadError('SUPABASE_REQUEST_FAILED', 502, 'Supabase rejected the public data request.', response.status, safeRetryAfter);
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new PublicContextLoadError('SUPABASE_RESPONSE_UNSUPPORTED', 502, 'Supabase returned an unsupported response type.', response.status);
  }

  let rows: unknown;
  try {
    rows = await response.json();
  } catch {
    if (controller.signal.aborted) throw new PublicContextLoadError(timedOut ? 'SUPABASE_TIMEOUT' : 'PUBLIC_CONTEXT_ABORTED', timedOut ? 504 : 502, 'Public data response reading was aborted.');
    throw new PublicContextLoadError('SUPABASE_RESPONSE_INVALID', 502, 'Supabase returned invalid JSON.', response.status);
  }
  return buildPublicPlatformSnapshot(rows, [url.origin]);
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); }
}
