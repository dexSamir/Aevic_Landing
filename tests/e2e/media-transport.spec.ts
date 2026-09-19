import { expect, test } from '@playwright/test';

test('large accepted brand sources are resized below the binary transport limit', async ({ page }) => {
  await page.goto('/team/profile');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/prepareBrandImage.ts';
    const { prepareBrandImage } = await import(/* @vite-ignore */ modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 2800; canvas.height = 600;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    for (let start = 0; start < pixels.data.length; start += 65536) crypto.getRandomValues(pixels.data.subarray(start, start + 65536));
    for (let index = 3; index < pixels.data.length; index += 4) pixels.data[index] = 255;
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'));
    const file = await prepareBrandImage(new File([blob], 'banner.png', { type: 'image/png' }), 'banner');
    const bitmap = await createImageBitmap(file);
    const output = { original: blob.size, size: file.size, mime: file.type, width: bitmap.width, height: bitmap.height };
    bitmap.close(); return output;
  });
  expect(result.original).toBeGreaterThan(4_000_000);
  expect(result.original).toBeLessThan(6_000_000);
  expect(result.size).toBeLessThan(4_000_000);
  expect(result.mime).toBe('image/webp');
  expect(result.width).toBe(2400);
  expect(result.height).toBeGreaterThanOrEqual(300);
});
