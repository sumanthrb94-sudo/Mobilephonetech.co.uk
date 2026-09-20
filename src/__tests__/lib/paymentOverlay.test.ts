import { describe, it, expect, afterEach } from 'vitest';
import {
  openPaymentOverlay,
  closePaymentOverlay,
  isPaymentOverlayOpen,
} from '../../lib/paymentOverlay';

afterEach(() => {
  document.documentElement.className = '';
});

describe('paymentOverlay', () => {
  it('hides the checkout header while a payment overlay is open', () => {
    expect(isPaymentOverlayOpen()).toBe(false);
    openPaymentOverlay();
    expect(document.documentElement.classList.contains('is-paying')).toBe(true);
  });

  it('gives the header back when the overlay closes', () => {
    openPaymentOverlay();
    closePaymentOverlay();
    expect(isPaymentOverlayOpen()).toBe(false);
  });

  /**
   * The failure that actually costs something: the class outliving the
   * overlay leaves a shopper on /checkout with no header at all. Closing is
   * called from several places that can race — a terminal PayPal callback
   * and the effect cleanup — so it has to be safe to call more than once,
   * and safe to call having never opened.
   */
  it('is safe to close twice, and to close without opening', () => {
    closePaymentOverlay();
    expect(isPaymentOverlayOpen()).toBe(false);

    openPaymentOverlay();
    closePaymentOverlay();
    closePaymentOverlay();
    expect(isPaymentOverlayOpen()).toBe(false);
  });

  /** Opening twice must still take exactly one close to undo. */
  it('does not need two closes after two opens', () => {
    openPaymentOverlay();
    openPaymentOverlay();
    closePaymentOverlay();
    expect(isPaymentOverlayOpen()).toBe(false);
  });

  /** It must not trample classes someone else put on <html>. */
  it('leaves other html classes alone', () => {
    document.documentElement.classList.add('is-checkout');
    openPaymentOverlay();
    closePaymentOverlay();
    expect(document.documentElement.classList.contains('is-checkout')).toBe(true);
  });
});
