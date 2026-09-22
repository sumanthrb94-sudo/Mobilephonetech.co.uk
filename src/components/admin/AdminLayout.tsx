import { NavLink, Outlet, Link } from 'react-router-dom';
import { Boxes, Store } from 'lucide-react';
import { useSeo } from '../../hooks/useSeo';
import { useAdmin } from '../../hooks/useAdmin';
import { roleLabel, type Capability } from '../../lib/adminRoles';

/**
 * Chrome for the admin console: a narrow header strip that is visibly distinct
 * from the storefront, so it is never ambiguous whether you are looking at
 * live customer-facing pages or the admin console.
 *
 * The nav is grouped the way InventoryManager's tab strip is — the daily work
 * first, then the manager-only sections behind a divider — so that the shape
 * of what you are allowed to do is legible at a glance rather than something
 * you discover by being refused.
 */

/**
 * The sections, in the order they are worked.
 *
 * `needs` names the capability each one requires, so a role change moves the
 * links without anybody editing this list. A section nobody in the building
 * can reach simply does not render, rather than rendering as a link that
 * leads to a refusal.
 */
const SECTIONS: ReadonlyArray<{
  to: string;
  label: string;
  needs: Capability;
  end?: boolean;
  /** First of the manager-only group — draws the divider before it. */
  startsManagerGroup?: boolean;
}> = [
  { to: '/admin',           label: 'Dashboard', needs: 'console', end: true },
  { to: '/admin/orders',    label: 'Orders',    needs: 'orders:write' },
  { to: '/admin/inventory', label: 'Inventory', needs: 'products:write' },
  { to: '/admin/returns',   label: 'Returns',   needs: 'returns:write' },
  { to: '/admin/support',   label: 'Support',   needs: 'support:write' },

  { to: '/admin/banners',   label: 'Banners',     needs: 'storefront:write', startsManagerGroup: true },
  { to: '/admin/home',      label: 'Home layout', needs: 'storefront:write' },
  { to: '/admin/series',    label: 'Series',      needs: 'storefront:write' },
  { to: '/admin/analytics', label: 'Analytics',   needs: 'insights:read' },
];

export default function AdminLayout() {
  // Belt and braces with the robots.txt Disallow: a disallowed URL can still
  // be indexed from inbound links, whereas noindex is honoured directly.
  useSeo({ title: 'Admin — LeHart', description: 'Staff inventory console.', noindex: true });

  const { can, role } = useAdmin();
  const visible = SECTIONS.filter(s => can(s.needs));

  // The divider belongs before the first manager-only section that is
  // actually shown — drawing it for a group with nothing in it leaves a rule
  // hanging off the end of the strip.
  const firstManagerShown = visible.find(s => s.startsManagerGroup)?.to;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-5)', paddingTop: 'var(--nav-total)' }}>
      <div style={{ background: 'var(--black)', color: 'var(--grey-0)' }}>
        <div className="container-bm admin-bar" style={{ maxWidth: 'var(--container-max)' }}>
          <span className="ops-brand">
            <Boxes size={16} style={{ color: 'var(--brand-cyan-on-dark)' }} />
            Admin
            {/* Which hat you are wearing. Staff who cannot find a section
                should be able to see why without asking. */}
            <span className="ops-role" title={`Signed in with the ${roleLabel(role)} role`}>
              {roleLabel(role)}
            </span>
          </span>

          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} aria-label="Admin sections">
            {visible.map(s => (
              <span key={s.to} style={{ display: 'contents' }}>
                {s.to === firstManagerShown && <span className="ops-nav-divider" aria-hidden="true" />}
                {/* `end` on the index link, or it stays active on every child route. */}
                <NavLink to={s.to} end={s.end} style={navLinkStyle}>{s.label}</NavLink>
              </span>
            ))}
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
