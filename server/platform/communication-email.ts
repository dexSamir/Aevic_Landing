import type { Sql } from 'postgres';
import { z } from 'zod';
import type { ServerConfig } from '../config';
import { MailDeliveryError, sendTransactional } from '../emailDelivery';
import { ServiceError } from '../errors';

type MailKind = 'welcome' | 'champion';
interface QueuedMail {
  id: string;
  kind: MailKind;
  title: string;
  body: string;
  href: string;
  attempts: number;
}
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function communicationEmail(siteUrl: string, mail: QueuedMail, name: string) {
  const origin = new URL(siteUrl).origin;
  const link = new URL(mail.href, origin);
  if (!mail.href.startsWith('/') || link.origin !== origin) throw new Error('INVALID_EMAIL_DESTINATION');
  const welcomeActions: Record<string, string> = {
    '/account/onboarding': 'Hesab məqsədini seç',
    '/team/setup': 'Komandanı yarat',
    '/team': 'Komanda panelini aç',
    '/tournaments': 'Turnirlərə bax',
  };
  const action =
    mail.kind === 'champion' ? 'Rəsmi nəticələrə bax' : (welcomeActions[link.pathname] ?? 'AEVIC-i aç');
  const greeting = name.trim() ? 'Salam, ' + name.trim() + '!' : 'Salam!';
  const subject = 'AEVIC — ' + mail.title.replace(/[\r\n]+/g, ' ');
  const text = [greeting, mail.title, mail.body, action + '\n' + link.href, 'AEVIC Admin'].join('\n\n');
  const html = `<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<style>@media(prefers-color-scheme:dark){.panel{background:#202024!important;color:#faf9f6!important}.outer{background:#111114!important}}</style></head>
<body class="outer" style="background:#eeeae3;margin:0;padding:20px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" class="panel" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#fffdf8;color:#232226;border-top:4px solid #c69831"><tr><td style="padding:24px;overflow-wrap:anywhere">
<img src="${escapeHtml(origin)}/brand/aevic-email-logo.png" alt="AEVIC Esports" width="64" height="64" style="display:block;background:#17171a">
<p style="margin:24px 0 8px;font-size:15px">${escapeHtml(greeting)}</p>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 16px">${escapeHtml(mail.title)}</h1>
<p style="font-size:16px;line-height:1.55;margin:0 0 24px">${escapeHtml(mail.body).replace(/\n/g, '<br>')}</p>
<a href="${escapeHtml(link.href)}" style="display:inline-block;background:#e7b956;color:#17171a;font-weight:bold;padding:14px 18px;border-radius:6px;text-decoration:none">${action}</a>
<p style="font-size:13px;margin:28px 0 0">AEVIC Admin</p></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html, messageId: `<communication-${mail.id}@${link.hostname}>` };
}

const maxAttempts = 4;
const retryDelays = [5, 30, 120]; // minutes after a definite temporary rejection

export async function processCommunicationEmail(
  sql: Sql,
  config: ServerConfig,
  send = sendTransactional,
) {
  if (!config.automaticCommunicationsEnabled) return;
  const [gate] = await sql`select aevic_platform.communication_active_since() as since`;
  if (!gate?.since) return;
  // SMTP has no idempotency API. If a worker disappeared after handoff began,
  // retain the ambiguous outcome for inspection instead of replaying the message.
  await sql`update aevic_platform.communication_email set status='uncertain', updated_at=now()
    where status='sending' and updated_at < now() - interval '10 minutes'`;

  async function deliverOne() {
    const claim = await sql.begin(async (tx) => {
      const [mail] = await tx<QueuedMail[]>`select id, kind, title, body, href, attempts
        from aevic_platform.communication_email where status in ('pending','retry') and next_attempt_at <= now()
          and created_at >= aevic_platform.communication_active_since()
        order by next_attempt_at, id limit 1 for update skip locked`;
      if (!mail) return null;
      const [recipient] =
        await tx`select a.email, a.captain_name from aevic_platform.communication_email e
        join aevic_platform.account_identity a on a.id=e.account_id
        join aevic_platform.communication_rules r on r.kind=e.kind and r.enabled and r.email
        left join aevic_platform.team_details original on original.team_id=a.original_team_id
        left join aevic_platform.notification_preferences p on p.user_id=a.id
        where e.id=${mail.id} and coalesce(a.email_verified_at,original.email_verified_at) is not null
          and a.status <> 'banned' and (e.kind='welcome' or (e.kind='champion'
            and (p.preferences->'channels'->'email') is distinct from 'false'::jsonb
            and (p.preferences->'events'->'results') is distinct from 'false'::jsonb
            and exists(select 1 from aevic_platform.team_authority ta join public.teams t on t.id=ta.team_id
              left join aevic_platform.team_details d on d.team_id=t.id
              where ta.account_id=a.id and ta.team_id=e.team_id and ta.role in ('OWNER','CAPTAIN')
                and d.archived_at is null and coalesce(t.status,'active') <> 'banned')
            and exists(select 1 from aevic.tournaments t where t.id=e.tournament_id and t.status='completed'
              and exists(select 1 from aevic.matches m where m.tournament_id=t.id)
              and not exists(select 1 from aevic.matches m where m.tournament_id=t.id and m.published_at is null))
            and (select s.standings->0 from aevic_platform.leaderboard_snapshots s where s.tournament_id=e.tournament_id
              order by s.published_at desc,s.id desc limit 1) @> jsonb_build_object('teamId',e.team_id::text,'rank',1)))`;
      if (!recipient || !z.email().max(254).safeParse(recipient.email).success) {
        await tx`update aevic_platform.communication_email set status='skipped', updated_at=now() where id=${mail.id}`;
        return null;
      }
      await tx`update aevic_platform.communication_email set status='sending', attempts=attempts+1, updated_at=now() where id=${mail.id}`;
      return { mail, email: String(recipient.email), name: String(recipient.captain_name ?? '') };
    });
    if (!claim) return;
    const { mail, email, name } = claim;
    let status: 'sent' | 'failed' | 'retry' | 'uncertain' = 'sent';
    try {
      const message = communicationEmail(config.siteUrl, mail, name);
      await send(config, email, message);
    } catch (error) {
      status =
        error instanceof MailDeliveryError
          ? error.disposition
          : error instanceof ServiceError && error.code === 'EMAIL_NOT_CONFIGURED'
            ? 'retry'
            : 'uncertain';
      if (status === 'retry' && mail.attempts + 1 >= maxAttempts) status = 'failed';
    }
    const delay = status === 'retry' ? retryDelays[mail.attempts] : 0;
    await sql`update aevic_platform.communication_email set status=${status}, updated_at=now(),
      next_attempt_at=now()+${delay}*interval '1 minute' where id=${mail.id} and status='sending'`;
  }
  // Claim only immediately dispatchable work, within scheduled-function runtime.
  const workers = await Promise.allSettled(Array.from({ length: 4 }, () => deliverOne()));
  const failed = workers.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
}
