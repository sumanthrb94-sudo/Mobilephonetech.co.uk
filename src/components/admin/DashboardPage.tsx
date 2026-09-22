import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, CircleDollarSign, AlertTriangle, ShoppingBag,
  Plus, Store, RefreshCw, PackageX, ArrowRight, FileWarning, Banknote,
} from 'lucide-react';
import {
  loadDashboardStats, describeError, LOW_STOCK_THRESHOLD,
  type DashboardStats,
  INVENTORY_READ_CAP,
} from '../../lib/adminApi';
import { useAdmin } from '../../hooks/useAdmin';

/**
 * Operations Hub — the admin landing page.
 *
 * Structure follows the InventoryManager console (KPI tiles, mono micro-labels,
 * a stock breakdown, work queues and quick actions) so staff moving between the
 * two tools recognise the layout. The palette is LeHart's own, so the console
 * still reads as part of this shop rather than a bolted-on second product.
 *
 * Three rules from that console's Office Blueprint run through everything here.
 * Panels are titled with the question they answer, because a title says what
 * the data is and the question says what you are meant to do about it, which
 * is the part a new member of staff does not know. A figure that has not been
 * read prints Awaiting rather than zero. And a panel with nothing in it says
 * whether that is "nothing needs you" or "this could not be loaded" — the same
 * two pixels meaning opposite things is how a dashboard tells a confident lie.
 *
 * The bar chart is hand-drawn. A charting library would be roughly the size of
 * the rest of this route put together, for one horizontal bar chart.
 */
