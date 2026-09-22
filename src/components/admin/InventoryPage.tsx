import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus, Search, Pencil, Archive, ArchiveRestore, Download, Check, X,
  AlertTriangle, Loader2, PackageX, RefreshCw,
} from 'lucide-react';
import {
  listInventory, listBrands, setStock, archiveProduct, restoreProduct, describeError,
  LOW_STOCK_THRESHOLD, INVENTORY_READ_CAP, type InventoryQuery,
} from '../../lib/adminApi';
import { INVENTORY_COLUMNS, toCsv, exportFilename, downloadCsv } from '../../lib/adminExport';
import { useAdmin } from '../../hooks/useAdmin';
import type { Product } from '../../types';
import Modal from '../ui/Modal';

const PAGE_SIZE = 25;

/**
 * How many rows the export asks for in one go.
 *
 * Above INVENTORY_READ_CAP on purpose, so the slice never drops a row the
 * read did carry; where the catalogue is bigger than one read, the result
 * says so and the export says so with it. Paging the export instead would
 * let the catalogue change between pages, producing a file describing a
 * state the shop was never in.
 */
const EXPORT_PAGE_SIZE = 5000;

/**
 * Back-store inventory console: search, filter, inline stock edits, and
 * add/archive. Stock is editable in the row because adjusting it is the single
 * most frequent job — making that a round trip through the full editor would
 * be the wrong default.
 *
 * There is no delete. A product is named by every order and return that ever
 * contained it, so removing the document left an old invoice with no record
 * of what it was for; archiving withdraws it from sale and keeps the record,
 * which is also all firestore.rules now permits.
 */
