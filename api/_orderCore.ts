import { sendEmail, looksLikeEmail } from './_email.js';
import { orderConfirmationEmail } from './_templates.js';

/**
 * The shared heart of ordering: price a basket, reserve its stock, write it,
 * and send the receipt.
 *
 * Two routes must agree on every penny — /api/orders (the direct path) and
 * the PayPal capture route, which reserves stock and writes the order only
 * after the money is captured. If each re-implemented the pricing, the two
 * would drift, and a drift here means charging one amount and recording
 * another. This project has been bitten by duplicated logic before (three
 * copies of a CSV parser, a browser price the server had to re-derive), so
 * the rule stands: one implementation, imported, never copied.
 *
 * Nothing here reads the network or the request directly — it takes a Firestore
 * handle and a plain body — so it is equally callable from a card checkout, a
 * PayPal capture, or a test harness.
 */

/** A basket that priced correctly but could no longer be filled. */
export class StockConflict extends Error {}

const SHIPPING: Record<string, { name: string; cost: number }> = {
  standard: { name: 'Standard Delivery', cost: 0 },
  express: { name: 'Express Delivery', cost: 9.99 },
  nextday: { name: 'Next Day Delivery', cost: 14.99 },
};

const COUPONS: Record<string, { type: 'percentage' | 'fixed'; value: number; minOrder?: number }> = {
  SAVE10: { type: 'percentage', value: 10 },
  FREESHIP: { type: 'fixed', value: 9.99 },
  REFURB15: { type: 'percentage', value: 15, minOrder: 200 },
};

const VAT_RATE = 0.2;
const MAX_LINES = 20;
const MAX_QTY_PER_LINE = 5;

export const money = (n: number) => Math.round(n * 100) / 100;

/** Trim and cap a free-text field before it is stored or emailed. */
export const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** The order shape both routes build and store. */
export interface PricedOrder {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  contactEmail: string;
  copyEmail: string | null;
  status: 'pending' | 'awaiting-payment';
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingMethod: string;
  tax: number;
  total: number;
  currency: 'GBP';
  couponCode: string | null;
  paymentMethod?: string;
  paypalOrderId?: string;
  shippingAddress: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}

/** Either a fully priced order, or a reason it could not be built. */
export type PriceResult =
  | { ok: true; order: PricedOrder; contactPhone: string }
  | { ok: false; status: number; error: string };

type Caller = { uid?: string; email?: string } | null;

