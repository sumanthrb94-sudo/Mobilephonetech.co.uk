import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Built on useSyncExternalStore + matchMedia so:
 *  - no resize-listener throttling (fires only when the query flips)
 *  - hydration-safe (server snapshot defaults to false)
 *  - no state-update storms on rapid drags
 *
 * @example
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *   const isCoarse   = useMediaQuery('(pointer: coarse)');
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  );
}
