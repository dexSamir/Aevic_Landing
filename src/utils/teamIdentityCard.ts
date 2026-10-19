import { publicImageUrl } from './mediaUrl';
import type { ProfileCardFormat, TeamProfileCardData } from '../types/domain';

export const teamIdentityCardSizes: Record<ProfileCardFormat, { width: number; height: number; label: string; use: string }> = {
  square: { width: 1080, height: 1080, label: 'Square', use: '1:1' },
  portrait: { width: 1080, height: 1350, label: 'Post', use: '4:5' },
  story: { width: 1080, height: 1920, label: 'Story', use: '9:16' },
};

export interface TeamIdentityCardAssets {
  logo?: CanvasImageSource;
  background?: CanvasImageSource;
  qr?: CanvasImageSource;
}

export type TeamIdentityCardTemplate = 'identity' | 'career' | 'legacy' | 'social';

export interface TeamIdentityCardOptions {
  template: TeamIdentityCardTemplate;
  showStats: boolean;
  showQr: boolean;
  showMaps?: boolean;
  showRecent?: boolean;
  extended?: boolean;
  showRoster?: boolean;
}

export async function loadCardImage(source?: string, generatedPng = false) {
  const safeSource = generatedPng && source?.startsWith('data:image/png;base64,') ? source : publicImageUrl(source);
  if (!safeSource) return undefined;
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  image.src = safeSource;
  await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Image timed out')), 10000); image.decode().then(() => { clearTimeout(timer); resolve(); }, () => { clearTimeout(timer); reject(new Error('Image unavailable')); }); });
  return image;
}

function drawCover(context: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number) {
  const dimensions = image as CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number };
  const sourceWidth = dimensions.naturalWidth ?? dimensions.displayWidth ?? dimensions.width ?? width;
  const sourceHeight = dimensions.naturalHeight ?? dimensions.displayHeight ?? dimensions.height ?? height;
  const scale = Math.max(width / Number(sourceWidth), height / Number(sourceHeight));
  const cropWidth = width / scale; const cropHeight = height / scale;
  context.drawImage(image, (Number(sourceWidth) - cropWidth) / 2, (Number(sourceHeight) - cropHeight) / 2, cropWidth, cropHeight, x, y, width, height);
}

function drawContain(context: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number) {
  const dimensions = image as CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number };
  const sourceWidth = Number(dimensions.naturalWidth ?? dimensions.displayWidth ?? dimensions.width ?? width);
  const sourceHeight = Number(dimensions.naturalHeight ?? dimensions.displayHeight ?? dimensions.height ?? height);
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const renderedWidth = sourceWidth * scale; const renderedHeight = sourceHeight * scale;
  context.drawImage(image, x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight);
}

function polygon(context: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string) {
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath(); context.fillStyle = fill; context.fill();
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number, initial: number, minimum: number) {
  let size = initial;
  while (size > minimum) { context.font = `800 ${size}px Orbitron, sans-serif`; if (context.measureText(text).width <= maxWidth) break; size -= 2; }
  return size;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('az');
}

function drawLogo(context: CanvasRenderingContext2D, data: TeamProfileCardData, logo: CanvasImageSource | undefined, x: number, y: number, size: number) {
  context.save();
  const cx = x + size / 2; const cy = y + size / 2;
  const glow = context.createRadialGradient(cx, cy, size * .1, cx, cy, size * .85);
  glow.addColorStop(0, 'rgba(243,196,80,.22)'); glow.addColorStop(1, 'rgba(243,196,80,0)');
  context.fillStyle = glow; context.fillRect(x - size * .4, y - size * .4, size * 1.8, size * 1.8);
  if (logo) {
    drawContain(context, logo, x + size * .06, y + size * .06, size * .88, size * .88);
  } else {
    context.fillStyle = '#151519'; context.beginPath(); context.roundRect(x, y, size, size, size * .1); context.fill();
    context.strokeStyle = 'rgba(243,196,80,.3)'; context.lineWidth = 2; context.stroke();
    context.fillStyle = '#f3c450'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `800 ${size * .3}px Orbitron, sans-serif`; context.fillText(initials(data.teamName), x + size / 2, y + size / 2);
  }
  context.restore(); context.textAlign = 'left'; context.textBaseline = 'alphabetic';
}

