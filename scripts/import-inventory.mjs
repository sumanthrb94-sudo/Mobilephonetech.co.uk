#!/usr/bin/env node
/**
 * Replace the catalogue with the real stock list.
 *
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   node scripts/import-inventory.mjs --dry-run     # report, write nothing
 *   node scripts/import-inventory.mjs --reset       # delete every product first
 *   node scripts/import-inventory.mjs               # upsert, keep unknown docs
 *
 * Two collections are written, and the split is the point.
 *
 *   products/{id}    what a customer chooses between — model + capacity, with
 *                    a variant per condition and colour carrying its own price
 *                    and stock count.
 *   stockUnits/{imei} one document per physical handset: what it cost, who it
 *                    came from, when it arrived, which listing it belongs to.
 *
 * The second one is the thing the shop could not do before. Until stock is
 * per-unit you cannot run the VAT margin scheme, cannot answer "which handset
 * did we send them" against a warranty claim, and cannot price by real
 * condition. It also makes the storefront's stock counts derived facts rather
 * than a number somebody remembered to decrement.
 *
 * --reset deletes the products collection and nothing else. Orders, users,
 * returns and support threads are never touched: this imports a catalogue, and
 * a catalogue import that could destroy order history is a footgun with no
 * safety on it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildCatalogue, slugify as slug, PRICE_SOURCE } from './lib/catalogue.mjs';
import { parseCsv } from './lib/csv.mjs';
import { deviceSvg } from './lib/deviceArt.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const DRY = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');
const SOURCE = process.argv.find((a) => a.endsWith('.csv')) ?? join(root, 'data/inventory.csv');

const fail = (m) => { console.error(`\n  ✗ ${m}\n`); process.exit(1); };

// ── Read and build ─────────────────────────────────────────────
let rows;
try {
  rows = parseCsv(readFileSync(SOURCE, 'utf8'));
} catch (err) {
  fail(`Could not read ${SOURCE}: ${err.message}`);
}
if (!rows.length) fail(`${SOURCE} has no rows.`);

const { products, units, sellable, inversions } = buildCatalogue(rows);
if (!products.length) fail('No sellable products were produced — refusing to reset the catalogue with nothing to put back.');

const held = units.filter((u) => u.stockType !== 'SHS' && !u.returnDate);
const retail = products.reduce((s, p) => s + p.variants.reduce((t, v) => t + v.price * v.stock, 0), 0);

console.log(`\n  Source        ${SOURCE}`);
console.log(`  Rows          ${rows.length}`);
console.log(`  Sellable      ${sellable.length}  (${units.length - sellable.length} excluded: awaiting delivery, returned, or no IMEI)`);
console.log(`  Listings      ${products.length}`);
console.log(`  Prices        ${PRICE_SOURCE === 'as-listed' ? 'as listed in the export, used verbatim' : 'derived from cost'}`);
console.log(`  Catalogue     £${retail.toLocaleString()} at listed prices\n`);

// Surfaced, never corrected: with listed prices these are the owner's numbers.
if (inversions.length) {
  console.log('  Worth a look — a larger capacity priced at or below a smaller one:');
  for (const i of inversions) {
    console.log(`    ${i.model.padEnd(28)} ${i.smaller.storage} £${i.smaller.price}  ->  ${i.larger.storage} £${i.larger.price}`);
  }
  console.log('');
}

// ── Artwork ────────────────────────────────────────────────────
// Written before Firestore so a product never points at a file that is not
// there. Real photographs uploaded from the admin console overwrite these.
const artDir = join(root, 'public/assets/catalogue');
mkdirSync(artDir, { recursive: true });
let art = 0;
const drawn = [];

for (const p of products) {
  const draw = (colour, file) => {
    writeFileSync(join(artDir, file), deviceSvg({
      brand: p.brand, model: p.model, storage: p.storage, colour, category: p.category,
    }));
    drawn.push(file);
    art++;
  };

  draw(p.colorOptions[0], `${p.id}.svg`);
  p.imageUrl = `/assets/catalogue/${p.id}.svg`;

  // One per colour on sale. A variant picker that changes the price and not
  // the picture is worse than no picker: the customer chose a colour and the
  // page told them, silently, that it made no difference.
  for (const colour of p.colorOptions) {
    draw(colour, `${p.id}--${slug(colour)}.svg`);
  }

  p.galleryImages = [...new Set([p.imageUrl, ...p.variants.map((v) => v.imageUrl).filter(Boolean)])];
}
console.log(`  Artwork       ${art} drawings written`);

/**
 * A JPEG beside every drawing, for email.
 *
 * SVG is the right format on the site — a kilobyte, crisp at any size — and
 * unusable in a mailbox, because Gmail, Outlook and Yahoo strip it. Without a
 * raster twin every order confirmation shows an empty square until real
 * photographs arrive, which is tidy but says nothing about what was bought.
 *
 * 300px JPEG rather than 600px PNG, which was the first attempt and produced
 * 20 MB of flat colour. These are only ever rendered at 52 pixels in an email
 * thumbnail, so 300 covers even a high-density display, and JPEG suits a
 * smooth gradient far better than PNG does. The result is roughly a tenth of
 * the size for a picture nobody can tell apart at the size it is shown.
 *
 * Chromium rasterises them, the same encoder scripts/import-images.mjs uses
 * for photographs. Skipped with --no-raster when the drawings have not
 * changed, since it is the slow part of this script by a wide margin.
 */
