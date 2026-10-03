import { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart, Loader2, RefreshCw } from 'lucide-react';
import { listOrders, type AdminOrder } from '../../lib/orders';
import { listReturns } from '../../lib/returns';
import { describeError } from '../../lib/adminApi';

type Line = { order: AdminOrder; item: AdminOrder['items'][number]; date: string; revenue: number; cost: number | null; gp: number | null };
const money = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) => iso.slice(0, 10);

export default function ReportsPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setOrders(await listOrders()); }
    catch (err) { setError(describeError(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const lines = useMemo<Line[]>(() => orders
    .filter(order => order.status !== 'refunded')
    .flatMap(order => order.items.map(item => {
      const revenue = item.price * item.quantity;
      const cost = item.buyPrice == null ? null : item.buyPrice * item.quantity;
      return { order, item, date: day(order.createdAt), revenue, cost, gp: cost == null ? null : revenue - cost };
    }))
    .filter(line => (!from || line.date >= from) && (!to || line.date <= to))
    .filter(line => {
      const q = search.trim().toLowerCase();
      return !q || [line.order.id, line.order.customer, line.item.name, line.item.sku, line.item.imei].some(v => String(v ?? '').toLowerCase().includes(q));
    }), [orders, from, to, search]);

  const revenue = lines.reduce((sum, line) => sum + line.revenue, 0);
  const gpLines = lines.filter((line): line is Line & { cost: number; gp: number } => line.cost != null && line.gp != null);
  const gp = gpLines.reduce((sum, line) => sum + line.gp, 0);

  const download = async () => {
    setExporting(true);
    try {
      const [{ downloadSalesReport }, returns] = await Promise.all([import('../../lib/reports'), listReturns()]);
      downloadSalesReport(lines.map(line => ({
        date: line.order.createdAt, channel: 'WEBSITE', channelOrderId: line.order.id,
        sku: line.item.sku, imei: line.item.imei, model: line.item.name, storage: line.item.storage,
        color: line.item.color, condition: line.item.grade, buyPrice: line.item.buyPrice,
        sellPrice: line.item.price, quantity: line.item.quantity,
      })), returns.filter(r => (!from || day(r.createdAt) >= from) && (!to || day(r.createdAt) <= to)));
    } catch (err) { setError(describeError(err)); }
    finally { setExporting(false); }
  };

  return <div className="ops-stack">
    <header className="ops-head"><div><p className="ops-eyebrow">Website operations</p><h1 className="ops-title">Live reports</h1></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="btn btn-secondary btn-md" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 size={15} className="admin-spin" /> : <RefreshCw size={15} />} Refresh</button><button type="button" className="btn btn-buy btn-md" onClick={() => void download()} disabled={exporting || loading}><Download size={15} /> {exporting ? 'Preparing...' : 'Download filtered report'}</button></div></header>
    {error && <div role="alert" className="ops-alert">{error}</div>}
    <section className="ops-panel"><div className="ops-panel-head"><h2 className="ops-panel-title">Period and search</h2><span className="ops-meta">Filters apply to the table and download</span></div><div className="admin-toolbar"><label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><label style={{ flex: '1 1 220px' }}>Search <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order, customer, model, SKU or IMEI" /></label></div></section>
    <section className="ops-kpis" aria-label="Filtered report totals"><Fact label="Units sold" value={String(lines.reduce((sum, line) => sum + line.item.quantity, 0))} /><Fact label="Sales revenue" value={money(revenue)} /><Fact label="Product GP" value={money(gp)} note={gpLines.length === lines.length ? `${revenue ? ((gp / revenue) * 100).toFixed(1) : '0.0'}% margin` : `${lines.length - gpLines.length} line${lines.length - gpLines.length === 1 ? '' : 's'} need a buy price`} /><Fact label="Matching sales" value={String(lines.length)} note="Website only" /></section>
    <section className="ops-panel"><div className="ops-panel-head"><h2 className="ops-panel-title">Sales ledger</h2><span className="ops-meta">Paid website orders · refunds excluded from sales totals</span></div>{loading ? <p className="ops-empty">Loading live orders…</p> : !lines.length ? <p className="ops-empty"><FileBarChart size={22} /> No website sales match these filters.</p> : <table className="ops-table"><thead><tr><th>Date</th><th>Order</th><th>Product</th><th>Qty</th><th>Revenue</th><th>Buy cost</th><th>Product GP</th></tr></thead><tbody>{lines.map((line, index) => <tr key={`${line.order.id}-${index}`}><td>{line.date}</td><td>{line.order.id}</td><td>{line.item.name}</td><td>{line.item.quantity}</td><td>{money(line.revenue)}</td><td>{line.cost == null ? '—' : money(line.cost)}</td><td>{line.gp == null ? 'Needs cost' : money(line.gp)}</td></tr>)}</tbody></table>}</section>
  </div>;
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="ops-kpi"><span className="ops-kpi-label">{label}</span><span className="ops-kpi-value">{value}</span>{note && <span className="ops-meta">{note}</span>}</div>; }