export function selectSharecardStats(data: TeamProfileCardData, template: TeamIdentityCardTemplate) {
  const career = [
    { label: 'WWCD', value: data.wwcd },
    { label: 'ÇEMPİONLUQ', value: data.championships },
    { label: 'PODİUM', value: data.podiums },
    { label: 'MATÇ', value: data.matches },
    { label: 'KILL', value: data.finishes },
  ];
  const legacy = [career[1], career[0], career[2], career[3], career[4]];
  const identity = [career[3], career[0], career[1], career[2]];
  const source = template === 'legacy' ? legacy : template === 'identity' ? identity : career;
  return source.filter((stat): stat is { label: string; value: number } => typeof stat.value === 'number' && Number.isFinite(stat.value) && stat.value >= 0).slice(0, 4);
}

function drawStats(context: CanvasRenderingContext2D, stats: ReturnType<typeof selectSharecardStats>, x: number, y: number, width: number, columns: number, rowHeight: number) {
  const cellWidth = width / columns;
  stats.forEach((stat, index) => {
    const column = index % columns; const row = Math.floor(index / columns); const left = x + column * cellWidth; const top = y + row * rowHeight;
    if (column) { context.fillStyle = 'rgba(255,255,255,.12)'; context.fillRect(left, top + 8, 1, rowHeight - 16); }
    context.fillStyle = '#f5f4f0'; context.font = '800 48px Orbitron, sans-serif'; context.fillText(String(stat.value), left + 24, top + 54);
    context.fillStyle = '#9b9891'; context.font = '700 17px Raleway, sans-serif'; context.letterSpacing = '1px'; context.fillText(stat.label, left + 24, top + 82); context.letterSpacing = '0px';
  });
}

export function formatSharecardRoster(data: Pick<TeamProfileCardData, 'roster'>) {
  return data.roster.slice(0, 5).map((member) => member.ign.toUpperCase()).join(' • ');
}

function drawRoster(context: CanvasRenderingContext2D, data: TeamProfileCardData, x: number, y: number, width: number, center = false) {
  const roster = data.roster.slice(0, 5);
  context.fillStyle = '#f3c450'; context.font = '800 17px Orbitron, sans-serif'; context.letterSpacing = '2px'; context.fillText('PUBLIC ROSTER', x, y); context.letterSpacing = '0px';
  if (!roster.length) { context.fillStyle = '#9b9891'; context.font = '600 20px Raleway, sans-serif'; context.fillText('Public heyət dərc edilməyib', x, y + 44); return; }
  const names = roster.map((member) => member.ign.toUpperCase());
  let fontSize = 25; context.font = `700 ${fontSize}px Raleway, sans-serif`;
  const full = names.join(' • ');
  while (fontSize > 18 && context.measureText(full).width > width) { fontSize -= 1; context.font = `700 ${fontSize}px Raleway, sans-serif`; }
  let lines = [full];
  if (context.measureText(full).width > width) {
    const split = Math.ceil(names.length / 2);
    lines = [names.slice(0, split).join(' • '), names.slice(split).join(' • ')];
  }
  context.fillStyle = '#f5f4f0'; context.textAlign = center ? 'center' : 'left';
  lines.forEach((line, index) => context.fillText(line, center ? x + width / 2 : x, y + 46 + index * 34, width));
  context.textAlign = 'left';
}

function drawSignature(context: CanvasRenderingContext2D, width: number, top: number, pad: number) {
  context.fillStyle = '#f3c450'; context.font = '800 23px Orbitron, sans-serif'; context.fillText('AEVIC', pad, top);
  context.fillStyle = '#a7a39b'; context.font = '700 15px Raleway, sans-serif'; context.fillText('TEAM IDENTITY // COMPETITIVE LEGACY', pad + 96, top - 1);
  context.fillStyle = '#f3c450'; context.fillRect(width - pad - 92, top - 12, 92, 2);
}

