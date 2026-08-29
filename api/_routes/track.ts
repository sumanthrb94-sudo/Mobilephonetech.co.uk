import { adminDb } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';

/**
 * Cookieless, identifier-free website analytics.
 *
 * The shop needed to know what people look at and where they stop, and the two
 * obvious answers were both bad. Google Analytics cannot load before consent,
 * so it measures only the visitors who accept a banner — which is exactly the
 * population least representative of the ones who leave. A homegrown tracker
 * with a visitor id is the same consent problem wearing a different hat.
 *
 * So this stores no identifier at all: no cookie, no device id, no IP, no
 * fingerprint. It increments counters. A page view adds one to today's total
 * for that path; a product view adds one to that product's tally. Nothing here
 * can be tied back to a person, by us or by anyone who obtained the data, which
 * is what takes it outside the consent requirement rather than merely
 * arguing it should be.
 *
 * The cost of that choice is real and worth stating: no sessions, no funnels
 * per user, no returning-visitor rate. What it does answer is what a shop this
 * size actually acts on — which products draw attention, which draw attention
 * and no orders, and whether yesterday was busier than the day before.
 *
 * One document per day keeps it cheap: a busy day is one write per event and
 * one small document, rather than a row per hit that must later be aggregated.
 */

/** Events worth counting. Anything else is rejected rather than stored. */
const KINDS = ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'search'] as const;
type Kind = (typeof KINDS)[number];

const MAX_EVENTS_PER_CALL = 20;

/** Today in UTC, as the document id: "2026-08-29". */
function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Paths are grouped before they are stored.
 *
 * `/product/apple-iphone-12-64gb` becomes `/product/*` in the page totals, with
 * the id counted separately under productViews. Storing every URL verbatim
 * turns one document per day into an unbounded map, and a page-path map that
 * grows with the catalogue is a document that eventually exceeds Firestore's
 * one-megabyte limit and starts failing every write.
 */
function normalisePath(raw: unknown): string | null {
  const path = String(raw ?? '').trim().slice(0, 200);
  if (!path.startsWith('/')) return null;

  const clean = path.split('?')[0].split('#')[0];
  return clean
    .replace(/^\/product\/.+/, '/product/*')
    .replace(/^\/order\/.+/, '/order/*')
    .replace(/^\/returns\/.+/, '/returns/*')
    .replace(/^\/admin\/.+/, '/admin/*')
    .slice(0, 80) || '/';
}

const cleanId = (v: unknown) => String(v ?? '').trim().slice(0, 190).replace(/[^A-Za-z0-9._-]/g, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Generous, because a browsing session legitimately fires a lot of these,
  // and they arrive batched.
  if (!enforceRateLimit(req, res, 'track', { limit: 60, windowMs: 60_000 })) return;

  const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, MAX_EVENTS_PER_CALL) : [];
  if (!events.length) return res.status(200).json({ ok: true, counted: 0 });

  const db = await adminDb();
  // Analytics must never be the reason a page fails. Silently fine.
  if (!db) return res.status(200).json({ ok: true, counted: 0, skipped: 'database unavailable' });

  const totals: Record<string, number> = {};
  const paths: Record<string, number> = {};
  const productViews: Record<string, number> = {};
  const searches: Record<string, number> = {};
  let counted = 0;

  for (const event of events) {
    const kind = String(event?.kind ?? '') as Kind;
    if (!KINDS.includes(kind)) continue;

    totals[kind] = (totals[kind] ?? 0) + 1;
    counted++;

    if (kind === 'page_view') {
      const path = normalisePath(event.path);
      if (path) paths[path] = (paths[path] ?? 0) + 1;
    } else if (kind === 'product_view' || kind === 'add_to_cart') {
      const id = cleanId(event.productId);
      if (id) productViews[`${kind}:${id}`] = (productViews[`${kind}:${id}`] ?? 0) + 1;
    } else if (kind === 'search') {
      // Lower-cased and truncated. A search term is what someone typed, so it
      // is capped hard and never joined to anything else.
      const term = String(event.term ?? '').trim().toLowerCase().slice(0, 40).replace(/[^a-z0-9 +]/g, '');
      if (term) searches[term] = (searches[term] ?? 0) + 1;
    }
  }

  if (!counted) return res.status(200).json({ ok: true, counted: 0 });

  const { FieldValue } = await import('firebase-admin/firestore');
  const increments: Record<string, unknown> = { day: dayKey(), updatedAt: new Date().toISOString() };

  for (const [k, n] of Object.entries(totals)) increments[`totals.${k}`] = FieldValue.increment(n);
  for (const [k, n] of Object.entries(paths)) increments[`paths.${encodeKey(k)}`] = FieldValue.increment(n);
  for (const [k, n] of Object.entries(productViews)) increments[`products.${encodeKey(k)}`] = FieldValue.increment(n);
  for (const [k, n] of Object.entries(searches)) increments[`searches.${encodeKey(k)}`] = FieldValue.increment(n);

  try {
    await db.collection('analyticsDaily').doc(dayKey()).set(increments, { merge: true });
  } catch (err) {
    // Still a 200. A failed counter must not surface to a shopper.
    console.error('[api/track]', (err as Error).message);
    return res.status(200).json({ ok: true, counted: 0, skipped: 'write failed' });
  }

  return res.status(200).json({ ok: true, counted });
}

/** Firestore field paths treat "." and "/" specially, so keys are encoded. */
export function encodeKey(key: string): string {
  return key.replace(/[.$/[\]#]/g, '_');
}
