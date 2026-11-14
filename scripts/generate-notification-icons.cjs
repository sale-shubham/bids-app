/**
 * Generate the two assets Android notifications need, which the home-screen
 * tile cannot be.
 *
 *   node scripts/generate-notification-icons.cjs   (needs the `sharp` devDependency)
 *
 * Source: public/brand/logo-source.png (transparent background) and
 * public/icons/icon-512x512.png (white tile, from generate-icons.cjs).
 *
 * badge-96x96.png - the small status-bar icon. Android discards its colours
 * and draws a white shape from the ALPHA channel, so it is the logo's own
 * alpha (the brain silhouette) painted white on transparent.
 *
 * notification-192x192.png - the large icon on the right of the row: the white
 * tile clipped to a circle (Android does not round it for web notifications).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, 'public', 'icons');
const LOGO = path.join(ROOT, 'public', 'brand', 'logo-source.png');
const TILE = path.join(ICONS, 'icon-512x512.png');

const BADGE = 96;
const BADGE_PAD = 0.1; // breathing room; Android gives the small icon none of its own.
const LARGE = 192;

for (const f of [LOGO, TILE]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing source: ${path.relative(ROOT, f)} (run generate-icons.cjs first)`);
    process.exit(1);
  }
}

const write = (buf, file) => {
  fs.writeFileSync(file, buf);
  console.log('  ok', path.relative(ROOT, file), `(${buf.length} bytes)`);
};

async function badge() {
  const inner = Math.round(BADGE * (1 - BADGE_PAD * 2));
  // Solid white wherever the logo has any opacity; alpha channel carries the shape.
  const { data, info } = await sharp(LOGO).trim().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) {
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = data[i * 4 + 3];
  }
  const mark = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: BADGE, height: BADGE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function largeIcon() {
  const tile = await sharp(TILE).resize(LARGE, LARGE).toBuffer();
  const circle = Buffer.from(
    `<svg width="${LARGE}" height="${LARGE}"><circle cx="${LARGE / 2}" cy="${LARGE / 2}" r="${LARGE / 2}" fill="#fff"/></svg>`,
  );
  return sharp(tile)
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('Generating notification icons ...');
  write(await badge(), path.join(ICONS, `badge-${BADGE}x${BADGE}.png`));
  write(await largeIcon(), path.join(ICONS, `notification-${LARGE}x${LARGE}.png`));
  console.log('Done. Both are referenced from public/sw.js.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
