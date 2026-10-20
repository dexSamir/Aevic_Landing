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

export function formatSharecardRoster(data: Pick<TeamProfileCardData, 'roster'>) {
  return data.roster.slice(0, 5).map((member) => member.ign.toUpperCase()).join(' • ');
}

/** Resolve optional content once for both the schematic preview and the PNG. */
export function resolveTeamCardOptions(data: TeamProfileCardData, options: TeamIdentityCardOptions): TeamIdentityCardOptions {
  return { ...options, showQr: Boolean(options.extended && options.showQr),
    showMaps: Boolean(options.extended && options.showMaps && data.mapStats?.some(map => map.matches > 0)),
    showRecent: Boolean(options.extended && options.showRecent && data.recentMatches?.length) };
}

/** All coordinates are in export pixels. Content ends before the exclusive branding zone. */
export function teamCardLayout(data: TeamProfileCardData, format: ProfileCardFormat, requested: TeamIdentityCardOptions) {
  const options = resolveTeamCardOptions(data, requested);
  const { width, height } = teamIdentityCardSizes[format];
  const pad = width * .065;
  const wordmarkHeight = width * .19;
  const wordmarkTop = height - wordmarkHeight;
  const maps = options.showMaps ? (data.mapStats ?? []).filter(map => map.matches > 0).slice(0, 5) : [];
  const recent = options.showRecent ? [...(data.recentMatches ?? [])].sort((a,b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0,5) : [];
  const stats = options.showStats ? selectSharecardStats(data, options.template) : [];
  const sections = [
    { id: 'header', height: 70 }, { id: 'team', height: 220 },
    ...(options.showRoster !== false ? [{ id: 'roster', height: 100 }] : []),
    ...(stats.length ? [{ id: 'stats', height: 110 }] : []),
    ...(maps.length ? [{ id: 'maps', height: 40 + maps.length * 54 }] : []),
    ...(recent.length ? [{ id: 'recent', height: 140 }] : []),
    ...(options.extended && data.sourceLabel ? [{ id: 'source', height: 44 }] : []),
    ...(options.showQr ? [{ id: 'qr', height: 170 }] : []),
  ];
  const naturalHeight = sections.reduce((sum, section) => sum + section.height, 0);
  const scale = Math.min(1, (wordmarkTop - pad * 1.4) / naturalHeight);
  // Taller formats give the identity breathing room without detaching the footer sections.
  sections[1].height += Math.max(0, (wordmarkTop - pad * 1.4) / scale - naturalHeight);
  let top = pad;
  const regions = sections.map(section => {
    const region = { ...section, top, height: section.height * scale };
    top += region.height;
    return region;
  });
  return { width, height, pad, wordmarkTop, wordmarkHeight, scale, regions, options, maps, recent, stats };
}

export function drawTeamIdentityCard(canvas: HTMLCanvasElement, data: TeamProfileCardData, format: ProfileCardFormat, assets: TeamIdentityCardAssets, requested: TeamIdentityCardOptions = { template: 'identity', showStats: true, showQr: false }, schematic = false) {
  const layout = teamCardLayout(data, format, requested);
  const { width, height, pad, wordmarkTop, scale, regions, options, maps, recent, stats } = layout;
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#090a0c'; context.fillRect(0, 0, width, height);
  polygon(context, [[0,0],[width*.2,0],[0,height*.2]], '#17181c');
  polygon(context, [[width*.7,0],[width*.86,0],[0,height*.65],[0,height*.5]], '#141519');
  polygon(context, [[width,height*.28],[width*.65,height*.4],[width,height*.55]], '#1c1b18');
  const contentWidth = width - pad * 2;
  // A uniform transform preserves typography, logos and QR aspect ratios even in dense square cards.
  const text = (value: string, x: number, y: number, size: number, maxWidth: number, kind: 'heading' | 'value' | 'brand' = 'value', color = '#e9e9ed') => {
    context.fillStyle = color;
    const family = kind === 'brand' ? 'Orbitron' : 'Raleway';
    let fitted = size;
    context.font = `${kind === 'value' ? 600 : 700} ${fitted}px ${family}, sans-serif`;
    while (context.measureText(value).width > maxWidth && fitted > 10) {
      fitted -= 1; context.font = `${kind === 'value' ? 600 : 700} ${fitted}px ${family}, sans-serif`;
    }
    if (context.measureText(value).width > maxWidth) {
      while (value.length && context.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
      value += '…';
    }
    if (schematic && kind === 'value') {
      context.fillStyle = '#494c54'; context.beginPath();
      context.roundRect(x, y - fitted * .75, Math.min(maxWidth, Math.max(fitted, context.measureText(value).width)), fitted * .7, 6); context.fill();
    } else context.fillText(value, x, y);
  };
  for (const region of regions) {
    context.save(); context.translate(pad, region.top); context.scale(scale, scale);
    const w = contentWidth / scale;
    const heading = (value: string, y = 22) => text(value, 0, y, 22, w, 'heading', '#f5ca49');
    switch (region.id) {
      case 'header':
        text('AEVIC', 0, 26, 30, 150, 'brand', '#f5ca49');
        text('TEAM IDENTITY // COMPETITIVE LEGACY', 165, 26, 17, w - 325, 'heading');
        if (data.year) text(`EST. ${data.year}`, w - 120, 26, 18, 120, 'heading', '#999ba3');
        break;
      case 'team':
        if (schematic) {
          context.fillStyle = '#22252b'; context.beginPath(); context.roundRect(0, 10, 180, 180, 14); context.fill();
          polygon(context, [[48,125],[78,72],[96,103],[118,65],[145,125]], '#494c54');
        } else drawLogo(context, data, assets.logo, 0, 10, 180);
        text('TEAM', 220, 42, 22, w - 220, 'heading', '#f5ca49');
        text(data.teamName, 220, 104, 46, w - 220);
        text([data.teamTag, data.organizationName, data.country].filter(Boolean).join(' · ') || 'AEVIC ESPORTS', 220, 150, 23, w - 220);
        break;
      case 'roster':
        heading('PUBLIC ROSTER');
        if (schematic && data.roster.length) {
          data.roster.slice(0, 5).forEach((member, index, roster) => text(member.ign, index * w / roster.length, 64, 25, w / roster.length - 20));
          break;
        }
        text(formatSharecardRoster(options.extended ? { ...data, roster: data.roster.map(member => ({ ...member, ign: `${member.ign} (${member.role})` })) } : data) || 'İctimai heyət dərc edilməyib', 0, 64, 25, w);
        break;
      case 'stats':
        stats.forEach((stat, index) => {
          const x = index * w / stats.length;
          text(String(stat.value), x, 48, 44, w / stats.length - 20);
          text(stat.label, x, 80, 18, w / stats.length - 20, 'heading', '#a6a7ae');
        }); break;
      case 'maps':
        heading('XƏRİTƏ STATİSTİKASI');
        maps.forEach((map, index) => {
          const y = 62 + index * 54;
          text(map.map.toLocaleUpperCase('az'), 0, y, 24, w * .45);
          text(`${map.matches} MATÇ · ${map.wwcd} WWCD · #${map.averagePlacement.toFixed(1)}`, w * .5, y, 21, w * .5);
        }); break;
      case 'recent': {
        heading('SON 5 MATÇ');
        const cell = Math.min(104, w / recent.length);
        recent.forEach((match, index) => {
          const x = (w - cell * recent.length) / 2 + index * cell;
          context.fillStyle = match.wwcd ? '#f5ca49' : '#1b1d22'; context.beginPath(); context.roundRect(x, 40, cell - 16, cell - 16, 12); context.fill();
          text(`${match.wwcd ? 'WWCD' : '#' + match.placement} · ${match.finishes} K`, x + 12, 40 + (cell - 16) / 2 + 7, 20, cell - 40, 'value', match.wwcd ? '#171819' : '#e9e9ed');
        }); break;
      }
      case 'source': text(data.sourceLabel!, 0, 25, 18, w); break;
      case 'qr':
        heading('SCAN // PUBLIC PROFILE', 35);
        text(data.profileUrl.replace(/^https?:\/\//, ''), 0, 78, 22, w - 180);
        text('Komandanın ictimai AEVIC profilini aç', 0, 115, 20, w - 180);
        if (assets.qr) context.drawImage(assets.qr, w - 150, 0, 150, 150);
        break;
    }
    context.restore();
  }
  // Measure the actual bundled face; never stretch letters or crop the wordmark.
  context.font = '800 200px Orbitron, sans-serif';
  const reference = context.measureText('AEVIC');
  const size = 200 * Math.min(width * .98 / reference.width, (height - wordmarkTop) * .96 / (reference.actualBoundingBoxAscent + reference.actualBoundingBoxDescent));
  context.font = `800 ${size}px Orbitron, sans-serif`;
  const metrics = context.measureText('AEVIC');
  const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  context.fillStyle = '#ffffff08';
  context.fillText('AEVIC', (width - metrics.width) / 2, wordmarkTop + (height - wordmarkTop - inkHeight) / 2 + metrics.actualBoundingBoxAscent);
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
