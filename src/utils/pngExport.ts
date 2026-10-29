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
  const width = node.offsetWidth;
  // Clipped decorative pseudo-elements must not enlarge a square poster. Long
  // standings use an intrinsically growing root, not a scrolling viewport.
  const height = getComputedStyle(node).overflow === 'hidden' ? node.offsetHeight : Math.max(node.offsetHeight, node.scrollHeight);
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
    // html-to-image deep-clones SVG without visiting its children. Freeze their
    // computed paint/text styles so class-based chart series survive serialization.
    clone.querySelectorAll('svg *').forEach(element => {
      if (!(element instanceof SVGElement)) return;
      const computed = getComputedStyle(element);
      for (const property of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight']) {
        element.style.setProperty(property, computed.getPropertyValue(property));
      }
    });
    const { toCanvas } = await import('html-to-image');
    const canvas = await toCanvas(clone, {
      cacheBust: false,
      preferredFontFormat: 'woff2',
      width, height,
      pixelRatio: options.width ? options.width / width : 2,
      backgroundColor: options.backgroundColor ?? getComputedStyle(node).backgroundColor,
      // Reset logical offsets too: Chromium serializes inset-inline-start along
      // with left, otherwise the cloned content remains 100,000px off-canvas.
      style: { position: 'relative', inset: 'auto', insetInline: 'auto', insetBlock: 'auto', left: '0', top: '0', transform: 'none' },
      filter: element => !(element instanceof Element && element.hasAttribute('data-export-exclude')),
    });
    const sample = document.createElement('canvas'); sample.width = sample.height = 32;
    const context = sample.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(canvas, 0, 0, 32, 32);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    let varied = false;
    for (let i = 4; i < pixels.length; i += 4) {
      if (Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 30) { varied = true; break; }
    }
    if (!varied) throw new Error('Export contains no visible content');
    const url = canvas.toDataURL('image/png');
    canvas.width = canvas.height = 0;
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
