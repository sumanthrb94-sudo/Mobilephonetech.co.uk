import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, Check, X, AlertTriangle, Loader2, PackageX, RefreshCw,
} from 'lucide-react';
import {
  listInventory, listBrands, setStock, deleteProduct, describeError,
  LOW_STOCK_THRESHOLD, type InventoryQuery,
} from '../../lib/adminApi';
import type { Product } from '../../types';
import Modal from '../ui/Modal';

const PAGE_SIZE = 25;

/**
 * Back-store inventory console: search, filter, inline stock edits, and
 * add/delete. Stock is editable in the row because adjusting it is the single
 * most frequent job — making that a round trip through the full editor would
 * be the wrong default.
 */
export default function InventoryPage() {
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
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

  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { products: rows, total: count } = await listInventory({
        search: debouncedSearch, brand, stockFilter, sort, page, pageSize: PAGE_SIZE,
      });
      setProducts(rows);
      setTotal(count);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, brand, stockFilter, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listBrands().then(setBrands).catch(() => setBrands([])); }, []);

  const handleStockSaved = (id: string, stock: number) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, stock } : p)));
    setNotice('Stock updated.');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDelete.id);
      setNotice(`${pendingDelete.brand} ${pendingDelete.model} deleted.`);
      setPendingDelete(null);
      // Stepping back a page avoids stranding the admin on an empty last page.
      if (products.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (err) {
      setError(describeError(err));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

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

      {/* ── Filters ── */}
      <div className="admin-filter-bar">
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
          <p style={{ margin: 0 }}>No products match those filters.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {products.map(p => (
            <InventoryRow
              key={p.id}
              product={p}
              onStockSaved={handleStockSaved}
              onDeleteRequest={() => setPendingDelete(p)}
              onError={setError}
            />
          ))}
        </ul>
      )}

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

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => !deleting && setPendingDelete(null)}
        title="Delete this product?"
      >
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14.5px', color: 'var(--grey-70)', lineHeight: 1.6, margin: '0 0 8px' }}>
          <strong style={{ color: 'var(--black)' }}>{pendingDelete?.brand} {pendingDelete?.model}</strong> will be
          removed from the storefront, along with its variants and uploaded images.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: '0 0 20px' }}>
          This cannot be undone. To take it off sale temporarily, set its stock to 0 instead.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-md" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-md"
            onClick={confirmDelete}
            disabled={deleting}
            style={{ background: 'var(--color-sale)', borderColor: 'var(--color-sale)', color: '#fff' }}
          >
            {deleting ? <><Loader2 size={15} className="admin-spin" /> Deleting…</> : <><Trash2 size={15} /> Delete permanently</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────

function InventoryRow({
  product, onStockSaved, onDeleteRequest, onError,
}: {
  product: Product;
  onStockSaved: (id: string, stock: number) => void;
  onDeleteRequest: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(String(product.stock)); }, [product.stock]);

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

  return (
    <li className="admin-row">
      <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--grey-5)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <PackageX size={18} style={{ color: 'var(--grey-30)' }} />}
      </div>

      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 700, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.brand} {product.model}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: 'var(--grey-50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.grade}{product.storage ? ` · ${product.storage}` : ''} · {product.id}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)', flexShrink: 0, minWidth: 68 }}>
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
            {product.stock} in stock
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <Link
          to={`/admin/inventory/${product.id}`}
          aria-label={`Edit ${product.brand} ${product.model}`}
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', padding: '0 10px' }}
        >
          <Pencil size={14} />
        </Link>
        <IconButton label={`Delete ${product.brand} ${product.model}`} onClick={onDeleteRequest} danger>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </li>
  );
}

function IconButton({
  children, label, onClick, disabled, danger,
}: {
  children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        // 34px square — above the 24px WCAG 2.2 SC 2.5.8 target minimum.
        width: 34, height: 34, display: 'grid', placeItems: 'center',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${danger ? '#fecaca' : 'var(--grey-20)'}`,
        background: danger ? 'var(--color-sale-subtle)' : 'var(--grey-0)',
        color: disabled ? 'var(--grey-30)' : danger ? 'var(--color-sale)' : 'var(--grey-60)',
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

const stockPillStyle: React.CSSProperties = {
  height: 34, padding: '0 12px', borderRadius: 'var(--radius-full)',
  fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap',
};

const stockToneStyle: Record<string, React.CSSProperties> = {
  ok:  { background: 'var(--color-trust)', border: '1.5px solid var(--green-20)', color: 'var(--color-trust-text)' },
  low: { background: 'var(--color-warn-subtle)', border: '1.5px solid #fde68a', color: '#92400e' },
  out: { background: 'var(--color-sale-subtle)', border: '1.5px solid #fecaca', color: '#991b1b' },
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)',
  textAlign: 'center', padding: 'var(--spacing-48) 0',
};
