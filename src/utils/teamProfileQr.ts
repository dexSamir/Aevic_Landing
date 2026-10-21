import QRCode from 'qrcode';
import QRCodeStyling from 'qr-code-styling';

// Keep vector geometry until the shared card renderer draws at export resolution.
// Even the smallest QR matrix (21 modules) has a four-module quiet zone.
const assets = new Map<string, Promise<HTMLImageElement>>();

export function loadTeamProfileQr(profileUrl: string): Promise<HTMLImageElement> {
  const cached = assets.get(profileUrl);
  if (cached) return cached;
  const pending = (async () => {
    // Four quiet-zone modules, scaled to the actual encoded URL's matrix.
    const modules = QRCode.create(profileUrl, { errorCorrectionLevel: 'M' }).modules.size;
    const margin = 728 * 4 / (modules + 8);
    const qr = new QRCodeStyling({
      type: 'svg', width: 728, height: 728, margin,
      data: profileUrl,
      // No logo occlusion: M keeps modules readable in the dense Square layout.
      qrOptions: { errorCorrectionLevel: 'M' },
      backgroundOptions: { color: '#17191E', round: .16 },
      dotsOptions: { type: 'rounded', color: '#DCE0E8', roundSize: false },
      cornersSquareOptions: { type: 'extra-rounded', color: '#DCE0E8' },
      cornersDotOptions: { type: 'rounded', color: '#F3C450' },
    });
    const svg = await qr.getRawData('svg');
    if (!(svg instanceof Blob)) throw new Error('QR generation failed');
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await svg.text())}`;
    const image = new Image();
    image.src = source;
    await image.decode();
    return image;
  })();
  assets.set(profileUrl, pending);
  // Bound memory across team navigation; failed renders remain retryable.
  if (assets.size > 24) assets.delete(assets.keys().next().value!);
  void pending.catch(() => { if (assets.get(profileUrl) === pending) assets.delete(profileUrl); });
  return pending;
}