export default function InventoryPage() {
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const { can } = useAdmin();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flash ?? null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [stockFilter, setStockFilter] = useState<InventoryQuery['stockFilter']>('all');
  const [sort, setSort] = useState<InventoryQuery['sort']>('newest');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<InventoryQuery['archived']>('live');

  const [pending, setPending] = useState<{ product: Product; kind: 'archive' | 'restore' } | null>(null);
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { products: rows, total: count, truncated: partial } = await listInventory({
        search: debouncedSearch, brand, stockFilter, sort, page, pageSize: PAGE_SIZE,
        archived: view,
      });
      setProducts(rows);
      setTotal(count);
      setTruncated(partial);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, brand, stockFilter, sort, page, view]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listBrands().then(setBrands).catch(() => setBrands([])); }, []);

  const handleStockSaved = (id: string, stock: number) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, stock } : p)));
    setNotice('Stock updated.');
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { product, kind } = pending;
    setWorking(true);
    try {
      if (kind === 'archive') {
        await archiveProduct(product.id);
        setNotice(`${product.brand} ${product.model} archived. Its record stays, and you can put it back on sale from the Archived tab.`);
      } else {
        await restoreProduct(product.id);
        setNotice(`${product.brand} ${product.model} is back on sale. Its stock is 0 until you enter the count you have.`);
      }
      setPending(null);
      // Stepping back a page avoids stranding the admin on an empty last page:
      // the row just acted on has left whichever view they are looking at.
      if (products.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (err) {
      setError(describeError(err));
      setPending(null);
    } finally {
      setWorking(false);
    }
  };

  /**
   * The whole matching set, not the page on screen.
   *
   * A spreadsheet holding 25 of 400 products looks complete and is not, so
   * the export re-runs the query instead of serialising the rows rendered
   * here. It asks for archived products too: a file that drops everything
   * withdrawn cannot be reconciled against an order from last year, which is
   * the main thing anyone exports the catalogue to do.
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { products: rows, truncated: partial } = await listInventory({
        search: debouncedSearch, brand, stockFilter, sort,
        page: 1, pageSize: EXPORT_PAGE_SIZE, archived: 'all',
      });
      downloadCsv(exportFilename('inventory'), toCsv(rows, INVENTORY_COLUMNS));
      // The file still downloads — a partial export is worth having — but it
      // is announced loudly, because a spreadsheet that silently stops short
      // of the catalogue is the trap this button exists to avoid.
      if (partial) {
        setError(`The export carries ${rows.length.toLocaleString('en-GB')} products, which is as many as one read holds. The catalogue is larger, so this file is not the whole of it — export brand by brand to cover the rest.`);
      } else {
        setNotice(`Exported ${rows.length.toLocaleString('en-GB')} product${rows.length === 1 ? '' : 's'}, archived ones included.`);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Switching view always returns to page 1.
   *
   * Live runs to hundreds of rows and Archived usually to a handful, so
   * carrying page 4 across the switch shows an empty table — which reads as a
   * broken query rather than as the end of a short list.
   */
  const showView = (next: InventoryQuery['archived']) => {
    setView(next);
    setPage(1);
  };

  const canArchive = can('products:archive');
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(21px, 3vw, 28px)', fontWeight: 900, color: 'var(--black)', margin: 0 }}>
            Inventory
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)', margin: '4px 0 0' }}>
            {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}`}
            {/* The count is of what one read could carry, not of the
                catalogue, and a figure that is quietly wrong is worse than no
                figure — so it is labelled the moment it stops being whole. */}
            {!loading && truncated && (
              <span className="ops-chip" style={{ marginLeft: 8 }}>Partial count</span>
            )}
          </p>
        </div>
        <Link to="/admin/inventory/new" className="btn btn-buy btn-md" style={{ textDecoration: 'none' }}>
          <Plus size={16} /> Add product
        </Link>
      </div>

      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>
      )}
      {error && (
        <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>
      )}

      {/* ── Toolbar, column header and rows share one panel ── */}
      <div className="admin-panel">
      <div className="admin-toolbar">
        <div className="ops-tabs" role="tablist" aria-label="Which products to show">
          <button type="button" role="tab" className="ops-tab" aria-selected={view === 'live'}
            onClick={() => showView('live')}>
            Live
          </button>
          <button type="button" role="tab" className="ops-tab" aria-selected={view === 'archived'}
            onClick={() => showView('archived')}>
            Archived
          </button>
        </div>

        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-50)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search model, brand or slug…"
            aria-label="Search inventory"
            style={{ ...controlStyle, paddingLeft: 38, width: '100%' }}
          />
        </div>

        <select aria-label="Filter by brand" value={brand}
          onChange={e => { setBrand(e.target.value); setPage(1); }} style={controlStyle}>
          <option value="">All brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select aria-label="Filter by stock" value={stockFilter}
          onChange={e => { setStockFilter(e.target.value as InventoryQuery['stockFilter']); setPage(1); }} style={controlStyle}>
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low (1–{LOW_STOCK_THRESHOLD})</option>
          <option value="out">Out of stock</option>
        </select>

        <select aria-label="Sort inventory" value={sort}
          onChange={e => { setSort(e.target.value as InventoryQuery['sort']); setPage(1); }} style={controlStyle}>
          <option value="newest">Newest first</option>
          <option value="stock_asc">Lowest stock</option>
          <option value="price_desc">Highest price</option>
          <option value="model_asc">Model A–Z</option>
        </select>

        {can('export') && (
          <button type="button" onClick={exportCsv} disabled={exporting}
            className="btn btn-secondary btn-md">
            {exporting
              ? <><Loader2 size={15} className="admin-spin" /> Exporting…</>
              : <><Download size={15} /> Export CSV</>}
          </button>
        )}

        <button type="button" onClick={load} className="btn btn-secondary btn-md" aria-label="Refresh inventory">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Rows ── */}
      {loading ? (
        <p style={emptyStyle} aria-live="polite">Loading inventory…</p>
      ) : products.length === 0 ? (
        <div style={{ ...emptyStyle, display: 'grid', placeItems: 'center', gap: 12 }}>
          <PackageX size={30} style={{ color: 'var(--grey-30)' }} />
          <p style={{ margin: 0 }}>
            {view === 'archived'
              ? 'Nothing is archived.'
              : 'No products match those filters.'}
          </p>
        </div>
      ) : (
        <>
          {/* aria-hidden: the labels are decoration for sighted scanning — each
              cell already carries its own accessible name. */}
          <div className="admin-thead" aria-hidden="true">
            <span>Image</span>
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {products.map(p => (
              <InventoryRow
                key={p.id}
                product={p}
                canArchive={canArchive}
                onStockSaved={handleStockSaved}
                onArchiveRequest={() => setPending({ product: p, kind: p.archivedAt ? 'restore' : 'archive' })}
                onError={setError}
              />
            ))}
          </ul>

          {truncated && (
            <p className="ops-footnote">
              One read carries {INVENTORY_READ_CAP.toLocaleString('en-GB')} products and the
              catalogue is larger than that, so this list, the count above it and the pager all
              describe that first slice rather than everything. Filter by brand to bring the rest
              into range.
            </p>
          )}

          {view === 'archived' && (
            <p className="ops-footnote">
              An archived product is off sale but still in the record, because every
              order and return that names one has to keep resolving. Restoring leaves
              its stock at 0.
            </p>
          )}
        </>
      )}
      </div>{/* /.admin-panel */}

      {totalPages > 1 && (
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 'var(--spacing-24)' }} aria-label="Inventory pages">
          <button type="button" className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>
            Page {page} of {totalPages}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </nav>
      )}

      {/* One dialog for both directions: the decision is the same shape either
          way, and a second modal would be a second place for the copy about
          stock to drift out of step with what the API actually does. */}
      <Modal
        isOpen={Boolean(pending)}
        onClose={() => !working && setPending(null)}
        title={pending?.kind === 'restore' ? 'Put this product back on sale?' : 'Archive this product?'}
      >
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14.5px', color: 'var(--grey-70)', lineHeight: 1.6, margin: '0 0 8px' }}>
          <strong style={{ color: 'var(--black)' }}>{pending?.product.brand} {pending?.product.model}</strong>
          {pending?.kind === 'restore'
            ? ' will show on the storefront again, and its record carries on as it was.'
            : ' will be taken off the storefront and its stock set to 0. The product itself stays in the record, so every order and return that names it still resolves.'}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: '0 0 20px' }}>
          {pending?.kind === 'restore'
            ? 'Its stock stays at 0, so enter the count you actually have — restoring the figure from before it was archived would be inventing stock.'
            : 'This is reversible: archived products are listed under the Archived tab, and restoring one puts it back on sale with its stock at 0 for you to re-count.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-md" onClick={() => setPending(null)} disabled={working}>
            {pending?.kind === 'restore' ? 'Leave it archived' : 'Keep it on sale'}
          </button>
          <button
            type="button"
            className="btn btn-buy btn-md"
            onClick={confirmPending}
            disabled={working}
          >
            {pending?.kind === 'restore'
              ? (working ? <><Loader2 size={15} className="admin-spin" /> Restoring…</> : <><ArchiveRestore size={15} /> Restore</>)
              : (working ? <><Loader2 size={15} className="admin-spin" /> Archiving…</> : <><Archive size={15} /> Archive</>)}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────

function InventoryRow({
  product, canArchive, onStockSaved, onArchiveRequest, onError,
}: {
  product: Product;
  canArchive: boolean;
  onStockSaved: (id: string, stock: number) => void;
  onArchiveRequest: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => { setValue(String(product.stock)); }, [product.stock]);
  useEffect(() => { setImageFailed(false); }, [product.imageUrl]);

  const commit = async () => {
    const next = parseInt(value, 10);
    if (!Number.isInteger(next) || next < 0) {
      onError('Stock must be a whole number of 0 or more.');
      setValue(String(product.stock));
      setEditing(false);
      return;
    }
    if (next === product.stock) { setEditing(false); return; }

    setSaving(true);
    try {
      await setStock(product.id, next);
      onStockSaved(product.id, next);
      setEditing(false);
    } catch (err) {
      onError(describeError(err));
      setValue(String(product.stock));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setValue(String(product.stock)); setEditing(false); };

  const tone = product.stock === 0 ? 'out' : product.stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
  const archived = Boolean(product.archivedAt);
  const audit = auditLine(product);

  return (
    <li className={archived ? 'admin-row ops-row-archived' : 'admin-row'}>
      {/* A hairline frame, not a filled tile: the thumbnail should read as an
          image on the row, not as a card nested inside one. */}
      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 'var(--radius-sm)', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        {/* A product whose image 404s falls back to the placeholder rather than
            the browser's broken-image icon — a missing file is exactly the kind
            of thing an admin comes here to notice and fix. */}
        {product.imageUrl && !imageFailed
          ? (
            <img
              src={product.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )
          : <PackageX size={18} style={{ color: 'var(--grey-30)' }} aria-label="No image" />}
      </div>

      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <Link
          to={`/admin/inventory/${product.id}`}
          /* minHeight 24 keeps the name link above the WCAG 2.2 SC 2.5.8
             target minimum — a 19px line box would not be. */
          /* Block, not flex: ellipsis truncation needs a block box. A 24px
             line box also clears the WCAG 2.2 SC 2.5.8 target minimum, which
             the natural ~19px one would not. */
          style={{ fontFamily: 'var(--font-sans)', fontSize: '14.5px', fontWeight: 700, color: 'var(--black)', textDecoration: 'none', display: 'block', lineHeight: '24px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {product.brand} {product.model}
        </Link>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.grade}{product.storage ? ` · ${product.storage}` : ''} · {product.id}
          {archived && <span className="ops-chip" style={{ marginLeft: 8 }}>Archived</span>}
        </div>
        {/* Nothing at all when the stamp is missing. A product last touched
            before these fields existed has no provenance, and printing
            "unknown" or an epoch date would invent some. */}
        {audit && <p className="ops-audit">{audit}</p>}
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14.5px', fontWeight: 800, color: 'var(--black)', flexShrink: 0, minWidth: 68 }}>
        £{product.price}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {editing ? (
          <>
            <input
              type="number" min="0" step="1" value={value} autoFocus
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              aria-label={`Stock for ${product.brand} ${product.model}`}
              style={{ ...controlStyle, width: 76, height: 34 }}
            />
            <IconButton label="Save stock" onClick={commit} disabled={saving}>
              {saving ? <Loader2 size={15} className="admin-spin" /> : <Check size={15} />}
            </IconButton>
            <IconButton label="Cancel stock edit" onClick={cancel} disabled={saving}>
              <X size={15} />
            </IconButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit stock for ${product.brand} ${product.model}, currently ${product.stock}`}
            style={{ ...stockPillStyle, ...stockToneStyle[tone] }}
          >
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: stockDotColor[tone], flexShrink: 0 }} />
            {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0, justifyContent: 'flex-end' }}>
        <Link
          to={`/admin/inventory/${product.id}`}
          aria-label={`Edit ${product.brand} ${product.model}`}
          title="Edit"
          className="admin-ghost"
          style={{ ...ghostButtonStyle, color: 'var(--grey-60)', textDecoration: 'none' }}
        >
          <Pencil size={15} />
        </Link>
        {/* Staff get no button rather than a button that refuses them:
            offering an action the role cannot carry out only teaches people
            to click through refusals. */}
        {canArchive && (
          archived ? (
            <IconButton label={`Restore ${product.brand} ${product.model}`} onClick={onArchiveRequest}>
              <ArchiveRestore size={15} />
            </IconButton>
          ) : (
            <IconButton label={`Archive ${product.brand} ${product.model}`} onClick={onArchiveRequest}>
              <Archive size={15} />
            </IconButton>
          )
        )}
      </div>
    </li>
  );
}

