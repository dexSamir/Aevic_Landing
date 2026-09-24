// Prepare an ignored, owner-readable import file. This never calls Netlify or deploys.
import { readFile, mkdir, writeFile, chmod } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const env = parseEnv(await readFile('.env', 'utf8'));
const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'AEVIC_DATABASE_URL', 'AEVIC_SESSION_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'TEAM_MEDIA_BUCKET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missing = names.filter(name => !env[name]);
if (missing.length) { console.error('Missing server settings: ' + missing.join(', ')); process.exit(1); }
if (new URL(env.SUPABASE_URL).hostname !== 'nmjjibifcuzjlsvfcaaz.supabase.co') throw new Error('Original project required');
if (env.AEVIC_SESSION_SECRET.length < 32) throw new Error('Session secret too short');
const values = Object.fromEntries(names.map(name => [name, env[name]]));
values.PUBLIC_SITE_URL = 'https://aevic-demo.netlify.app';
if (env.EMAIL_FROM) values.EMAIL_FROM = env.EMAIL_FROM;
// Literal single quotes protect $, #, and backslashes in existing credentials.
// Refuse unsupported encodings instead of silently changing credentials.
for (const value of Object.values(values)) if (/['\r\n]/.test(value)) throw new Error('A value needs manual secure import; no file generated');
await mkdir('.netlify', { recursive: true });
const path = '.netlify/captain.production.env';
await writeFile(path, '# Import into aevic-demo, Production context, Functions scope only.\n' + Object.entries(values).map(([key,value]) => `${key}='${value}'`).join('\n') + '\n', { mode: 0o600 });
await chmod(path, 0o600);
console.log('Prepared ignored .netlify/captain.production.env (owner read/write only). No upload or deployment performed.');
