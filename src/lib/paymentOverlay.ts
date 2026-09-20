/**
 * "A payment overlay is on screen" as a class on <html>.
 *
 * WHAT THIS IS FOR
 *
 * CheckoutHeader is position:fixed across the top 64px of /checkout. When
 * PayPal opens its card form, PayPal puts its own header — a "Debit or Credit
 * Card" pill with a close button — in that same band. The two draw on top of
 * each other: the pill lands across our centred LeHart logo, while our back
 * arrow and padlock stay visible either side of it. Two headers, interleaved,
 * on the screen where the shopper is typing their card number.
 *
 * WHY HIDE OURS RATHER THAN RESTACK
 *
 * Because the fix then does not depend on knowing who is winning. PayPal's
 * overlay is rendered by their SDK into their own iframe with a z-index we do
 * not control and which is free to change between SDK versions. Raising or
 * lowering ours is a guess about a number owned by someone else, and a guess
 * that is wrong in the other direction leaves the same mess. Taking our
 * header out of the band removes the collision whether we were above them or
 * below them.
 *
 * It costs nothing while it is open: the overlay covers the page, so a
 * back-to-cart button behind it is not reachable anyway.
 *
 * ON GETTING STUCK
 *
 * The failure that matters is the class outliving the overlay, which would
 * leave a shopper on /checkout with no header at all. So this is driven from
 * the PayPal Buttons callbacks — onClick to open, and every terminal
 * callback (onCancel, onApprove, onError) to close — and PayPalCheckout also
 * calls close() from its effect cleanup. Leaving the route unmounts that
 * component, so navigating away always clears it even if PayPal never told
 * us the overlay had gone.
 */

const CLASS = 'is-paying';

/** Hide the checkout header: a payment overlay is taking the screen. */
export function openPaymentOverlay(): void {
  document.documentElement.classList.add(CLASS);
}

/** Give the checkout header back. Safe to call when it was never hidden. */
export function closePaymentOverlay(): void {
  document.documentElement.classList.remove(CLASS);
}

/** Whether the header is currently stood down. Exported for tests. */
export function isPaymentOverlayOpen(): boolean {
  return document.documentElement.classList.contains(CLASS);
}
