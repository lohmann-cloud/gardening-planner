// One-off: rasterize the SVG app icons into the PNG sizes the manifest and
// platforms need. Requires `sharp` (not a project dependency):
//   npm install --no-save sharp && node scripts/gen-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const rounded = join(pub, 'favicon.svg');
const maskable = join(pub, 'icon-maskable.svg');

const jobs = [
  [rounded, 'favicon-32.png', 32],
  [rounded, 'icon-192.png', 192],
  [rounded, 'icon-512.png', 512],
  [maskable, 'apple-touch-icon.png', 180],
  [maskable, 'icon-maskable-192.png', 192],
  [maskable, 'icon-maskable-512.png', 512],
];

for (const [src, name, size] of jobs) {
  await sharp(src, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(join(pub, name));
  console.log(`[gen-icons] ${name} (${size}px)`);
}
