import { useEffect, useRef } from 'react';
import { FileUpload } from '../common/primitives';
import { services } from '../../services';

export default function TeamMediaPreview({ teamId, onPreview }: { teamId: string; onPreview: (type: 'logo' | 'banner', url: string) => void }) {
  const urls = useRef<Partial<Record<'logo' | 'banner', string>>>({});
  useEffect(() => () => { Object.values(urls.current).forEach(url => URL.revokeObjectURL(url)); }, []);
  const validate = (assetType: 'logo' | 'banner') => async (file: File) => {
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      const result = await services.media.validateBrandAsset({ ownerType: 'team', ownerId: teamId, assetType, fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: bitmap.width, height: bitmap.height });
      return result.ok ? undefined : result.reason ?? 'Şəkil ölçüləri tələblərə uyğun deyil.';
    } catch { return 'Şəkil oxunmadı. PNG, JPG və ya WebP seçin.'; }
    finally { bitmap?.close(); }
  };
  return <div className="form-grid">{(['logo', 'banner'] as const).map(type => <FileUpload key={type} label={type === 'logo' ? 'Logo önbaxışı' : 'Banner önbaxışı'} accept={['image/png', 'image/jpeg', 'image/webp']} maxBytes={6_000_000} hint="PNG, JPG, WebP · maksimum 6 MB · yalnız lokal önbaxış" validators={[validate(type)]} onFile={file => { const url = URL.createObjectURL(file); if (urls.current[type]) URL.revokeObjectURL(urls.current[type]!); urls.current[type] = url; onPreview(type, url); }} />)}</div>;
}
