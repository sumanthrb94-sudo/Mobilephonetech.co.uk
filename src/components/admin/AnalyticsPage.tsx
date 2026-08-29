import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, TrendingUp, Eye, ShoppingCart, Banknote, Boxes, Clock } from 'lucide-react';
import { auth } from '../../lib/firebase';

/**
 * Analytics — what people looked at, what they bought, and what stock it cost.
 *
 * The page is built around one question the shop could not previously answer:
 * **which listings get attention and no orders.** Revenue tables cannot show
 * you that, because a product with two hundred views and no sales earns
 * nothing and therefore appears nowhere. Yet it is the most actionable row in
 * the whole console — it is mispriced, badly photographed, or out of stock in
 * the grade people actually want, and every one of those is fixable today.
 *
 * The charts are drawn by hand, as elsewhere in this console. A charting
 * library would be larger than this entire route for two sparklines and a bar
 * list, and the bundle is already tripping Vite's size warning.
 */

interface Analytics {
  range: { days: number; from: string; to: string };
  traffic: {
    series: Array<{ day: string; views: number; productViews: number; addToCart: number }>;
    totals: Record<string, number>;
    topPaths: Array<{ key: string; count: number }>;
    topSearches: Array<{ key: string; count: number }>;
  };
  sales: {
    revenue: number; orders: number; averageOrderValue: number;
    series: Array<{ day: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; model: string; units: number; revenue: number }>;
  };
  stock: {
    units: number; cost: number; byGrade: Record<string, number>; ageingOver90Days: number;
    bySupplier: Array<{ supplier: string; units: number; cost: number }>;
  };
  attention: Array<{ productId: string; model: string; views: number; addToCart: number; unitsSold: number; revenue: number; conversion: number }>;
  noSales: Array<{ productId: string; model: string; views: number; addToCart: number }>;
}

