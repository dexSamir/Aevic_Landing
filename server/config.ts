import { z } from 'zod';

export interface ServerConfig { supabaseUrl: string; publishableKey: string; siteUrl: string; secureCookies: boolean; databaseUrl?: string; sessionSecret?: string; resendKey?: string; emailFrom?: string; storageKey?: string; mediaBucket?: string; smtp?: {host:string;port:number;user:string;pass:string} }
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const site = z.url().parse(env.PUBLIC_SITE_URL || (env.CONTEXT ? undefined : 'http://localhost:8888'));
  const url = z.url().parse(env.SUPABASE_URL);
  if (new URL(url).hostname !== 'nmjjibifcuzjlsvfcaaz.supabase.co') throw new Error('Original production project required');
  const local = ['localhost', '127.0.0.1'].includes(new URL(site).hostname);
  if ((!local && new URL(site).protocol !== 'https:') || (!['localhost','127.0.0.1'].includes(new URL(url).hostname) && new URL(url).protocol !== 'https:')) throw new Error('Invalid server URL');
  const smtpPort=Number(env.SMTP_PORT || 587);
  const smtp=env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASS&&Number.isInteger(smtpPort)&&smtpPort>0&&smtpPort<=65535
    ? {host:env.SMTP_HOST,port:smtpPort,user:env.SMTP_USER,pass:env.SMTP_PASS}:undefined;
  return { supabaseUrl: url, publishableKey: z.string().min(1).parse(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY), siteUrl: new URL(site).origin, secureCookies: !local, databaseUrl: env.AEVIC_DATABASE_URL, sessionSecret: env.AEVIC_SESSION_SECRET || env.ADMIN_SERVER_KEY, resendKey: env.RESEND_API_KEY, emailFrom: env.EMAIL_FROM || env.SMTP_USER, storageKey: env.SUPABASE_SERVICE_ROLE_KEY, mediaBucket: env.TEAM_MEDIA_BUCKET, smtp };
}
