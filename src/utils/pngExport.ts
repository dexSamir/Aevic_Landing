/** Shared, on-demand DOM export for official posters and chart snapshots. */
export async function renderPng(node: HTMLElement, options: { width?: number; backgroundColor?: string } = {}) {
  await document.fonts.ready;
  await Promise.all(Array.from(node.querySelectorAll('img')).map(async image => {
    image.loading = 'eager';
    if (!image.complete) await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error('Image failed to load')), { once: true });
    });
    if (image.decode) await image.decode().catch(() => undefined);
  }));
  const { toPng } = await import('html-to-image');
  return toPng(node, {
    cacheBust: true,
    pixelRatio: options.width ? Math.max(1, options.width / node.offsetWidth) : 2,
    backgroundColor: options.backgroundColor ?? getComputedStyle(node).backgroundColor,
    filter: element => !(element instanceof Element && element.hasAttribute('data-export-exclude')),
  });
}
export function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
