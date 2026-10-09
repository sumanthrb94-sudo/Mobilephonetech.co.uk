import { useState } from 'react';

/**
 * False until `on` is first true, then true for good.
 *
 * For overlays that are code-split: the drawer or modal is not mounted (so
 * its chunk is not fetched) until the first time it is asked to open, and is
 * then kept mounted so closing it still plays its exit animation exactly as
 * it did when it was always in the tree.
 */
export function useLatch(on: boolean): boolean {
  const [latched, setLatched] = useState(on);
  // Setting state during render is React's documented way to derive state
  // from a prop change; it re-renders before anything is committed.
  if (on && !latched) setLatched(true);
  return latched || on;
}
