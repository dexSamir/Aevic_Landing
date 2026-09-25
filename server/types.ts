import type { Context } from 'hono';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { ServerConfig } from './config';
import type { DbClient } from './db';
export type Env = { Variables: { config: ServerConfig; db: DbClient; user?: AuthUser; accessToken?: string; platform?: import('./platform/repository').PlatformRepository; requestId: string } };
export type ApiContext = Context<Env>;
