import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
export const projectRef = 'nmjjibifcuzjlsvfcaaz';
export function environment() { return { ...loadEnv('development', process.cwd(), ''), ...process.env }; }
export function connect(env, write = false) {
  const url = new URL(env.AEVIC_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !(url.hostname === `db.${projectRef}.supabase.co` || url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username).endsWith(`.${projectRef}`))) throw new Error('DATABASE_PROJECT_MISMATCH');
  const ca = readFileSync(new URL('../../server/captain/database-ca.ts', import.meta.url), 'utf8').match(/`([\s\S]*?)`/)[1];
  return postgres(env.AEVIC_DATABASE_URL, { ssl: { rejectUnauthorized: true, ca }, max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5, onnotice: () => {}, connection: { application_name: 'aevic-media-migration', statement_timeout: 15000, lock_timeout: 3000, default_transaction_read_only: write ? 'off' : 'on' } });
}
