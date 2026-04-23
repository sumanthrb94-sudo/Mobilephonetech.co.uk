import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — mounted once inside <Router>. Whenever the pathname or
 * query string changes, scroll the window back to the top so every page
 * starts from the top — standard SPA "restore to top on nav" behaviour.
 *
 * Skips the reset when there's a URL hash so deep-links like /#why-us
 * still land on their anchor.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname, search, hash]);

  return null;
}