function drawQrZone(context: CanvasRenderingContext2D, data: TeamProfileCardData, qr: CanvasImageSource | undefined, x: number, y: number, width: number, size: number) {
  const h = size + 28;
  context.fillStyle = 'rgba(255,255,255,.04)'; context.beginPath(); context.roundRect(x, y, width, h, 16); context.fill();
  context.strokeStyle = 'rgba(243,196,80,.4)'; context.lineWidth = 1.5; context.beginPath(); context.roundRect(x + .75, y + .75, width - 1.5, h - 1.5, 16); context.stroke();
  context.fillStyle = '#f3c450'; context.fillRect(x, y, Math.max(8, width * .012), h);
  context.fillStyle = '#f3c450'; context.font = '800 16px Orbitron, sans-serif'; context.fillText('SCAN // PUBLIC PROFILE', x + 30, y + 42);
  const path = data.profileUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  context.fillStyle = '#e9e6de'; context.font = '600 17px Raleway, sans-serif'; context.fillText(path, x + 28, y + 78, width - size - 70);
  context.fillStyle = '#9b9891'; context.font = '600 15px Raleway, sans-serif'; context.fillText('Komandanın ictimai AEVIC profilini aç', x + 28, y + 108, width - size - 70);
  if (qr) { const qrX = x + width - size - 14; const qrY = y + 14; context.fillStyle = '#f5f0dd'; context.beginPath(); context.roundRect(qrX - 8, qrY - 8, size + 16, size + 16, 10); context.fill(); context.drawImage(qr, qrX, qrY, size, size); }
}

function drawCornerBrackets(context: CanvasRenderingContext2D, width: number, height: number, pad: number, arm: number) {
  context.strokeStyle = 'rgba(243,196,80,.55)'; context.lineWidth = 2;
  const corners: Array<[number, number, number, number]> = [[pad, pad, 1, 1], [width - pad, pad, -1, 1], [pad, height - pad, 1, -1], [width - pad, height - pad, -1, -1]];
  corners.forEach(([x, y, dx, dy]) => { context.beginPath(); context.moveTo(x, y + arm * dy); context.lineTo(x, y); context.lineTo(x + arm * dx, y); context.stroke(); });
}

