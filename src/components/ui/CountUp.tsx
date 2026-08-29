import React, { useEffect, useRef } from 'react';
import { animate, utils } from 'animejs';
import { useReducedMotion } from 'motion/react';

/**
 * A number that counts up to its value when it scrolls into view.
 *
 * Built on anime.js rather than motion/react, which the rest of the app uses:
 * motion animates style properties, so tweening a *displayed number* means
 * driving a MotionValue and subscribing to it by hand. anime.js tweens plain
 * object properties directly, which is what this actually is.
 *
 * Prices are the main use, so the default formatting is currency-shaped —
 * but `format` takes over completely when passed.
 */
export default function CountUp({
  to,
  from = 0,
  duration = 1400,
  prefix = '',
  suffix = '',
  decimals = 0,
  format,
  className,
  style,
}: {
  to: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  const render = React.useCallback(
    (value: number) => {
      if (format) return format(value);
      return `${prefix}${value.toLocaleString('en-GB', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    },
    [format, prefix, suffix, decimals],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion means the final value, immediately — not a slower count.
    if (reduceMotion) {
      el.textContent = render(to);
      return;
    }

    // Only animate once it is actually on screen: a counter that finishes
    // above the fold before anyone scrolls to it has done nothing.
    let animation: { pause: () => void } | null = null;

    const start = () => {
      const state = { value: from };
      animation = animate(state, {
        value: to,
        duration,
        ease: 'outExpo',
        onUpdate: () => { el.textContent = render(utils.round(state.value, decimals)); },
      });
    };

    if (typeof IntersectionObserver === 'undefined') { start(); return; }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      animation?.pause();
    };
  }, [to, from, duration, decimals, reduceMotion, render]);

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      // The final value is in the DOM from the first paint, so the number is
      // correct for search engines and screen readers even though the visible
      // text is rewritten as it counts.
      aria-label={render(to)}
    >
      {render(to)}
    </span>
  );
}
