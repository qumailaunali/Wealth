// Generates every favicon / PWA icon from the brand source PNGs.
//   assets/brand/app-icon.png  (2048×2048, master)
//   assets/brand/favicon.png   (512×512, tuned for tiny sizes)
// Run with: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const APP_ICON = path.join(root, "assets/brand/app-icon.png");
const FAVICON = path.join(root, "assets/brand/favicon.png");
// Matches the badge colour inside the artwork, so padded/maskable icons look seamless.
const BADGE_BG = "#0E1017";

const out = (p) => path.join(root, p);

async function png(src, size, dest) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out(dest));
}

/** Full-bleed solid background with the icon scaled into the centre `scale` fraction. */
async function padded(src, size, scale, dest) {
  const inner = Math.round(size * scale);
  const logo = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BADGE_BG } })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: BADGE_BG })
    .png()
    .toFile(out(dest));
}

/** Minimal ICO writer: embeds PNG images (supported by all modern browsers). */
async function ico(src, sizes, dest) {
  const images = await Promise.all(sizes.map((s) => sharp(src).resize(s, s).png().toBuffer()));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach((img, i) => {
    const s = sizes[i];
    const e = Buffer.alloc(16);
    e.writeUInt8(s >= 256 ? 0 : s, 0);
    e.writeUInt8(s >= 256 ? 0 : s, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.length;
    entries.push(e);
  });
  await writeFile(out(dest), Buffer.concat([header, ...entries, ...images]));
}

async function ogImage(dest) {
  const W = 1200;
  const H = 630;
  const logo = await sharp(APP_ICON).resize(260, 260).png().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g" cx="20%" cy="0%" r="90%">
        <stop offset="0" stop-color="#10B981" stop-opacity="0.28"/>
        <stop offset="1" stop-color="#0B0D12" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#0B0D12"/>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="470" y="300" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="110" font-weight="800" fill="#EEF1F6">Wealth</text>
    <text x="474" y="370" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="38" fill="#8B93A7">Track every rupee. Grow every month.</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: 150, top: 185 }])
    .png()
    .toFile(out(dest));
}

await mkdir(out("public/icons"), { recursive: true });
await mkdir(out("public/brand"), { recursive: true });

await ico(FAVICON, [16, 32, 48], "app/favicon.ico");
await png(APP_ICON, 512, "app/icon.png");
await padded(APP_ICON, 180, 1, "app/apple-icon.png");
await png(APP_ICON, 96, "public/icons/icon-96.png");
await png(APP_ICON, 192, "public/icons/icon-192.png");
await png(APP_ICON, 512, "public/icons/icon-512.png");
await padded(APP_ICON, 192, 0.8, "public/icons/maskable-192.png");
await padded(APP_ICON, 512, 0.8, "public/icons/maskable-512.png");
// In-app logo (used by next/image)
await png(APP_ICON, 256, "public/brand/logo.png");
await ogImage("app/opengraph-image.png");

console.log("✔ Icons generated");
