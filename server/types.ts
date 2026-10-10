import type { Context } from 'hono';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { ServerConfig } from './config';
import type { DbClient } from './db';
export type Env = { Variables: { sessionDigest?: string; sessionId?: string; config: ServerConfig; db: DbClient; user?: AuthUser; accessToken?: string; platform?: import('./platform/repository').PlatformRepository; verifiedCaptain?: import('./captain/store').CaptainRow; requestId: string; operationalError?: string; databaseFailure?: string } };
export type ApiContext = Context<Env>;
