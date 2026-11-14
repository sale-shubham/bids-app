// Generates the iOS launch screens (apple-touch-startup-image) in public/splash/.
//
// iOS ignores the manifest's icons + background_color for the launch screen —
// that is Android only. It shows an image only when a <link
// rel="apple-touch-startup-image"> matches the device's exact screen size and
// orientation, and a blank screen otherwise. The device list lives in
// src/constants/apple-splash-devices.json and is shared with src/app/layout.tsx,
// which emits the matching links. Re-run after changing the icon or the list:
//   node scripts/generate-apple-splash.mjs
import { mkdir, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(root, 'public', 'splash');
const ICON = path.join(root, 'public', 'icons', 'icon-512x512.png');
// Same as the manifest's background_color, so iOS and Android launch alike.
const BACKGROUND = '#0a0a0a';
// Icon edge as a fraction of the screen's shorter side, and its corner radius
// as a fraction of the icon edge (the iOS home-screen icon shape).
const ICON_SCALE = 0.32;
const CORNER_RADIUS = 0.225;

const devices = JSON.parse(
  await readFile(path.join(root, 'src', 'constants', 'apple-splash-devices.json'), 'utf8'),
);

async function roundedIcon(size) {
  const r = Math.round(size * CORNER_RADIUS);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`,
  );
  return sharp(ICON)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function render(width, height) {
  const size = Math.round(Math.min(width, height) * ICON_SCALE);
  const file = path.join(OUT_DIR, `apple-splash-${width}x${height}.png`);
  await sharp({ create: { width, height, channels: 3, background: BACKGROUND } })
    .composite([{ input: await roundedIcon(size), gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(file);
  return path.basename(file);
}

await mkdir(OUT_DIR, { recursive: true });
// Start clean so a device dropped from the list does not leave a stale file.
for (const f of await readdir(OUT_DIR)) await unlink(path.join(OUT_DIR, f));

for (const d of devices) {
  const w = d.width * d.ratio;
  const h = d.height * d.ratio;
  const made = [await render(w, h)];
  if (d.landscape) made.push(await render(h, w));
  console.log(`${d.name}: ${made.join(', ')}`);
}
