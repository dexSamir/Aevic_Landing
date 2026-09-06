import { sanitizeOutboundUrl } from './outboundUrl.js';
import type { PointFormula, SocialPlatform } from '../types/domain';

export function passwordRequirements(value: string) {
  return {
    minimumLength: value.length >= 8,
    uppercase: /[A-ZƏÖÜĞÇŞİ]/.test(value),
    number: /\d/.test(value),
  };
}

const socialHosts: Partial<Record<SocialPlatform, string[]>> = {
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
  x: ['x.com', 'twitter.com'],
  discord: ['discord.com', 'discord.gg'],
  twitch: ['twitch.tv'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
};

export function normalizeSocialUrl(platform: SocialPlatform, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: '' };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`); }
  catch { return { ok: false, reason: 'Düzgün URL daxil edin.' }; }
  if (!sanitizeOutboundUrl(url.toString())) return { ok: false, reason: 'Yalnız HTTPS keçidləri qəbul olunur.' };
  const expected = socialHosts[platform];
  if (expected && !expected.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return { ok: false, reason: `${platform} üçün uyğun platforma keçidi daxil edin.` };
  url.hash = '';
  return { ok: true, value: url.toString() };
}

export interface RoundReviewRow {
  teamId: string;
  placement: number;
  finishes: number;
  penalty: number;
  total: number;
}

export function reviewRoundResults(rows: RoundReviewRow[], formula: PointFormula) {
  const issues: string[] = [];
  if (!rows.length) issues.push('Ən azı bir komanda nəticəsi tələb olunur.');
  const placements = rows.map((row) => row.placement);
  if (new Set(placements).size !== placements.length) issues.push('Təkrarlanan placement var.');
  rows.forEach((row) => {
    if (!Number.isInteger(row.placement) || row.placement < 1) issues.push(`${row.teamId}: placement etibarlı deyil.`);
    if (!Number.isInteger(row.finishes) || row.finishes < 0) issues.push(`${row.teamId}: kill sayı etibarlı deyil.`);
    if (row.penalty < 0) issues.push(`${row.teamId}: penalty mənfi ola bilməz.`);
    const placementPoints = formula.placement.find((item) => item.placement === row.placement)?.points ?? 0;
    const expected = placementPoints + row.finishes * formula.finishPointValue + (row.placement === 1 ? formula.wwcdBonus : 0) - row.penalty;
    if (row.total !== expected) issues.push(`${row.teamId}: total point formula ilə uyğun gəlmir.`);
  });
  return { valid: issues.length === 0, issues };
}

export function isDisputeWindowOpen(deadlineAt: string, now = Date.now()) {
  const deadline = Date.parse(deadlineAt);
  return Number.isFinite(deadline) && now <= deadline;
}
