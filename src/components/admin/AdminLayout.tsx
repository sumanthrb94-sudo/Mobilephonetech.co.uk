import { NavLink, Outlet, Link } from 'react-router-dom';
import { Boxes, Store } from 'lucide-react';
import { useSeo } from '../../hooks/useSeo';

/**
 * Chrome for the admin console: a narrow header strip that is visibly distinct
 * from the storefront, so it is never ambiguous whether you are looking at
 * live customer-facing pages or the admin console.
 */
export default function AdminLayout() {
  // Belt and braces with the robots.txt Disallow: a disallowed URL can still
  // be indexed from inbound links, whereas noindex is honoured directly.
  useSeo({ title: 'Admin — LeHart', description: 'Staff inventory console.', noindex: true });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-5)', paddingTop: 'var(--nav-total)' }}>
      <div style={{ background: 'var(--black)', color: 'var(--grey-0)' }}>
        <div className="container-bm admin-bar" style={{ maxWidth: 'var(--container-max)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, letterSpacing: '-0.01em' }}>
            <Boxes size={16} style={{ color: 'var(--brand-cyan-on-dark)' }} />
            Admin
          </span>

          <nav style={{ display: 'flex', gap: 4 }} aria-label="Admin sections">
            {/* `end` on the index link, or it stays active on every child route. */}
            <NavLink to="/admin" end style={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/admin/inventory" style={navLinkStyle}>Inventory</NavLink>
          </nav>

          <Link to="/" style={{ ...navLinkStyle({ isActive: false }), marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Store size={14} /> View storefront
          </Link>
        </div>
      </div>

      <main className="container-bm" style={{ maxWidth: 'var(--container-max)', paddingTop: 'var(--spacing-32)', paddingBottom: 'var(--spacing-80)' }}>
        <Outlet />
      </main>
    </div>
  );
}

function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    // 34px tall keeps these above the 24px WCAG 2.2 SC 2.5.8 target minimum.
    display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 12px',
    borderRadius: 'var(--radius-full)',
    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
    textDecoration: 'none',
    color: isActive ? 'var(--black)' : 'var(--grey-30)',
    background: isActive ? 'var(--brand-cyan-on-dark)' : 'transparent',
  };
}
