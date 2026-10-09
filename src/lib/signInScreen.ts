import { useSyncExternalStore } from 'react';

/**
 * Whether the account page is currently showing its sign-in screen.
 *
 * Only the account page knows (it depends on the user and on a sign-up still
 * being finished), but the shell decides the chrome: a sign-in screen gets the
 * focused header and loses search, chat and the tab bar, like checkout.
 */
let showing = false;
const listeners = new Set<() => void>();

export function setSignInScreen(next: boolean): void {
  if (next === showing) return;
  showing = next;
  listeners.forEach(l => l());
}

export function useSignInScreen(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => showing,
    () => false,
  );
}
