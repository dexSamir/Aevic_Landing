import { sanitizeOutboundUrl } from '../utils/outboundUrl';

export const brandRoutes = [
  '/',
  '/tournaments',
  '/teams',
  '/matches',
  '/leaderboard',
  '/organizations',
  '/regulations',
  '/support',
  '/contact',
  '/terms',
  '/privacy',
];
const brandHosts = [
  'instagram.com',
  'tiktok.com',
  'discord.gg',
  'discord.com',
  'youtube.com',
  'youtu.be',
  'x.com',
  'linkedin.com',
  'twitch.tv',
];
export function approvedBrandUrl(value: string) {
  if (brandRoutes.includes(value)) return value;
  const safe = sanitizeOutboundUrl(value.replace(/^http:\/\//i, 'https://'));
  if (!safe) return undefined;
  const url = new URL(safe);
  return brandHosts.includes(url.hostname.replace(/^www\./, '')) && !url.search && !url.hash ? safe : undefined;
}

export type LinkGroup = 'header' | 'footer' | 'social';
export interface BrandLink {
  label: string;
  href: string;
  visible: boolean;
}
export const assetLabels = {
  logo: 'Əsas loqo',
  alternate: 'Kompakt loqo',
  favicon: 'Sayt ikonu',
  fallback: 'Paylaşım şəkli',
};
export type BrandAsset = keyof typeof assetLabels;
export interface Branding {
  revision: number;
  name: string;
  description: string;
  seoDescription: string;
  assets: Partial<Record<BrandAsset, string>>;
  links: Partial<Record<LinkGroup, BrandLink[]>>;
}
export const defaultBranding: Branding = {
  revision: 0,
  name: 'AEVIC Esports',
  description: '',
  seoDescription: '',
  assets: {},
  links: {},
};
export function brandAssetUrl(id?: string) {
  return id && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)
    ? '/api/media/tournament-banners/' + id
    : undefined;
}