if (!process.argv.includes('--no-raster')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
  let rastered = 0;

  for (const file of drawn) {
    const svg = readFileSync(join(artDir, file), 'utf8');
    const png = await page.evaluate(async (source) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
      await img.decode();
      const SIZE = 300;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      // White behind it. JPEG has no alpha channel, so without this the
      // transparent areas composite as black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      return canvas.toDataURL('image/jpeg', 0.86);
    }, svg);

    writeFileSync(join(artDir, file.replace(/\.svg$/, '.jpg')), Buffer.from(png.split(',')[1], 'base64'));
    rastered++;
  }

  await browser.close();
  console.log(`  Email art     ${rastered} JPEG twins written`);
}

if (DRY) {
  console.log('  --dry-run: nothing written to Firestore.\n');
  products.slice(0, 10).forEach((p) =>
    console.log(`    ${p.id.padEnd(42)} £${String(p.price).padStart(4)}  ×${String(p.stock).padStart(3)}  ${p.variants.length} variants`));
  process.exit(0);
}

// ── Firestore ──────────────────────────────────────────────────
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) fail('Set FIREBASE_SERVICE_ACCOUNT (service-account JSON, raw or base64).');

let creds;
try {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  creds = JSON.parse(text);
  if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (err) {
  fail(`FIREBASE_SERVICE_ACCOUNT could not be parsed: ${err.message}`);
}

initializeApp({
  credential: cert({ projectId: creds.project_id, clientEmail: creds.client_email, privateKey: creds.private_key }),
  projectId: creds.project_id,
});
const db = getFirestore();
console.log(`  Project       ${creds.project_id}\n`);

/**
 * Firestore refuses a document containing `undefined` anywhere in it, and the
 * error names one field while the write that failed carried seventy. Optional
 * product attributes — a tablet has no SIM type, a phone has no case size —
 * are genuinely absent rather than null, so this drops them on the way out.
 *
 * Dropping beats coercing to null: a null in Firestore is a stored value that
 * `where('bodySIM', '==', null)` matches, so coercion invents a fact ("this
 * device has no SIM type") where absence means "we do not know".
 */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return value;
}

/** Firestore caps a batch at 500 writes. */
async function commitInChunks(items, apply) {
  let done = 0;
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    for (const item of items.slice(i, i + 400)) apply(batch, item);
    await batch.commit();
    done += Math.min(400, items.length - i);
    process.stdout.write(`\r  … ${done}/${items.length}`);
  }
  process.stdout.write('\r');
  return done;
}

async function deleteCollection(name) {
  let removed = 0;
  for (;;) {
    const snap = await db.collection(name).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.size;
  }
  return removed;
}

const now = new Date().toISOString();

if (RESET) {
  // Only these two. Orders, users, returns and support threads are not ours.
  console.log(`  Reset         products: ${await deleteCollection('products')} deleted`);
  console.log(`                stockUnits: ${await deleteCollection('stockUnits')} deleted`);
}

const searchTermsFor = (p) => [...new Set(
  `${p.brand} ${p.model} ${p.storage ?? ''} ${p.category}`.toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean),
)].slice(0, 40);

await commitInChunks(products, (batch, p) => {
  batch.set(db.collection('products').doc(p.id), stripUndefined({
    // createdAt as well as updatedAt: a catalogue read that orders by a
    // field these documents lack comes back empty rather than unsorted,
    // which reads as "no catalogue" and sends the storefront to bundled
    // sample data whose ids no order can be priced against.
    ...p, searchTerms: searchTermsFor(p), source: 'inventory-import',
    createdAt: now, updatedAt: now,
  }));
});
console.log(`  Products      ${products.length} written`);

await commitInChunks(sellable, (batch, u) => {
  batch.set(db.collection('stockUnits').doc(u.imei), stripUndefined({
    imei: u.imei,
    productId: `${u.brand}-${u.model}-${u.storage ?? u.caseSize ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    brand: u.brand, model: u.model, category: u.category,
    grade: u.grade, supplierGrade: u.supplierGrade,
    storage: u.storage, caseSize: u.caseSize, colour: u.colour, simType: u.simType,
    supplier: u.supplier, buyPrice: u.buyPrice,
    stockInDate: u.stockInDate, stockType: u.stockType,
    // 'available' until an order claims it. The margin-scheme stock book is
    // this collection plus the sale price recorded when that happens.
    status: 'available', soldAt: null, orderId: null,
    updatedAt: now,
  }));
});
console.log(`  Stock units   ${sellable.length} written\n  Done.\n`);
process.exit(0);
