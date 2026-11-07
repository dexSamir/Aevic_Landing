import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { body, text } from '../validation/input';
import { ServiceError } from '../errors';
import { approvedBrandUrl, defaultBranding } from '../../src/content/branding';
import { actor, admin, platform } from './context';
import { audit, transaction } from './competition';

const app = new Hono<Env>();
const link = z
  .object({
    label: text(1, 30),
    href: z
      .string()
      .max(350)
      .transform((value, ctx) => {
        const url = approvedBrandUrl(value);
        if (!url) {
          ctx.addIssue({ code: 'custom', message: 'Invalid destination' });
          return z.NEVER;
        }
        return url;
      }),
    visible: z.boolean(),
  })
  .strict();
const links = (max: number) =>
  z
    .array(link)
    .max(max)
    .refine((rows) => new Set(rows.map((row) => row.href)).size === rows.length);
const brand = z
  .object({
    revision: z.number().int().nonnegative(),
    name: text(2, 48),
    description: text(0, 180),
    seoDescription: text(0, 240),
    assets: z
      .object({
        logo: z.uuid().optional(),
        alternate: z.uuid().optional(),
        favicon: z.uuid().optional(),
        fallback: z.uuid().optional(),
      })
      .strict(),
    links: z
      .object({ header: links(5).optional(), footer: links(12).optional(), social: links(10).optional() })
      .strict(),
  })
  .strict();
app.get('/admin/settings/branding', async (c) => {
  admin(c, ['super-admin']);
  const [row] = await platform(c).sql`select value from aevic_platform.settings where key='branding'`;
  return c.json(row?.value ?? defaultBranding);
});
app.put('/admin/settings/branding', async (c) => {
  admin(c, ['super-admin']);
  const input = await body(c, brand);
  const saved = await transaction(platform(c).sql, async (tx) => {
    const ids = [...new Set(Object.values(input.assets))];
    if (ids.length) {
      const images =
        await tx`select id from aevic_platform.tournament_banners where id=any(${tx.array(ids)}::uuid[])`;
      if (images.length !== ids.length) throw new ServiceError(422, 'MEDIA_NOT_FOUND');
    }
    await tx`select pg_advisory_xact_lock(hashtextextended('settings:branding',0))`;
    const [prior] = await tx`select value from aevic_platform.settings where key='branding'`;
    if ((prior?.value.revision ?? 0) !== input.revision) throw new ServiceError(409, 'STALE_VERSION');
    const next = { ...input, revision: input.revision + 1 };
    await tx`insert into aevic_platform.settings(key,value) values('branding',${tx.json(next)}) on conflict(key) do update set value=excluded.value,updated_at=now()`;
    await audit(tx, actor(c), 'settings.branding-update', 'settings', 'branding', { revision: next.revision });
    return next;
  });
  return c.json(saved);
});
export default app;