const money = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/analytics?days=${days}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) throw new Error('This page is staff only. Sign out and back in if you were promoted recently — a custom claim only reaches the browser on a fresh sign-in.');
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const t = data?.traffic;
  const s = data?.sales;

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Analytics</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`btn btn-md ${days === d ? 'btn-buy' : 'btn-secondary'}`}
            >
              {d} days
            </button>
          ))}
          <button type="button" onClick={load} className="btn btn-secondary btn-md" aria-label="Refresh analytics">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="ops-alert">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{error}</span>
        </div>
      )}

      <section aria-label="Headline figures" className="ops-kpis">
        <Kpi icon={<Eye size={16} />} label="Page views" value={loading ? null : String(t?.totals.page_view ?? 0)} note={`last ${days} days`} />
        <Kpi icon={<ShoppingCart size={16} />} label="Added to basket" value={loading ? null : String(t?.totals.add_to_cart ?? 0)} note="items" />
        <Kpi icon={<Banknote size={16} />} label="Revenue" value={loading ? null : money(s?.revenue ?? 0)} note={`${s?.orders ?? 0} orders`} />
        <Kpi icon={<TrendingUp size={16} />} label="Average order" value={loading ? null : money(s?.averageOrderValue ?? 0)} note="incl. VAT" />
        <Kpi icon={<Boxes size={16} />} label="Stock at cost" value={loading ? null : money(data?.stock.cost ?? 0)} note={`${data?.stock.units ?? 0} units held`} />
        <Kpi icon={<Clock size={16} />} label="Ageing stock" value={loading ? null : String(data?.stock.ageingOver90Days ?? 0)} note="held over 90 days" tone={(data?.stock.ageingOver90Days ?? 0) > 0 ? 'warn' : 'ink'} />
      </section>

      {data && (
        <>
          <Panel title="Traffic and revenue" note="Views are counted without cookies or any identifier, so this is every visitor rather than only those who accept a banner.">
            <Sparkline
              series={data.traffic.series.map((d, i) => ({
                label: d.day.slice(5),
                a: d.views,
                b: data.sales.series[i]?.revenue ?? 0,
              }))}
              aLabel="Page views"
              bLabel="Revenue (£)"
            />
          </Panel>

          <Panel
            title="Attention without sales"
            note="The most actionable list in the console: people are looking and not buying. Usually price, photography, or the grade in stock is not the grade they want."
          >
            {data.noSales.length === 0
              ? <p className="ops-empty">Nothing yet — either every viewed listing has sold, or there is not enough traffic to tell.</p>
              : <Bars rows={data.noSales.map((r) => ({ label: r.model || r.productId, value: r.views, note: `${r.addToCart} added to basket, 0 sold` }))} />}
          </Panel>

          <div className="ops-two-col">
            <Panel title="Most viewed" note="Views, baskets and orders per listing.">
              {data.attention.length === 0
                ? <p className="ops-empty">No product views recorded yet.</p>
                : (
                  <table className="ops-table">
                    <thead><tr><th>Product</th><th>Views</th><th>Basket</th><th>Sold</th><th>Conv.</th></tr></thead>
                    <tbody>
                      {data.attention.map((r) => (
                        <tr key={r.productId}>
                          <td>{r.model || r.productId}</td>
                          <td>{r.views}</td>
                          <td>{r.addToCart}</td>
                          <td>{r.unitsSold}</td>
                          <td>{r.conversion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </Panel>

            <Panel title="Best sellers" note="By revenue over the period.">
              {data.sales.topProducts.length === 0
                ? <p className="ops-empty">No orders in this period.</p>
                : <Bars rows={data.sales.topProducts.map((p) => ({ label: p.model || p.productId, value: p.revenue, note: `${p.units} sold`, format: money }))} />}
            </Panel>
          </div>

          <div className="ops-two-col">
            <Panel title="Where capital is sitting" note="Stock at cost by supplier. Ageing stock is a loss that has not been booked yet — handset prices fall every month.">
              <Bars rows={data.stock.bySupplier.map((r) => ({ label: r.supplier, value: r.cost, note: `${r.units} units`, format: money }))} />
            </Panel>

            <Panel title="Stock by condition" note="What is actually on the shelf, by the grade a customer sees.">
              <Bars rows={Object.entries(data.stock.byGrade).map(([grade, units]) => ({ label: grade, value: units, note: `${units} units` }))} />
            </Panel>
          </div>

          <div className="ops-two-col">
            <Panel title="Most visited pages" note="Product and order URLs are grouped, never stored one by one.">
              <Bars rows={data.traffic.topPaths.map((p) => ({ label: p.key, value: p.count }))} />
            </Panel>

            <Panel title="What people searched for" note="Searches with no matching stock are the cheapest buying signal you will get.">
              {data.traffic.topSearches.length === 0
                ? <p className="ops-empty">No searches recorded yet.</p>
                : <Bars rows={data.traffic.topSearches.map((p) => ({ label: p.key, value: p.count }))} />}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────

function Kpi({ icon, label, value, note, tone = 'ink' }: {
  icon: React.ReactNode; label: string; value: string | null; note: string; tone?: 'ink' | 'warn';
}) {
  return (
    <div className="ops-kpi">
      <div className={`ops-kpi-icon ops-kpi-${tone}`}>{icon}</div>
      <div>
        <p className="ops-kpi-label">{label}</p>
        <p className="ops-kpi-value">{value ?? '—'}</p>
        <p className="ops-note">{note}</p>
      </div>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="ops-panel">
      <h2 className="ops-panel-title">{title}</h2>
      {note && <p className="ops-note" style={{ marginTop: 4, marginBottom: 14 }}>{note}</p>}
      {children}
    </section>
  );
}

/** Two series on one baseline. Drawn rather than imported — see the header. */
function Sparkline({ series, aLabel, bLabel }: {
  series: Array<{ label: string; a: number; b: number }>; aLabel: string; bLabel: string;
}) {
  const W = 720, H = 180, PAD = 8;
  const maxA = Math.max(1, ...series.map((d) => d.a));
  const maxB = Math.max(1, ...series.map((d) => d.b));
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, series.length - 1);
  const y = (v: number, max: number) => H - PAD - (v / max) * (H - PAD * 2);
  const path = (key: 'a' | 'b', max: number) =>
    series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key], max).toFixed(1)}`).join(' ');

  return (
    <div>
      <div className="ops-legend">
        <span><i style={{ background: 'var(--brand-cyan, #0E5259)' }} />{aLabel}</span>
        <span><i style={{ background: '#B07D2B' }} />{bLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180" role="img"
           aria-label={`${aLabel} and ${bLabel} over ${series.length} days`} style={{ display: 'block' }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="currentColor" opacity="0.15" />
        <path d={path('a', maxA)} fill="none" stroke="var(--brand-cyan, #0E5259)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={path('b', maxB)} fill="none" stroke="#B07D2B" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" />
      </svg>
      <div className="ops-axis">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Bars({ rows }: {
  rows: Array<{ label: string; value: number; note?: string; format?: (n: number) => string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="ops-empty">Nothing to show yet.</p>;

  return (
    <ul className="ops-bars">
      {rows.map((r) => (
        <li key={r.label} className="ops-bar-row">
          <span className="ops-bar-label" title={r.label}>{r.label}</span>
          <span className="ops-bar-track">
            <span className="ops-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
            {r.note && <span className="ops-note">{r.note}</span>}
          </span>
          <span className="ops-bar-count">{r.format ? r.format(r.value) : r.value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
