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
  maps?: Record<string, CanvasImageSource | undefined>;
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

/** Fit the actual glyph ink, then put its midpoint on the canvas clipping edge. */
export function teamCardWordmark(context: CanvasRenderingContext2D, width: number, height: number) {
  context.font = '900 200px Raleway, sans-serif';
  const reference = context.measureText('AEVIC');
  const size = 200 * width * .98 / (reference.actualBoundingBoxLeft + reference.actualBoundingBoxRight);
  context.font = `900 ${size}px Raleway, sans-serif`;
  const metrics = context.measureText('AEVIC');
  const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  return { font: context.font, x: width * .01 + metrics.actualBoundingBoxLeft,
    baseline: height + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2,
    top: height - inkHeight / 2, inkHeight };
}

/** Export-pixel regions shared by both render modes. No optional section reserves space when absent. */
export function teamCardLayout(data: TeamProfileCardData, format: ProfileCardFormat, requested: TeamIdentityCardOptions, measuredWordmarkTop?: number) {
  const options = resolveTeamCardOptions(data, requested);
  const { width, height } = teamIdentityCardSizes[format];
  const story = format === 'story';
  const pad = width * (options.extended && !story ? .09 : .06);
  // The conservative fallback also makes non-canvas layout checks independent of font loading.
  const wordmarkTop = measuredWordmarkTop ?? height - width * .13;
  const wordmarkHeight = height - wordmarkTop;
  const maps = options.showMaps ? (data.mapStats ?? []).filter(map => map.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 3) : [];
  const recent = options.showRecent ? [...(data.recentMatches ?? [])].sort((a,b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0,5) : [];
  const stats = options.showStats ? selectSharecardStats(data, options.template) : [];
  const rosterRows = Math.max(1, Math.ceil(data.roster.length / (story ? 3 : 5)));
  const sections = [
    { id: 'header', height: story ? 160 : options.extended ? 70 : 130 },
    { id: 'team', height: story ? 430 : options.extended ? 200 : 265 },
    ...(options.showRoster !== false ? [{ id: 'roster', height: 74 + rosterRows * 36 }] : []),
    ...(stats.length ? [{ id: 'stats', height: 125 }] : []),
    ...(maps.length ? [{ id: 'maps', height: 46 + maps.length * 64 }] : []),
    ...(recent.length ? [{ id: 'recent', height: 140 }] : []),
    ...(options.showQr ? [{ id: 'qr', height: 150 }] : []),
  ];
  const naturalHeight = sections.reduce((sum, section) => sum + section.height, 0);
  // Keep essential Story content clear of app chrome and reply controls.
  const topInset = story ? 240 : pad;
  const contentBottom = story ? Math.min(wordmarkTop, height - 300) : wordmarkTop;
  const available = contentBottom - topInset - width * .035;
  const preferredScale = story ? 1.65 : format === 'portrait' ? 1.2 : 1;
  const scale = Math.min(preferredScale, available / naturalHeight);
  // Distribute spare height between sections, never inside the team identity.
  const gap = Math.min(options.extended ? 28 : 65, Math.max(0, (available - naturalHeight * scale) / (sections.length - 1)));
  let top = topInset;
  const regions = sections.map(section => {
    const region = { ...section, top, height: section.height * scale };
    top += region.height + gap;
    return region;
  });
  return { width, height, pad, wordmarkTop, wordmarkHeight, scale, regions, options, maps, recent, stats, story };
}

export function drawTeamIdentityCard(canvas: HTMLCanvasElement, data: TeamProfileCardData, format: ProfileCardFormat, assets: TeamIdentityCardAssets, requested: TeamIdentityCardOptions = { template: 'identity', showStats: true, showQr: false }, schematic = false) {
  const { width, height } = teamIdentityCardSizes[format];
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
  const wordmark = teamCardWordmark(context, width, height);
  const layout = teamCardLayout(data, format, requested, wordmark.top);
  const { pad, scale, regions, options, maps, recent, stats, story } = layout;
  context.fillStyle = '#090a0c'; context.fillRect(0, 0, width, height);
  polygon(context, [[0,0],[width*.2,0],[0,height*.2]], '#17181c');
  polygon(context, [[width*.7,0],[width*.86,0],[0,height*.65],[0,height*.5]], '#141519');
  polygon(context, [[width,height*.28],[width*.65,height*.4],[width,height*.55]], '#1c1b18');
  const contentWidth = width - pad * 2;
  // A uniform transform preserves typography, logos and QR aspect ratios even in dense square cards.
  const text = (value: string, x: number, y: number, size: number, maxWidth: number, kind: 'heading' | 'value' | 'brand' = 'value', color = '#e9e9ed', centered = false) => {
    context.fillStyle = color;
    const family = kind === 'brand' ? 'Orbitron' : 'Raleway';
    let fitted = size;
    context.font = `${kind === 'value' ? 600 : 700} ${fitted}px ${family}, sans-serif`;
    while (context.measureText(value).width > maxWidth && fitted > Math.max(14, size * .65)) {
      fitted -= 1; context.font = `${kind === 'value' ? 600 : 700} ${fitted}px ${family}, sans-serif`;
    }
    if (context.measureText(value).width > maxWidth) {
      while (value.length && context.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
      value += '…';
    }
    if (centered) x += (maxWidth - context.measureText(value).width) / 2;
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
        text('AEVIC', 0, 30, 30, 150, 'brand', '#f5ca49');
        if (story) {
          text('TEAM IDENTITY //', 0, 64, 17, w, 'heading');
          text('COMPETITIVE LEGACY', 0, 90, 17, w, 'heading');
        } else text('TEAM IDENTITY // COMPETITIVE LEGACY', 165, 28, 17, w - 295, 'heading');
        if (data.year) {
          text(`EST. ${data.year}`, w - 106, 28, 17, 106, 'heading', '#999ba3');
          context.fillStyle = '#f5ca49'; context.fillRect(w - 106, 40, 106, 3);
        }
        break;
      case 'team': {
        const size = story ? 230 : options.extended ? 166 : 220;
        const x = story ? (w - size) / 2 : 0;
        if (schematic) {
          context.fillStyle = '#22252b'; context.beginPath(); context.roundRect(x, 0, size, size, 14); context.fill();
          polygon(context, [[x+size*.26,size*.7],[x+size*.43,size*.4],[x+size*.53,size*.55],[x+size*.65,size*.36],[x+size*.8,size*.7]], '#494c54');
        } else drawLogo(context, data, assets.logo, x, 0, size);
        const tx = story ? 0 : size + 46;
        const ty = story ? size + 44 : 30;
        text('TEAM', tx, ty, 22, w - tx, 'heading', '#f5ca49');
        context.font = '600 46px Raleway, sans-serif';
        if (context.measureText(data.teamName).width <= w - tx) text(data.teamName, tx, ty + 64, 46, w - tx);
        else {
          const words = data.teamName.split(/\s+/);
          let first = words.shift() ?? '';
          context.font = '600 32px Raleway, sans-serif';
          while (words.length > 1 && context.measureText(`${first} ${words[0]}`).width <= w - tx) first += ` ${words.shift()}`;
          text(first, tx, ty + 48, 32, w - tx);
          if (words.length) text(words.join(' '), tx, ty + 84, 32, w - tx);
        }
        text([data.teamTag, data.organizationName, data.country].filter(Boolean).join(' · ') || 'AEVIC ESPORTS', tx, ty + 108, 23, w - tx);
        break;
      }
      case 'roster': {
        heading('PUBLIC ROSTER');
        const roster = data.roster;
        if (!roster.length) text('İctimai heyət dərc edilməyib', 0, 64, 22, w);
        // Individual slots keep long names legible; Story wraps into two balanced rows.
        const columns = story ? 3 : Math.min(5, Math.max(1, roster.length));
        roster.forEach((member, index) => text(member.ign.toLocaleUpperCase('az'), (index % columns) * w / columns,
          64 + Math.floor(index / columns) * 36, 23, w / columns - 14));
        break;
      }
      case 'stats':
        stats.forEach((stat, index) => {
          const x = index * w / stats.length;
          text(String(stat.value), x, 48, 44, w / stats.length - 20, 'value', '#e9e9ed', true);
          text(stat.label, x, 80, 18, w / stats.length - 20, 'heading', '#a6a7ae', true);
        }); break;
      case 'maps':
        heading('XƏRİTƏ STATİSTİKASI');
        maps.forEach((map, index) => {
          const y = 44 + index * 64;
          context.fillStyle = '#27343b'; context.beginPath(); context.roundRect(0, y, 76, 48, 6); context.fill();
          const artwork = assets.maps?.[map.map.toLowerCase()];
          if (artwork) { context.save(); context.clip(); drawCover(context, artwork, 0, y, 76, 48); context.restore(); }
          text(map.map.toLocaleUpperCase('az'), 96, y + 19, 23, w * .43);
          text(`${map.matches} MATÇ`, 96, y + 44, 17, w * .43);
          text(`${map.wwcd} WWCD · #${map.averagePlacement.toFixed(1)}`, w * .7, y + 30, 19, w * .3);
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
      case 'qr':
        context.strokeStyle = '#292b30'; context.lineWidth = 1; context.beginPath(); context.roundRect(0, 0, w, 140, 12); context.stroke();
        text('SCAN // PUBLIC PROFILE', 20, 30, 20, w - 170, 'heading', '#f5ca49');
        text(data.profileUrl.replace(/^https?:\/\//, ''), 20, 75, 22, w - 180);
        text(data.sourceLabel || 'Komandanın ictimai AEVIC profilini aç', 20, 110, 20, w - 180);
        if (assets.qr) context.drawImage(assets.qr, w - 130, 10, 120, 120);
        break;
    }
    context.restore();
  }
  // Canvas bounds clip exactly the lower half of the measured ink, with no divider or padding.
  context.font = wordmark.font;
  context.fillStyle = '#ffffff12';
  context.fillText('AEVIC', wordmark.x, wordmark.baseline);
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
