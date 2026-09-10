/**
 * Last resort against a white page.
 *
 * This site is a single-page app: index.html is a shell whose only job is to
 * load a hashed module bundle. Every deploy — and every environment-variable
 * change, which also triggers a rebuild — gives that bundle a new hash. A
 * browser holding yesterday's HTML therefore asks for a file that no longer
 * exists, and the answer it gets decides whether the visitor sees the shop or
 * nothing at all. Served the HTML shell in its place, Chrome refuses to run a
 * module with a MIME type of text/html; the app never boots, #root stays
 * empty, and the page is silently blank. No error, no message, and no way for
 * the visitor to know that a reload would fix it.
 *
 * vercel.json now returns a real 404 for a missing asset rather than the
 * shell, which is the correct answer — but a 404 is still a blank page. This
 * script is what turns it back into a working shop.
 *
 * Deliberately plain, unhashed and unbundled: its whole value is that its URL
 * never changes, so it is the one thing still guaranteed to load when the
 * hashed bundle does not. It must also run BEFORE the module script — hence no
 * `defer` on the tag — so its listener is in place before the failure it
 * exists to catch. No imports and no modern syntax: it has to run in whatever
 * the visitor is holding.
 */
(function () {
  var KEY = 'lehart:boot-recovery';
  /* Only a safety net. The error listener below is what normally fires, and it
     fires the instant the bundle fails rather than after a timeout. */
  var GRACE_MS = 5000;
  var done = false;

  function rootIsEmpty() {
    var root = document.getElementById('root');
    return !root || root.childElementCount === 0;
  }

  function tried() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  /**
   * Only reached when a reload has already failed, so the cause is not a stale
   * bundle and reloading again would just spin. Say so plainly rather than
   * leaving the visitor looking at nothing.
   */
  function explain() {
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML =
      '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
      'max-width:32rem;margin:16vh auto;padding:0 24px;text-align:center;color:#1a1a1a">' +
      '<h1 style="font-size:20px;margin:0 0 12px">This page did not load</h1>' +
      '<p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#555">' +
      'Something went wrong on our side, not yours. Nothing you were doing has been lost.</p>' +
      '<a href="/" style="display:inline-block;padding:12px 22px;border-radius:999px;' +
      'background:#006c49;color:#fff;text-decoration:none;font-weight:600;font-size:15px">Try again</a>' +
      '</div>';
  }

  function recover() {
    if (done) return;
    done = true;
    if (tried()) { explain(); return; }
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* private mode: one attempt still beats none */ }
    // The HTML is served must-revalidate, so this fetches the current shell and
    // with it the hashes that actually exist.
    location.reload();
  }

  /**
   * Capture phase, because resource load failures do not bubble. This catches
   * the module script both when it 404s and when it comes back as the HTML
   * shell — a wrong MIME type raises the same error event on the element.
   */
  window.addEventListener('error', function (event) {
    var el = event.target;
    if (!el || el === window || el.tagName !== 'SCRIPT') return;
    if (String(el.type) !== 'module') return;
    recover();
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!rootIsEmpty()) {
        // Booted. Clear the marker so a future stale deploy gets its own retry
        // instead of being locked out by an attempt from hours ago.
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        return;
      }
      recover();
    }, GRACE_MS);
  });
})();