/**
 * Who last touched this product, and when.
 *
 * Returns null rather than a placeholder when the record says nothing. The
 * stamp only exists on products written since the console started keeping
 * one, and a row that reads "updated by unknown on 1 Jan 1970" is worse than
 * a row that says nothing: it looks like an answer.
 */
function auditLine(product: Product): string | null {
  const when = product.updatedAt ? new Date(product.updatedAt) : null;
  const date = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  // 'unknown' is what the API writes when it cannot name the signed-in user,
  // so it is an absent stamp wearing a value's clothes.
  const who = product.updatedBy && product.updatedBy !== 'unknown' ? product.updatedBy : null;

  if (date && who) return `Updated ${date} by ${who}`;
  if (date) return `Updated ${date}`;
  if (who) return `Updated by ${who}`;
  return null;
}

function IconButton({
  children, label, onClick, disabled,
}: {
  children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="admin-ghost"
      style={{
        ...ghostButtonStyle,
        color: disabled ? 'var(--grey-30)' : 'var(--grey-60)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Banner({
  tone, children, onDismiss,
}: { tone: 'success' | 'error'; children: React.ReactNode; onDismiss: () => void }) {
  const success = tone === 'success';
  return (
    <div
      role={success ? 'status' : 'alert'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: success ? 'var(--color-trust)' : 'var(--color-sale-subtle)',
        border: `1px solid ${success ? 'var(--green-20)' : '#fecaca'}`,
        color: success ? 'var(--color-trust-text)' : '#991b1b',
        borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 'var(--spacing-16)',
        fontFamily: 'var(--font-body)', fontSize: '13.5px', lineHeight: 1.5,
      }}
    >
      {success ? <Check size={15} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ flex: 1 }}>{children}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
        <X size={15} />
      </button>
    </div>
  );
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 16, flexWrap: 'wrap', marginBottom: 'var(--spacing-20)',
};

