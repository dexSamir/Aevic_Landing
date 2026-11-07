import { panelRows, tablePanels, type OcrWord, type TablePanel, type Participant } from './roundScreenshot';
import { createWorker, OEM, PSM, type Worker, type Page } from 'tesseract.js';
const workerPath = new URL('tesseract.js/dist/worker.min.js', import.meta.url).href;
const corePath = new URL('tesseract.js-core/tesseract-core-lstm.wasm.js', import.meta.url).href;
const languagePath = new URL('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', import.meta.url).href;

async function withResultReader<T>(signal: AbortSignal, read: (worker: Worker) => Promise<T>) {
  signal.throwIfAborted();
  const worker = await new Promise<Worker>((resolve, reject) => {
    // Tesseract reports some initialization failures only through errorHandler.
    createWorker('eng', OEM.LSTM_ONLY, {
      workerPath, corePath, langPath: new URL('.', languagePath).href,
      workerBlobURL: false, cacheMethod: 'none', errorHandler: reject,
    }).then(resolve, reject);
  });
  const terminate = () => { void worker.terminate(); };
  signal.addEventListener('abort', terminate, { once: true });
  try {
    signal.throwIfAborted();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    return await read(worker);
  } finally {
    signal.removeEventListener('abort', terminate);
    terminate();
  }
}

export function readResultScreenshot(file: File, signal: AbortSignal) {
  return withResultReader(signal, async worker => (await worker.recognize(file)).data.text);
}

function wordsOf(data: Page): OcrWord[] {
  return (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(p => p.lines.flatMap(line =>
    line.words.map(w => ({ text: w.text, confidence: w.confidence, ...w.bbox })))));
}

function canvas(width: number, height: number) {
  const image = document.createElement('canvas');
  image.width = Math.max(1, Math.round(width)); image.height = Math.max(1, Math.round(height));
  return image.getContext('2d', { willReadFrequently: true })!;
}

// Bright broadcast lettering, often very narrow, is easier to read on a white field.
function broadcastMask(source: CanvasRenderingContext2D) {
  const mask = canvas(source.canvas.width, source.canvas.height);
  const pixels = source.getImageData(0, 0, source.canvas.width, source.canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = Math.min(pixels.data[i], pixels.data[i+1], pixels.data[i+2]) >= 178 ? 0 : 255;
    pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = value;
  }
  mask.putImageData(pixels, 0, 0);
  return mask;
}

// A short text anchor helps the line recognizer segment isolated digits. Read
// only words inside the image patch, never the anchor.
async function readNumericPatch(worker: Worker, patch: HTMLCanvasElement) {
  const line = canvas(155 + patch.width, patch.height);
  line.fillStyle = 'white'; line.fillRect(0, 0, line.canvas.width, line.canvas.height);
  line.fillStyle = 'black'; line.font = '36px Arial';
  line.fillText('Value', 12, line.canvas.height / 2 + 14);
  line.drawImage(patch, 155, 0);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: '' });
  const result = await worker.recognize(line.canvas, {}, { blocks: true });
  return wordsOf(result.data).filter(w => w.x0 >= 150);
}

