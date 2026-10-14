import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const svg = (margem) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1d4ed8"/>
  <g transform="translate(${margem} ${margem}) scale(${(512 - 2 * margem) / 512})">
    <path d="M64 144h144l40 40h200v232H64z" fill="#fff"/>
    <rect x="120" y="250" width="272" height="20" rx="10" fill="#1d4ed8"/>
    <rect x="120" y="310" width="200" height="20" rx="10" fill="#1d4ed8"/>
  </g>
</svg>`);

await mkdir('public/icons', { recursive: true });
await sharp(svg(32)).resize(192).png().toFile('public/icons/icon-192.png');
await sharp(svg(32)).resize(512).png().toFile('public/icons/icon-512.png');
await sharp(svg(96)).resize(512).png().toFile('public/icons/icon-512-maskable.png');
console.log('Ícones gerados em public/icons');
