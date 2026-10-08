import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, CircleDollarSign, AlertTriangle, ShoppingBag, Plus, RefreshCw,
  PackageX, ArrowRight, Download, Truck, RotateCcw, MessageSquare, TrendingUp,
  TrendingDown, Megaphone, CheckCircle2, Circle, HelpCircle, Clock,
} from 'lucide-react';
import {
  loadDashboardStats, describeError, LOW_STOCK_THRESHOLD, type DashboardStats,
} from '../../lib/adminApi';
import { loadDashboardInputs, type DashboardInputs } from '../../lib/dashboardData';
import {
  todo, selling, pushToSell, accounts, ahead, readiness, type WaitingItem,
} from '../../lib/dashboardInsights';
import { auth } from '../../lib/firebase';
import { COMPANY } from '../../config/company';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';

/**
 * Operations Hub — the admin landing page, built to be read top to bottom in
 * under a minute:
 *
 *   1. Needs doing now   orders to pack, parcels stuck, returns, messages
 *   2. This month        revenue, orders, units, stock
 *   3. Selling / Push    what is moving, and what is not and why
 *   4. Accounts / Ahead  the money, and what will go wrong next if ignored
 *   5. Stock             by brand, and the restock queue
 *   6. Launch readiness  live settings and data checks before going live
 *
 * Every figure comes from src/lib/dashboardInsights.ts, which is unit-tested;
 * this file only fetches and draws.
 */
