// Static safeguards only: no browser, application API, or production data access.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';
const root = resolve('dist');
const manifest = JSON.parse(readFileSync(resolve(root, '.vite/manifest.json'), 'utf8'));
let references = 0;
for (const entry of Object.values(manifest)) {
  for (const file of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) {
    if (!existsSync(resolve(root, file))) throw new Error(`Missing emitted asset: ${file}`);
    references++;
  }
  for (const key of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) {
    if (!manifest[key]) throw new Error(`Missing manifest import: ${key}`);
  }
}
const images = [];
for (const directory of ['src/assets', 'public']) {
  for (const file of readdirSync(directory, { recursive: true })) {
    const path = resolve(directory, file);
    if (!/\.(png|jpe?g|webp|avif|svg)$/i.test(path)) continue;
    const metadata = await sharp(path).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Invalid image: ${path}`);
    images.push({ path, bytes: statSync(path).size, width: metadata.width, height: metadata.height });
  }
}
for (const relative of readdirSync(resolve(root, 'assets'))) {
  if (!/\.(css|js)$/.test(relative)) continue;
  const path = resolve(root, 'assets', relative), text = readFileSync(path, 'utf8');
  if (/__VITE_ASSET__/.test(text)) throw new Error(`Unresolved Vite asset in ${relative}`);
  if (relative.endsWith('.css')) {
    for (const match of text.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)) {
      const url = match[1];
      if (/^(data:|https?:|#)/.test(url)) continue;
      const file = url.startsWith('/') ? resolve(root, '.' + url) : resolve(dirname(path), url);
      if (!existsSync(file.split(/[?#]/)[0])) throw new Error(`Missing CSS asset: ${url}`);
    }
  }
}
console.log(`Validated ${references} manifest asset references, all module edges/CSS URLs, and ${images.length} local images. No browser or production requests made.`);
