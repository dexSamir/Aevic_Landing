import { z } from 'zod';
import type { ApiContext } from '../types';
import { ServiceError } from '../errors';
export const id = z.uuid();
export const text = (min = 1, max = 200) => z.string().trim().min(min).max(max);
export const email = z.email().max(254).transform(v => v.toLowerCase());
export const password = z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/);
export const token = z.string().regex(/^[a-zA-Z0-9_-]{20,256}$/);
export const memberRole = z.enum(['CAPTAIN','MANAGER','CO_CAPTAIN','PLAYER','SUBSTITUTE']);
export const socialLinks = z.partialRecord(z.enum(['instagram','tiktok','youtube','x','linkedin','discord','twitch','website']), z.union([z.literal(''), z.url().max(500).refine(v => { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; })]));
export const profileInput = z.object({ name: text(2,60), tag: text(0,12).optional(), description: text(0,3000), country: text(0,80).optional(), foundedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), bannerAlt: text(0,200).optional() }).strict();
export const playerDraft = z.object({ ign: text(2,40), uid: z.string().regex(/^\d{5,20}$/), role: z.enum(['captain','starter','substitute']) });
export const registration = z.object({ draft: z.object({ teamName: text(2,60), tag: text(2,12), firstName: text(1,80), lastName: text(1,80), phone: text(6,30), email, players: z.array(playerDraft).length(5) }).superRefine((v,ctx) => {
 if (new Set(v.players.map(p=>p.uid)).size!==5 || v.players.filter(p=>p.role==='captain').length!==1 || v.players.filter(p=>p.role==='starter').length!==3 || v.players.filter(p=>p.role==='substitute').length!==1) ctx.addIssue({code:'custom', message:'Invalid roster',path:['players']});
}), password, idempotencyKey: text(8,128) });
export const resultInput = z.object({ id: z.string().optional(), tournamentId:id, roundId:id, teamId:id, placement:z.number().int().min(1).max(100),finishes:z.number().int().min(0).max(400),placementPoints:z.number().nonnegative(),finishPoints:z.number().nonnegative(),penalties:z.number().nonnegative().max(1000),totalPoints:z.number(),notes:text(0,3000).optional(),published:z.boolean() }).strict();
export async function body<T>(c: ApiContext, schema: z.ZodType<T>): Promise<T> {
  let value: unknown; try { value = await c.req.json(); } catch { throw new ServiceError(400,'INVALID_JSON'); }
  return schema.parse(value);
}
export const paramId = (c: ApiContext, name = 'id') => id.parse(c.req.param(name));
export function pagination(c: ApiContext) {
  const cursor = c.req.query('cursor'); const offset = cursor ? z.coerce.number().int().min(0).max(100000).parse(cursor) : 0;
  return { offset, limit: z.coerce.number().int().min(1).max(100).parse(c.req.query('limit') ?? 50) };
}
