import { useMediaQuery } from './useMediaQuery';

/**
 * Semantic viewport breakpoints used across the app.
 * Aligned with Tailwind defaults and the existing .hero-container /
 * .container-bm media queries in src/index.css:
 *
 *   mobile  : < 640px           (Tailwind < sm)
 *   tablet  : 640 – 1023px      (Tailwind sm – lg)
 *   desktop : >= 1024px         (Tailwind lg+)
 *
 * Touch detection uses the interaction-media primitive (`hover: none`)
 * rather than a width heuristic — a 13" touchscreen laptop reports as
 * desktop-width but coarse-pointer, and we want the right affordances
 * for each.
 */
export const BREAKPOINTS = {
  /** viewport < 640px */
  mobile:  '(max-width: 639.98px)',
  /** 640px <= viewport < 1024px */
  tablet:  '(min-width: 640px) and (max-width: 1023.98px)',
  /** viewport >= 1024px */
  desktop: '(min-width: 1024px)',
  /** primary pointer is coarse (touch) */
  touch:   '(hover: none), (pointer: coarse)',
  /** user asked for reduced motion */
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ViewportInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Pointer is coarse (touch screens, game controllers). */
  isTouch: boolean;
  /** User prefers reduced motion. */
  prefersReducedMotion: boolean;
  /** Single narrowed label — useful for switch statements. */
  breakpoint: Breakpoint;
}

/**
 * React hook that returns the current viewport classification.
 *
 * Uses a native matchMedia subscription per query — each query is
 * a single OS-level event source, so this is cheaper than a resize
 * listener even when used by many components simultaneously.
 *
 * @example
 *   const { isDesktop, isTouch } = useBreakpoint();
 *   if (isDesktop && !isTouch) { ... }
 */
export function useBreakpoint(): ViewportInfo {
  const isMobile  = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet  = useMediaQuery(BREAKPOINTS.tablet);
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop);
  const isTouch   = useMediaQuery(BREAKPOINTS.touch);
  const prefersReducedMotion = useMediaQuery(BREAKPOINTS.reducedMotion);

  const breakpoint: Breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

  return { isMobile, isTablet, isDesktop, isTouch, prefersReducedMotion, breakpoint };
}
