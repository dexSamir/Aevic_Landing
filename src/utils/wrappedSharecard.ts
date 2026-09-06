import type { ProfileCardFormat, WrappedSummary } from '../types/domain';

const formats: Record<ProfileCardFormat, [number, number]> = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
};

export function wrappedCardSize(format: ProfileCardFormat) {
  return formats[format];
}

export function drawWrappedSharecard(canvas: HTMLCanvasElement, summary: WrappedSummary, format: ProfileCardFormat, preview = false) {
  const [targetWidth, targetHeight] = formats[format];
  const scale = preview ? Math.min(540 / targetWidth, 640 / targetHeight) : 1;
  canvas.width = Math.round(targetWidth * scale);
  canvas.height = Math.round(targetHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  const { width, height } = { width: targetWidth, height: targetHeight };
  context.fillStyle = '#09090b';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#17171b';
  context.beginPath(); context.moveTo(width * .44, 0); context.lineTo(width, 0); context.lineTo(width, height * .68); context.lineTo(width * .76, height); context.lineTo(width * .18, height); context.closePath(); context.fill();
  context.fillStyle = '#f3c450';
  context.beginPath(); context.moveTo(width * .78, 0); context.lineTo(width, 0); context.lineTo(width, height * .24); context.closePath(); context.fill();
  context.fillStyle = '#6a1b9a';
  context.globalAlpha = .55;
  context.beginPath(); context.moveTo(0, height * .7); context.lineTo(width * .22, height * .58); context.lineTo(width * .12, height); context.lineTo(0, height); context.closePath(); context.fill();
  context.globalAlpha = 1;
  const pad = width * .085;
  context.fillStyle = '#f3c450'; context.font = `700 ${width * .035}px Orbitron, sans-serif`; context.fillText(`AEVIC WRAPPED ${summary.period.label}`, pad, height * .095);
  context.fillStyle = '#f5f4f0'; context.font = `800 ${width * .082}px Orbitron, sans-serif`;
  const name = summary.entity.name.toLocaleUpperCase('az');
  context.fillText(name, pad, height * .19, width * .82);
  const metrics = [
    [summary.matches, 'MATÇ'], [summary.kills, 'KILL'], [summary.wwcd, 'WWCD'], [summary.podiums, 'PODIUM'],
  ] as const;
  const top = height * .34; const rowGap = height * .18;
  metrics.forEach(([value, label], index) => {
    const column = index % 2; const row = Math.floor(index / 2);
    const x = pad + column * width * .44; const y = top + row * rowGap;
    context.fillStyle = '#f5f4f0'; context.font = `800 ${width * .105}px Orbitron, sans-serif`; context.fillText(String(value), x, y);
    context.fillStyle = '#b6b3ac'; context.font = `700 ${width * .028}px Raleway, sans-serif`; context.fillText(label, x, y + width * .045);
  });
  if (summary.bestMap) {
    context.fillStyle = '#b6b3ac'; context.font = `600 ${width * .026}px Raleway, sans-serif`; context.fillText('ƏN GÜCLÜ XƏRİTƏ', pad, height * .76);
    context.fillStyle = '#f3c450'; context.font = `800 ${width * .07}px Orbitron, sans-serif`; context.fillText(summary.bestMap.map.toLocaleUpperCase('az'), pad, height * .82);
  }
  context.fillStyle = '#f5f4f0'; context.font = `700 ${width * .032}px Orbitron, sans-serif`; context.fillText('AEVIC', pad, height - pad * .62);
  context.fillStyle = '#8d8a83'; context.font = `500 ${width * .022}px Raleway, sans-serif`; context.textAlign = 'right'; context.fillText('aevic.gg', width - pad, height - pad * .62);
  context.textAlign = 'left';
}

export function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