const controlStyle: React.CSSProperties = {
  height: 40, padding: '0 12px',
  border: '1.5px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--black)',
  background: 'var(--grey-0)', boxSizing: 'border-box',
};

/* Borderless, transparent until hovered. Framed icon buttons on a framed row
   inside a framed panel is the nesting the row layout is trying to shed. */
const ghostButtonStyle: React.CSSProperties = {
  // 34px square — above the 24px WCAG 2.2 SC 2.5.8 target minimum.
  width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0,
  borderRadius: 'var(--radius-md)', border: '1px solid transparent',
  background: 'transparent', cursor: 'pointer',
};

/* The status colour carries the meaning; the dot and the click affordance do
   the rest, so no hard border is needed to make it legible. */
const stockPillStyle: React.CSSProperties = {
  height: 30, padding: '0 10px', borderRadius: 'var(--radius-full)',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 700,
  border: '1px solid transparent',
  cursor: 'pointer', whiteSpace: 'nowrap',
};

const stockToneStyle: Record<string, React.CSSProperties> = {
  ok:  { background: 'var(--color-trust)', color: 'var(--color-trust-text)' },
  low: { background: 'var(--color-warn-subtle)', color: '#92400e' },
  out: { background: 'var(--color-sale-subtle)', color: '#991b1b' },
};

const stockDotColor: Record<string, string> = {
  ok: 'var(--color-trust-text)', low: '#b45309', out: '#dc2626',
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)',
  textAlign: 'center', padding: 'var(--spacing-48) 0',
};