async function readDarkPanel(worker: Worker, mask: CanvasRenderingContext2D, panel: TablePanel, participants: Participant[]) {
  const top = Math.ceil(panel.top) + 1, height = Math.max(1, Math.floor(panel.bottom) - top);
  const cols = panel.columns.filter(c => c.kind !== 'other');
  const left = Math.floor(cols[0].left);
  const clean = canvas(Math.ceil(cols[cols.length-1].right) - left, height);
  clean.fillStyle = 'white'; clean.fillRect(0, 0, clean.canvas.width, height);
  for (const col of cols) {
    const start = Math.floor(col.left), width = Math.max(1, Math.floor(col.right) - start);
    const pixels = mask.getImageData(start, top, width, height);
    for (let y = 0; y < height; y++) {
      const offset = y * width * 4;
      let ink = 0;
      for (let i = offset; i < offset + width * 4; i += 4) if (!pixels.data[i]) ink++;
      // Erase long horizontal separators and the bright background beyond the panel.
      if (ink > width * 0.50) pixels.data.fill(255, offset, offset + width * 4);
    }
    clean.putImageData(pixels, start - left, 0);
  }
  const scaled = canvas(clean.canvas.width * 1.9, height * 1.25);
  scaled.drawImage(clean.canvas, 0, 0, scaled.canvas.width, scaled.canvas.height);
  const { data } = await worker.recognize(scaled.canvas, {}, { blocks: true });
  const words = wordsOf(data).map(w => ({ ...w, x0: left + w.x0 / 1.9, x1: left + w.x1 / 1.9,
    y0: top + w.y0 / 1.25, y1: top + w.y1 / 1.25 }));
  const kills = cols.find(c => c.kind === 'kills')!;
  const start = Math.floor(kills.left), width = Math.max(1, Math.floor(kills.right) - start);
  const strip = clean.getImageData(start - left, 0, width, height).data;
  const digits: OcrWord[] = [];
  // Sparse OCR often skips an isolated zero or one. Read individual ink bands
  // in the labelled eliminations column, retaining their original coordinates.
  let first = -1, last = -1, x0 = width, x1 = 0;
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD, tessedit_char_whitelist: '0123456789' });
  try {
    for (let y = 0; y <= height + 2; y++) {
      let ink = false;
      if (y < height) for (let x = 0; x < width; x++) {
        if (strip[(y * width + x) * 4] === 0) {
          ink = true; x0 = Math.min(x, x0); x1 = Math.max(x, x1);
        }
      }
      if (ink) { if (first < 0) first = y; last = y; }
      if (first < 0 || y - last < 3) continue;
      const glyphHeight = last - first + 1, glyphWidth = x1 - x0 + 1;
      if (glyphHeight >= panel.headerHeight * 0.55 && glyphHeight <= panel.headerHeight * 2.8
          && glyphWidth < width * 0.8) {
        const outputWidth = Math.max(12, Math.round(65 * glyphWidth / glyphHeight));
        const cell = canvas(outputWidth + 28, 72);
        cell.fillStyle = 'white'; cell.fillRect(0, 0, cell.canvas.width, 72);
        cell.drawImage(clean.canvas, start - left + x0, first, glyphWidth, glyphHeight, 14, 12, outputWidth, 48);
        const recognized = await worker.recognize(cell.canvas, {}, { blocks: true });
        const value = wordsOf(recognized.data);
        if (value.length === 1 && /^\d{1,3}$/.test(value[0].text.trim())) {
          digits.push({ ...value[0], x0: start + x0, x1: start + x1, y0: top + first, y1: top + last });
        }
      }
      first = -1; x0 = width; x1 = 0;
    }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '' });
  }
  const refined = words.filter(w => {
    const x = (w.x0 + w.x1) / 2, y = (w.y0 + w.y1) / 2;
    return x < kills.left || x >= kills.right || !digits.some(d => Math.abs((d.y0+d.y1)/2-y) < panel.headerHeight);
  });
  return panelRows([...refined, ...digits], panel, participants);
}

async function readLightPanel(worker: Worker, source: CanvasRenderingContext2D, panel: TablePanel, participants: Participant[]) {
  const left = Math.floor(panel.columns[0].left);
  const right = Math.ceil(panel.columns[panel.columns.length - 1].right);
  const top = Math.ceil(panel.top) + 1;
  const table = canvas(right - left, panel.bottom - top);
  table.drawImage(source.canvas, -left, -top);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  try {
    const { data } = await worker.recognize(table.canvas, {}, { blocks: true });
    let words = wordsOf(data);
    for (const col of panel.columns.filter(c => c.kind === 'kills' || (c.kind === 'rank' && !panel.pointsRank))) {
      const x = Math.floor(col.left) - left, width = Math.floor(col.right - col.left);
      const strip = canvas(width + 16, table.canvas.height + 16);
      strip.fillStyle = 'white'; strip.fillRect(0, 0, strip.canvas.width, strip.canvas.height);
      strip.drawImage(table.canvas, x, 0, width, table.canvas.height, 8, 8, width, table.canvas.height);
      await worker.setParameters({ tessedit_char_whitelist: col.kind === 'rank' ? '#0123456789' : '0123456789' });
      const numbers = await worker.recognize(strip.canvas, {}, { blocks: true });
      for (const w of wordsOf(numbers.data)) {
        if (w.confidence < 55 || !/^#?\d{1,3}$/.test(w.text.trim())) continue;
        const number = { ...w, x0:w.x0+x-8, x1:w.x1+x-8, y0:w.y0-8, y1:w.y1-8 };
        const sameCell = (v: OcrWord) => (v.x0+v.x1)/2 >= x && (v.x0+v.x1)/2 < x + width &&
          Math.abs((v.y0+v.y1-number.y0-number.y1)/2) < panel.headerHeight;
        const previous = words.filter(sameCell);
        // Conflicting high-confidence numeric readings require manual entry.
        const disagreement = previous.some(v => v.text.trim().replace('#','') !== number.text.trim().replace('#',''));
        if (disagreement) {
          const y0 = Math.max(0, Math.min(number.y0, ...previous.map(v => v.y0)) - 4);
          const y1 = Math.max(number.y1, ...previous.map(v => v.y1)) + 4;
          const patch = canvas(width * 48 / (y1 - y0), 48);
          patch.drawImage(table.canvas, x, y0, width, y1 - y0, 0, 0, patch.canvas.width, 48);
          const checked = await readNumericPatch(worker, patch.canvas);
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
          if (checked.length === 1 && checked[0].confidence >= 55 && /^#?\d+$/.test(checked[0].text.trim()))
            Object.assign(number, { text: checked[0].text.trim(), confidence: checked[0].confidence });
          else number.confidence = 0;
        }
        words = [...words.filter(v => !sameCell(v)), number];
      }
    }
    return panelRows(words.map(w => ({ ...w,x0:left+w.x0,x1:left+w.x1,y0:top+w.y0,y1:top+w.y1 })),panel,participants);
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '' });
  }
}

