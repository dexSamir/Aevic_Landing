import { vi } from 'vitest';
// The deployed DB factory deliberately refuses privileged Supabase Auth calls.
// Retained module tests inject a transport-only client; fetch is always a fixture.
vi.mock('../../server/db', async importOriginal => {
 const original=await importOriginal<typeof import('../../server/db')>();
 return {...original,client:(config:import('../../server/config').ServerConfig,token?:string)=>original.client(config,token,false)};
});
// Retained Supabase Auth/UUID module contracts, NOT the deployed original-team backend.
// Production signed-cookie and SQL authorization coverage lives in tests/platform
// and tests/server/captain.test.ts. Keep these security assertions for the retained modules.
import { createHttpApp } from '../../server/http';
import type { ServerConfig } from '../../server/config';
import auth from '../../server/routes/auth';
import workspace from '../../server/routes/workspace';
import identity from '../../server/routes/identity';
import media from '../../server/routes/media';
import claims from '../../server/routes/legacyClaims';
import publicRoutes from '../../server/routes/public';
export function createNormalizedModuleApp(config?:ServerConfig) {
 const app=createHttpApp(config,{});
 app.route('/',auth);app.route('/',claims);app.route('/',media);
 app.route('/',workspace);app.route('/',identity);app.route('/',publicRoutes);
 return app;
}
