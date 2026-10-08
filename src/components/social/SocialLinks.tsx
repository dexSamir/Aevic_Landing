import { Globe2, RadioTower } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { SocialLinks as SocialLinkMap, SocialPlatform } from '../../types/domain';
import { sanitizeOutboundUrl } from '../../utils/outboundUrl';
import { normalizeSocialUrl } from '../../utils/lifecycle';

type SocialIconProps = SVGProps<SVGSVGElement> & { size?: number };

function SocialGlyph({ size = 19, children, ...props }: SocialIconProps) {
  return <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{children}</svg>;
}

const Instagram = (props: SocialIconProps) => <SocialGlyph {...props}><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></SocialGlyph>;
const TikTok = (props: SocialIconProps) => <SocialGlyph {...props}><path d="M14.5 3v11.3a4.3 4.3 0 1 1-3.7-4.26v2.8a1.7 1.7 0 1 0 1.1 1.6V3h2.6Zm0 0c.38 2.3 1.75 3.72 4.1 4.2v2.7a7.6 7.6 0 0 1-4.1-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></SocialGlyph>;
const YouTube = (props: SocialIconProps) => <SocialGlyph {...props}><rect x="2.7" y="6" width="18.6" height="12" rx="4" stroke="currentColor" strokeWidth="1.8"/><path d="m10.2 9.2 5 2.8-5 2.8V9.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></SocialGlyph>;
const X = (props: SocialIconProps) => <SocialGlyph {...props}><path d="M5 4 19 20M19 4 5 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></SocialGlyph>;
const LinkedIn = (props: SocialIconProps) => <SocialGlyph {...props}><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10v7m0-10v.01M12 17v-4a3 3 0 0 1 6 0v4m-6 0v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></SocialGlyph>;
const Discord = (props: SocialIconProps) => <SocialGlyph {...props}><path d="M7.2 7.1A12 12 0 0 1 12 6c1.7 0 3.3.38 4.8 1.1 1.15 1.65 1.9 3.72 2.2 6.1a9.5 9.5 0 0 1-3.1 2.25l-.8-1.1c.5-.2.98-.44 1.4-.72-2.85 1.35-6.15 1.35-9 0 .43.28.9.52 1.4.72l-.8 1.1A9.5 9.5 0 0 1 5 13.2c.3-2.38 1.05-4.45 2.2-6.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="9.5" cy="11.5" r="1" fill="currentColor"/><circle cx="14.5" cy="11.5" r="1" fill="currentColor"/></SocialGlyph>;

const socialConfig: Record<SocialPlatform, { label: string; icon: ComponentType<SocialIconProps> }> = {
  instagram: { label: 'Instagram', icon: Instagram },
  tiktok: { label: 'TikTok', icon: TikTok },
  youtube: { label: 'YouTube', icon: YouTube },
  x: { label: 'X', icon: X },
  linkedin: { label: 'LinkedIn', icon: LinkedIn },
  discord: { label: 'Discord', icon: Discord },
  twitch: { label: 'Twitch', icon: RadioTower },
  website: { label: 'Website', icon: Globe2 },
};

export function isSafeSocialUrl(value: string) {
  return Boolean(sanitizeOutboundUrl(value));
}

export function SocialIconButton({ platform, url, ownerName, showLabel = false }: { platform: SocialPlatform; url: string; ownerName: string; showLabel?: boolean }) {
  const safeUrl = sanitizeOutboundUrl(url);
  if (!safeUrl || !normalizeSocialUrl(platform, safeUrl).ok) return null;
  const item = socialConfig[platform];
  const Icon = item.icon;
  return <a className="social-icon-button" href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`${ownerName} — ${item.label}`} title={`${ownerName} — ${item.label}`}><Icon size={19} /><span className={showLabel ? '' : 'sr-only'}>{item.label}</span></a>;
}

export function SocialLinks({ links, ownerName, compact = false }: { links?: SocialLinkMap; ownerName: string; compact?: boolean }) {
  const configured = Object.entries(links ?? {}).filter((entry): entry is [SocialPlatform, string] => Boolean(entry[1]) && isSafeSocialUrl(entry[1] as string) && normalizeSocialUrl(entry[0] as SocialPlatform, entry[1] as string).ok);
  if (!configured.length) return null;
  return <nav className={`social-links ${compact ? 'social-links--compact' : ''}`} aria-label={`${ownerName} sosial keçidləri`}>{configured.map(([platform, url]) => <SocialIconButton key={platform} platform={platform} url={url} ownerName={ownerName} showLabel={!compact} />)}</nav>;
}

export const officialPlatformSocialLinks: SocialLinkMap = {
  instagram: import.meta.env.VITE_AEVIC_INSTAGRAM_URL || undefined,
  tiktok: import.meta.env.VITE_AEVIC_TIKTOK_URL || undefined,
  youtube: import.meta.env.VITE_AEVIC_YOUTUBE_URL || undefined,
  x: import.meta.env.VITE_AEVIC_X_URL || undefined,
  linkedin: import.meta.env.VITE_AEVIC_LINKEDIN_URL || undefined,
  discord: import.meta.env.VITE_AEVIC_DISCORD_URL || undefined,
  twitch: import.meta.env.VITE_AEVIC_TWITCH_URL || undefined,
  website: import.meta.env.VITE_AEVIC_WEBSITE_URL || undefined,
};
