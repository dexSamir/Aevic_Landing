import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import type { Env } from '../types';
import { platform } from './context';
import { sitePage, publishedDocument } from '../../src/content/publishedSiteContent';

const app=new Hono<Env>();
// Preserve public content and its media compatibility. The former Admin draft,
// media-library and publishing endpoints intentionally no longer exist.
app.get('/public/site-content',async c=>{
 const rows=await platform(c).sql`select substring(key from 6) as id,value->'published' as document from aevic_platform.settings where key like 'site:%' and value->'published' is not null and value->'published'<>'null'::jsonb order by key`;
 const pages=Object.fromEntries(rows.flatMap(row=>{const document=sitePage(row.id)&&publishedDocument(row.document);return document?[[row.id,document]]:[];}));
 const etag='"'+createHash('sha256').update(JSON.stringify(pages)).digest('hex')+'"';
 c.header('Cache-Control','public, max-age=0, must-revalidate');c.header('ETag',etag);
 if(c.req.header('if-none-match')===etag)return c.body(null,304);
 return c.json(pages);
});
export default app;
