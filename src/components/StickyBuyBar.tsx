import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * StickyBuyBar — price and Add to cart, pinned to the bottom of the screen
 * once the real buy button has scrolled away.
 *
 * The product page runs to about 5,200px on a 390px screen and 3,100px on a
 * desktop: gallery, specs, reviews, related products. Everything below the
 * buy box is evidence for a decision the shopper then has to scroll all the
 * way back up to act on. This is the bar every large store ends up with, for
 * that reason.
 *
 * It runs at every width. Desktop has a sticky buy COLUMN as well, but that
 * only helps while the column is on screen: `position: sticky` pins an
 * element taller than the viewport until its bottom passes, and no further.
 * Measured on a 1440x900 desktop, Add to cart left the screen at a scroll of
 * about 1,000px with 2,100px of page still to go.
 *
 * It watches the real button rather than a scroll offset, so it appears
 * exactly when the button leaves the screen and never double-renders a second
 * Add to cart next to the first — no magic pixel number to go stale when the
 * column above it changes.
 *
 * Rendered into document.body through a portal: its ancestor is a transformed
 * motion element, and `position: fixed` inside a transform is positioned
 * against that element rather than the viewport, which would strand the bar
 * halfway up the page.
 */

export interface StickyBuyBarProps {
  /** The real Add to cart button. The bar shows only while this is off-screen. */
  watch: React.RefObject<HTMLElement | null>;
  /** Shown on desktop, where there is room to say what is being bought. */
  title?: string;
  price: string;
  originalPrice?: string | null;
  label: string;
  disabled?: boolean;
  onAdd: () => void;
}

/** Long enough for layout and the gallery to settle; short enough to feel like part of the page. */
const SETTLE_MS = 700;

export default function StickyBuyBar({
  watch, title, price, originalPrice, label, disabled = false, onAdd,
}: StickyBuyBarProps) {
  const [show, setShow] = useState(false);
  const armed = useRef(false);
  const offScreen = useRef(false);

  useEffect(() => {
    const el = watch.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(false);
      return;
    }
    const apply = () => setShow(armed.current && offScreen.current);

    const io = new IntersectionObserver(
      ([entry]) => {
        offScreen.current = !entry.isIntersecting;
        // Seeing the button on screen is one way to arm the bar: from then on
        // it shows whenever the button has gone.
        if (entry.isIntersecting) armed.current = true;
        apply();
      },
      { rootMargin: '0px 0px -8px 0px' },
    );
    io.observe(el);

    // The other way is time. This used to arm ONLY once the button had been
    // on screen, to stop the bar flashing during the first paint before
    // layout settled. On a phone that meant no buy control at all on the
    // first screen: the real button sits about 1,200px down, so a shopper
    // who had not yet scrolled to it and back saw a price and no way to act
    // on it — the exact gap the bar exists to close. A short settle delay
    // keeps the first paint quiet and still puts the bar up on its own.
    const settle = window.setTimeout(() => { armed.current = true; apply(); }, SETTLE_MS);

    return () => { io.disconnect(); window.clearTimeout(settle); };
  }, [watch]);

  if (!show || typeof document === 'undefined') return null;

  return createPortal(
    <div className="pdp-stickybuy">
      {title && <span className="pdp-stickybuy__title">{title}</span>}
      <div className="pdp-stickybuy__price">
        <strong>{price}</strong>
        {originalPrice && <s>{originalPrice}</s>}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-md"
        disabled={disabled}
        onClick={onAdd}
      >
        {label}
      </button>
    </div>,
    document.body,
  );
}
