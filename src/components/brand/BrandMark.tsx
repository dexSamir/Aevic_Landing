import { useBranding } from '../site/SiteContent';
import { brandAssetUrl } from '../../content/branding';
import { Link } from 'react-router-dom';
import officialLogo from '../../assets/brand/aevic-phoenix-144.png';
import officialLogoWebp from '../../assets/brand/aevic-phoenix-144.webp';
import officialLogoSource from '../../assets/brand/aevic-phoenix-source.png';
import { restoreLocalImageFallback, useLocalImageFallback } from '../../assets/imageDelivery';

export type AevicBrandVariant = 'compact' | 'navigation' | 'signature' | 'sharecard';

function resolveVariant(variant?: AevicBrandVariant, compact?: boolean): AevicBrandVariant {
  return variant ?? (compact ? 'compact' : 'navigation');
}

export function BrandEmblem({ compact = false, variant, className = '', decorative = true }: { compact?: boolean; variant?: AevicBrandVariant; className?: string; decorative?: boolean }) {
  const resolvedVariant = resolveVariant(variant, compact);
  const brand=useBranding();
  const custom=brandAssetUrl((resolvedVariant==='compact' && brand?.assets.alternate) || brand?.assets.logo);
  const sources = custom ? [] : [{ type: 'image/webp', srcSet: `${officialLogoWebp} 144w` }];
  const imageRef = useLocalImageFallback(officialLogo);
  return <span className={`brand-emblem brand-emblem--${resolvedVariant} ${className}`}><picture>{sources?.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes="72px" />)}<img ref={imageRef} src={custom??officialLogo} alt={decorative ? '' : (brand?.name??'AEVIC Esports')+' loqosu'} width={54} height={54} onError={(event) => restoreLocalImageFallback(event, officialLogo)} /></picture></span>;
}

export function BrandMark({ compact = false, variant }: { compact?: boolean; variant?: Exclude<AevicBrandVariant, 'sharecard'> }) {
  const resolvedVariant = resolveVariant(variant, compact);
  const name=useBranding()?.name??'AEVIC Esports';
  return <Link to="/" className={`brand-mark brand-mark--${resolvedVariant}`} aria-label={name+" ana səhifə"}><BrandEmblem variant={resolvedVariant} /><span className="sr-only">{name}</span></Link>;
}

export function PhoenixVisual({ className = '' }: { className?: string }) {
  return <figure className={`phoenix-visual ${className}`}><img src={officialLogoSource} alt="AEVIC-in rəsmi qızılı, bənövşəyi və qırmızı həndəsi phoenix emblemi" /></figure>;
}
