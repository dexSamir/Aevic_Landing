import { z } from 'zod';

export interface ServerConfig { google?: {clientId:string;clientSecret:string}; sessionMode?: 'legacy' | 'transition' | 'tokens'; legacySessionUntil?: string; cloudinary?: { cloudName: string; apiKey: string; apiSecret: string }; supabaseUrl: string; publishableKey: string; siteUrl: string; secureCookies: boolean; indexableDeployment?: boolean; databaseUrl?: string; sessionSecret?: string; resendKey?: string; emailFrom?: string; storageKey?: string; mediaBucket?: string; smtp?: {host:string;port:number;user:string;pass:string} }
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const site = z.url().parse(env.PUBLIC_SITE_URL || (env.CONTEXT ? undefined : 'http://localhost:8888'));
  const url = z.url().parse(env.SUPABASE_URL);
  if (new URL(url).hostname !== 'nmjjibifcuzjlsvfcaaz.supabase.co') throw new Error('Original production project required');
  const local = ['localhost', '127.0.0.1'].includes(new URL(site).hostname);
  if ((!local && new URL(site).protocol !== 'https:') || (!['localhost','127.0.0.1'].includes(new URL(url).hostname) && new URL(url).protocol !== 'https:')) throw new Error('Invalid server URL');
  const smtpPort=Number(env.SMTP_PORT || 587);
  const smtp=env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASS&&Number.isInteger(smtpPort)&&smtpPort>0&&smtpPort<=65535
    ? {host:env.SMTP_HOST,port:smtpPort,user:env.SMTP_USER,pass:env.SMTP_PASS}:undefined;
  const provider = z.enum(['existing', 'cloudinary']).parse(env.TEAM_MEDIA_PROVIDER || 'existing');
  const cloudinary = provider === 'cloudinary' ? {
    cloudName: z.string().regex(/^[a-zA-Z0-9_-]+$/).parse(env.CLOUDINARY_CLOUD_NAME),
    apiKey: z.string().min(1).parse(env.CLOUDINARY_API_KEY),
    apiSecret: z.string().min(1).parse(env.CLOUDINARY_API_SECRET),
  } : undefined;
  const sessionMode=z.enum(['legacy','transition','tokens']).parse(env.AEVIC_SESSION_MODE||'legacy');
  const legacySessionUntil=sessionMode==='transition'?z.iso.datetime().parse(env.AEVIC_LEGACY_SESSION_UNTIL):undefined;
  if(sessionMode!=='legacy'&&(!env.AEVIC_DATABASE_URL||(env.AEVIC_SESSION_SECRET||env.ADMIN_SERVER_KEY||'').length<32))throw new Error('Session configuration incomplete');
  const google=env.AEVIC_GOOGLE_ENABLED==='true'?{clientId:z.string().min(1).parse(env.GOOGLE_CLIENT_ID),clientSecret:z.string().min(1).parse(env.GOOGLE_CLIENT_SECRET)}:undefined;
  if(google&&(!env.AEVIC_DATABASE_URL||(env.AEVIC_SESSION_SECRET||env.ADMIN_SERVER_KEY||'').length<32))throw new Error('Google configuration incomplete');
  return { google, sessionMode, legacySessionUntil, cloudinary, indexableDeployment: !local && (!env.CONTEXT || env.CONTEXT==='production'), supabaseUrl: url, publishableKey: z.string().min(1).parse(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY), siteUrl: new URL(site).origin, secureCookies: !local, databaseUrl: env.AEVIC_DATABASE_URL, sessionSecret: env.AEVIC_SESSION_SECRET || env.ADMIN_SERVER_KEY, resendKey: env.RESEND_API_KEY, emailFrom: env.EMAIL_FROM || env.SMTP_USER, storageKey: env.SUPABASE_SERVICE_ROLE_KEY, mediaBucket: env.TEAM_MEDIA_BUCKET, smtp };
}
