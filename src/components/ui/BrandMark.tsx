import { motion, useReducedMotion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

/**
 * BrandMark — the header's logo tile, on its own and optionally turning.
 *
 * Waiting is the one moment the app has nothing to show, so it shows the
 * brand instead of a generic ring. It is the same mark the navbar draws, the
 * same mark the installed icon uses and the same mark the boot splash in
 * index.html paints by hand — one thing the user recognises in the header,
 * on their home screen and while they wait.
 *
 * The refresh glyph turning is not decoration chosen at random: rotation is
 * what that glyph already means, so the motion reads as "working" rather than
 * as a logo doing a trick.
 *
 * Motion is via `motion/react` rather than a @keyframes rule so that
 * `prefers-reduced-motion` renders a still mark — a slower spin is still a
 * spin, and that setting is often a vestibular one.
 */

export type BrandMarkSize = 'sm' | 'md' | 'lg';

const TILE: Record<BrandMarkSize, number> = { sm: 32, md: 48, lg: 68 };
const GLYPH: Record<BrandMarkSize, number> = { sm: 17, md: 25, lg: 34 };
const RADIUS: Record<BrandMarkSize, number> = { sm: 9, md: 13, lg: 18 };

export interface BrandMarkProps {
  size?: BrandMarkSize;
  /** Turn the glyph. Off by default: a static mark is a logo, not a state. */
  spinning?: boolean;
  /**
   * Screen-reader text. Omit when the caller already owns the status region
   * and its label, which BrandLoading and every failure screen here do.
   */
  label?: string;
}

export default function BrandMark({ size = 'md', spinning = false, label }: BrandMarkProps) {
  const reduceMotion = useReducedMotion();
  const turning = spinning && !reduceMotion;

  return (
    <span
      data-testid="brand-mark"
      data-spinning={turning ? 'true' : 'false'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: TILE[size],
        height: TILE[size],
        borderRadius: RADIUS[size],
        background: 'var(--brand-cyan)',
        color: '#fff',
      }}
    >
      <motion.span
        style={{ display: 'inline-flex' }}
        animate={turning ? { rotate: 360 } : undefined}
        transition={turning ? { duration: 1.1, ease: 'linear', repeat: Infinity } : undefined}
      >
        <RefreshCw size={GLYPH[size]} strokeWidth={2.5} />
      </motion.span>
    </span>
  );
}
