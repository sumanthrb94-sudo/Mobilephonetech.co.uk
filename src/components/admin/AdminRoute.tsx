import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';

/**
 * Gate for every /admin route.
 *
 * Presentation only — it hides the console from people who should not see it.
 * The database is the real boundary: RLS rejects writes from non-admins even
 * if someone renders these components by hand.
 *
 * WHY THIS REFRESHES THE TOKEN (ONCE PER SESSION)
 *
 * The `admin` claim is read from the ID token cached in this tab, and
 * granting it happens entirely server-side (scripts/create-users.mjs) —
 * nothing tells an already-open browser to go fetch a new one. Someone
 * granted admin and then trying it in a tab they signed into earlier the
 * same session got exactly this: the UI can still be showing an old
 * decoded token, and Firestore rejects the write with a permission error
 * for a reason invisible from here, since the write itself carries the
 * same stale token. Forcing a fresh token before deciding access means a
 * just-granted admin works without a manual sign-out, and it costs nothing
 * for everyone else — one extra token fetch, already the cheapest call
 * Firebase Auth makes.
 */
/**
 * Once per browser session, not per page. The admin routes remount on every
 * navigation (the route tree is keyed on the path), so refreshing on mount
 * held each admin page on "Checking your access…" for a token round trip —
 * several seconds on a slow connection, on every click.
 */
let refreshedThisSession = false;

/** Longest the page waits for a fresh token before deciding with the one it has. */
const REFRESH_WAIT_MS = 4000;

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, refreshClaims } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [refreshing, setRefreshing] = useState(isAuthenticated && !refreshedThisSession);
  const refreshedFor = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { refreshedFor.current = null; setRefreshing(false); return; }
    if (refreshedThisSession || refreshedFor.current === isAuthenticated) { setRefreshing(false); return; }
    refreshedFor.current = isAuthenticated;
    setRefreshing(true);
    // Never wait on the network indefinitely: a refresh that stalls (a dropped
    // connection, a slow token service) left the page on "Checking your
    // access…" for good. After a few seconds the token already held decides;
    // the database still judges every write by its own copy.
    const giveUp = new Promise<void>(resolve => { window.setTimeout(resolve, REFRESH_WAIT_MS); });
    Promise.race([refreshClaims().catch(() => {}), giveUp])
      .finally(() => { refreshedThisSession = true; setRefreshing(false); });
  }, [isAuthenticated, refreshClaims]);

  // A token that already says admin is enough to show the page: the refresh
  // finishes in the background, and the database still checks every write.
  // Only an account not yet seen as admin waits for it, so a role granted a
  // minute ago is picked up before the "admin only" screen is shown.
  if (authLoading || adminLoading || (refreshing && !isAdmin)) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', paddingTop: 'var(--nav-total)' }}>
        <div
          aria-live="polite"
          style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}
        >
          Checking your access…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Gate icon={<LogIn size={26} />} title="Sign in required" body="The admin console is only available to signed-in staff accounts." cta={{ to: '/account', label: 'Go to sign in' }} />;
  if (!isAdmin) return <Gate icon={<ShieldAlert size={26} />} title="Admin access only" body="Your account does not have the admin role. If it was just granted, sign out and back in — the change only reaches your browser on a fresh sign-in." cta={{ to: '/', label: 'Back to the store' }} />;

  return <>{children}</>;
}

function Gate({
  icon, title, body, cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', paddingTop: 'var(--nav-total)', paddingInline: '20px' }}>
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
            display: 'grid', placeItems: 'center',
            background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)',
          }}
        >
          {icon}
        </div>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 900, color: 'var(--black)', margin: '0 0 8px' }}>
          {title}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 22px' }}>
          {body}
        </p>
        <Link to={cta.to} className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