async function readTable(worker: Worker, file: File, signal: AbortSignal, participants: Participant[]) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2600 / bitmap.width, 2600 / bitmap.height);
  const source = canvas(bitmap.width * scale, bitmap.height * scale);
  source.drawImage(bitmap, 0, 0, source.canvas.width, source.canvas.height);
  bitmap.close();
  const { width, height } = source.canvas;
  const { data } = await worker.recognize(source.canvas, {}, { blocks: true, text: true });
  if (/overall\s+(?:ranking|standings)|cumulative\s+(?:ranking|standings)/i.test(data.text))
    return { rows: [], layout: 'unsupported' as const };
  let panels = tablePanels(wordsOf(data), width, height);
  const mask = broadcastMask(source);
  // Re-read narrow captions if the original has no complete table header.
  if (!panels.length || panels.some(p => p.pointsRank)) {
    const wide = canvas(width * 1.6, height * 1.2);
    wide.drawImage(mask.canvas, 0, 0, wide.canvas.width, wide.canvas.height);
    signal.throwIfAborted();
    const headerRead = await worker.recognize(wide.canvas, {}, { blocks: true, text: true });
    if (/overall\s+(?:ranking|standings)/i.test(headerRead.data.text)) return { rows: [], layout: 'unsupported' as const };
    const contrastWords = wordsOf(headerRead.data).map(w => ({ ...w, x0:w.x0/1.6,x1:w.x1/1.6,y0:w.y0/1.2,y1:w.y1/1.2 }));
    const contrastPanels = tablePanels(contrastWords, width, height);
    if (contrastPanels.length >= panels.length && contrastPanels.length) panels = contrastPanels;
  }
  const rows = [];
  for (const panel of panels) {
    signal.throwIfAborted();
    const kills = panel.columns.find(c => c.kind === 'kills')!;
    const sampleY = Math.min(height - 1, Math.round(panel.top + panel.headerHeight * 1.8));
    const sample = source.getImageData(Math.floor(kills.left), sampleY, Math.max(1, Math.floor(kills.right - kills.left)), 1).data;
    let dark = 0;
    for (let i = 0; i < sample.length; i += 4) if (sample[i] + sample[i+1] + sample[i+2] < 450) dark++;
    rows.push(...(dark > sample.length / 8 ? await readDarkPanel(worker, mask, panel, participants) : await readLightPanel(worker, source, panel, participants)));
  }
  return { rows, layout: !rows.length ? 'unsupported' as const : panels.some(p => p.pointsRank) ? 'points' as const : 'placement' as const };
}

export function readRoundScreenshots(files: File[], signal: AbortSignal, onRead: (file: File, result: Awaited<ReturnType<typeof readTable>>) => void, participants: Participant[] = []) {
  return withResultReader(signal, async worker => {
    for (const file of files) {
      signal.throwIfAborted();
      let result;
      try { result = await readTable(worker, file, signal, participants); }
      catch { signal.throwIfAborted(); result = { rows: [], layout: 'unsupported' as const }; }
      signal.throwIfAborted();
      onRead(file, result);
    }
  });
}
