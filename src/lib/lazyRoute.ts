import { lazy, type ComponentType } from 'react';

/**
 * React.lazy for a route, with the one recovery a deployed SPA cannot do
 * without.
 *
 * Every route in this app is a dynamic import of a hashed chunk, and every
 * deploy gives those chunks new hashes. Vercel serves only the CURRENT
 * deployment's files from the live domain, so the moment a deploy lands,
 * every chunk filename the previous one produced starts answering 404.
 *
 * public/boot-check.js already covers one half of that: a visitor holding
 * yesterday's index.html asks for an entry bundle that has gone, the app
 * never boots, and it reloads them onto the new HTML. What it cannot cover
 * is the other half — a visitor whose app is ALREADY RUNNING. Their shell
 * is mounted and fine; it is the next navigation that asks for a route chunk
 * that no longer exists. The import rejects, the error boundary catches it,
 * and they get "Something went wrong" on every route they try, while the
 * navbar and tab bar around it keep working perfectly.
 *
 * That is exactly what a deploy did to the live site on 20 September 2026:
 * the shop looked alive and every single page inside it was dead, including
 * pages that deploy had not touched. Reproduced locally by deleting two
 * route chunks from dist/ and navigating: /products and /account both hit
 * the boundary, each preceded by a 404 for its own chunk.
 *
 * So: if the import fails, reload once. The new HTML names the new chunks
 * and the visitor lands where they were going. Guarded by sessionStorage so
 * a genuinely broken chunk cannot put the page in a reload loop — the second
 * failure is allowed to reach the error boundary, which is the honest
 * outcome when reloading is not the answer.
 */

/**
 * When this session last reloaded itself, as an epoch millisecond string.
 *
 * A timestamp rather than a boolean, and never cleared on success. A boolean
 * cleared by the next chunk that happens to load is a loop waiting to
 * happen: reload -> some other route's chunk resolves -> flag cleared -> the
 * broken chunk fails again -> reload. On a live shop that is a page that
 * never stops refreshing, which is worse than the error it was fixing.
 *
 * A cooling-off window cannot do that. One reload, then at least a minute
 * before another is even considered, whatever else succeeds in between.
 */
const RELOAD_KEY = 'lehart:chunk-reload-at';
const COOLDOWN_MS = 60_000;

function mayReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    return !Number.isFinite(last) || Date.now() - last > COOLDOWN_MS;
  } catch {
    // Private mode, or storage blocked. Unreadable means we cannot promise
    // this will not loop, so do not reload at all and let the boundary show.
    return false;
  }
}

function markReloading(): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* nothing to do: mayReload() above fails closed */
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRoute<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    load().then(
      (mod) => mod,
      (err: unknown) => {
        if (!mayReload()) throw err;
        markReloading();
        // location.reload() would re-request the same cached HTML. Assigning
        // the URL back to itself makes the browser revalidate the document,
        // which is what brings down the index.html naming the new chunks.
        window.location.replace(window.location.href);
        // Never resolves: the page is on its way out, and resolving with a
        // placeholder would flash a broken screen before the reload lands.
        return new Promise<{ default: T }>(() => {});
      },
    ),
  );
}
