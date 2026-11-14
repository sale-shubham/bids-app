/**
 * Generate all PWA + favicon assets from the NobleBid logo.
 *
 *   node scripts/generate-icons.cjs   (needs the `sharp` devDependency)
 *
 * Source: public/brand/logo-source.png (colourful brain mark on a TRANSPARENT
 * background, 192x192 - drop in a larger master for crisper 384/512 icons).
 * A multi-colour mark on the purple brand colour would clash, so app icons use
 * a WHITE tile; the maskable icons keep the mark inside the 80% safe zone.
 *
 * Outputs: public/icons/icon-{72..512}.png, icon-{192,512}x{192,512}-maskable.png,
 * Apple touch icons, PNG favicons + favicon.ico (linked from metadata in
 * src/app/layout.tsx) and public/logo.png (transparent; headers and the
 * email LOGO_URL).
 *
 * Then run: node scripts/generate-notification-icons.cjs && node scripts/generate-apple-splash.mjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS = path.join(PUBLIC, 'icons');
const SRC = path.join(PUBLIC, 'brand', 'logo-source.png');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

if (!fs.existsSync(SRC)) {
  console.error('Missing source: public/brand/logo-source.png');
  process.exit(1);
}
fs.mkdirSync(ICONS, { recursive: true });

// Logo (trimmed to its bounds) centred on a size x size canvas at `fill` of the edge.
async function render(size, { fill = 0.78, background = WHITE } = {}) {
  const inner = Math.round(size * fill);
  const mark = await sharp(SRC).trim().resize(inner, inner, { fit: 'contain', background: CLEAR }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();
}

function write(buf, file) {
  fs.writeFileSync(file, buf);
  console.log('  ok', path.relative(ROOT, file));
}

// PNG-based multi-size .ico (ICO can embed PNG payloads).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((img, i) => {
    const b = i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b + 1);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(img.buffer.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += img.buffer.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.buffer)]);
}

async function main() {
  console.log('Generating icons from public/brand/logo-source.png ...');

  for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
    write(await render(s), path.join(ICONS, `icon-${s}x${s}.png`));
  }
  for (const s of [192, 512]) {
    write(await render(s, { fill: 0.6 }), path.join(ICONS, `icon-${s}x${s}-maskable.png`));
  }

  for (const s of [152, 167, 180]) {
    write(await render(s), path.join(ICONS, `apple-touch-icon-${s}x${s}.png`));
  }
  const apple180 = await render(180);
  write(apple180, path.join(ICONS, 'apple-touch-icon.png'));
  write(apple180, path.join(PUBLIC, 'apple-touch-icon.png'));

  const fav = { fill: 0.94, background: CLEAR };
  const fav16 = await render(16, fav);
  const fav32 = await render(32, fav);
  const fav48 = await render(48, fav);
  write(fav16, path.join(PUBLIC, 'favicon-16x16.png'));
  write(fav32, path.join(PUBLIC, 'favicon-32x32.png'));
  fs.writeFileSync(
    path.join(PUBLIC, 'favicon.ico'),
    buildIco([
      { size: 16, buffer: fav16 },
      { size: 32, buffer: fav32 },
      { size: 48, buffer: fav48 },
    ]),
  );
  console.log('  ok public/favicon.ico');

  // Transparent, for headers and the email LOGO_URL.
  write(
    await sharp(SRC).trim().resize(512, 512, { fit: 'contain', background: CLEAR }).png().toBuffer(),
    path.join(PUBLIC, 'logo.png'),
  );
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