/**
 * Validate and price a basket against the live catalogue.
 *
 * The browser sends only WHAT it wants — product ids, quantities, the chosen
 * variant — never a price. Every figure below is looked up server-side, so a
 * crafted request cannot buy a £759 phone for a penny. Stock is checked but
 * not yet reserved: reservation happens in commitOrder, inside a transaction,
 * because the gap between pricing and writing is where a race lives.
 *
 * `status: 'pending'` for the direct path (already paid-by-intent at write),
 * `'awaiting-payment'` for the PayPal path, which writes only after capture.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function priceAndValidate(
  db: any,
  body: any,
  caller: Caller,
  opts: { status?: 'pending' | 'awaiting-payment' } = {},
): Promise<PriceResult> {
  const fail = (status: number, error: string): PriceResult => ({ ok: false, status, error });

  const lines = Array.isArray(body.items) ? body.items : [];
  if (lines.length === 0) return fail(400, 'Your basket is empty');
  if (lines.length > MAX_LINES) return fail(400, 'Too many items in one order');

  const address = body.shippingAddress ?? {};
  if (!clean(address.fullName, 120)) return fail(400, 'A delivery name is required');
  if (!clean(address.addressLine1, 200)) return fail(400, 'A delivery address is required');
  if (!clean(address.postalCode ?? address.postcode, 20)) return fail(400, 'A postcode is required');

  const contactPhone = clean(address.phone, 40);
  if (!contactPhone) return fail(400, 'A contact phone number is required for delivery');

  const accountEmail = clean(caller?.email, 254);
  const typedEmail = clean(address.email || body.guestEmail, 254);
  if (typedEmail && !looksLikeEmail(typedEmail)) {
    return fail(400, 'A valid email address is required for order updates');
  }
  const contactEmail = looksLikeEmail(accountEmail) ? accountEmail : typedEmail;
  if (!looksLikeEmail(contactEmail)) {
    return fail(400, 'A valid email address is required for order updates');
  }
  const copyEmail = typedEmail && typedEmail.toLowerCase() !== contactEmail.toLowerCase()
    ? typedEmail
    : null;

  const shipping = SHIPPING[String(body.shippingOptionId ?? 'standard')] ?? SHIPPING.standard;

  const priced: Array<Record<string, unknown>> = [];
  let subtotal = 0;

  for (const line of lines) {
    const productId = clean(line.productId ?? line.id, 200);
    const quantity = Math.floor(Number(line.quantity ?? 1));

    if (!productId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,190}$/.test(productId) || productId.includes('..')) {
      return fail(400, 'An item is missing a valid product');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return fail(400, 'Item quantities must be between 1 and 5');
    }

    const snap = await db.collection('products').doc(productId).get();
    if (!snap.exists) return fail(400, 'That product is no longer available');

    const product = snap.data() as Record<string, any>;
    const variantId = clean(line.variantId, 200);
    const variant = variantId && Array.isArray(product.variants)
      ? product.variants.find((v: any) => v?.id === variantId) ?? null
      : null;
    if (variantId && Array.isArray(product.variants) && product.variants.length > 0 && !variant) {
      return fail(400, 'That configuration is no longer available');
    }

    const stock = Number((variant?.stock ?? product.stock) ?? 0);
    if (stock < quantity) return fail(409, `${product.brand} ${product.model} is out of stock`);

    const unitPrice = Number(variant?.price ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return fail(500, 'That product is mispriced — please contact us');
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

  let discount = 0;
  const code = clean(body.couponCode, 40).toUpperCase();
  if (code) {
    const coupon = COUPONS[code];
    if (coupon && subtotal >= (coupon.minOrder ?? 0)) {
      discount = coupon.type === 'percentage'
        ? money(subtotal * (coupon.value / 100))
        : money(Math.min(coupon.value, subtotal));
    }
  }

  const shippingCost = money(shipping.cost);
  const tax = money((subtotal - discount + shippingCost) * VAT_RATE);
  const total = money(subtotal - discount + shippingCost + tax);
  if (total < 0) return fail(400, 'That basket does not price correctly');

  const now = new Date().toISOString();
  const order: PricedOrder = {
    id: `ORD-${Date.now()}${Math.floor(Math.random() * 900 + 100)}`,
    userId: caller?.uid ?? null,
    guestEmail: caller ? null : contactEmail,
    contactEmail,
    copyEmail,
    // Always server-set. A customer must never hand us an order that claims to
    // be paid or delivered.
    status: opts.status ?? 'pending',
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
      email: typedEmail || contactEmail,
      phone: contactPhone,
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

  return { ok: true, order, contactPhone };
}

/**
 * Reserve stock and write the order as one atomic step.
 *
 * A transaction, not a plain write: two simultaneous checkouts for the last
 * unit both read "1 available" and both pass otherwise, and only a transaction
 * makes one of them lose. Firestore wants every read before every write, hence
 * the two passes. Throws StockConflict if the basket can no longer be filled —
 * the caller decides whether that is a 409 (card path) or a refund (PayPal).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function commitOrder(db: any, order: PricedOrder): Promise<void> {
  const priced = order.items;
  const now = order.updatedAt;

  await db.runTransaction(async (tx: any) => {
    const ids = [...new Set(priced.map(i => String(i.productId)))];
    const refs = ids.map(id => db.collection('products').doc(id));
    const snaps = await Promise.all(refs.map((ref: any) => tx.get(ref)));

    const docs = new Map(refs.map((ref: any, i: number) => [
      ref.id,
      { ref, exists: snaps[i].exists, data: (snaps[i].data() ?? {}) as Record<string, any> },
    ]));

    for (const item of priced) {
      const entry = docs.get(String(item.productId));
      if (!entry?.exists) throw new StockConflict('That product is no longer available');

      const product = entry.data;
      const variant = item.variantId && Array.isArray(product.variants)
        ? product.variants.find((v: any) => v?.id === item.variantId) ?? null
        : null;

      const available = Number((variant?.stock ?? product.stock) ?? 0);
      const wanted = Number(item.quantity);
      if (available < wanted) {
        const name = `${product.brand ?? ''} ${product.model ?? ''}`.trim() || 'That item';
        throw new StockConflict(`${name} is out of stock`);
      }
      if (variant) variant.stock = available - wanted;
      else product.stock = available - wanted;
    }

    for (const entry of docs.values()) {
      const { ref, data } = entry as { ref: any; data: Record<string, any> };
      const patch: Record<string, any> = { updatedAt: now };
      if (Array.isArray(data.variants)) patch.variants = data.variants;
      if (typeof data.stock === 'number') patch.stock = data.stock;
      tx.update(ref, patch);
    }

    tx.set(db.collection('orders').doc(order.id), order);
  });
}

/**
 * The side effects that follow a written order: remember the contact number on
 * the profile, and send the confirmation (plus a copy, if a different address
 * was given). All best-effort — an order already durably written must never be
 * turned into a 500 by a dead mail provider or a slow profile write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function finalizeOrder(
  db: any,
  order: PricedOrder,
  caller: Caller,
  contactPhone: string,
): Promise<{ sent: boolean; skipped?: string; copySent?: boolean }> {
  if (caller?.uid) {
    try {
      // contactPhone, never phoneNumber: that field is the SMS-verified
      // sign-in credential, and an unverified delivery number must not
      // silently downgrade it.
      await db.collection('users').doc(caller.uid).set(
        { contactPhone, updatedAt: order.updatedAt },
        { merge: true },
      );
    } catch (err) {
      console.warn(`[orderCore] profile phone for ${order.id}:`, (err as Error).message);
    }
  }

  const confirmation = orderConfirmationEmail(order);
  const send = (to: string) => sendEmail({
    to,
    toName: String(order.shippingAddress.fullName ?? ''),
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text,
    tag: 'order-confirmation',
  });

  const [emailed, copied] = await Promise.all([
    send(order.contactEmail),
    order.copyEmail ? send(order.copyEmail) : Promise.resolve(null),
  ]);

  if (emailed.error) console.error(`[orderCore] confirmation for ${order.id}:`, emailed.error);
  if (copied?.error) console.error(`[orderCore] copy for ${order.id}:`, copied.error);

  return {
    sent: emailed.sent,
    skipped: emailed.skipped,
    ...(order.copyEmail ? { copySent: Boolean(copied?.sent) } : {}),
  };
}