export function drawTeamIdentityCard(canvas: HTMLCanvasElement, data: TeamProfileCardData, format: ProfileCardFormat, assets: TeamIdentityCardAssets, options: TeamIdentityCardOptions = { template: 'identity', showStats: true, showQr: true }) {
  const { width, height } = teamIdentityCardSizes[format];
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#070709'; context.fillRect(0, 0, width, height);
  const bannerHeight = format === 'story' ? 540 : format === 'portrait' ? 430 : 300;
  if (assets.background) { context.save(); context.globalAlpha = .72; drawCover(context, assets.background, 0, 0, width, height); context.restore(); }
  const fade = context.createLinearGradient(0, 0, 0, bannerHeight + 260); fade.addColorStop(0, 'rgba(7,7,9,.22)'); fade.addColorStop(.68, 'rgba(7,7,9,.7)'); fade.addColorStop(1, '#070709'); context.fillStyle = fade; context.fillRect(0, 0, width, bannerHeight + 260);
  polygon(context, [[0, 0], [width * .22, 0], [width * .09, bannerHeight * .72], [0, bannerHeight]], 'rgba(106,27,154,.2)');
  polygon(context, [[width * .78, 0], [width, 0], [width, bannerHeight * .34], [width * .88, bannerHeight * .22]], 'rgba(243,196,80,.12)');
  const pad = 72;
  context.fillStyle = '#f3c450'; context.fillRect(0, 0, 12, height);
  const dividerY = format === 'story' ? 180 : 150;
  const divider = context.createLinearGradient(72, 0, width - 72, 0); divider.addColorStop(0, 'rgba(243,196,80,.55)'); divider.addColorStop(.5, 'rgba(255,255,255,.1)'); divider.addColorStop(1, 'rgba(243,196,80,.55)');
  context.fillStyle = divider; context.fillRect(72, dividerY, width - 144, 1);
  drawCornerBrackets(context, width, height, 28, 34);
  drawSignature(context, width, format === 'story' ? 118 : 92, pad);
  const stats = options.showStats ? selectSharecardStats(data, options.template) : [];

  const maps = options.showMaps ? (data.mapStats ?? []).filter(m => m.matches > 0).slice(0, options.extended ? 5 : 3) : [];
  const recent = options.showRecent ? [...(data.recentMatches ?? [])].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, 5) : [];
  const roster = options.showRoster !== false && data.roster.length > 0;
  const compact = format === 'square';
  const story = format === 'story';
  const extraHeight = (roster ? 110 : 0) + (stats.length ? 112 : 0) + (maps.length ? 42 + maps.length * 43 : 0) + (recent.length ? 110 : 0);
  const qrHeight = options.showQr ? (compact ? 155 : 210) : 0;
  const sectionScale = Math.min(1, (height - 520) / Math.max(1, qrHeight + extraHeight));
  const contentTop = height - 112 - (qrHeight + extraHeight) * sectionScale;
  const heroTop = dividerY + 40;
  const heroHeight = contentTop - heroTop - 30;
  // Each format has its own identity composition; optional sections consume real space.
  const logoSize = Math.min(story ? 310 : compact ? 200 : 240, heroHeight * (story ? .48 : .65));
  const centered = story;
  const logoX = centered ? (width - logoSize) / 2 : pad;
  const heroY = heroTop + Math.max(0, (heroHeight - logoSize - (story ? 180 : 0)) / 2);
  drawLogo(context, data, assets.logo, logoX, heroY, logoSize);
  const nameX = centered ? width / 2 : compact ? pad + logoSize + 36 : pad + logoSize + 40;
  const nameWidth = centered ? width - pad * 2 : width - pad - nameX;
  const nameY = centered ? heroY + logoSize + 94 : heroY + logoSize * .58;
  context.textAlign = centered ? 'center' : 'left';
  context.fillStyle = '#f3c450'; context.font = '700 18px Raleway, sans-serif';
  context.fillText(data.teamTag || 'PUBG MOBILE', nameX, nameY - 52, nameWidth);
  const nameSize = fitText(context, data.teamName.toLocaleUpperCase('az'), nameWidth, story ? 76 : 56, 30);
  context.fillStyle = '#f5f4f0'; context.font = `800 ${nameSize}px Orbitron, sans-serif`;
  context.fillText(data.teamName.toLocaleUpperCase('az'), nameX, nameY + 12, nameWidth);
  context.fillStyle = '#b6b3ac'; context.font = '600 20px Raleway, sans-serif';
  context.fillText([data.organizationName, data.country].filter(Boolean).join(' · ') || 'AEVIC ESPORTS', nameX, nameY + 56, nameWidth);
  context.textAlign = 'left';
  context.save();
  context.translate(0, contentTop); context.scale(1, sectionScale);
  let y = 0;
  context.fillStyle = 'rgba(243,196,80,.3)'; context.fillRect(pad, y - 24, width - pad * 2, 1);
  if (roster) { drawRoster(context, options.extended ? { ...data, roster: data.roster.map(member => ({ ...member, ign: `${member.ign} (${member.role})` })) } : data, pad, y, width - pad * 2); y += 110; }
  if (stats.length) { drawStats(context, stats, pad - 24, y, width - pad * 2 + 24, stats.length, 104); y += 112; }
  if (maps.length) {
    context.fillStyle = '#f3c450'; context.font = '700 17px Raleway, sans-serif';
    context.fillText('XƏRİTƏ / MATÇ / WWCD / ORTA YER', pad, y + 18); y += 42;
    for (const map of maps) {
      context.fillStyle = '#f5f4f0'; context.font = '600 22px Raleway, sans-serif';
      context.fillText(map.map.toLocaleUpperCase('az'), pad, y + 22, 380);
      context.textAlign = 'right';
      context.fillText(`${map.matches}  /  ${map.wwcd}  /  #${map.averagePlacement.toFixed(1)}`, width - pad, y + 22, 460);
      context.textAlign = 'left'; y += 43;
    }
  }
  if (recent.length) {
    context.fillStyle = '#f3c450'; context.font = '700 17px Raleway, sans-serif';
    context.fillText('SON 5 MATÇ', pad, y + 18);
    const cellWidth = (width - pad * 2) / recent.length;
    recent.forEach((match, index) => {
      const x = pad + index * cellWidth;
      context.fillStyle = match.wwcd ? '#f3c450' : '#202226';
      context.beginPath(); context.roundRect(x, y + 32, cellWidth - 12, 58, 10); context.fill();
      context.fillStyle = match.wwcd ? '#070709' : '#f5f4f0'; context.font = '700 22px Raleway, sans-serif';
      context.fillText(`${match.wwcd ? 'WWCD' : '#' + match.placement} · ${match.finishes} K`, x + 12, y + 68, cellWidth - 36);
    });
    y += 110;
  }
  if (options.showQr) drawQrZone(context, data, assets.qr, pad, y + 12, width - pad * 2, compact ? 116 : 170);
  context.restore();
  if (data.year) { context.fillStyle = '#a7a39b'; context.font = '500 16px Raleway, sans-serif'; context.textAlign = 'right'; context.fillText(`EST. ${data.year}`, width - pad, format === 'story' ? 142 : 116); context.textAlign = 'left'; }
  context.fillStyle = '#b6b3ac'; context.font = '500 16px Raleway, sans-serif';
  context.fillText(options.extended && data.sourceLabel || 'AEVIC ESPORTS · PUBLIC TEAM IDENTITY', pad, height - 48, width - pad * 2);

}

