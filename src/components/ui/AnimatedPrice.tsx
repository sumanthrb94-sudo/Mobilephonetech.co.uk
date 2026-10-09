import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, utils } from 'animejs';
import { useReducedMotion } from 'motion/react';

/**
 * A price that rolls from its old figure to its new one when it changes.
 *
 * For prices that move because of something the shopper did — a storage or
 * grade picked, a charger ticked, a quantity changed, a code applied — so the
 * change is seen rather than missed. It does not count up on first paint:
 * the figure a page opens with is simply there.
 *
 * Short on purpose (350ms): long enough to notice, short enough that nobody
 * waits for it. Reduced motion shows the new figure at once.
 *
 * The text is written by hand rather than rendered as a child: the tween
 * replaces the text node, and React updating a node it no longer owns would
 * leave the old figure on screen.
 */
export default function AnimatedPrice({
  value,
  decimals = 'auto',
  className,
  style,
}: {
  value: number;
  /** 'auto' shows whole pounds as £270 and pennies as £270.50. */
  decimals?: number | 'auto';
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const places = decimals === 'auto' ? (Number.isInteger(value) ? 0 : 2) : decimals;
  const format = (n: number) => `£${n.toFixed(places)}`;

  // First paint, and any change that should not animate, before the browser
  // draws — so there is never a frame with no price in it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shown.current === null || reduceMotion) {
      el.textContent = format(value);
      shown.current = value;
    }
  });

  useEffect(() => {
    const el = ref.current;
    const from = shown.current;
    if (!el || from === null || from === value || reduceMotion) return;
    const state = { n: from };
    const animation = animate(state, {
      n: value,
      duration: 350,
      ease: 'outQuad',
      onUpdate: () => { el.textContent = format(utils.round(state.n, places)); },
      onComplete: () => { el.textContent = format(value); },
    });
    // Frames stop in a background tab, which would leave a figure from the
    // middle of the roll on screen. The final one is written regardless.
    const settle = window.setTimeout(() => { animation.pause(); el.textContent = format(value); }, 400);
    shown.current = value;
    return () => {
      animation.pause();
      window.clearTimeout(settle);
      el.textContent = format(value);
    };
    // format depends only on places, which is derived from value and decimals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, places, reduceMotion]);

  return <span ref={ref} className={className} style={style} aria-label={format(value)} />;
}
