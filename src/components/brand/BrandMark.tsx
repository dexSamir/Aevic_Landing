import { Link } from 'react-router-dom';
import officialLogo from '../../assets/brand/aevic-phoenix-144.png';
import officialLogoSource from '../../assets/brand/aevic-phoenix-source.png';
import { modernImageSources, restoreLocalImageFallback, useLocalImageFallback } from '../../assets/imageDelivery';

export type AevicBrandVariant = 'compact' | 'navigation' | 'signature' | 'sharecard';

function resolveVariant(variant?: AevicBrandVariant, compact?: boolean): AevicBrandVariant {
  return variant ?? (compact ? 'compact' : 'navigation');
}

export function BrandEmblem({ compact = false, variant, className = '', decorative = true }: { compact?: boolean; variant?: AevicBrandVariant; className?: string; decorative?: boolean }) {
  const resolvedVariant = resolveVariant(variant, compact);
  const sources = modernImageSources(officialLogo, [72, 108, 144]);
  const imageRef = useLocalImageFallback(officialLogo);
  return <span className={`brand-emblem brand-emblem--${resolvedVariant} ${className}`}><picture>{sources?.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes="72px" />)}<img ref={imageRef} src={officialLogo} alt={decorative ? '' : 'AEVIC Esports rəsmi phoenix loqosu'} width={54} height={54} onError={(event) => restoreLocalImageFallback(event, officialLogo)} /></picture></span>;
}

export function BrandMark({ compact = false, variant }: { compact?: boolean; variant?: Exclude<AevicBrandVariant, 'sharecard'> }) {
  const resolvedVariant = resolveVariant(variant, compact);
  return <Link to="/" className={`brand-mark brand-mark--${resolvedVariant}`} aria-label="AEVIC Esports ana səhifə"><BrandEmblem variant={resolvedVariant} /><span className="sr-only">AEVIC Esports</span></Link>;
}

export function PhoenixVisual({ className = '' }: { className?: string }) {
  return <figure className={`phoenix-visual ${className}`}><img src={officialLogoSource} alt="AEVIC-in rəsmi qızılı, bənövşəyi və qırmızı həndəsi phoenix emblemi" /></figure>;
}