export default function DashboardPage() {
  const { can } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await loadDashboardStats());
      setReadAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      // The old figures stay on screen behind the alert, so the stamp must not
      // move: it says when what you are looking at was read, not when someone
      // last pressed Refresh.
      setStats(null);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Everything on this page comes from one read of the catalogue and one of the
  // order book, and the second can fail on its own. Which of the two failed
  // decides what each panel is allowed to claim, so it is worked out once here
  // rather than re-derived from `stats?.x ?? 0` at every call site.
  const catalogueRead = !loading && !!stats;
  // Only meaningful once the read succeeded: a failed read has no opinion on
  // whether the catalogue is bigger than the cap, and saying "partial" over
  // figures that are already marked Awaiting would be two different
  // explanations for the same blank.
  const truncated = catalogueRead && stats!.catalogueTruncated;
  const ordersRead = catalogueRead && !stats!.ordersUnavailable;

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

      {truncated && (
        <p className="ops-footnote" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
          This shop has more products than one read carries, so every figure
          below describes the first {INVENTORY_READ_CAP.toLocaleString('en-GB')}{' '}
          rather than the whole catalogue. The inventory list can be filtered
          by brand to see a complete count within one.
        </p>
      )}

      {/* ── KPIs ── */}
      <section aria-label="Inventory summary" className="ops-kpis">
        <Kpi
          icon={<Package size={16} />} tone="ink" label="Products"
          value={loading ? null : catalogueRead ? String(stats!.skuCount) : <Awaiting />}
          // A catalogue larger than one read can carry makes this figure, and
          // every other one in this strip, describe the first slice rather
          // than the shop. Found by opening this page against twelve hundred
          // products: it said "1000 listed SKUs" with total conviction.
          note={truncated ? 'listed SKUs — partial' : 'listed SKUs'}
        />
        <Kpi
          icon={<Boxes size={16} />} tone="ink" label="Units in stock"
          value={loading ? null : catalogueRead ? String(stats!.unitsInStock) : <Awaiting />}
          note="across all SKUs"
        />
        <Kpi
          icon={<CircleDollarSign size={16} />} tone="gold" label="Stock value"
          value={loading ? null : catalogueRead ? money(stats!.stockValue) : <Awaiting />}
          note="at retail price"
        />
        <Kpi
          icon={<AlertTriangle size={16} />} tone="warn" label="Needs attention"
          value={loading ? null : catalogueRead ? String(stats!.lowStock + stats!.outOfStock) : <Awaiting />}
          note={catalogueRead ? `${stats!.outOfStock} out · ${stats!.lowStock} low` : ''}
        />
        <Kpi
          icon={<ShoppingBag size={16} />} tone="ink" label="Orders"
          value={loading ? null : ordersRead ? String(stats!.orderCount) : <Awaiting />}
          note={loading ? '' : ordersRead ? 'in the order book' : 'order book could not be read'}
        />
        {/* Takings are the one figure on this page a staff account does not get.
            The tile is omitted rather than blanked: an empty box where the money
            goes invites someone to ask who hid it, and a row of four tiles reads
            as the whole dashboard, which for a staff account it is.

            Stock value above stays for everyone on purpose. Staff set the price
            and the stock count on every product, so hiding the total of numbers
            they typed themselves would be theatre, not confidentiality. */}
        {can('insights:read') && (
          <Kpi
            icon={<Banknote size={16} />} tone="gold" label="Takings"
            value={loading ? null : ordersRead ? money(stats!.orderRevenue) : <Awaiting />}
            note="all orders, all time"
          />
        )}
      </section>

      <div className="ops-split">
        {/* ── Stock by brand ── */}
        <Panel
          owner="stock"
          title="Stock by brand"
          question="Which brands are you actually holding? The one carrying most of the units is the one a quiet month hurts."
          hint={catalogueRead ? `${stats!.byBrand.length} brands` : ''}
          footnote={catalogueRead && stats!.byBrand.length > 8
            ? `The eight largest brands, in units. Units in stock counts all ${stats!.byBrand.length}, so it is the larger number.`
            : undefined}
        >
          {loading ? (
            <Skeleton rows={5} />
          ) : !catalogueRead ? (
            <LoadFailed>
              The catalogue could not be read, so this is not an empty shop — it is an unknown one.
              Refresh to try again.
            </LoadFailed>
          ) : !stats!.byBrand.length ? (
            <Empty icon={<PackageX size={26} />} text="No stock recorded yet." />
          ) : (
            <BrandBars rows={stats!.byBrand} />
          )}
        </Panel>

        {/* ── Work queue ── */}
        <Panel
          owner="stock"
          title="Needs restocking"
          question={`What do you need to buy? Anything down to ${LOW_STOCK_THRESHOLD} or fewer, thinnest first.`}
          hint={catalogueRead ? `${LOW_STOCK_THRESHOLD} or fewer` : ''}
          action={{ to: '/admin/inventory', label: 'Open inventory' }}
          footnote={catalogueRead && stats!.lowStock + stats!.outOfStock > stats!.needsAttention.length
            ? `The ${stats!.needsAttention.length} thinnest lines. Needs attention counts all ${stats!.lowStock + stats!.outOfStock} — open inventory for the rest.`
            : undefined}
        >
          {loading ? (
            <Skeleton rows={4} />
          ) : !catalogueRead ? (
            <LoadFailed>
              The catalogue could not be read. An empty queue here would mean nothing needs buying,
              and that is not something this page currently knows.
            </LoadFailed>
          ) : !stats!.needsAttention.length ? (
            <Empty icon={<Boxes size={26} />} text="Everything is comfortably in stock. Nothing to buy today." />
          ) : (
            <ul className="ops-list">
              {stats!.needsAttention.map(p => (
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
      <Panel
        owner="sales"
        title="Recent orders"
        question="What has just come in, and is any of it still waiting to be packed?"
        hint={ordersRead ? `${stats!.orderCount} total` : ''}
        action={{ to: '/admin/orders', label: 'Open orders' }}
        footnote={ordersRead && stats!.recentOrders.length
          ? 'The five most recent. Orders counts the whole book, which is read in one page of 500, so the two will not match once the shop is busier than that.'
          : undefined}
      >
        {loading ? (
          <Skeleton rows={3} />
        ) : !ordersRead ? (
          <LoadFailed>
            Orders could not be read. Check that your account still carries the admin claim — the
            catalogue figures above came from a separate read and are unaffected.
          </LoadFailed>
        ) : !stats!.recentOrders.length ? (
          <Empty icon={<ShoppingBag size={26} />} text="No orders yet." />
        ) : (
          <ul className="ops-list">
            {stats!.recentOrders.map(o => (
              <li key={o.id} className="ops-list-row">
                <span style={{ minWidth: 0 }}>
                  <span className="ops-list-name" style={{ display: 'block' }}>{o.customer}</span>
                  <span className="ops-meta">
                    {/* A real order always has at least one line, so a count of
                        nothing means the items never came back from the read.
                        "0 items" would read as a fact about the order. */}
                    {o.itemCount > 0
                      ? `${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`
                      : <Awaiting label="items not recorded" />}
                    {o.createdAt ? ` · ${formatDate(o.createdAt)}` : ''}
                  </span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span className="ops-pill ops-pill-neutral">{o.status}</span>
                  <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>
                    <Money value={o.total} />
                  </strong>
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

      {/* When these figures were read. Nothing on this page updates by itself,
          so without a stamp a screen left open overnight looks like this
          morning's shop. */}
      <p className="ops-audit">
        {readAt
          ? `Read at ${readAt} · one pass over the catalogue, one over the order book · Refresh re-reads both`
          : 'Not read yet'}
      </p>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────

/**
 * A figure that has not been read is not a zero.
 *
 * Verbatim from the Blueprint: an un-invoiced repair is not a free repair, so
 * the ledger says Awaiting rather than showing nothing owed. The same applies
 * to every number here. An order book that could not be read, drawn as "0
 * orders", tells staff the shop sold nothing — the one thing the page does
 * not know.
 */
function Awaiting({ label = 'Awaiting' }: { label?: string }) {
  return <span className="ops-awaiting">{label}</span>;
}

/** Money, or Awaiting when the amount never arrived — £0.00 is a sale, not a gap. */
function Money({ value }: { value: number | null | undefined }) {
  return Number.isFinite(value) ? <>{money(value as number)}</> : <Awaiting />;
}

function Kpi({
  icon, label, value, note, tone,
}: {
  icon: React.ReactNode; label: string;
  /** null while the read is in flight; anything else is rendered as given. */
  value: React.ReactNode;
  note?: string;
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
  owner, title, question, hint, action, footnote, children,
}: {
  /** Whose job this panel is. The stripe is the only thing on a crowded
   *  screen that answers that without reading a word of it. */
  owner: 'stock' | 'sales' | 'returns';
  title: string;
  question: string;
  hint?: string;
  action?: { to: string; label: string };
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`ops-panel ops-panel-${owner}`}>
      <div className="ops-panel-head">
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h2 className="ops-panel-title">{title}</h2>
          <p className="ops-question">{question}</p>
        </div>
        {hint ? <span className="ops-meta">{hint}</span> : null}
        {action && (
          <Link to={action.to} className="ops-panel-action">
            {action.label} <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {children}
      {/* Two figures that disagree look like a bug until something says why.
          The footnote is dropped when the panel has nothing to qualify. */}
      {footnote ? <p className="ops-footnote">{footnote}</p> : null}
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

/** Nothing to do. The calm one. */
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="ops-empty">
      <span style={{ color: 'var(--grey-30)' }}>{icon}</span>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

/**
 * Nothing known. The one that must never be mistaken for the calm one.
 *
 * This is the finding from the InventoryManager simulation, in full: with the
 * stock spread evenly, nothing ever ran dry, and the restock panel sat there
 * empty while the check on it passed without a line ever being read. An empty
 * panel and a broken one drew the same grey icon. The chip, the colour and a
 * sentence naming what failed are what keep them apart, in the panel itself —
 * the page-level alert scrolls off, and by then this panel still looks fine.
 */
function LoadFailed({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-empty" role="status">
      <span style={{ color: 'var(--color-sale)' }}><FileWarning size={26} /></span>
      <span className="ops-chip">Could not load</span>
      <p style={{ margin: 0, maxWidth: '46ch' }}>{children}</p>
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
