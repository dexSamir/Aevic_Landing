import { z } from 'zod';

export interface ServerConfig { supabaseUrl: string; publishableKey: string; siteUrl: string; secureCookies: boolean }
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const site = z.url().parse(env.PUBLIC_SITE_URL || (env.CONTEXT ? undefined : 'http://localhost:8888'));
  const url = z.url().parse(env.SUPABASE_URL);
  if (new URL(url).hostname !== 'nmjjibifcuzjlsvfcaaz.supabase.co') throw new Error('Original production project required');
  const local = ['localhost', '127.0.0.1'].includes(new URL(site).hostname);
  if ((!local && new URL(site).protocol !== 'https:') || (!['localhost','127.0.0.1'].includes(new URL(url).hostname) && new URL(url).protocol !== 'https:')) throw new Error('Invalid server URL');
  return { supabaseUrl: url, publishableKey: z.string().min(1).parse(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY), siteUrl: new URL(site).origin, secureCookies: !local };
}
