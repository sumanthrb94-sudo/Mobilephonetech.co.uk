#!/usr/bin/env node
/**
 * Seed the Firestore product catalogue from the bundled sample data.
 *
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   node scripts/seed-firestore.mjs            # add or update every product
 *   node scripts/seed-firestore.mjs --dry-run  # report, write nothing
 *   node scripts/seed-firestore.mjs --prune    # also delete docs not in the source
 *
 * Idempotent: documents are keyed by product id, so re-running updates in
 * place rather than duplicating. Existing stock levels are preserved by
 * default — re-seeding must not silently undo the shop's real inventory.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const PRUNE = process.argv.includes('--prune');
const RESET_STOCK = process.argv.includes('--reset-stock');

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

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
  credential: cert({
    projectId: creds.project_id,
    clientEmail: creds.client_email,
    privateKey: creds.private_key,
  }),
  projectId: creds.project_id,
});
const db = getFirestore();

/**
 * The catalogue lives in src/data.ts as TypeScript, which node cannot import.
 * Rather than add a build step for a one-off script, the array literal is
 * pulled out and evaluated — the file is generated data, not hand-written
 * logic, so there is nothing in it but object literals.
 */
function loadProducts() {
  const src = readFileSync(join(here, '..', 'src', 'data.ts'), 'utf8');
  const marker = 'export const MOCK_PHONES';
  const start = src.indexOf(marker);
  if (start === -1) fail('Could not find MOCK_PHONES in src/data.ts');

  const open = src.indexOf('[', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) fail('Could not find the end of the MOCK_PHONES array');

  const literal = src.slice(open, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${literal};`)();
}

/** Whole-word and prefix tokens, mirroring src/lib/productMapper.ts. */
function buildSearchTerms(brand, model, category) {
  const words = `${brand} ${model} ${category ?? ''}`
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const terms = new Set(words);
  for (const w of words) {
    for (let i = 2; i < Math.min(w.length, 12); i++) terms.add(w.slice(0, i));
  }
  return [...terms].slice(0, 120);
}

function deepClean(value) {
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = deepClean(v);
    return out;
  }
  return value;
}

function toDoc(p) {
  const doc = {
    model: p.model,
    brand: p.brand,
    category: p.category,
    storage: p.storage ?? null,
    price: p.price,
    originalPrice: p.originalPrice ?? p.price,
    grade: p.grade,
    batteryHealth: p.batteryHealth ?? null,
    warrantyMonths: p.warrantyMonths ?? 12,
    returnDays: p.returnDays ?? 30,
    imageUrl: p.imageUrl ?? null,
    galleryImages: p.galleryImages ?? null,
    isCertified: Boolean(p.isCertified),
    stock: p.stock ?? 0,
    specs: p.specs ?? {},
    description: p.description ?? null,
    conditionDescription: p.conditionDescription ?? null,
    colorOptions: p.colorOptions ?? null,
    storageOptions: p.storageOptions ?? null,
    conditionOptions: p.conditionOptions ?? null,
    variants: p.variants ?? null,
    searchTerms: buildSearchTerms(p.brand, p.model, p.category),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Recursive: Firestore rejects undefined at any depth, and one product has
  // one inside variants[]. A top-level-only clean fails the entire batch.
  return deepClean(doc);
}

const products = loadProducts();
console.log(`\nSeeding ${products.length} products into ${creds.project_id}${DRY ? ' (dry run)' : ''}\n`);

const existing = await db.collection('products').get();
const existingById = new Map(existing.docs.map(d => [d.id, d.data()]));
console.log(`  ${existingById.size} product(s) already present`);

let created = 0;
let updated = 0;

// Firestore caps a batch at 500 writes, so chunk rather than assume it fits.
const CHUNK = 400;
for (let i = 0; i < products.length; i += CHUNK) {
  const slice = products.slice(i, i + CHUNK);
  const batch = db.batch();

  for (const p of slice) {
    if (!p.id) continue;
    const prior = existingById.get(p.id);
    const doc = toDoc(p);

    if (prior) {
      // Keep the live stock level unless explicitly told otherwise: re-seeding
      // to pick up a copy change must not quietly restock sold-out items.
      if (!RESET_STOCK) delete doc.stock;
      updated++;
    } else {
      doc.createdAt = FieldValue.serverTimestamp();
      created++;
    }

    if (!DRY) batch.set(db.collection('products').doc(p.id), doc, { merge: true });
  }

  if (!DRY) await batch.commit();
  console.log(`  ...${Math.min(i + CHUNK, products.length)}/${products.length}`);
}

let pruned = 0;
if (PRUNE) {
  const wanted = new Set(products.map(p => p.id));
  const stale = existing.docs.filter(d => !wanted.has(d.id));
  for (let i = 0; i < stale.length; i += CHUNK) {
    const batch = db.batch();
    for (const d of stale.slice(i, i + CHUNK)) batch.delete(d.ref);
    if (!DRY) await batch.commit();
  }
  pruned = stale.length;
}

// Read back rather than trusting the writes: a rules or quota failure would
// otherwise look identical to success.
const after = DRY ? existingById.size : (await db.collection('products').count().get()).data().count;

console.log(`\n  created ${created}   updated ${updated}${PRUNE ? `   pruned ${pruned}` : ''}`);
console.log(`  ${after} product(s) in Firestore now`);
if (!DRY && after === 0) fail('Nothing was written — check the service account has Firestore access.');
console.log(`\n  ✓ Done${DRY ? ' (dry run — nothing written)' : ''}.\n`);
