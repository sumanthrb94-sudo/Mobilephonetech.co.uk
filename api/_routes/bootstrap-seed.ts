import { timingSafeEqual } from 'node:crypto';
import { adminDb, getAdminInitError } from '../_firebaseAdmin.js';
import { MOCK_PHONES } from '../../src/data.js';

/**
 * One-time catalogue seed, for when running scripts/seed-firestore.mjs is not
 * practical.
 *
 * Guarded by the same BOOTSTRAP_SECRET as the admin promotion route, so there
 * is one thing to set and one thing to delete afterwards. With the secret
 * unset the route 404s.
 *
 * Idempotent: documents are keyed by product id, so re-running updates in
 * place. Stock is preserved on products that already exist — re-seeding to
 * pick up a copy change must not quietly restock sold-out items.
 */

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Whole-word and prefix tokens; mirrors src/lib/productMapper.ts. */
function buildSearchTerms(brand: string, model: string, category?: string): string[] {
  const words = `${brand} ${model} ${category ?? ''}`
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const terms = new Set<string>(words);
  for (const w of words) {
    for (let i = 2; i < Math.min(w.length, 12); i++) terms.add(w.slice(0, i));
  }
  return [...terms].slice(0, 120);
}

/**
 * Remove undefined at every depth. Firestore rejects undefined anywhere in a
 * document, and one product in the catalogue has an undefined inside
 * variants[] — with a top-level-only clean, that single record fails the whole
 * batch and nothing at all is written.
 */
function deepClean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(v => deepClean(v)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = deepClean(v);
    }
    return out as T;
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDoc(p: any, createdAt: string) {
  const doc: Record<string, unknown> = {
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
    updatedAt: createdAt,
  };
  return deepClean(doc);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.BOOTSTRAP_SECRET ?? '';
  if (!expected || expected.length < 16) {
    return res.status(404).json({ error: 'Not found' });
  }

  const provided = String(req.query?.secret ?? req.body?.secret ?? '');
  if (!provided || !secretMatches(provided, expected)) {
    // Same 404 as the disabled case, so probing cannot tell them apart.
    return res.status(404).json({ error: 'Not found' });
  }

  const db = adminDb ? await adminDb() : null;
  if (!db) {
    return res.status(503).json({
      error: 'Firebase Admin SDK is not initialised',
      detail: getAdminInitError() ?? 'FIREBASE_SERVICE_ACCOUNT missing',
    });
  }

  const resetStock = String(req.query?.resetStock ?? '') === 'true';

  try {
    const existing = await db.collection('products').get();
    const existingIds = new Set(existing.docs.map(d => d.id));

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (MOCK_PHONES as any[]).filter(p => p?.id);

    let created = 0;
    let updated = 0;

    // A Firestore batch caps at 500 writes, so chunk rather than assume it fits.
    const CHUNK = 400;
    for (let i = 0; i < products.length; i += CHUNK) {
      const batch = db.batch();
      for (const p of products.slice(i, i + CHUNK)) {
        const doc = toDoc(p, now);
        if (existingIds.has(p.id)) {
          if (!resetStock) delete doc.stock;
          updated++;
        } else {
          doc.createdAt = now;
          created++;
        }
        batch.set(db.collection('products').doc(p.id), doc, { merge: true });
      }
      await batch.commit();
    }

    // Read the count back rather than trusting the writes — a rules or quota
    // failure would otherwise report a success that did not happen.
    const after = (await db.collection('products').count().get()).data().count;

    return res.status(after > 0 ? 200 : 500).json({
      created,
      updated,
      productsInFirestore: after,
      stockPreserved: !resetStock,
      next: after > 0
        ? 'Catalogue seeded. Delete BOOTSTRAP_SECRET from your environment now — it also disables the admin promotion route.'
        : 'Nothing was written. Check the service account has Firestore write access.',
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Seeding failed',
      detail: (err as Error).message,
    });
  }
}
