#!/usr/bin/env node
/**
 * Take a folder of collected product photographs into the catalogue.
 *
 *   node scripts/import-images.mjs ./inbox --dry-run
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   node scripts/import-images.mjs ./inbox
 *
 * Files are matched to listings by filename, which is why the manifest gives
 * an exact `saveAs` for every image it wants. `samsung-galaxy-a32-5g-64gb.jpg`
 * becomes that listing's main image; `…--black.jpg` becomes the Black
 * variant's. Extension is ignored — jpg, png and webp all work.
 *
 * Three things happen to every file, and the order matters.
 *
 * 1. **It is re-encoded to 1200×1200 WebP.** Press photos arrive at 3000px and
 *    two megabytes. Seventy of those is a 140 MB repository and a product grid
 *    that takes ten seconds on a phone, which costs more sales than a missing
 *    photograph does. Chromium does the work — Playwright is already a
 *    dependency, so this needs no image library.
 * 2. **It is letterboxed onto white, never cropped.** Sources have different
 *    aspect ratios and a crop-to-fill quietly removes the top of a handset.
 * 3. **Firestore is updated to point at it**, leaving the drawn SVG in place
 *    for any listing with no photograph yet. A half-photographed catalogue
 *    must not become a half-broken one.
 *
 * ── On where the images come from ──
 *
 * A photograph is someone's copyright. Manufacturer press images are generally
 * licensed for editorial use, which is not the same as selling against them,
 * and a retailer's product shot belongs to that retailer. The safe sources are
 * your own photographs, Wikimedia Commons under CC BY-SA with attribution, and
 * syndication services such as Icecat that exist precisely so resellers can
 * use manufacturer assets with permission.
 *
 * There is also a consumer-law point that has nothing to do with copyright: a
 * press render shows a flawless device. You are selling graded second-hand
 * stock, and a Fair-grade handset that arrives with the scratches its grade
 * promised, against a listing photo showing none, is the shape of a complaint
 * that is expensive to answer.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib/csv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const inbox = process.argv.slice(2).find((a) => !a.startsWith('--'));
const fail = (m) => { console.error(`\n  ✗ ${m}\n`); process.exit(1); };

if (!inbox) fail('Usage: node scripts/import-images.mjs <folder> [--dry-run]');
if (!existsSync(inbox)) fail(`No such folder: ${inbox}`);

const ACCEPTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const OUT_DIR = join(root, 'public/assets/catalogue/photos');
const SIZE = 1200;
const QUALITY = 0.82;

const files = readdirSync(inbox).filter((f) => ACCEPTED.has(extname(f).toLowerCase()));
if (!files.length) fail(`No images in ${inbox} (looked for ${[...ACCEPTED].join(', ')}).`);

// ── Match filenames to listings ────────────────────────────────
const manifestPath = join(root, 'data/image-manifest.csv');
if (!existsSync(manifestPath)) fail('Run scripts/image-manifest.mjs first.');

const manifest = parseCsv(readFileSync(manifestPath, 'utf8'))
  .map((r) => ({ ...r, units: Number(r.units) }));

const wanted = new Map(manifest.map((m) => [basename(m.saveAs, extname(m.saveAs)).toLowerCase(), m]));

const matched = [];
const unmatched = [];
for (const file of files) {
  const key = basename(file, extname(file)).toLowerCase();
  const target = wanted.get(key);
  if (target) matched.push({ file, target });
  else unmatched.push(file);
}

console.log(`\n  Inbox      ${inbox}`);
console.log(`  Images     ${files.length} found, ${matched.length} matched, ${unmatched.length} unrecognised`);
if (unmatched.length) {
  console.log('\n  Unrecognised — the filename must match a saveAs in data/image-manifest.csv:');
  unmatched.slice(0, 10).forEach((f) => console.log(`    ${f}`));
  if (unmatched.length > 10) console.log(`    … and ${unmatched.length - 10} more`);
}
if (!matched.length) fail('Nothing to import.');

const covered = new Set(matched.map((m) => m.target.productId));
console.log(`\n  Listings   ${covered.size} of 70 would have a photograph\n`);

if (DRY) {
  matched.slice(0, 12).forEach((m) =>
    console.log(`    ${m.file.padEnd(44)} -> ${m.target.brand} ${m.target.model}${m.target.colour ? ` (${m.target.colour})` : ''}`));
  console.log('\n  --dry-run: nothing written.\n');
  process.exit(0);
}

// ── Re-encode through Chromium ─────────────────────────────────
const { chromium } = await import('playwright');
mkdirSync(OUT_DIR, { recursive: true });

// CHROMIUM_PATH is an escape hatch for environments where Playwright's
// bundled browser version does not match what is installed — a CI image with
// a pinned Chromium, most often. Unset, Playwright finds its own.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();

/**
 * Square, letterboxed onto white, at a size a phone can load.
 *
 * Done in the page rather than in Node because canvas is the only image
 * encoder available without adding a native dependency — and Playwright, with
 * Chromium, is already installed for the end-to-end suites.
 */