export default function DashboardPage() {
  const { canViewProfit } = useAdminPermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inputs, setInputs] = useState<DashboardInputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'sales' | 'inventory' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, i] = await Promise.all([loadDashboardStats(), loadDashboardInputs()]);
      setStats(s);
      setInputs(i);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const view = useMemo(() => {
    if (!inputs) return null;
    const { products, orders, demand, health } = inputs;
    return {
      todo: todo(orders),
      selling: selling(products, orders),
      push: pushToSell(products, orders, demand),
      accounts: accounts(products, orders),
      ahead: ahead(products, orders, demand),
      readiness: readiness(products, orders, health, { icoRegistration: COMPANY.icoRegistration }),
    };
  }, [inputs]);

  const handleDownloadSales = async () => {
    setExporting('sales');
    try {
      const { downloadSalesReport } = await import('../../lib/reports');
      const [{ listOrders }, { listReturns }] = await Promise.all([
        import('../../lib/orders'), import('../../lib/returns'),
      ]);
      const orders = await listOrders();
      const lines = orders
        .filter(order => order.status !== 'refunded')
        .flatMap(order => order.items.map(item => ({
          date: order.createdAt, channel: 'WEBSITE', channelOrderId: order.id,
          sku: item.sku, imei: item.imei, model: item.name, storage: item.storage,
          color: item.color, condition: item.grade,
          ...(canViewProfit ? { buyPrice: item.buyPrice } : {}),
          sellPrice: item.price, quantity: item.quantity,
        })));
      downloadSalesReport(lines, await listReturns(), undefined, { includeProfit: canViewProfit });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setExporting(null);
    }
  };

  // From live stock. This used to bundle a spreadsheet of units (IMEIs, buy
  // prices, suppliers) into the website itself, where anyone could fetch it.
  const handleDownloadInventory = async () => {
    setExporting('inventory');
    try {
      const { downloadInventoryReport } = await import('../../lib/reports');
      const { liveInventoryUnits } = await import('../../lib/inventoryExport');
      downloadInventoryReport(await liveInventoryUnits({ includeCost: canViewProfit }));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setExporting(null);
    }
  };

  const t = view?.todo;
  const a = view?.accounts;
  const s = view?.selling;
  const restock = (stats?.lowStock ?? 0) + (stats?.outOfStock ?? 0);
  const trend = s && s.revenuePrev30 ? (s.revenue30 - s.revenuePrev30) / s.revenuePrev30 : null;

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Operations Hub</h1>
          <p className="ops-meta" style={{ margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleDownloadSales} disabled={exporting === 'sales'} className="btn btn-secondary btn-md">
            <Download size={15} /> {exporting === 'sales' ? 'Exporting…' : 'Sales (.xlsx)'}
          </button>
          <button type="button" onClick={handleDownloadInventory} disabled={exporting === 'inventory'} className="btn btn-secondary btn-md">
            <Download size={15} /> {exporting === 'inventory' ? 'Exporting…' : 'Stock (.xlsx)'}
          </button>
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
      {!!inputs?.unavailable.length && (
        <p className="ops-note" role="status">
          Could not read: {inputs.unavailable.join(', ')}. Figures that need them are left out rather than shown as zero.
        </p>
      )}

      {/* ── 1. Needs doing now ── */}
      <section aria-label="Needs doing now" className="ops-todo">
        <Todo to="/admin/orders" icon={<Package size={18} />} label="To pack"
          count={t?.toPack} urgent={(t?.overdue ?? 0) > 0}
          note={t ? (t.overdue ? `${t.overdue} waiting over a day` : 'paid, not yet dispatched') : ''} />
        <Todo to="/admin/orders" icon={<Truck size={18} />} label="Stuck in transit"
          count={t?.inTransitLong} urgent={(t?.inTransitLong ?? 0) > 0} note="dispatched 3+ days ago" />
        <Todo to="/admin/returns" icon={<RotateCcw size={18} />} label="Open returns"
          count={inputs?.openReturns ?? undefined} urgent={(inputs?.openReturns ?? 0) > 0} note="waiting on us" />
        <Todo to="/admin/support" icon={<MessageSquare size={18} />} label="Unread messages"
          count={inputs?.unreadMessages ?? undefined} urgent={(inputs?.unreadMessages ?? 0) > 0} note="from customers" />
        <Todo to="/admin/inventory" icon={<PackageX size={18} />} label="Restock"
          count={stats ? restock : undefined} urgent={false}
          note={stats ? `${stats.outOfStock} out · ${stats.lowStock} low` : ''} />
      </section>

      {/* ── 2. This month ── */}
      <section aria-label="Inventory summary" className="ops-kpis">
        <Kpi icon={<CircleDollarSign size={16} />} tone="gold" label={a ? `Sales · ${a.monthLabel}` : 'Sales'}
          value={loading ? null : money(a?.revenueMonth ?? 0)}
          note={a ? `${a.ordersMonth} orders · last month ${money(a.revenueLastMonth)}` : ''} to="/admin/orders" />
        <Kpi icon={<ShoppingBag size={16} />} tone="ink" label="Units sold"
          value={loading ? null : String(s?.units30 ?? 0)} note={s ? `30 days · ${s.units7} this week` : ''} to="/admin/reports" />
        <Kpi icon={<Package size={16} />} tone="ink" label="Products"
          value={loading ? null : String(stats?.skuCount ?? 0)} note="listed SKUs" to="/admin/inventory" />
        <Kpi icon={<Boxes size={16} />} tone="ink" label="Units in stock"
          value={loading ? null : String(stats?.unitsInStock ?? 0)} note="across all SKUs" to="/admin/inventory" />
        <Kpi icon={<CircleDollarSign size={16} />} tone="gold" label="Stock value"
          value={loading ? null : money(stats?.stockValue ?? 0)} note="at retail price" to="/admin/inventory" />
        <Kpi icon={<AlertTriangle size={16} />} tone="warn" label="Needs attention"
          value={loading ? null : String(restock)}
          note={loading ? '' : `${stats?.outOfStock ?? 0} out · ${stats?.lowStock ?? 0} low`} to="/admin/inventory" />
      </section>

      {/* ── 3. Selling / Push to sell ── */}
      <div className="ops-split">
        <Panel title="Selling" icon={<TrendingUp size={16} />}
          hint={s ? `${money(s.revenue30)} in 30 days${trend == null ? '' : ` · ${trend >= 0 ? '+' : ''}${Math.round(trend * 100)}% on the 30 before`}` : ''}>
          {loading ? <Skeleton rows={4} /> : !s?.top.length ? (
            <Empty icon={<ShoppingBag size={26} />} text="No paid orders in the last 30 days yet." />
          ) : (
            <ul className="ops-list">
              {s.top.map(p => (
                <li key={p.id} className="ops-list-row">
                  <span style={{ minWidth: 0 }}>
                    <Link to={`/admin/inventory/${p.id}`} className="ops-list-name" style={{ display: 'block' }}>{p.name}</Link>
                    <span className="ops-meta">{p.sold} sold in 30 days</span>
                  </span>
                  <span className={`ops-pill ${p.stock === 0 ? 'ops-pill-out' : (p.daysOfCover ?? 99) <= 14 ? 'ops-pill-low' : 'ops-pill-neutral'}`}>
                    {p.stock === 0 ? 'Sold out' : `${p.stock} left${p.daysOfCover != null ? ` · ~${p.daysOfCover}d` : ''}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Push to sell" icon={<Megaphone size={16} />}
          hint={view ? `${view.push.length} in stock, no sale in 30 days` : ''}
          action={{ to: '/admin/inventory', label: 'Inventory' }}>
          {loading ? <Skeleton rows={4} /> : !view?.push.length ? (
            <Empty icon={<TrendingUp size={26} />} text="Everything in stock has sold in the last 30 days." />
          ) : (
            <ul className="ops-list">
              {view.push.slice(0, 6).map(p => (
                <li key={p.id} className="ops-list-row">
                  <span style={{ minWidth: 0 }}>
                    <Link to={`/admin/inventory/${p.id}`} className="ops-list-name" style={{ display: 'block' }}>{p.name}</Link>
                    <span className="ops-meta">{p.stock} in stock · {money(p.value)} · {p.reason}</span>
                  </span>
                  <span className="ops-pill ops-pill-low">{p.action}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── 4. Accounts / Coming up ── */}
      <div className="ops-split">
        <Panel title="Accounts" icon={<CircleDollarSign size={16} />} hint={a?.monthLabel ?? ''} action={{ to: '/admin/reports', label: 'Reports' }}>
          {loading || !a ? <Skeleton rows={5} /> : (
            <dl className="ops-ledger">
              <Row label="Sales this month" value={money(a.revenueMonth)} />
              <Row label="Last month" value={money(a.revenueLastMonth)} />
              <Row label="Average order" value={a.ordersMonth ? money(a.averageOrder) : '—'} />
              <Row label="Refunded this month" value={a.refundsMonth ? `−${money(a.refundsMonth)}` : '£0'} />
              {canViewProfit && (
                <Row label="Gross profit this month"
                  value={a.grossProfitMonth == null ? '—' : money(a.grossProfitMonth)}
                  note={a.grossProfitMonth == null ? 'Record buy prices to see profit' : a.ordersWithoutCost ? `${a.ordersWithoutCost} orders have no cost recorded` : undefined} />
              )}
              <Row label="Stock on hand" value={money(a.stockValue)} note={`${a.stockUnits} units at retail price`} />
              {a.unpaidExcluded > 0 && (
                <Row label="Left out" value={String(a.unpaidExcluded)} note="orders with no PayPal payment (tests)" />
              )}
            </dl>
          )}
        </Panel>

        <Panel title="Coming up" icon={<Clock size={16} />} hint="act before it costs sales">
          {loading || !view ? <Skeleton rows={5} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {view.ahead.backInStock.length > 0 && (
                <BackInStock items={view.ahead.backInStock} onSent={load} />
              )}
              <AheadGroup title="Running out within 2 weeks" empty="Nothing selling fast enough to run out." items={view.ahead.runningOut} tone="low" />
              <AheadGroup title="Sold out but still wanted" empty="No demand going unmet." items={view.ahead.missedDemand} tone="out" />
              <AheadGroup title="Stock over 90 days, not selling" empty="No ageing stock." items={view.ahead.ageing} tone="neutral" />
            </div>
          )}
        </Panel>
      </div>

      {/* ── 5. Stock ── */}
      <div className="ops-split">
        <Panel title="Stock by brand" hint={loading ? '' : `${stats?.byBrand.length ?? 0} brands`}>
          {loading ? <Skeleton rows={5} /> : !stats?.byBrand.length ? (
            <Empty icon={<PackageX size={26} />} text="No stock recorded yet." />
          ) : <BrandBars rows={stats.byBrand} />}
        </Panel>

        <Panel title="Restock queue" hint={loading ? '' : `sold out first · then ${LOW_STOCK_THRESHOLD} or fewer`}
          action={{ to: '/admin/inventory', label: 'Open inventory' }}>
          {loading ? <Skeleton rows={4} /> : !stats?.needsAttention.length ? (
            <Empty icon={<Boxes size={26} />} text="Everything is comfortably in stock." />
          ) : (
            <ul className="ops-list">
              {stats.needsAttention.map(p => (
                <li key={p.id} className="ops-list-row">
                  <Link to={`/admin/inventory/${p.id}`} className="ops-list-name">{p.brand} {p.model}</Link>
                  {p.soldUnits > 0 && <span className="ops-meta">{p.soldUnits} sold</span>}
                  <span className={`ops-pill ${p.stock === 0 ? 'ops-pill-out' : 'ops-pill-low'}`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── 6. Launch readiness ── */}
      <Panel title="Ready for launch" icon={<CheckCircle2 size={16} />}
        hint={view ? `${view.readiness.filter(c => c.state === 'done').length} of ${view.readiness.length} done` : ''}>
        {loading || !view ? <Skeleton rows={6} /> : (
          <ul className="ops-checks">
            {view.readiness.map(c => (
              <li key={c.label} className={`ops-check ops-check-${c.state}`}>
                {c.state === 'done' ? <CheckCircle2 size={18} /> : c.state === 'todo' ? <Circle size={18} /> : <HelpCircle size={18} />}
                <span>
                  <strong>{c.label}</strong>
                  <span className="ops-meta" style={{ display: 'block' }}>{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────

function Todo({ to, icon, label, count, note, urgent }: {
  to: string; icon: React.ReactNode; label: string; count: number | undefined; note: string; urgent: boolean;
}) {
  const active = (count ?? 0) > 0;
  return (
    <Link to={to} className={`ops-todo-tile${active ? ' ops-todo-active' : ''}${urgent ? ' ops-todo-urgent' : ''}`}
      aria-label={`${label}: ${count ?? 'unknown'}`}>
      <span className="ops-todo-icon">{icon}</span>
      <span className="ops-todo-count">{count ?? '—'}</span>
      <span className="ops-todo-label">{label}</span>
      {note ? <span className="ops-meta">{note}</span> : null}
    </Link>
  );
}

function Kpi({ icon, label, value, note, tone, to }: {
  icon: React.ReactNode; label: string; value: string | null; note?: string;
  tone: 'ink' | 'gold' | 'warn'; to?: string;
}) {
  const content = (
    <div className="ops-kpi">
      <span className={`ops-kpi-icon ops-kpi-${tone}`}>{icon}</span>
      <span className="ops-kpi-label">{label}</span>
      {value === null
        ? <span className="ops-kpi-value ops-skel" style={{ width: '3.5em', height: '1em' }} />
        : <span className="ops-kpi-value">{value}</span>}
      {note ? <span className="ops-meta">{note}</span> : null}
    </div>
  );
  return to ? <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }} aria-label={`${label}: open details`}>{content}</Link> : content;
}

function Panel({ title, hint, icon, action, children }: {
  title: string; hint?: string; icon?: React.ReactNode;
  action?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <h2 className="ops-panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{icon}{title}</h2>
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

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="ops-ledger-row">
      <dt>{label}{note ? <span className="ops-meta" style={{ display: 'block' }}>{note}</span> : null}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AheadGroup({ title, items, empty, tone }: {
  title: string; empty: string; tone: 'low' | 'out' | 'neutral';
  items: Array<{ id: string; name: string; detail: string }>;
}) {
  return (
    <div>
      <p className="ops-eyebrow" style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {tone === 'out' ? <TrendingDown size={13} /> : null}{title}{items.length ? ` · ${items.length}` : ''}
      </p>
      {!items.length ? <p className="ops-meta" style={{ margin: 0 }}>{empty}</p> : (
        <ul className="ops-list">
          {items.slice(0, 4).map(i => (
            <li key={i.id} className="ops-list-row">
              <Link to={`/admin/inventory/${i.id}`} className="ops-list-name">{i.name}</Link>
              <span className={`ops-pill ops-pill-${tone}`}>{i.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Back in stock with people waiting: one button emails them all, once. */
function BackInStock({ items, onSent }: { items: WaitingItem[]; onSent: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const send = async (item: WaitingItem) => {
    setBusy(item.id);
    setNotice(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/stock-alert-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `That did not work (${res.status}).`);
      setNotice(`${item.name}: emailed ${data.sent} ${data.sent === 1 ? 'person' : 'people'}${data.failed ? `, ${data.failed} could not be sent` : ''}.`);
      onSent();
    } catch (err) {
      setNotice(describeError(err));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div>
      <p className="ops-eyebrow" style={{ margin: '0 0 6px' }}>Back in stock, people waiting · {items.length}</p>
      <ul className="ops-list">
        {items.slice(0, 4).map(i => (
          <li key={i.id} className="ops-list-row">
            <span style={{ minWidth: 0 }}>
              <Link to={`/admin/inventory/${i.id}`} className="ops-list-name" style={{ display: 'block' }}>{i.name}</Link>
              <span className="ops-meta">{i.detail}</span>
            </span>
            <button type="button" className="btn btn-buy btn-md" disabled={busy === i.id} onClick={() => send(i)}>
              {busy === i.id ? 'Sending…' : `Email ${i.waiting} ${i.waiting === 1 ? 'person' : 'people'}`}
            </button>
          </li>
        ))}
      </ul>
      {notice && <p className="ops-meta" role="status" style={{ margin: '6px 0 0' }}>{notice}</p>}
    </div>
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
            <span className="ops-bar-fill" style={{ width: r.units === 0 ? 0 : `${Math.max(2, (r.units / max) * 100)}%` }} />
          </span>
          <span className="ops-bar-value">{r.units}</span>
        </li>
      ))}
    </ul>
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

/** Whole pounds — pence on a dashboard is noise, not precision. */
function money(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}
