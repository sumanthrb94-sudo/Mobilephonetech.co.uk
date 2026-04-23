import { useRef } from 'react';

/**
 * useHoverPrefetch — returns event handlers that call a loader fn the first
 * time the user hovers (or focuses) a target. Used to warm lazy-loaded
 * route chunks so the navigation feels instant.
 */
export function useHoverPrefetch(loader: () => Promise<unknown>) {
  const called = useRef(false);

  const prefetch = () => {
    if (called.current) return;
    called.current = true;
    loader().catch(() => { called.current = false; });
  };

  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
    onTouchStart: prefetch,
  };
}
