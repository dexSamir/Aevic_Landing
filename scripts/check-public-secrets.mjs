import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

// Values stay in memory. Diagnostics contain key names only, never matching bytes.
export function checkPublicSecrets(directory, env) {
  const secrets = Object.entries(env).filter(([key,value]) => value && /SECRET|PASSWORD|(?:^|_)PASS$|TOKEN|PRIVATE_KEY|SERVICE_ROLE|DATABASE_URL|API_KEY|ADMIN_SERVER_KEY/i.test(key));
  const found = new Set();
  const visit = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) {
        const bytes = readFileSync(file);
        for (const [key,value] of secrets) {
          const variants = [value, JSON.stringify(value).slice(1,-1), encodeURIComponent(value)];
          if (variants.some(v => bytes.includes(Buffer.from(v)))) found.add(key);
        }
      }
    }
  };
  visit(directory);
  if (found.size) throw new Error(`Private values in public output: ${[...found].sort().join(', ')}`);
  return secrets.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const count = checkPublicSecrets('dist', { ...loadEnv('production', process.cwd(), ''), ...process.env });
    console.log(`Public output secret check passed (${count} configured sensitive keys checked).`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
