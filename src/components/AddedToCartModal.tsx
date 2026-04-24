import { useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

/**
 * AddedToCartModal — now an invisible effect.
 *
 * The component name is kept so App.tsx's mount tree stays stable,
 * but the UI is replaced with a lightweight toast fired through the
 * existing UIContext.showToast() pipeline. A full-screen modal was
 * hijacking the viewport on every Add-to-cart tap; a bottom-dismiss
 * banner keeps the user in the flow of browsing.
 *
 * Returns null — rendering is handled by the <Toast/> component
 * already mounted in App.tsx.
 */

export default function AddedToCartModal() {
  const { lastAddedItem, lastAddedQuantity, clearLastAdded, cartCount } = useCart();
  const { showToast } = useUI();
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastAddedItem) return;

    // Fire once per add — debounce via a signature that combines
    // item id + the snapshot quantity, so repeated adds of the same
    // product still trigger a fresh toast.
    const signature = `${lastAddedItem.id}:${lastAddedQuantity}:${Date.now()}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    const qty = lastAddedQuantity || 1;
    const msg =
      qty > 1
        ? `${qty} × ${lastAddedItem.model} added to cart · ${cartCount} items total`
        : `${lastAddedItem.model} added to cart · ${cartCount} item${cartCount === 1 ? '' : 's'} total`;

    showToast(msg, 'success');
    clearLastAdded();
  }, [lastAddedItem, lastAddedQuantity, cartCount, clearLastAdded, showToast]);

  return null;
}
