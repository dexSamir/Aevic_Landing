import type { BrandAssetValidationResult, BrandUploadRequest } from '../types/domain';

export const brandAssetGuidance = {
  teamBanner: { recommendedWidth: 1600, recommendedHeight: 500, minimumWidth: 960, minimumHeight: 300 },
  organizationBanner: { recommendedWidth: 1600, recommendedHeight: 500, minimumWidth: 960, minimumHeight: 300 },
  logo: { recommendedWidth: 1024, recommendedHeight: 1024, minimumWidth: 512, minimumHeight: 512 },
} as const;

export function validateBrandAssetRequest(request: BrandUploadRequest): BrandAssetValidationResult {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(request.mimeType)) return { ok: false, reason: 'Use PNG, JPG or WebP.' };
  if (request.sizeBytes > 6_000_000) return { ok: false, reason: 'The file must be 6 MB or smaller.' };
  if (!Number.isFinite(request.width) || !Number.isFinite(request.height) || request.width < 1 || request.height < 1) return { ok: false, reason: 'Şəkil ölçüləri oxuna bilmədi. Başqa fayl seçin.' };
  const aspectRatio = request.width / request.height;
  if (request.assetType === 'logo') {
    const minimum = brandAssetGuidance.logo;
    if (request.width < minimum.minimumWidth || request.height < minimum.minimumHeight) return { ok: false, reason: `Logo ən azı ${minimum.minimumWidth} × ${minimum.minimumHeight} px olmalıdır. Seçilən fayl ${request.width} × ${request.height} px-dir.` };
    if (aspectRatio < 0.9 || aspectRatio > 1.1) return { ok: true, warning: `Logo kvadrat deyil (${request.width} × ${request.height} px). Kəsilməməsi üçün contain rejimi istifadə ediləcək.`, renderMode: 'contain' };
    return { ok: true, renderMode: 'contain' };
  }
  const minimum = request.ownerType === 'team' ? brandAssetGuidance.teamBanner : brandAssetGuidance.organizationBanner;
  if (request.width < minimum.minimumWidth || request.height < minimum.minimumHeight) return { ok: false, reason: `Banner ən azı ${minimum.minimumWidth} × ${minimum.minimumHeight} px olmalıdır. Seçilən fayl ${request.width} × ${request.height} px-dir.` };
  if (aspectRatio < 2.85 || aspectRatio > 3.55) return { ok: true, warning: `Banner 16:5 nisbətindən fərqlidir (${request.width} × ${request.height} px). Məcburi kəsilmə və böyütmənin qarşısını almaq üçün contain rejimi istifadə ediləcək.`, renderMode: 'contain' };
  return { ok: true, renderMode: 'cover' };
}
