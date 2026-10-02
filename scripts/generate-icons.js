import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImagePath = path.resolve('src/assets/images/cvmama_logo_1790941350732.jpg');
const publicDir = path.resolve('public');

async function generateIcons() {
  if (!fs.existsSync(sourceImagePath)) {
    throw new Error(`Source image not found at ${sourceImagePath}`);
  }

  const imageBuffer = fs.readFileSync(sourceImagePath);

  // Copy raw original image to public
  fs.copyFileSync(sourceImagePath, path.join(publicDir, 'cvmama_logo.jpeg'));
  fs.copyFileSync(sourceImagePath, path.join(publicDir, 'cvmama_logo.jpg'));

  // 1. Full square logo (512x512 PNG)
  await sharp(imageBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'cvmama_logo.png'));

  // 2. Horizontal fitted logo for desktop and mobile headers
  // Text bounds: left: 121, right: 902, top: 405, bottom: 592
  await sharp(imageBuffer)
    .extract({ left: 70, top: 360, width: 884, height: 280 })
    .resize(500, 158)
    .png()
    .toFile(path.join(publicDir, 'cvmama_logo_horizontal.png'));

  // 3. pwa-192x192.png
  await sharp(imageBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 4. pwa-512x512.png
  await sharp(imageBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 5. apple-touch-icon.png (180x180)
  await sharp(imageBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. pwa-maskable-512x512.png (scaled to 80% with safe margin)
  const innerResized = await sharp(imageBuffer).resize(410, 410).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 88, g: 168, b: 196, alpha: 1 } // #58A8C4
    }
  })
    .composite([{ input: innerResized, top: 51, left: 51 }])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 7. Favicon (48x48 PNG)
  await sharp(imageBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('All image-based PWA icons and logos generated successfully in /public!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
