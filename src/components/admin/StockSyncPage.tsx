import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, Upload } from 'lucide-react';
import { MARKUP, OFFICE_SHEET, planStockSync, type SkippedRow, type SyncPlan, type SyncUnit } from '../../lib/stockSync';
import { applyStockSync, loadAllProducts, readInventoryReport } from '../../lib/stockSyncApply';
import { describeError } from '../../lib/adminApi';

const markupPercent = Math.round((MARKUP - 1) * 100);

/**
 * Make the shop match the stock app.
 *
 * Staff upload the inventory report (All time: it lists every handset still
 * on the shelf, and nothing that has sold). The page shows exactly what will
 * change, and nothing is written until they press Apply.
 */
export default function StockSyncPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [units, setUnits] = useState<SyncUnit[] | null>(null);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPlan(null);
    setFileName(file.name);
    try {
      const parsed = await readInventoryReport(file);
      if (!parsed.units.length) {
        throw new Error(`The ${OFFICE_SHEET} tab has no units in it. A "Today" export only lists units booked in today: export the report with the period set to All time.`);
      }
      setUnits(parsed.units);
      setSkipped(parsed.skipped);
      setPlan(planStockSync(parsed.units, await loadAllProducts()));
    } catch (err) {
      setUnits(null);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!units) return;
    setBusy(true);
    setError(null);
    try {
      // Planned again against the database as it is now, so an order placed
      // since the preview is not overwritten with an older stock count.
      const products = await loadAllProducts();
      const fresh = planStockSync(units, products);
      setProgress({ done: 0, total: 1 });
      await applyStockSync(fresh, products, (done, total) => setProgress({ done, total }));
      setNotice(`Done. ${fresh.units} units are on sale across ${fresh.updates.length + fresh.creates.length} listings, and ${fresh.zeroed.length} listings are now out of stock (still visible).`);
      setPlan(null);
      setUnits(null);
      setFileName(null);
    } catch (err) {
      setError(`${describeError(err)} Anything written before the error is saved; upload the same report again to finish.`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const inStock = plan ? [...plan.updates, ...plan.creates] : [];

  return (
    <div>
      <h1 style={titleStyle}>Stock sync</h1>
      <p style={leadStyle}>
        Upload the inventory report from the stock app, exported with the period set to <strong>All time</strong> (it
        lists only units still in stock). Only the {OFFICE_SHEET} tab is used. Every unit in it goes on sale as
        <strong> Pristine</strong> at its buying price plus {markupPercent}%, rounded up to the pound; where a colour has
        units bought at different prices, the highest sets the price. Every other listing is set to out of stock and
        stays visible. Nothing changes until you press Apply.
      </p>

      {error && <div role="alert" style={alertStyle}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span></div>}
      {notice && (
        <div role="status" style={noticeStyle}>
          <Check size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{notice} <Link to="/admin/inventory">Open inventory</Link></span>
        </div>
      )}

      <label style={uploadStyle}>
        {busy && !progress ? <Loader2 size={16} className="admin-spin" /> : <Upload size={16} />}
        {fileName ?? 'Choose inventory report (.xlsx)'}
        <input type="file" accept=".xlsx,.xls" disabled={busy} style={{ display: 'none' }}
          onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>

      {plan && (
        <>
          <div style={summaryStyle}>
            <Stat label="Units on sale" value={plan.units} />
            <Stat label="Listings updated" value={plan.updates.length} />
            <Stat label="New listings" value={plan.creates.length} />
            <Stat label="Set to out of stock" value={plan.zeroed.length} />
          </div>

          {skipped.length > 0 && (
            <div role="alert" style={warnStyle}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {skipped.length} rows will not be put on sale:{' '}
                {skipped.slice(0, 8).map(s => `row ${s.row} ${s.model} (${s.reason})`).join('; ')}
                {skipped.length > 8 ? `; and ${skipped.length - 8} more.` : '.'}
              </span>
            </div>
          )}

          <div style={actionRowStyle}>
            <button type="button" onClick={() => void apply()} disabled={busy} style={primaryButtonStyle}>
              {busy ? <Loader2 size={16} className="admin-spin" /> : <Check size={16} />}
              {progress ? `Saving ${progress.done} of ${progress.total}…` : `Apply to the shop`}
            </button>
          </div>

          <h2 style={sectionTitleStyle}>On sale after the sync</h2>
          <div style={{ ...tableWrapStyle, marginBottom: 24 }}>
            <table style={tableStyle}>
              <thead><tr>{['Listing', 'Now', 'After', 'Colours and prices'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {inStock.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <strong>{p.brand} {p.model}</strong>
                      {!p.existing && <span style={newStyle}> · new listing</span>}
                      <div style={mutedStyle}>{p.id}</div>
                    </td>
                    <td style={tdStyle}>{p.existing ? <>£{p.existing.price} · {p.existing.stock} in stock</> : '—'}</td>
                    <td style={tdStyle}><strong>from £{p.price}</strong> · {p.stock} in stock</td>
                    <td style={tdStyle}>
                      {p.lines.map(l => (
                        <div key={`${l.storage}|${l.colour}`}>
                          {[l.storage, l.colour ?? 'No colour'].filter(Boolean).join(' ')}: {l.units} × £{l.price}
                          <span style={mutedStyle}> (cost £{l.maxBuyPrice})</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={sectionTitleStyle}>Set to out of stock ({plan.zeroed.length})</h2>
          <p style={leadStyle}>These stay on the shop, marked out of stock, with their prices unchanged.</p>
          <div style={{ ...tableWrapStyle, maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 480 }}>
              <thead><tr>{['Listing', 'Stock now'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {plan.zeroed.map(z => (
                  <tr key={z.id}>
                    <td style={tdStyle}><strong>{z.brand} {z.model}</strong><div style={mutedStyle}>{z.id}</div></td>
                    <td style={tdStyle}>{z.previousStock} → 0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 900 }}>{value}</div>
      <div style={mutedStyle}>{label}</div>
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'clamp(21px, 3vw, 28px)', fontWeight: 900, color: 'var(--black)', margin: '0 0 8px' };
const leadStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', maxWidth: '72ch', lineHeight: 1.55, margin: '0 0 20px' };
const alertStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 14, marginBottom: 16 };
const warnStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 14, marginBottom: 16 };
const noticeStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: 14, marginBottom: 16 };
const uploadStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px dashed var(--grey-30)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 20, background: 'var(--grey-0)' };
const summaryStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 };
const statStyle: React.CSSProperties = { padding: 14, border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)', background: 'var(--grey-0)' };
const mutedStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-50)' };
const actionRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 };
const primaryButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 'var(--radius-md)', border: 0, background: 'var(--black)', color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)', background: 'var(--grey-0)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13, minWidth: 720 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--grey-10)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-50)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--grey-10)', verticalAlign: 'top', color: 'var(--black)' };
const sectionTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 800, color: 'var(--black)', margin: '0 0 8px' };
const newStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--color-trust-text)' };
