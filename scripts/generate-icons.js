import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const publicDir = path.resolve('public');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  // pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // pwa-maskable-512x512.png (512x512 with safe padded border)
  const innerResized = await sharp(svgBuffer).resize(410, 410).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 72, g: 152, b: 173, alpha: 1 }
    }
  })
    .composite([{ input: innerResized, top: 51, left: 51 }])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('PWA icons successfully generated in /public!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
