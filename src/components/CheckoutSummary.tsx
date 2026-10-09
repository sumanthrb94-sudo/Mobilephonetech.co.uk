import React, { useState } from 'react';
import { ChevronDown, ShoppingBag, Tag, X } from 'lucide-react';
import { useCart, type CartItem } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import ProductImage from './ProductImage';
import { gbp, type CheckoutTotals } from '../lib/checkoutTotals';

/**
 * The checkout's order summary: compact lines, the promo code, the totals.
 *
 * One component, drawn in two places. On desktop it is the side column, always
 * open. On a phone it sits behind a "Show order summary" bar at the top of the
 * page (the pattern most UK shoppers know from Shopify checkouts), because
 * three full-width item cards with 64px photos used to push the delivery
 * choice and the Continue button a long way down the screen.
 *
 * There is no VAT line. Prices already include VAT, and adding 20% on top is
 * the bug this replaced — see src/lib/checkoutTotals.ts.
 */

const variantLine = (item: CartItem) =>
  [item.selectedStorage, item.selectedColor, item.selectedCondition].filter(Boolean).join(' · ');

function OrderLines({ items }: { items: CartItem[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item) => {
        const variant = variantLine(item);
        return (
          <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 48px and the 'thumb' context: at this size the "Photo coming
                soon" tag only ever showed as a clipped "oto coming so". */}
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, background: 'var(--grey-5)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)', padding: '3px', boxSizing: 'border-box' }}>
              <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'calc(var(--radius-md) - 2px)' }}>
                <ProductImage brand={item.brand} model={item.model} category={item.category} color={item.selectedColor} imageUrl={item.imageUrl} alt={item.model} context="thumb" />
              </div>
              {item.quantity > 1 && (
                <span aria-hidden="true" style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '18px', height: '18px', padding: '0 5px', boxSizing: 'border-box', borderRadius: '9px', background: 'var(--grey-60)', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, lineHeight: '18px', textAlign: 'center' }}>
                  {item.quantity}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--black)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.model}
              </p>
              <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Qty {item.quantity}{variant ? ` · ${variant}` : ''}
              </p>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap' }}>
              {gbp(item.price * item.quantity)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Promo code. Collapsed behind a link where space is short, so a shopper with
 * no code is not handed an empty box to wonder about.
 */
function PromoCode({ collapsed }: { collapsed: boolean }) {
  const { appliedCoupon, applyCoupon, removeCoupon } = useCheckout();
  const [open, setOpen] = useState(!collapsed);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (appliedCoupon) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 10px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-trust-text)' }}>
        <Tag size={14} color="var(--color-trust-text)" aria-hidden="true" />
        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--color-trust-text)' }}>{appliedCoupon.code}</span>
        <button type="button" onClick={removeCoupon} aria-label={`Remove promo code ${appliedCoupon.code}`} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', color: 'var(--color-trust-text)' }}><X size={14} /></button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--brand-cyan-hover)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        Have a promo code?
      </button>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) return;
    if (applyCoupon(code)) setCode('');
    else setError('That code is not valid');
  };

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: '8px' }}>
        <label htmlFor={collapsed ? 'promo-code-mobile' : 'promo-code'} className="sr-only">Promo code</label>
        <input
          id={collapsed ? 'promo-code-mobile' : 'promo-code'}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, height: '38px', padding: '0 12px', background: 'var(--grey-0)', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)', outline: 'none', boxSizing: 'border-box' }}
        />
        <button type="submit" className="btn btn-secondary" style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}>Apply</button>
      </form>
      {error && <p role="alert" style={{ margin: '4px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--color-sale)' }}>{error}</p>}
    </div>
  );
}

function TotalRow({ label, value, tone }: { label: string; value: string; tone?: 'saving' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.4, color: tone ? 'var(--color-trust-text)' : 'var(--grey-60)' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: tone ? 'var(--color-trust-text)' : 'var(--black)' }}>{value}</span>
    </div>
  );
}

/**
 * Subtotal, discount, delivery, total — and the one line about VAT. No VAT
 * amount is shown: refurbished phones may be sold under the margin scheme,
 * where the VAT inside a price is not stated to the customer.
 */
export function TotalsRows({ totals, couponCode }: { totals: CheckoutTotals; couponCode?: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <TotalRow label="Subtotal" value={gbp(totals.subtotal)} />
      {totals.discount > 0 && (
        <TotalRow label={couponCode ? `Discount (${couponCode})` : 'Discount'} value={`−${gbp(totals.discount)}`} tone="saving" />
      )}
      <TotalRow label="Shipping" value={totals.shippingCost === 0 ? 'FREE' : gbp(totals.shippingCost)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--grey-10)', paddingTop: '10px', marginTop: '4px' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>Total</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.01em' }}>{gbp(totals.total)}</span>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', textAlign: 'right' }}>
        All prices include VAT
      </p>
    </div>
  );
}

const divider: React.CSSProperties = { borderTop: '1px solid var(--grey-10)', paddingTop: '12px', marginTop: '12px' };

/** The full summary: lines, promo, totals. */
function SummaryBody({ totals, collapsePromo }: { totals: CheckoutTotals; collapsePromo: boolean }) {
  const { items } = useCart();
  const { appliedCoupon } = useCheckout();
  return (
    <>
      <OrderLines items={items} />
      <div style={divider}><PromoCode collapsed={collapsePromo} /></div>
      <div style={divider}><TotalsRows totals={totals} couponCode={appliedCoupon?.code} /></div>
    </>
  );
}

/** Desktop side column; the caller hides it below lg, where the toggle bar takes over. */
export function OrderSummaryPanel({ totals }: { totals: CheckoutTotals }) {
  return (
    <aside aria-label="Order summary" style={{ position: 'sticky', top: '16px', background: 'var(--grey-0)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--grey-10)' }}>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)', margin: '0 0 14px' }}>Order summary</h2>
      <SummaryBody totals={totals} collapsePromo={false} />
    </aside>
  );
}

/**
 * Phone and tablet: one bar at the top of the checkout carrying the item count
 * and the total, which opens to the same summary. Closed by default so the
 * address form and delivery choice are what a shopper sees first.
 */
export function OrderSummaryToggle({ totals }: { totals: CheckoutTotals }) {
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="lg:hidden" style={{ background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="checkout-summary-mobile"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minHeight: '48px', padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <ShoppingBag size={16} aria-hidden="true" style={{ color: 'var(--brand-cyan-hover)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--brand-cyan-hover)' }}>
          {open ? 'Hide' : 'Show'} order summary ({count} {count === 1 ? 'item' : 'items'})
        </span>
        <ChevronDown size={16} aria-hidden="true" style={{ color: 'var(--brand-cyan-hover)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)', whiteSpace: 'nowrap' }}>{gbp(totals.total)}</span>
      </button>
      {open && (
        <div id="checkout-summary-mobile" style={{ borderTop: '1px solid var(--grey-10)', padding: '12px 14px 14px' }}>
          <SummaryBody totals={totals} collapsePromo />
        </div>
      )}
    </div>
  );
}
