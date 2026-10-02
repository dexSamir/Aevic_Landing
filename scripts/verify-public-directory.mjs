// Explicitly read-only; no production API middleware or mutation is invoked.
import postgres from 'postgres';
import { createServer } from 'vite';
if (!process.env.AEVIC_DATABASE_URL) throw new Error('AEVIC_DATABASE_URL is required for explicit read-only verification');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const sql = postgres(process.env.AEVIC_DATABASE_URL, { max: 1, prepare: false, connect_timeout: 15 });
try {
  const { PlatformRepository } = await server.ssrLoadModule('/server/platform/repository.ts');
  await sql.begin('read only', async tx => {
    const baseline = await tx`select id::text,status from public.teams order by id`;
    const repo = new PlatformRepository(undefined, tx);
    const start = performance.now();
    const teams = await repo.teams();
    const firstReadMs = performance.now() - start;
    const second = performance.now();
    await repo.teams();
    const repeatedReadMs = performance.now() - second;
    console.log(JSON.stringify({ baseline, oldGuestCount: baseline.filter(t => t.status === 'approved').length, publicIds: teams.map(t => t.id), firstReadMs, repeatedReadMs, privateContactsAbsent: teams.every(t => !t.captain.email && !t.captain.contact) }, null, 2));
  });
} finally { await sql.end(); await server.close(); }
