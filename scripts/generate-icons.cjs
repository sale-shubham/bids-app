/**
 * Generate all PWA + favicon assets from the NobleBid master SVG.
 *
 *   npm i -D sharp && node scripts/generate-icons.cjs   (then optionally: npm un sharp)
 *
 * sharp is NOT a kept dependency — icons are pre-generated and committed, so
 * install it only when you need to regenerate, then remove it again.
 *
 * Source: src/app/icon.svg (full-bleed gradient tile with the "NobleBid" mark).
 * The SVG is a complete icon, so we rasterize it straight to each size —
 * no white background / trim (unlike a bare logo). Only dep is `sharp`.
 * Outputs PWA icons (72→512 + maskable), Apple touch icons, PNG favicons,
 * a hand-built multi-size favicon.ico, and public/logo.png.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS = path.join(PUBLIC, 'icons');
const SRC = path.join(ROOT, 'src', 'app', 'icon.svg');

if (!fs.existsSync(SRC)) {
  console.error('❌ Missing source: src/app/icon.svg');
  process.exit(1);
}
fs.mkdirSync(ICONS, { recursive: true });

const svg = fs.readFileSync(SRC);

// Rasterize the SVG to a size×size PNG. High density = crisp text at large sizes.
function render(size) {
  return sharp(svg, { density: Math.max(72, size) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function write(buf, file) {
  fs.writeFileSync(file, buf);
  console.log('  ✅', path.relative(ROOT, file));
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
  console.log('Generating icons from src/app/icon.svg …');

  for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
    write(await render(s), path.join(ICONS, `icon-${s}x${s}.png`));
  }

  for (const s of [152, 167, 180]) {
    write(await render(s), path.join(ICONS, `apple-touch-icon-${s}x${s}.png`));
  }
  const apple180 = await render(180);
  write(apple180, path.join(ICONS, 'apple-touch-icon.png'));
  write(apple180, path.join(PUBLIC, 'apple-touch-icon.png'));

  const fav16 = await render(16);
  const fav32 = await render(32);
  const fav48 = await render(48);
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
  console.log('  ✅', 'public/favicon.ico');

  write(await render(512), path.join(PUBLIC, 'logo.png'));
  console.log('Done.');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