export function teamIdentityCardBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}

/** Horizontal public dossier card; the same canvas is previewed and exported. */
export function drawPublicTeamIdentityCard(canvas: HTMLCanvasElement, data: TeamProfileCardData, assets: TeamIdentityCardAssets) {
  canvas.width = 1200; canvas.height = 660;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#080a0b'; context.fillRect(0, 0, 1200, 660);
  if (assets.background) drawCover(context, assets.background, 0, 0, 950, 660);
  const shade = context.createLinearGradient(0, 0, 0, 660);
  shade.addColorStop(0, 'rgba(0,0,0,.65)'); shade.addColorStop(.4, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.8)');
  context.fillStyle = shade; context.fillRect(0, 0, 950, 660);
  context.fillStyle = '#ffd338'; context.font = '700 116px Oswald, sans-serif';
  if (assets.logo) drawContain(context, assets.logo, 40, 35, 160, 130);
  else context.fillText(initials(data.teamName), 40, 160, 170);
  context.fillStyle = '#f5f4f0'; context.font = '600 58px Oswald, sans-serif'; context.fillText(data.teamName, 240, 110, 665);
  context.fillStyle = '#ffd338'; context.font = '500 20px Oswald, sans-serif'; context.fillText(data.teamTag ?? '', 244, 153, 650);
  context.fillStyle = '#080a0b'; context.fillRect(950, 0, 250, 660);
  const stats = [{ value: data.matches, label: 'MATÇ' }, { value: data.finishes, label: 'KILL' }, { value: data.wwcd, label: 'WWCD' }, { value: data.championships, label: 'ÇEMPİONLUQ' }];
  stats.forEach((stat, i) => {
    const y = 95 + i * 139;
    context.fillStyle = '#ffd338'; context.font = '600 64px Oswald, sans-serif'; context.fillText(String(stat.value ?? '—'), 1004, y, 165);
    context.fillStyle = '#f5f4f0'; context.font = '500 21px Oswald, sans-serif'; context.fillText(stat.label, 1004, y + 31);
  });
  context.fillStyle = '#dedbd4'; context.font = '500 19px Oswald, sans-serif'; context.letterSpacing = '3px';
  context.fillText('PUBG MOBILE', 36, 602); context.fillText((data.country ?? '').toLocaleUpperCase('az'), 36, 634, 550);
  context.textAlign = 'right'; if (data.year) context.fillText(`EST. ${data.year}`, 912, 634); context.textAlign = 'left'; context.letterSpacing = '0px';
}
