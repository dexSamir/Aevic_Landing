/** Keep multipart uploads below Netlify's binary request limit, before transport. */
export async function prepareBrandImage(file: File, kind: 'logo' | 'banner'): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const minimum = kind === 'logo' ? [512, 512] : [960, 300];
    if (bitmap.width < minimum[0] || bitmap.height < minimum[1] || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('INVALID_IMAGE_DIMENSIONS');
    }
    const scale = Math.min(1, (kind === 'logo' ? 1024 : 2400) / bitmap.width, kind === 'logo' ? 1024 / bitmap.height : 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('IMAGE_PROCESSING_FAILED')), 'image/webp', 0.9));
    if (blob.size > 4_000_000) throw new Error('FILE_TOO_LARGE');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.png'), { type: blob.type });
  } finally {
    bitmap.close();
  }
}
