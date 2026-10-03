import { useImageApproach } from '../../assets/useImageApproach';
import { publicImageUrl, publicImageSrcSet, restoreOriginalUpload } from '../../utils/mediaUrl';
import type { CSSProperties } from 'react';
import { restoreLocalImageFallback, useLocalImageFallback, type ResponsiveImageSource } from '../../assets/imageDelivery';

type MediaStyle = CSSProperties & {
  '--media-focal-desktop'?: string;
  '--media-focal-mobile'?: string;
};

export function MediaBackdrop({
  src,
  alt = '',
  className = '',
  priority = false,
  deferred = false,
  focalDesktop = '50% 50%',
  focalMobile = '50% 50%',
  width,
  height,
  srcSet,
  sizes,
  sources,
}: {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  deferred?: boolean;
  focalDesktop?: string;
  focalMobile?: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  sources?: readonly ResponsiveImageSource[];
}) {
  const safeSrc = publicImageUrl(src);
  const { pictureRef, ready } = useImageApproach(deferred && !priority);
  const imageRef = useLocalImageFallback(src, ready);
  if (!safeSrc) return null;
  const style: MediaStyle = { '--media-focal-desktop': focalDesktop, '--media-focal-mobile': focalMobile };
  return <div className={`media-backdrop ${className}`} style={style} aria-hidden={alt ? undefined : true}>
    <picture ref={pictureRef}>
      {ready && sources?.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />)}
      <img ref={imageRef} src={ready ? safeSrc : undefined} srcSet={ready ? srcSet ?? publicImageSrcSet(safeSrc, [480, 768, 1280, 1920]) : undefined} sizes={sizes ?? '100vw'} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={(event) => { if (!srcSet && restoreOriginalUpload(event.currentTarget)) return; restoreLocalImageFallback(event, src); }} />
    </picture>
    <span className="media-backdrop__shade" aria-hidden="true" />
  </div>;
}