const encode = async (dataUrl) => page.evaluate(async ({ src, size, quality }) => {
  const img = new Image();
  img.src = src;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Contain, not cover: cropping to fill silently removes the top of a phone.
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  return canvas.toDataURL('image/webp', quality);
}, { src: dataUrl, size: SIZE, quality: QUALITY });

const written = [];
let before = 0, after = 0;

for (const { file, target } of matched) {
  const bytes = readFileSync(join(inbox, file));
  before += bytes.length;
  const mime = { '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' }[extname(file).toLowerCase()] ?? 'image/jpeg';

  try {
    const out = await encode(`data:${mime};base64,${bytes.toString('base64')}`);
    const buf = Buffer.from(out.split(',')[1], 'base64');
    const name = `${basename(target.saveAs, extname(target.saveAs))}.webp`;
    writeFileSync(join(OUT_DIR, name), buf);
    after += buf.length;
    written.push({ ...target, url: `/assets/catalogue/photos/${name}` });
  } catch (err) {
    console.log(`    FAILED  ${file} — ${err.message}`);
  }
}

await browser.close();

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`  Encoded    ${written.length} images, ${mb(before)} -> ${mb(after)}\n`);

// ── Point the catalogue at them ────────────────────────────────
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.log('  FIREBASE_SERVICE_ACCOUNT not set — images written, Firestore not updated.\n');
  process.exit(0);
}

let creds;
try {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  creds = JSON.parse(text);
  if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (err) {
  fail(`FIREBASE_SERVICE_ACCOUNT could not be parsed: ${err.message}`);
}

const { cert, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
initializeApp({
  credential: cert({ projectId: creds.project_id, clientEmail: creds.client_email, privateKey: creds.private_key }),
  projectId: creds.project_id,
});
const db = getFirestore();

const byProduct = new Map();
for (const w of written) {
  if (!byProduct.has(w.productId)) byProduct.set(w.productId, []);
  byProduct.get(w.productId).push(w);
}

let updated = 0;
for (const [productId, images] of byProduct) {
  const snap = await db.collection('products').doc(productId).get();
  if (!snap.exists) { console.log(`    skipped ${productId} — no such listing`); continue; }

  const product = snap.data();
  const main = images.find((i) => !i.colour);
  const byColour = new Map(images.filter((i) => i.colour).map((i) => [i.colour, i.url]));

  // Only replace what we actually have. A listing photographed in one colour
  // keeps its drawing for the others rather than showing the wrong handset.
  const variants = (product.variants ?? []).map((v) =>
    (v.color && byColour.has(v.color) ? { ...v, imageUrl: byColour.get(v.color) } : v));

  const imageUrl = main?.url ?? byColour.values().next().value ?? product.imageUrl;
  const gallery = [...new Set([imageUrl, ...variants.map((v) => v.imageUrl).filter(Boolean)])];

  await db.collection('products').doc(productId).set(
    { imageUrl, galleryImages: gallery, variants, hasPhotography: true, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  updated++;
}

console.log(`  Firestore  ${updated} listings now point at photographs`);
console.log(`             ${70 - updated} still using the drawn placeholder\n`);
