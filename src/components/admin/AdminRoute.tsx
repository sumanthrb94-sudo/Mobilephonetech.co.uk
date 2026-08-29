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
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  if (authLoading || adminLoading) {
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
