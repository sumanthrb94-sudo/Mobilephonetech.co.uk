import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Download, Loader2, Trash2 } from 'lucide-react';
import { APPLE_CATALOGUE, type CatalogueFamily, type CatalogueModel } from '../../data/catalogue/apple';
import {
  deleteProducts, existingProducts, importModels, isLegacySample, variantsFor, type ExistingProduct,
} from '../../lib/catalogueImport';
import { describeError } from '../../lib/adminApi';

const FAMILIES: CatalogueFamily[] = ['iPhone', 'iPad', 'Apple Watch'];

/**
 * Adds Apple's 2020-onwards range to the shop as draft products.
 *
 * Every model arrives with all its configurations (storage × colour ×
 * connectivity) and its specs, but no prices, conditions, stock or photos,
 * so nothing appears on the shop until staff complete and list it in the
 * product editor. Models already in the database are left untouched.
 */
export default function CatalogueImportPage() {
  const [existing, setExisting] = useState<Map<string, ExistingProduct> | null>(null);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [families, setFamilies] = useState<Set<CatalogueFamily>>(new Set(FAMILIES));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await existingProducts();
      setExisting(next);
      // Sample products with no stock are ticked by default; anything a
      // member of staff has put stock against is left for them to decide.
      setSelectedSamples(new Set([...next.values()].filter(p => isLegacySample(p) && p.stock === 0).map(p => p.id)));
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const chosen = useMemo(
    () => APPLE_CATALOGUE.filter(m => families.has(m.family)),
    [families],
  );
  const toImport = useMemo(
    () => (existing ? chosen.filter(m => !existing.has(m.id)) : []),
    [chosen, existing],
  );
  const samples = useMemo(
    () => (existing ? [...existing.values()].filter(isLegacySample).sort((a, b) => a.id.localeCompare(b.id)) : []),
    [existing],
  );
  const configCount = toImport.reduce((sum, m) => sum + variantsFor(m).length, 0);

  const toggleFamily = (family: CatalogueFamily) => setFamilies(current => {
    const next = new Set(current);
    if (next.has(family)) next.delete(family); else next.add(family);
    return next;
  });

  const runImport = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setProgress({ done: 0, total: toImport.length });
    try {
      const result = await importModels(toImport, (done, total) => setProgress({ done, total }));
      setNotice(`${result.created.length} models added as drafts.${result.skipped.length ? ` ${result.skipped.length} were already in the database and were left as they are.` : ''}`);
    } catch (err) {
      setError(`${describeError(err)} Anything imported before the error is saved; run the import again to add the rest.`);
    } finally {
      setBusy(false);
      setProgress(null);
      await refresh();
    }
  };

  const removeSamples = async () => {
    const ids = [...selectedSamples];
    setBusy(true);
    setError(null);
    setNotice(null);
    setConfirmDelete(false);
    setProgress({ done: 0, total: ids.length });
    try {
      await deleteProducts(ids, (done, total) => setProgress({ done, total }));
      setNotice(`${ids.length} sample products deleted.`);
    } catch (err) {
      setError(`${describeError(err)} Products deleted before the error stay deleted; run it again for the rest.`);
    } finally {
      setBusy(false);
      setProgress(null);
      await refresh();
    }
  };

  return (
    <div>
      <h1 style={titleStyle}>Catalogue import</h1>
      <p style={leadStyle}>
        Adds every iPhone, iPad and Apple Watch released since 2020 as a <strong>draft</strong>, with its colours,
        storage, connectivity and specs. Drafts stay hidden from the shop. To sell one, open it in Inventory,
        set a condition and price on each configuration you stock, upload photos per colour, and switch it to listed.
      </p>

      {error && <div role="alert" style={alertStyle}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span></div>}
      {notice && (
        <div role="status" style={noticeStyle}>
          <Check size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{notice} <Link to="/admin/inventory">Open inventory</Link></span>
        </div>
      )}

      {samples.length > 0 && (
        <section style={sampleBoxStyle} aria-labelledby="samples-title">
          <h2 id="samples-title" style={sectionTitleStyle}>1. Remove the old sample products</h2>
          <p style={leadStyle}>
            {samples.length} products in the database came from the demo catalogue that used to be seeded into
            Firestore. They are not real stock. Products with stock are left unticked so you can check them first.
            {samples.some(p => APPLE_CATALOGUE.some(m => m.id === p.id)) && ' Some share an id with a model below, which will be skipped by the import until the sample is removed.'}
          </p>
          <div style={{ ...tableWrapStyle, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
            <table style={{ ...tableStyle, minWidth: 560 }}>
              <thead><tr>{['', 'Product', 'Price', 'Stock'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {samples.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <input type="checkbox" aria-label={`Delete ${p.brand} ${p.model}`} checked={selectedSamples.has(p.id)}
                        onChange={() => setSelectedSamples(current => {
                          const next = new Set(current);
                          if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                          return next;
                        })} style={{ width: 16, height: 16, accentColor: 'var(--brand-cyan)' }} />
                    </td>
                    <td style={tdStyle}><strong>{p.brand} {p.model}</strong><div style={mutedStyle}>{p.id}</div></td>
                    <td style={tdStyle}>£{p.price}</td>
                    <td style={{ ...tdStyle, color: p.stock > 0 ? '#92400e' : undefined, fontWeight: p.stock > 0 ? 700 : undefined }}>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {confirmDelete ? (
            <div role="group" aria-label="Confirm delete" style={actionRowStyle}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Delete {selectedSamples.size} products and their photos permanently?
              </span>
              <button type="button" className="btn btn-primary btn-sm" onClick={removeSamples} disabled={busy}>Yes, delete</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary btn-md" onClick={() => setConfirmDelete(true)}
              disabled={busy || selectedSamples.size === 0}>
              {busy && progress ? <Loader2 size={15} className="admin-spin" /> : <Trash2 size={15} />}
              {` Delete ${selectedSamples.size} sample products`}
            </button>
          )}
        </section>
      )}

      {samples.length > 0 && <h2 style={sectionTitleStyle}>2. Import the Apple range</h2>}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Include</legend>
        {FAMILIES.map(family => {
          const total = APPLE_CATALOGUE.filter(m => m.family === family).length;
          return (
            <label key={family} style={checkStyle}>
              <input type="checkbox" checked={families.has(family)} onChange={() => toggleFamily(family)}
                style={{ width: 17, height: 17, accentColor: 'var(--brand-cyan)' }} />
              {family} <span style={mutedStyle}>({total} models)</span>
            </label>
          );
        })}
      </fieldset>

      <div style={actionRowStyle}>
        <button type="button" className="btn btn-primary btn-md" onClick={runImport}
          disabled={busy || !existing || toImport.length === 0}>
          {busy ? <Loader2 size={15} className="admin-spin" /> : <Download size={15} />}
          {busy && progress
            ? ` Importing ${progress.done} of ${progress.total}…`
            : toImport.length
              ? ` Import ${toImport.length} models as drafts`
              : ' Nothing new to import'}
        </button>
        <span style={mutedStyle}>
          {existing
            ? `${toImport.length} new · ${chosen.length - toImport.length} already in the database · ${configCount.toLocaleString('en-GB')} configurations`
            : 'Checking the database…'}
        </span>
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Model', 'Released', 'Colours', 'Storage', 'Connectivity', 'Configurations', 'Status'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chosen.map(model => <ModelRow key={model.id} model={model} inDb={existing ? existing.get(model.id) ?? null : undefined} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelRow({ model, inDb }: { model: CatalogueModel; inDb: ExistingProduct | null | undefined }) {
  return (
    <tr>
      <td style={tdStyle}>
        <strong>{model.model}</strong>
        {model.verify && <div style={verifyStyle}><AlertTriangle size={12} aria-hidden="true" /> {model.verify}</div>}
      </td>
      <td style={tdStyle}>{formatMonth(model.released)}</td>
      <td style={tdStyle}>
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {model.colours.map(c => (
            <span key={c.name} title={c.name} aria-label={c.name} style={{ ...dotStyle, background: c.hex }} />
          ))}
        </span>
      </td>
      <td style={tdStyle}>{model.storage.length ? model.storage.join(', ') : '—'}</td>
      <td style={tdStyle}>{model.connectivity?.join(', ') ?? '—'}</td>
      <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{variantsFor(model).length}</td>
      <td style={tdStyle}>
        {inDb === undefined ? '…' : inDb
          ? isLegacySample(inDb)
            ? <span style={sampleStyle}>Old sample — remove first</span>
            : <Link to={`/admin/inventory/${model.id}`} style={inDbStyle}>In database</Link>
          : <span style={newStyle}>New</span>}
      </td>
    </tr>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const titleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'clamp(21px, 3vw, 28px)', fontWeight: 900, color: 'var(--black)', margin: '0 0 8px' };
const leadStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', maxWidth: '72ch', lineHeight: 1.55, margin: '0 0 20px' };
const alertStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 14, marginBottom: 16 };
const noticeStyle: React.CSSProperties = { display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: 14, marginBottom: 16 };
const fieldsetStyle: React.CSSProperties = { border: 0, padding: 0, margin: '0 0 14px', display: 'flex', gap: 18, flexWrap: 'wrap' };
const legendStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, marginBottom: 8, padding: 0 };
const checkStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' };
const mutedStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-50)' };
const actionRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)', background: 'var(--grey-0)' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13, minWidth: 820 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--grey-10)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey-50)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--grey-10)', verticalAlign: 'top', color: 'var(--black)' };
const dotStyle: React.CSSProperties = { width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--grey-20)', display: 'inline-block' };
const verifyStyle: React.CSSProperties = { display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 4, fontSize: 12, color: '#92400e', maxWidth: '46ch' };
const inDbStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--grey-60)' };
const sampleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#92400e' };
const sampleBoxStyle: React.CSSProperties = { padding: 16, border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 'var(--radius-md)', marginBottom: 24 };
const sectionTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 800, color: 'var(--black)', margin: '0 0 8px' };
const newStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--color-trust-text)' };
