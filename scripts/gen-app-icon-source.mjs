// One-off generator for the Capacitor icon/splash source images.
// Mirrors the colors/gradient in src/lib/icon-mark.tsx (rendered there via
// next/og for the web manifest); native app icons need real static PNGs
// bundled into the iOS/Android projects, so we regenerate the same mark here.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const iconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B3A5C" />
      <stop offset="55%" stop-color="#2C4A6E" />
      <stop offset="100%" stop-color="#B79B72" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)" />
  <text x="512" y="660" font-family="Arial, sans-serif" font-weight="800"
    font-size="420" fill="#B79B72" text-anchor="middle" letter-spacing="-8">W</text>
</svg>
`;

const splashSvg = `
<svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B3A5C" />
      <stop offset="55%" stop-color="#2C4A6E" />
      <stop offset="100%" stop-color="#B79B72" />
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#g)" />
  <text x="1366" y="1500" font-family="Arial, sans-serif" font-weight="800"
    font-size="360" fill="#B79B72" text-anchor="middle" letter-spacing="-8">W</text>
</svg>
`;

await mkdir("resources", { recursive: true });
await sharp(Buffer.from(iconSvg)).png().toFile("resources/icon.png");
await sharp(Buffer.from(splashSvg)).png().toFile("resources/splash.png");
await sharp(Buffer.from(splashSvg)).png().toFile("resources/splash-dark.png");
console.log("Wrote resources/icon.png, resources/splash.png, resources/splash-dark.png");
