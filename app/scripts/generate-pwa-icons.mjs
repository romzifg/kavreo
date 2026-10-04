import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = new URL("../public/icons/", import.meta.url);
await mkdir(directory, { recursive: true });
const svg = await readFile(new URL("../public/favicon.svg", import.meta.url));
for (const [name, size] of [["pwa-192.png", 192], ["pwa-512.png", 512], ["apple-touch-icon.png", 180]]) {
  await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL(name, directory)));
}
const foreground = await sharp(svg).resize(384, 384).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#5744dc" } })
  .composite([{ input: foreground, left: 64, top: 64 }]).png()
  .toFile(fileURLToPath(new URL("pwa-maskable-512.png", directory)));
console.log("Generated Kavreo PWA icons (192, 512, maskable, Apple 180).");
