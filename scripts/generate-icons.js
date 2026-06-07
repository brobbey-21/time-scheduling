const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE = path.join(__dirname, '..', 'assets', 'icon-source.png');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const APP_DIR = path.join(__dirname, '..', 'app');

const BG = { r: 245, g: 245, b: 240, alpha: 1 };
const RADIUS_RATIO = 0.22;

function roundedMaskSvg(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
    </svg>`
  );
}

async function buildIcon(size, outPath, { inset = 0.08 } = {}) {
  const radius = Math.round(size * RADIUS_RATIO);
  const inner = Math.round(size * (1 - inset * 2));
  const offset = Math.round((size - inner) / 2);

  const artwork = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .ensureAlpha()
    .png()
    .toBuffer();

  const square = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: artwork, top: offset, left: offset }])
    .ensureAlpha()
    .png()
    .toBuffer();

  await sharp(square)
    .composite([{ input: roundedMaskSvg(size, radius), blend: 'dest-in' }])
    .png()
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing source icon at assets/icon-source.png');
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  await buildIcon(512, path.join(ICONS_DIR, 'icon-512.png'));
  await buildIcon(192, path.join(ICONS_DIR, 'icon-192.png'));
  await buildIcon(180, path.join(ICONS_DIR, 'apple-touch-icon.png'));
  await buildIcon(72, path.join(ICONS_DIR, 'badge-72.png'), { inset: 0.1 });
  await buildIcon(32, path.join(ICONS_DIR, 'favicon-32.png'), { inset: 0.1 });
  await buildIcon(32, path.join(APP_DIR, 'icon.png'), { inset: 0.1 });

  console.log('Icons generated with rounded corners from assets/icon-source.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
