import { ApiError } from './apiError';

export function mediaUploadError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sessiyanın vaxtı bitib. Yenidən daxil olub şəkli yükləyin.';
    if (error.status === 403) return 'Bu komandanın şəklini dəyişmək üçün icazəniz yoxdur.';
    if (error.status === 413 || error.code === 'FILE_TOO_LARGE') return 'Şəkil 4 MB-dan böyük olmamalıdır.';
    if (['INVALID_IMAGE', 'INVALID_FILE_TYPE', 'MIME_MISMATCH'].includes(error.code)) return 'Etibarlı PNG, JPG və ya WebP şəkli seçin.';
    if (error.code === 'MEDIA_UPLOAD_NOT_CONFIGURED') return 'Şəkil yükləmə xidməti konfiqurasiya edilməyib. Daha sonra yenidən cəhd edin.';
    if (error.code === 'MEDIA_UPLOAD_FAILED') return 'Şəkil xidmətə yüklənmədi. Mövcud şəkliniz saxlanılıb. Yenidən cəhd edin.';
    if (error.status === 429) return 'Çox sayda şəkil yükləmə cəhdi edildi. Bir az gözləyib yenidən cəhd edin.';
    if (error.status === 0 || error.kind === 'timeout') return 'Yükləmənin nəticəsi təsdiqlənmədi. Bağlantını yoxlayıb səhifəni yeniləyin.';
  }
  return 'Şəkil yüklənmədi. Formatı, ölçünü və bağlantını yoxlayın.';
}
