// Usage: node scripts/optimize-home-hero.mjs /absolute/path/to/supplied-image.png
// Preserve the complete supplied composition; filenames retain the existing asset contract.
import sharp from 'sharp';
if (!process.argv[2]) throw new Error('Supply the original Image 6 PNG path');
for (const width of [480, 640, 800, 1120, 1672]) {
  for (const format of ['avif', 'webp', 'jpg']) {
    let image = sharp(process.argv[2]).resize({ width, withoutEnlargement: true });
    image = format === 'avif' ? image.avif({ quality: 52, effort: 6 })
      : format === 'webp' ? image.webp({ quality: 80 }) : image.jpeg({ quality: 82, mozjpeg: true });
    await image.toFile(`src/assets/home/hero-${width}.${format}`);
  }
}
