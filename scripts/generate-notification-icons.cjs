/**
 * Generate the two assets Android notifications need, which the home-screen
 * tile cannot be. Ported from unikorncoatings_app (same script, NobleBid source).
 *
 *   npm i -D sharp && node scripts/generate-notification-icons.cjs   (then: npm un sharp)
 *
 * sharp is NOT a kept dependency — the output is committed, same arrangement as
 * scripts/generate-icons.cjs.
 *
 * Source is public/icons/icon-512x512.png (rasterized from src/app/icon.svg by
 * generate-icons.cjs): the white "NobleBid" mark on the blue gradient tile.
 *
 * ---------------------------------------------------------------------------
 * badge-96x96.png — the small icon in the status bar and at the left of the
 * notification row.
 *
 * Android does not draw this image. It draws a solid white shape from its
 * ALPHA CHANNEL and throws the colours away. A fully opaque square — which
 * every one of our tiles is — therefore becomes a solid white square. So the
 * mark has to BE the alpha: white pixels of the source become opaque, the blue
 * background becomes transparent.
 *
 * notification-192x192.png — the large icon on the right of the row.
 *
 * Not cropped to a circle by Android (that only happens for app icons and
 * conversation notifications), so a square tile stays a square. Every app whose
 * notification reads as finished supplies a round bitmap; this is ours.
 * ------------------------------------------------------------------------- */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, 'public', 'icons');
const SRC = path.join(ICONS, 'icon-512x512.png');

// Above this luminance a pixel is the white mark, below it the blue tile. The
// gradient (hsl(221 83% 53%) → hsl(224 64% 33%), src/app/icon.svg) peaks near
// 96 — so 150 clears it with room to spare, and the 150→255 stretch keeps the
// mark's anti-aliased edge smooth instead of jagged.
const CUT = 150;
const BADGE = 96;
const BADGE_PAD = 0.1; // 10% breathing room; Android gives the small icon none of its own.
const LARGE = 192;

function assertSource() {
  if (fs.existsSync(SRC)) return;
  console.error(`❌ Missing source: ${path.relative(ROOT, SRC)}`);
  process.exit(1);
}

const write = (buf, file) => {
  fs.writeFileSync(file, buf);
  console.log('  ✅', path.relative(ROOT, file), `(${buf.length} bytes)`);
};

/**
 * White mark on transparent, taken from the source's own brightness.
 *
 * Done pixel by pixel rather than with a threshold operator because the result
 * is an alpha channel, not a black-and-white picture: every pixel's opacity has
 * to come out of its luminance, and the partly-lit pixels along the mark's edge
 * have to stay partly opaque or the silhouette comes back jagged at 96px.
 */
async function silhouette() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const alpha = Math.max(0, Math.min(255, Math.round(((luminance - CUT) / (255 - CUT)) * 255)));
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = alpha;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function badge() {
  // Trimmed to the mark's own bounds first: the tile's margin around "NobleBid"
  // would shrink the glyph to nothing once Android scales it to status-bar size.
  const mark = await sharp(await silhouette())
    .trim({ threshold: 1 })
    .toBuffer();

  const inner = Math.round(BADGE * (1 - BADGE_PAD * 2));
  const fitted = await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: BADGE, height: BADGE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function largeIcon() {
  const tile = await sharp(SRC).resize(LARGE, LARGE).toBuffer();
  // `dest-in` keeps the tile only where the mask is opaque, so the corners come
  // out transparent rather than white — a white corner would be a square again
  // on the light notification shade.
  const circle = Buffer.from(
    `<svg width="${LARGE}" height="${LARGE}"><circle cx="${LARGE / 2}" cy="${LARGE / 2}" r="${LARGE / 2}" fill="#fff"/></svg>`,
  );
  return sharp(tile)
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  assertSource();
  console.log(`Generating notification icons from ${path.relative(ROOT, SRC)} …`);
  write(await badge(), path.join(ICONS, `badge-${BADGE}x${BADGE}.png`));
  write(await largeIcon(), path.join(ICONS, `notification-${LARGE}x${LARGE}.png`));
  console.log('Done. Both are referenced from public/sw.js.');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
