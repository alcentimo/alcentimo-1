/**
 * Genera thumbnails WebP (máx. 400px) desde los JPG de referencia.
 * Ejecutar: node scripts/generate-reference-thumbnails.mjs
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "images", "referencia");
const MAX_WIDTH = 400;
const WEBP_QUALITY = 82;

async function collectJpgFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJpgFiles(fullPath)));
    } else if (entry.name.endsWith(".jpg")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const jpgs = await collectJpgFiles(root);
  let ok = 0;
  let fail = 0;

  for (const input of jpgs) {
    const output = input.replace(/\.jpg$/i, ".webp");

    try {
      await sharp(input)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(output);

      const { size } = await stat(output);
      ok += 1;
      console.log(`OK  ${path.relative(root, output)} (${Math.round(size / 1024)} KB)`);
    } catch (err) {
      fail += 1;
      console.error(`FAIL ${path.relative(root, input)}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
