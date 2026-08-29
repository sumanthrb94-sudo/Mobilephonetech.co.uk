import { motion, useReducedMotion } from 'motion/react';

/**
 * Loading — the single loading vocabulary for the app.
 *
 * Three pieces, one spinner underneath:
 *   <Spinner />       the ring itself (buttons, icons, anywhere)
 *   <PageLoading />   full-page centred state, used for route suspense
 *   <InlineLoading /> spinner + visible label for sections and inline waits
 *
 * Motion: the ring is animated by `motion/react`, not a hand-rolled
 * `@keyframes spin` in a <style> tag, so `prefers-reduced-motion` is honoured
 * by rendering a *static* ring rather than a slower spin.
 *
 * Accessibility: every non-decorative use is wrapped in
 * role="status" + aria-live="polite" and carries a text alternative, so a
 * screen reader always hears what is happening. Nothing here is ever a bare
 * spinning div.
 */

export type SpinnerSize = 'sm' | 'md' | 'lg';

/** 'brand' = cyan on a light surface. 'current' = inherits button text colour. */
export type SpinnerTone = 'brand' | 'current';

const SPINNER_PX: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 44 };
const SPINNER_BORDER: Record<SpinnerSize, number> = { sm: 2, md: 3, lg: 3 };

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  /** Screen-reader text. Ignored when `decorative` is set. */
  label?: string;
  /**
   * Set when the caller already provides the status region and the label
   * (PageLoading / InlineLoading do). Renders the ring alone, aria-hidden.
   */
  decorative?: boolean;
}

export function Spinner({
  size = 'md',
  tone = 'brand',
  label = 'Loading',
  decorative = false,
}: SpinnerProps) {
  const reduceMotion = useReducedMotion();
  const px = SPINNER_PX[size];
  const border = SPINNER_BORDER[size];

  const track = tone === 'current' ? 'currentColor' : 'var(--color-brand-subtle)';
  const head = tone === 'current' ? 'transparent' : 'var(--brand-cyan)';

  const ring = (
    <motion.span
      aria-hidden="true"
      data-testid="spinner"
      data-reduced-motion={reduceMotion ? 'true' : 'false'}
      style={{
        display: 'inline-block',
        boxSizing: 'border-box',
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: 'var(--radius-full)',
        border: `${border}px solid ${track}`,
        // A static ring keeps its full outline: a half-drawn circle that never
        // moves reads as broken, not as "waiting".
        borderTopColor: reduceMotion ? track : head,
        opacity: reduceMotion ? 0.55 : 1,
        flexShrink: 0,
      }}
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.7, ease: 'linear', repeat: Infinity }
      }
    />
  );

  if (decorative) return ring;

  return (
    <span
      role="status"
      aria-live="polite"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface PageLoadingProps {
  label?: string;
}

/** Full-page centred loading state — the fallback for lazy routes. */
export function PageLoading({ label = 'Loading' }: PageLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-16)',
        background: 'var(--grey-0)',
        padding: 'var(--spacing-48) var(--spacing-16)',
      }}
    >
      <Spinner size="lg" decorative />
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--grey-50)',
        }}
      >
        {label}
      </p>
    </div>
  );
}

export interface InlineLoadingProps {
  label: string;
  size?: SpinnerSize;
  tone?: SpinnerTone;
}

/** Spinner + visible label, for buttons and sections that wait in place. */
export function InlineLoading({ label, size = 'sm', tone = 'brand' }: InlineLoadingProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-8)',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 600,
        color: 'inherit',
      }}
    >
      <Spinner size={size} tone={tone} decorative />
      {label}
    </span>
  );
}

export default Spinner;
