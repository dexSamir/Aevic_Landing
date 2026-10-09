import type { SocialLinks, SocialPlatform } from '../types/domain';
import { normalizeSocialUrl } from '../utils/lifecycle';

// Public destinations only. Never put credentials or signed URLs in these settings.
export const emailSocialDefaults: SocialLinks = {
  instagram: 'https://www.instagram.com/aevicesports',
  tiktok: 'https://www.tiktok.com/@aevicesports',
  linkedin: 'https://www.linkedin.com/company/109203444/',
  x: 'https://x.com/aevicesports',
};
export function publicSocialLinks(env: Record<string, unknown>, defaults: SocialLinks = {}): SocialLinks {
  const result: SocialLinks = {};
  for (const platform of ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'discord', 'twitch', 'website'] as SocialPlatform[]) {
    const value = env[`VITE_AEVIC_${platform.toUpperCase()}_URL`] ?? defaults[platform];
    if (typeof value !== 'string' || !value.trim()) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !normalizeSocialUrl(platform, value).ok) continue;
      result[platform] = value;
    } catch { /* Invalid public destinations are omitted, including in email HTML. */ }
  }
  return result;
}
