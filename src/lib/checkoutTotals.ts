/**
 * The checkout's running totals, priced the way the server prices them.
 *
 * Catalogue prices are the consumer prices on the product page, and UK
 * consumer prices must already include VAT (Price Marking Order 2004). The
 * checkout used to add "Estimated Tax (20%)" on top, so a £270 phone showed —
 * and was charged — £324. Nothing is added now: the total is subtotal, less
 * any discount, plus delivery. No VAT amount is broken out either, because
 * refurbished stock may be sold under the VAT margin scheme.
 *
 * This mirrors priceAndValidate in api/_orderCore.ts, penny rounding included,
 * so the total on screen is the total PayPal is asked for. The server stays
 * the authority; src/__tests__/lib/checkoutTotals.test.ts holds the two
 * together.
 */

export interface CheckoutCoupon {
  discountType: 'percentage' | 'fixed';
  value: number;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
}

const money = (n: number) => Math.round(n * 100) / 100;

export function checkoutTotals(
  lines: ReadonlyArray<{ price: number; quantity: number }>,
  shippingCost: number,
  coupon: CheckoutCoupon | null,
): CheckoutTotals {
  const subtotal = money(lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0));

  let discount = 0;
  if (coupon) {
    discount = coupon.discountType === 'percentage'
      ? money(subtotal * (coupon.value / 100))
      : money(Math.min(coupon.value, subtotal));
  }

  const shipping = money(shippingCost);
  return { subtotal, discount, shippingCost: shipping, total: money(subtotal - discount + shipping) };
}

/** "£270.00" — the one format every checkout figure is shown in. */
export const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;
