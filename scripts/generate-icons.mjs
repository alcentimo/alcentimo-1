import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");

async function loadEnvLocal() {
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Sin .env.local: usar variables del entorno actual.
  }
}

/** Fallback cuando no hay logo en Supabase. */
function createFallbackSvg(size) {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.42);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${radius}" fill="#059669"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
        font-weight="700" fill="#ffffff">a</text>
</svg>`;
}

async function fetchPlatformLogoBuffer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apiKey) return null;

  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/platform_settings?id=eq.default&select=logo_url,pwa_icon_512_url,pwa_icon_192_url`,
    {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!settingsRes.ok) return null;

  const rows = await settingsRes.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  const logoUrl =
    row?.pwa_icon_512_url?.trim() ||
    row?.pwa_icon_192_url?.trim() ||
    row?.logo_url?.trim();

  if (!logoUrl) return null;

  const imageRes = await fetch(logoUrl.split("?")[0]);
  if (!imageRes.ok) return null;

  return Buffer.from(await imageRes.arrayBuffer());
}

async function renderSquareIcon(sourceBuffer, size) {
  return sharp(sourceBuffer, { animated: false })
    .rotate()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

const OUTPUTS = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "icon-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
  { file: "icon-512x512.png", size: 512 },
];

await loadEnvLocal();
await mkdir(publicDir, { recursive: true });

let source = await fetchPlatformLogoBuffer();
if (source) {
  console.log("Using platform logo from Supabase.");
} else {
  console.log("No platform logo in Supabase; using fallback brand mark.");
  source = await sharp(Buffer.from(createFallbackSvg(512))).png().toBuffer();
}

for (const { file, size } of OUTPUTS) {
  const buffer = await renderSquareIcon(source, size);
  await writeFile(path.join(publicDir, file), buffer);
  console.log(`  wrote public/${file}`);
}

const favicon32 = await renderSquareIcon(source, 32);
await sharp(favicon32).toFile(path.join(publicDir, "favicon.ico"));
console.log("  wrote public/favicon.ico");

console.log("Platform PWA icons and favicons generated in public/");
