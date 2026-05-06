// One-shot image optimiser: walks /public/images, downscales each PNG/JPG to
// a sensible max dimension (different for icons / vehicles / hero shots), then
// re-encodes with palette quantisation. Filenames stay the same so no code
// changes needed downstream.
//
// Run with: node scripts/optimize-images.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'public', 'images');

// max-width budgets per folder. Pick the biggest output the UI will ever
// render, then double for retina, then accept that's enough.
const BUDGETS = {
  sections: 256,   // home tile icons display at ~80–96px
  stanok: 256,     // small spec icons
  vehicles: 480,   // delivery vehicle cards
  default: 1024,   // hero shots / catch-all
};

async function* walk(dir) {
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function budgetFor(file) {
  const rel = path.relative(ROOT, file).split(path.sep);
  return BUDGETS[rel[0]] ?? BUDGETS.default;
}

async function main() {
  let savedBytes = 0;
  let count = 0;
  for await (const file of walk(ROOT)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
    const before = (await fs.stat(file)).size;
    const buf = await fs.readFile(file);
    const meta = await sharp(buf).metadata();
    const max = budgetFor(file);

    let pipeline = sharp(buf);
    if (meta.width && meta.width > max) {
      pipeline = pipeline.resize({ width: max, withoutEnlargement: true });
    }
    if (ext === '.png') {
      pipeline = pipeline.png({ palette: true, quality: 80, compressionLevel: 9 });
    } else {
      pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    }

    const out = await pipeline.toBuffer();
    if (out.length < before) {
      await fs.writeFile(file, out);
      const saved = before - out.length;
      savedBytes += saved;
      count++;
      console.log(
        `${path.relative(ROOT, file).padEnd(40)} ${(before / 1024).toFixed(0).padStart(6)} KB → ${(out.length / 1024).toFixed(0).padStart(5)} KB  (-${((saved / before) * 100).toFixed(0)}%)`
      );
    } else {
      console.log(`${path.relative(ROOT, file).padEnd(40)} (skipped — re-encode larger)`);
    }
  }
  console.log(`\nOptimised ${count} files, saved ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(e => { console.error(e); process.exit(1); });
