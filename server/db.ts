import { createClient } from '@supabase/supabase-js';
import type { ServerConfig } from './config';
import { dbError } from './errors';
export function client(config: ServerConfig, token?: string, privileged = false) {
  return createClient(config.supabaseUrl, privileged ? config.serviceKey : config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}), fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(8_000) }) },
    db: { schema: 'aevic' },
  });
}
export type DbClient = ReturnType<typeof client>;
export async function command(db: DbClient, action: string, payload: unknown, idempotencyKey?: string) {
  const { data, error } = await db.rpc('command', { action, payload, idempotency_key: idempotencyKey ?? null }); dbError(error);
  return data as Record<string, unknown>;
}
