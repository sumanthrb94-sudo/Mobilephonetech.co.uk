import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, CircleDollarSign, AlertTriangle, ShoppingBag,
  Plus, Store, RefreshCw, PackageX, ArrowRight, FileWarning,
} from 'lucide-react';
import {
  loadDashboardStats, describeError, LOW_STOCK_THRESHOLD,
  type DashboardStats,
} from '../../lib/adminApi';

/**
 * Operations Hub — the admin landing page.
 *
 * Structure follows the InventoryManager console (KPI tiles, mono micro-labels,
 * a stock breakdown, work queues and quick actions) so staff moving between the
 * two tools recognise the layout. The palette is LeHart's own, so the console
 * still reads as part of this shop rather than a bolted-on second product.
 *
 * The bar chart is hand-drawn. A charting library would be roughly the size of
 * the rest of this route put together, for one horizontal bar chart.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await loadDashboardStats());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Operations Hub</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={load} className="btn btn-secondary btn-md" aria-label="Refresh dashboard">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/admin/inventory/new" className="btn btn-buy btn-md" style={{ textDecoration: 'none' }}>
            <Plus size={16} /> Add product
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="ops-alert">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPIs ── */}
      <section aria-label="Inventory summary" className="ops-kpis">
        <Kpi
          icon={<Package size={16} />} tone="ink" label="Products"
          value={loading ? null : String(stats?.skuCount ?? 0)} note="listed SKUs"
        />
        <Kpi
          icon={<Boxes size={16} />} tone="ink" label="Units in stock"
          value={loading ? null : String(stats?.unitsInStock ?? 0)} note="across all SKUs"
        />
        <Kpi
          icon={<CircleDollarSign size={16} />} tone="gold" label="Stock value"
          value={loading ? null : money(stats?.stockValue ?? 0)} note="at retail price"
        />
        <Kpi
          icon={<AlertTriangle size={16} />} tone="warn" label="Needs attention"
          value={loading ? null : String((stats?.lowStock ?? 0) + (stats?.outOfStock ?? 0))}
          note={loading ? '' : `${stats?.outOfStock ?? 0} out · ${stats?.lowStock ?? 0} low`}
        />
        <Kpi
          icon={<ShoppingBag size={16} />} tone="ink" label="Orders"
          value={loading ? null : stats?.ordersUnavailable ? '—' : String(stats?.orderCount ?? 0)}
          note={loading ? '' : stats?.ordersUnavailable ? 'unavailable' : `${money(stats?.orderRevenue ?? 0)} total`}
        />
      </section>

      <div className="ops-split">
        {/* ── Stock by brand ── */}
        <Panel title="Stock by brand" hint={loading ? '' : `${stats?.byBrand.length ?? 0} brands`}>
          {loading ? (
            <Skeleton rows={5} />
          ) : !stats?.byBrand.length ? (
            <Empty icon={<PackageX size={26} />} text="No stock recorded yet." />
          ) : (
            <BrandBars rows={stats.byBrand} />
          )}
        </Panel>

        {/* ── Work queue ── */}
        <Panel
          title="Needs restocking"
          hint={loading ? '' : `${LOW_STOCK_THRESHOLD} or fewer`}
          action={{ to: '/admin/inventory', label: 'Open inventory' }}
        >
          {loading ? (
            <Skeleton rows={4} />
          ) : !stats?.needsAttention.length ? (
            <Empty icon={<Boxes size={26} />} text="Everything is comfortably in stock." />
          ) : (
            <ul className="ops-list">
              {stats.needsAttention.map(p => (
                <li key={p.id} className="ops-list-row">
                  <Link to={`/admin/inventory/${p.id}`} className="ops-list-name">
                    {p.brand} {p.model}
                  </Link>
                  <span className={`ops-pill ${p.stock === 0 ? 'ops-pill-out' : 'ops-pill-low'}`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Recent orders ── */}
      <Panel title="Recent orders" hint={loading ? '' : stats?.ordersUnavailable ? '' : `${stats?.orderCount ?? 0} total`}>
        {loading ? (
          <Skeleton rows={3} />
        ) : stats?.ordersUnavailable ? (
          <Empty
            icon={<FileWarning size={26} />}
            text="Orders could not be read. Check that your account still carries the admin claim."
          />
        ) : !stats?.recentOrders.length ? (
          <Empty icon={<ShoppingBag size={26} />} text="No orders yet." />
        ) : (
          <ul className="ops-list">
            {stats.recentOrders.map(o => (
              <li key={o.id} className="ops-list-row">
                <span style={{ minWidth: 0 }}>
                  <span className="ops-list-name" style={{ display: 'block' }}>{o.customer}</span>
                  <span className="ops-meta">
                    {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                    {o.createdAt ? ` · ${formatDate(o.createdAt)}` : ''}
                  </span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span className="ops-pill ops-pill-neutral">{o.status}</span>
                  <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>{money(o.total)}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Quick actions ── */}
      <section aria-label="Quick actions" className="ops-actions">
        <ActionCard
          to="/admin/inventory" icon={<Boxes size={20} />}
          eyebrow="Catalogue" title="Manage inventory"
          body="Search, filter and adjust stock across every listed product."
        />
        <ActionCard
          to="/admin/inventory/new" icon={<Plus size={20} />}
          eyebrow="Add" title="New product"
          body="Create a listing with images, grade, pricing and stock."
        />
        <ActionCard
          to="/" icon={<Store size={20} />}
          eyebrow="Storefront" title="View the shop"
          body="See the catalogue exactly as a customer does."
        />
      </section>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────

function Kpi({
  icon, label, value, note, tone,
}: {
  icon: React.ReactNode; label: string; value: string | null; note?: string;
  tone: 'ink' | 'gold' | 'warn';
}) {
  return (
    <div className="ops-kpi">
      <span className={`ops-kpi-icon ops-kpi-${tone}`}>{icon}</span>
      <span className="ops-kpi-label">{label}</span>
      {value === null
        ? <span className="ops-kpi-value ops-skel" style={{ width: '3.5em', height: '1em' }} />
        : <span className="ops-kpi-value">{value}</span>}
      {note ? <span className="ops-meta">{note}</span> : null}
    </div>
  );
}

function Panel({
  title, hint, action, children,
}: {
  title: string; hint?: string;
  action?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <h2 className="ops-panel-title">{title}</h2>
        {hint ? <span className="ops-meta">{hint}</span> : null}
        {action && (
          <Link to={action.to} className="ops-panel-action">
            {action.label} <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Horizontal bars, sized against the largest row rather than the total, so the
 * shape of the distribution stays readable when one brand dominates.
 */
function BrandBars({ rows }: { rows: { brand: string; units: number; value: number }[] }) {
  const max = Math.max(...rows.map(r => r.units), 1);
  return (
    <ul className="ops-bars">
      {rows.slice(0, 8).map(r => (
        <li key={r.brand} className="ops-bar-row">
          <span className="ops-bar-label">{r.brand}</span>
          <span className="ops-bar-track">
            {/* A 2% floor keeps small non-zero brands visible, but zero must
                draw nothing — a stub of bar reads as "some", not "none". */}
            <span
              className="ops-bar-fill"
              style={{ width: r.units === 0 ? 0 : `${Math.max(2, (r.units / max) * 100)}%` }}
            />
          </span>
          <span className="ops-bar-value">{r.units}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionCard({
  to, icon, eyebrow, title, body,
}: {
  to: string; icon: React.ReactNode; eyebrow: string; title: string; body: string;
}) {
  return (
    <Link to={to} className="ops-action">
      <span className="ops-action-icon">{icon}</span>
      <span className="ops-eyebrow">{eyebrow}</span>
      <span className="ops-action-title">{title}</span>
      <span className="ops-meta" style={{ lineHeight: 1.5 }}>{body}</span>
    </Link>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="ops-skel" style={{ height: 16, width: `${92 - i * 9}%` }} />
      ))}
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="ops-empty">
      <span style={{ color: 'var(--grey-30)' }}>{icon}</span>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Formatting ─────────────────────────────────────────────────

/** Whole pounds — pence on a stock valuation is noise, not precision. */
function money(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
