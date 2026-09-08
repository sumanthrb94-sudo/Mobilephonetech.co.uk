import { adminDb, verifyCaller } from '../_firebaseAdmin.js';
import { enforceRateLimit } from '../_rateLimit.js';
import { looksLikeEmail, sendEmail } from '../_email.js';
import { orderConfirmationEmail } from '../_templates.js';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../src/config/preview.js';

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

/** A basket that priced correctly but could no longer be filled. */
class StockConflict extends Error {}

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

  /**
   * Preview mode, enforced here rather than only in the browser.
   *
   * The banner on the storefront is a courtesy; this is the control. A hidden
   * button is still a reachable endpoint, and the one person who finds it is
   * the one who then has a real order, a real expectation, and no payment
   * behind it. 503 rather than 403: the shop is temporarily not serving, which
   * is what a client and a search engine should both understand.
   */
  if (previewModeFrom(process.env.VITE_PREVIEW_MODE)) {
    return res.status(503).json({ error: PREVIEW_MESSAGE, previewMode: true });
  }

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

  /**
   * A contact number, required here and not only in the checkout form.
   *
   * The browser already refuses to submit without one, but a form validation
   * is not a rule — the endpoint is reachable without the form. Couriers need
   * a number to deliver against, and a failed delivery with no way to reach
   * the customer is a returned parcel and a refund.
   *
   * Deliberately not SMS-verified: this is a delivery contact, not a
   * credential, so it never depends on text delivery working in the
   * customer's country. It does not link the number to their sign-in, and so
   * does not by itself prevent a duplicate account.
   */
  const contactPhone = clean(address.phone, 40);
  if (!contactPhone) {
    return res.status(400).json({ error: 'A contact phone number is required for delivery' });
  }

  /**
   * Who the receipt goes to.
   *
   * The account address is the customer's identity — it is the one they can
   * sign in with, the one their order history hangs off, and the one they will
   * look in when they want to find this purchase again. An address typed into
   * the checkout form is a delivery detail: a gift, a work inbox, a partner's.
   *
   * So the account wins as the primary contact when there is one, and the
   * typed address gets its own copy when it differs. Preferring the typed one
   * outright, as this did, meant a signed-in customer who mistyped that field
   * lost the only record of their purchase to a stranger's inbox — with
   * nothing in their own, and nothing to match against their order history.
   */
  const accountEmail = clean(caller?.email, 254);
  const typedEmail = clean(address.email || body.guestEmail, 254);

  // An address that was supplied must still be a real one; silently dropping a
  // typo would send the copy nowhere and say nothing about it.
  if (typedEmail && !looksLikeEmail(typedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required for order updates' });
  }

  const contactEmail = looksLikeEmail(accountEmail) ? accountEmail : typedEmail;
  if (!looksLikeEmail(contactEmail)) {
    return res.status(400).json({ error: 'A valid email address is required for order updates' });
  }

  // Sent as a separate message rather than a second To:, so neither recipient
  // learns the other's address — the gift case makes that a real disclosure.
  const copyEmail = typedEmail && typedEmail.toLowerCase() !== contactEmail.toLowerCase()
    ? typedEmail
    : null;

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
    // The address the shopper asked us to copy, kept so support can see who
    // else was told about this order.
    copyEmail,
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

  /**
   * Reserve the stock and write the order as one atomic step.
   *
   * The check above reads stock and refuses a basket it cannot fill, but
   * nothing ever reduced the figure — so the same handset sold to an unlimited
   * number of customers, and this catalogue is keyed by IMEI, where every unit
   * is one physical phone. Four of five buyers get an apology and a refund.
   *
   * A transaction rather than a plain write because the check and the decrement
   * must not be separable: two simultaneous checkouts for the last unit both
   * read "1 available" and both pass, and only a transaction makes one of them
   * lose. Firestore requires every read before every write, hence the two
   * passes below.
   */
  try {
    await db.runTransaction(async (tx) => {
      const ids = [...new Set(priced.map(i => String(i.productId)))];
      const refs = ids.map(id => db.collection('products').doc(id));
      const snaps = await Promise.all(refs.map(ref => tx.get(ref)));

      const docs = new Map(refs.map((ref, i) => [
        ref.id,
        { ref, exists: snaps[i].exists, data: (snaps[i].data() ?? {}) as Record<string, any> },
      ]));

      for (const item of priced) {
        const entry = docs.get(String(item.productId));
        // Sold out or withdrawn between pricing the basket and reserving it.
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

        // Written back to the working copy, not just compared: two lines of the
        // same product must not each pass against the same starting figure.
        if (variant) variant.stock = available - wanted;
        else product.stock = available - wanted;
      }

      for (const { ref, data } of docs.values()) {
        const patch: Record<string, any> = { updatedAt: now };
        // A configured product carries its stock per variant, inside an array
        // Firestore can only rewrite whole.
        if (Array.isArray(data.variants)) patch.variants = data.variants;
        if (typeof data.stock === 'number') patch.stock = data.stock;
        tx.update(ref, patch);
      }

      tx.set(db.collection('orders').doc(orderId), order);
    });
  } catch (err) {
    // 409 rather than 400: the basket was valid, someone else simply got there
    // first, and the customer's own next move is different for each.
    if (err instanceof StockConflict) return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: 'Could not save your order', detail: (err as Error).message });
  }

  // The confirmation is a courtesy on top of an order that is already durably
  // written. A dead mail provider must not turn a successful purchase into a
  // 500 the customer would reasonably retry — which is how you get two orders
  // and one angry email. sendEmail swallows its own failures; this await is
  // still needed because the runtime can freeze the instance the moment the
  // response is sent, cancelling anything left in flight.
  /**
   * Keep the number on the customer's profile.
   *
   * Stored as `contactPhone`, never as `phoneNumber`: that field holds the
   * SMS-verified number attached to their sign-in, and overwriting a proven
   * credential with an unverified delivery detail would quietly downgrade it.
   *
   * Best-effort. A profile write must never cost someone an order that is
   * already paid for and filed.
   */
  if (caller?.uid) {
    try {
      await db.collection('users').doc(caller.uid).set(
        { contactPhone, updatedAt: now },
        { merge: true },
      );
    } catch (err) {
      console.warn(`[api/orders] profile phone for ${orderId}:`, (err as Error).message);
    }
  }

  const confirmation = orderConfirmationEmail(order);
  const send = (to: string) => sendEmail({
    to,
    toName: order.shippingAddress.fullName,
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text,
    tag: 'order-confirmation',
  });

  // Both go out together. The copy is not allowed to delay or fail the
  // primary, and neither is allowed to fail the order.
  const [emailed, copied] = await Promise.all([
    send(contactEmail),
    copyEmail ? send(copyEmail) : Promise.resolve(null),
  ]);

  if (emailed.error) console.error(`[api/orders] confirmation for ${orderId}:`, emailed.error);
  if (copied?.error) console.error(`[api/orders] copy for ${orderId}:`, copied.error);

  return res.status(201).json({
    order,
    confirmationEmail: {
      sent: emailed.sent,
      skipped: emailed.skipped,
      // Absent when no second address was asked for, so the checkout can tell
      // "no copy wanted" from "the copy did not go".
      ...(copyEmail ? { copySent: Boolean(copied?.sent) } : {}),
    },
  });
}
