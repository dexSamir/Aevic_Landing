/** Shared, on-demand DOM export for official posters and chart snapshots. */
const imageTimeout = 12_000;
async function readyImage(image: HTMLImageElement) {
  image.loading = 'eager';
  if (!image.complete) await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); image.removeEventListener('load', loaded); image.removeEventListener('error', failed);
      error ? reject(error) : resolve();
    };
    const loaded = () => finish();
    const failed = () => finish(new Error('Export image unavailable'));
    const timer = window.setTimeout(failed, imageTimeout);
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', failed, { once: true });
    if (image.complete) loaded();
  });
  if (!image.naturalWidth) throw new Error('Export image is empty');
  await image.decode();
}

export async function renderPng(node: HTMLElement, options: { width?: number; backgroundColor?: string } = {}) {
  await document.fonts.ready;
  const width = node.offsetWidth, height = node.scrollHeight;
  if (!width || !height) throw new Error('Export surface has no dimensions');
  // Isolate asset preparation from the visible React tree. Keep the same CSS ancestry.
  const clone = node.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', width: `${width}px`, height: `${height}px`, margin: '0', transform: 'none', pointerEvents: 'none' });
  clone.setAttribute('aria-hidden', 'true');
  node.parentElement!.appendChild(clone);
  try {
    const originals = Array.from(node.querySelectorAll('img'));
    await Promise.all(Array.from(clone.querySelectorAll('img')).map(async (image, index) => {
      const original = originals[index];
      try {
        let source = original;
        if (new URL(original.currentSrc || original.src, location.href).origin !== location.origin && !original.src.startsWith('data:')) {
          source = new Image(); source.crossOrigin = 'anonymous'; source.src = original.currentSrc || original.src;
        }
        await readyImage(source);
        // Reuse decoded pixels. No cache-busted second request for each logo/map.
        const canvas = document.createElement('canvas');
        canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(source, 0, 0);
        image.parentElement?.querySelectorAll('source').forEach(source => source.remove());
        image.removeAttribute('srcset'); image.removeAttribute('sizes');
        image.src = canvas.toDataURL('image/png');
        await image.decode();
        canvas.width = canvas.height = 0;
      } catch (error) {
        if (original.hasAttribute('data-export-required')) throw error;
        // Optional art must not discard standings. Identity text stays in the DOM;
        // branded images retain their accessible name as a text fallback.
        const fallback = document.createElement('span');
        fallback.className = image.className;
        fallback.textContent = original.alt;
        fallback.style.cssText = `display:grid;place-items:center;width:${original.offsetWidth}px;height:${original.offsetHeight}px;color:inherit;font:inherit`;
        image.replaceWith(fallback);
      }
    }));
    const { toPng } = await import('html-to-image');
    const url = await toPng(clone, {
      cacheBust: false,
      preferredFontFormat: 'woff2',
      width, height,
      pixelRatio: options.width ? options.width / width : 2,
      backgroundColor: options.backgroundColor ?? getComputedStyle(node).backgroundColor,
      style: { position: 'relative', left: '0', top: '0', transform: 'none' },
      filter: element => !(element instanceof Element && element.hasAttribute('data-export-exclude')),
    });
    if (!url.startsWith('data:image/png;base64,') || url.length < 100) throw new Error('PNG encoding failed');
    return url;
  } finally { clone.remove(); }
}
export function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
