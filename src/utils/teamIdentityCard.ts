import { publicImageUrl } from './mediaUrl';
import type { ProfileCardFormat, TeamProfileCardData } from '../types/domain';

export const teamIdentityCardSizes: Record<ProfileCardFormat, { width: number; height: number; label: string; use: string }> = {
  square: { width: 1080, height: 1080, label: '1:1', use: 'X · Discord' },
  portrait: { width: 1080, height: 1350, label: '4:5', use: 'Instagram feed' },
  story: { width: 1080, height: 1920, label: '9:16', use: 'Story · Status' },
};

export interface TeamIdentityCardAssets {
  logo?: CanvasImageSource;
  banner?: CanvasImageSource;
  qr?: CanvasImageSource;
}

export type TeamIdentityCardTemplate = 'identity' | 'career' | 'legacy' | 'social';

export interface TeamIdentityCardOptions {
  template: TeamIdentityCardTemplate;
  showStats: boolean;
  showQr: boolean;
}

export async function loadCardImage(source?: string, generatedPng = false) {
  const safeSource = generatedPng && source?.startsWith('data:image/png;base64,') ? source : publicImageUrl(source);
  if (!safeSource) return undefined;
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  image.src = safeSource;
  await image.decode();
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
  return source.filter((stat): stat is { label: string; value: number } => typeof stat.value === 'number' && stat.value > 0).slice(0, 4);
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
  context.fillStyle = '#9b9891'; context.font = '600 15px Raleway, sans-serif'; context.fillText('Komandanın təsdiqlənmiş AEVIC profilini aç', x + 28, y + 108, width - size - 70);
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
  const context = canvas.getContext('2d'); if (!context) return;
  context.fillStyle = '#070709'; context.fillRect(0, 0, width, height);
  const bannerHeight = format === 'story' ? 540 : format === 'portrait' ? 430 : 300;
  if (assets.banner) { context.save(); context.globalAlpha = .72; drawCover(context, assets.banner, 0, 0, width, bannerHeight); context.restore(); }
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

  if (format === 'square') {
    drawLogo(context, data, assets.logo, 76, 248, 190);
    context.fillStyle = '#f3c450'; context.font = '700 18px Raleway, sans-serif'; context.fillText(`${data.teamTag || 'PUBG MOBILE'} · AEVIC COMPETITOR`, 76, 478);
    const nameSize = fitText(context, data.teamName.toLocaleUpperCase('az'), 900, 68, 40); context.fillStyle = '#f5f4f0'; context.font = `800 ${nameSize}px Orbitron, sans-serif`; context.fillText(data.teamName.toLocaleUpperCase('az'), 76, 558, 900);
    if (data.organizationName || data.country) { context.fillStyle = '#aaa69e'; context.font = '600 19px Raleway, sans-serif'; context.fillText([data.organizationName, data.country].filter(Boolean).join(' · '), 76, 600); }
    context.fillStyle = 'rgba(255,255,255,.1)'; context.fillRect(76, 642, 928, 1);
    drawRoster(context, data, 76, 668, 928);
    if (stats.length) drawStats(context, stats, 52, 770, 976, stats.length, 104);
    if (options.showQr) drawQrZone(context, data, assets.qr, 76, 900, 928, 136);
  } else if (format === 'portrait') {
    drawLogo(context, data, assets.logo, 76, 300, 238);
    context.fillStyle = '#f3c450'; context.font = '700 18px Raleway, sans-serif'; context.fillText(`${data.teamTag || 'PUBG MOBILE'} · OFFICIAL TEAM IDENTITY`, 350, 370);
    const nameSize = fitText(context, data.teamName.toLocaleUpperCase('az'), 650, 66, 38); context.fillStyle = '#f5f4f0'; context.font = `800 ${nameSize}px Orbitron, sans-serif`; context.fillText(data.teamName.toLocaleUpperCase('az'), 350, 455, 650);
    context.fillStyle = '#aaa69e'; context.font = '600 20px Raleway, sans-serif'; context.fillText([data.organizationName, data.country].filter(Boolean).join(' · ') || 'AEVIC COMPETITOR', 350, 500, 650);
    context.fillStyle = 'rgba(255,255,255,.1)'; context.fillRect(72, 590, 936, 1);
    drawRoster(context, data, 76, 642, 928);
    if (stats.length) drawStats(context, stats, 52, 748, 976, stats.length, 112);
    if (options.showQr) drawQrZone(context, data, assets.qr, 72, 940, 936, 210);
    if (data.sourceLabel) { context.fillStyle = '#8e8a82'; context.font = '500 16px Raleway, sans-serif'; context.fillText(data.sourceLabel, 72, 1268); }
  } else {
    drawLogo(context, data, assets.logo, 390, 390, 300);
    context.textAlign = 'center'; context.fillStyle = '#f3c450'; context.font = '700 22px Raleway, sans-serif'; context.fillText(`${data.teamTag || 'PUBG MOBILE'} · AEVIC TEAM IDENTITY`, width / 2, 758);
    const nameSize = fitText(context, data.teamName.toLocaleUpperCase('az'), 890, 82, 44); context.fillStyle = '#f5f4f0'; context.font = `800 ${nameSize}px Orbitron, sans-serif`; context.fillText(data.teamName.toLocaleUpperCase('az'), width / 2, 866, 890);
    context.fillStyle = '#aaa69e'; context.font = '600 22px Raleway, sans-serif'; context.fillText([data.organizationName, data.country].filter(Boolean).join(' · ') || 'AEVIC COMPETITOR', width / 2, 914); context.textAlign = 'left';
    context.fillStyle = 'rgba(255,255,255,.1)'; context.fillRect(92, 984, 896, 1);
    drawRoster(context, data, 96, 1030, 888, true);
    if (stats.length) drawStats(context, stats, 72, 1170, 936, stats.length, 120);
    if (options.showQr) drawQrZone(context, data, assets.qr, 72, 1430, 936, 210);
    if (data.sourceLabel || data.year) { context.fillStyle = '#8e8a82'; context.font = '500 17px Raleway, sans-serif'; context.fillText([data.sourceLabel, data.year].filter(Boolean).join(' · '), 72, 1770); }
  }
}

export function teamIdentityCardBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}
