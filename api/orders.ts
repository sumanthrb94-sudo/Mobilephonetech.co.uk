import { adminDb, verifyCaller } from './_firebaseAdmin.js';
import { enforceRateLimit } from './_rateLimit.js';
import { looksLikeEmail } from './_email.js';

/**
 * Create an order. The server prices it; the browser never does.
 *
 * Orders used to be written straight from the client, which meant every price
 * in the document came from the browser. A crafted request could buy a £759
 * phone for a penny, and the security rules could not stop it: rules have no
 * loop with which to re-price a basket against the catalogue.
 *
 * So the client now sends only WHAT it wants — product ids and quantities —
 * and this route looks up every price in Firestore, applies shipping and any
 * coupon from server-side tables, computes the totals, and writes with the
 * Admin SDK. `orders` is closed to client writes entirely.
 *
 * Guests are allowed. Signing in is not a security control here — the prices
 * are authoritative either way — and requiring it would have blocked guest
 * checkout, which is currently broken precisely because the old rule demanded
 * a uid the guest did not have.
 */

const SHIPPING: Record<string, { name: string; cost: number }> = {
  standard: { name: 'Standard Delivery', cost: 0 },
  express: { name: 'Express Delivery', cost: 9.99 },
  nextday: { name: 'Next Day Delivery', cost: 14.99 },
};

const COUPONS: Record<string, { type: 'percentage' | 'fixed'; value: number; minOrder?: number }> = {
  SAVE10: { type: 'percentage', value: 10 },
  WELCOME20: { type: 'fixed', value: 20, minOrder: 50 },
  FREESHIP: { type: 'fixed', value: 9.99 },
  REFURB15: { type: 'percentage', value: 15, minOrder: 200 },
};

const VAT_RATE = 0.2;
const MAX_LINES = 20;
const MAX_QTY_PER_LINE = 5;

const money = (n: number) => Math.round(n * 100) / 100;

/** Trim and cap a free-text field before it is stored or emailed. */
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!enforceRateLimit(req, res, 'orders', { limit: 12, windowMs: 60_000 })) return;

  const db = await adminDb();
  if (!db) return res.status(503).json({ error: 'Ordering is temporarily unavailable' });

  const caller = await verifyCaller(req);
  const body = req.body ?? {};

  // ── Validate the shape before touching the database ──
  const lines = Array.isArray(body.items) ? body.items : [];
  if (lines.length === 0) return res.status(400).json({ error: 'Your basket is empty' });
  if (lines.length > MAX_LINES) return res.status(400).json({ error: 'Too many items in one order' });

  const address = body.shippingAddress ?? {};
  if (!clean(address.fullName, 120)) return res.status(400).json({ error: 'A delivery name is required' });
  if (!clean(address.addressLine1, 200)) return res.status(400).json({ error: 'A delivery address is required' });
  if (!clean(address.postalCode ?? address.postcode, 20)) return res.status(400).json({ error: 'A postcode is required' });

  const contactEmail = clean(address.email || body.guestEmail || caller?.email, 254);
  if (!looksLikeEmail(contactEmail)) {
    return res.status(400).json({ error: 'A valid email address is required for order updates' });
  }

  const shipping = SHIPPING[String(body.shippingOptionId ?? 'standard')] ?? SHIPPING.standard;

  // ── Price the basket from the catalogue ──
  const priced: Array<Record<string, unknown>> = [];
  let subtotal = 0;

  for (const line of lines) {
    const productId = clean(line.productId ?? line.id, 200);
    const quantity = Math.floor(Number(line.quantity ?? 1));

    // Firestore throws on a path-shaped id ("../x"), which surfaces as a 500.
    // Validate the shape first so a malformed request is a clean 400 and no
    // internal detail leaks in the error.
    if (!productId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,190}$/.test(productId) || productId.includes('..')) {
      return res.status(400).json({ error: 'An item is missing a valid product' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return res.status(400).json({ error: 'Item quantities must be between 1 and 5' });
    }

    const snap = await db.collection('products').doc(productId).get();
    if (!snap.exists) return res.status(400).json({ error: `That product is no longer available` });

    const product = snap.data() as Record<string, any>;

    // A configured product is sold at its variant's price and stock, not the
    // base row's — pricing the base would let someone pick the Pristine model
    // and be charged the Good one's price.
    const variantId = clean(line.variantId, 200);
    const variant = variantId && Array.isArray(product.variants)
      ? product.variants.find((v: any) => v?.id === variantId) ?? null
      : null;
    if (variantId && Array.isArray(product.variants) && product.variants.length > 0 && !variant) {
      return res.status(400).json({ error: 'That configuration is no longer available' });
    }

    const stock = Number((variant?.stock ?? product.stock) ?? 0);
    if (stock < quantity) {
      return res.status(409).json({ error: `${product.brand} ${product.model} is out of stock` });
    }

    // The catalogue price, never the one the browser offered.
    const unitPrice = Number(variant?.price ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(500).json({ error: 'That product is mispriced — please contact us' });
    }

    subtotal += unitPrice * quantity;
    priced.push({
      id: productId,
      productId,
      brand: product.brand ?? '',
      model: product.model ?? '',
      variantId: variant?.id ?? null,
      price: unitPrice,
      originalPrice: Number(variant?.originalPrice ?? product.originalPrice ?? unitPrice),
      quantity,
      imageUrl: product.imageUrl ?? null,
      grade: product.grade ?? null,
      selectedColor: clean(line.selectedColor, 60) || null,
      selectedStorage: clean(line.selectedStorage, 60) || null,
      selectedCondition: clean(line.selectedCondition, 60) || null,
    });
  }

  subtotal = money(subtotal);

  // ── Discount, also from a server-side table ──
  let discount = 0;
  const code = clean(body.couponCode, 40).toUpperCase();
  if (code) {
    const coupon = COUPONS[code];
    if (coupon && subtotal >= (coupon.minOrder ?? 0)) {
      discount = coupon.type === 'percentage'
        ? money(subtotal * (coupon.value / 100))
        : money(Math.min(coupon.value, subtotal));
    }
    // An unrecognised or ineligible code is silently worth nothing rather than
    // an error: the basket is still valid and the customer still wants it.
  }

  const shippingCost = money(shipping.cost);
  const tax = money((subtotal - discount + shippingCost) * VAT_RATE);
  const total = money(subtotal - discount + shippingCost + tax);

  if (total < 0) return res.status(400).json({ error: 'That basket does not price correctly' });

  // ── Write it ──
  const orderId = `ORD-${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  const now = new Date().toISOString();

  const order = {
    id: orderId,
    userId: caller?.uid ?? null,
    guestEmail: caller ? null : contactEmail,
    contactEmail,
    // Always 'pending'. A customer must never be able to hand us an order that
    // says it is already paid or delivered.
    status: 'pending' as const,
    subtotal,
    discount,
    shippingCost,
    shippingMethod: shipping.name,
    tax,
    total,
    currency: 'GBP',
    couponCode: discount > 0 ? code : null,
    shippingAddress: {
      fullName: clean(address.fullName, 120),
      email: contactEmail,
      phone: clean(address.phone, 40) || null,
      addressLine1: clean(address.addressLine1, 200),
      addressLine2: clean(address.addressLine2, 200) || null,
      city: clean(address.city, 100),
      postalCode: clean(address.postalCode ?? address.postcode, 20),
      country: clean(address.country, 100) || 'United Kingdom',
    },
    items: priced,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection('orders').doc(orderId).set(order);
  } catch (err) {
    return res.status(500).json({ error: 'Could not save your order', detail: (err as Error).message });
  }

  return res.status(201).json({ order });
}
