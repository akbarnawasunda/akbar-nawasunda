import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const slugs = [
  'masih-mencintainya-papinka',
  'cinta-terbuang',
  'masih-dihatiku',
  'bayang-tanpa-kata',
  'pada-imut-aisyah-tak-belagu',
  'hitungan-cinta-breakbeat-super-exc'
];

const coversDir = 'public/assets/covers';
const logoPath = 'public/assets/logo-an.png';

if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

for (const slug of slugs) {
  const outPath = path.join(coversDir, `${slug}.webp`);
  if (fs.existsSync(outPath)) {
    console.log(`Skipped ${slug} — already exists`);
    continue;
  }
  
  // Create 800x800 auto cover: bg #101014 + AN ghost + title + gradient border
  const title = slug.replace(/-/g, ' ').toUpperCase();
  
  const svg = `
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="800" fill="#101014"/>
      <rect y="796" width="800" height="4" fill="url(#grad)"/>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0087FF"/>
          <stop offset="100%" stop-color="#7800FF"/>
        </linearGradient>
      </defs>
      <text x="400" y="400" font-family="Syne, sans-serif" font-size="32" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.02em">${title}</text>
      <text x="400" y="450" font-family="Inter, sans-serif" font-size="14" fill="#A1A1B5" text-anchor="middle">AKBAR NAWASUNDA</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .webp({ quality: 85 })
    .toFile(outPath);
  
  console.log(`Generated ${slug}.webp`);
}

console.log('Done — 6 placeholder covers generated');
