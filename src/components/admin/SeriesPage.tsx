import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, Eye, EyeOff, GripVertical, Image as ImageIcon,
  Link as LinkIcon, Loader2, Plus, Trash2, Upload,
} from 'lucide-react';
import {
  listPanels, savePanel, deletePanel, panelId, panelProblems, panelProducts,
  parseWords, joinWords, EMPTY_PANEL, type SeriesPanel,
} from '../../lib/seriesPanels';
import { uploadImage, describeError, isUsableImageUrl, IMAGE_BUCKET } from '../../lib/adminApi';
import { optimizeImage } from '../../lib/imageOptimize';
import { useCatalogue } from '../../context/CatalogueContext';
import { SeriesPanelView } from '../BrandShowcase';

/**
 * The home page's series panels, editable without a deploy.
 *
 * These are the big editorial blocks below the carousel. Adding a Galaxy A
 * panel when the A series lands, or retiring the iPhone 17 one when the 18
 * arrives, used to mean a developer; it is now a form.
 *
 * Two things make this safe to hand over. The rule picking a series' products
 * is plain words rather than an expression, so the worst a mistake can do is
 * match nothing — and a panel matching nothing does not render at all. And
 * the preview is the real panel component fed the real catalogue, so what
 * staff approve here is literally what a visitor gets, down to the products
 * in the rail.
 */
export default function SeriesPage() {
  const [rows, setRows] = useState<SeriesPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await listPanels()); }
    catch (err) { setError(describeError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = (id: string, change: Partial<SeriesPanel>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...change } : r)));

  const addPanel = () => {
    setRows(rs => [...rs, {
      ...EMPTY_PANEL,
      id: panelId('new series'),
      order: rs.length,
      updatedAt: '',
    } as SeriesPanel]);
  };

  const save = async (p: SeriesPanel) => {
    setBusyId(p.id); setError(null); setNotice(null);
    try {
      await savePanel(p);
      setNotice(p.active
        ? `"${p.eyebrow}" saved and live on the home page.`
        : `"${p.eyebrow}" saved. It is off, so the home page does not show it yet.`);
      await load();
    } catch (err) { setError(describeError(err)); }
    finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deletePanel(id);
      setConfirmDelete(null);
      setNotice('Series panel deleted.');
      await load();
    } catch (err) { setError(describeError(err)); }
    finally { setBusyId(null); }
  };

  /** Persist the order of every row whose position changed. */
  const persistOrder = async (next: SeriesPanel[]) => {
    const renumbered = next.map((r, i) => ({ ...r, order: i }));
    setRows(renumbered);
    setError(null);
    try {
      // Only the rows that actually moved, and only ones already saved —
      // a panel still being drafted has nothing stored to reorder.
      const moved = renumbered.filter((r, i) => rows[i]?.id !== r.id && r.updatedAt);
      await Promise.all(moved.map(savePanel));
    } catch (err) { setError(describeError(err)); }
  };

  const moveBy = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    void persistOrder(next);
  };

  /** Drop `dragging` onto the row at `index`. */
  const dropOn = (index: number) => {
    if (!dragging) return;
    const from = rows.findIndex(r => r.id === dragging);
    setDragging(null);
    if (from < 0 || from === index) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    void persistOrder(next);
  };

  return (
    <div className="ops-stack">
      <div className="ops-head">
        <div>
          <p className="ops-eyebrow">Shop front</p>
          <h1 className="ops-title">Series panels</h1>
        </div>
        <button type="button" className="btn btn-primary btn-md" onClick={addPanel}>
          <Plus size={15} /> New series
        </button>
      </div>

      <p className="hl-intro">
        The big blocks down the home page — iPhone 17, Galaxy S, Fold &amp; Flip,
        Pixel. Each one picks its own products by brand and by words in the
        model name, so a new series is a form rather than a developer. Drag a
        panel by its handle to reorder, or use the arrows.
      </p>

      {error && (
        <p role="alert" className="admin-panel ord-fact" style={{ padding: 14, color: 'var(--color-sale)' }}>
          <AlertTriangle size={16} /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-panel ord-fact" style={{ padding: 14 }}>
          <Check size={16} /> {notice}
        </p>
      )}

      {loading && rows.length === 0 && (
        <p className="ord-empty"><Loader2 size={18} className="admin-spin" /> Loading series…</p>
      )}

      {!loading && rows.length === 0 && (
        <div className="admin-panel ord-empty">
          <ImageIcon size={22} />
          <p style={{ margin: 0, maxWidth: 480 }}>
            No series saved yet, so the home page is showing the four built-in
            panels. Add one here and it takes over — the built-ins come back if
            you ever delete them all.
          </p>
        </div>
      )}

      {rows.map((p, i) => (
        <PanelEditor
          key={p.id}
          panel={p}
          index={i}
          first={i === 0}
          last={i === rows.length - 1}
          busy={busyId === p.id}
          confirming={confirmDelete === p.id}
          isDragging={dragging === p.id}
          onDragStart={() => setDragging(p.id)}
          onDragEnd={() => setDragging(null)}
          onDrop={() => dropOn(i)}
          onChange={change => patch(p.id, change)}
          onSave={() => void save(p)}
          onMove={dir => moveBy(i, dir)}
          onAskDelete={() => setConfirmDelete(p.id)}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={() => void remove(p.id)}
          onError={setError}
        />
      ))}
    </div>
  );
}

interface EditorProps {
  panel: SeriesPanel;
  index: number;
  first: boolean;
  last: boolean;
  busy: boolean;
  confirming: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onChange: (change: Partial<SeriesPanel>) => void;
  onSave: () => void;
  onMove: (dir: -1 | 1) => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onError: (message: string) => void;
}

function PanelEditor({
  panel: p, index, first, last, busy, confirming, isDragging,
  onDragStart, onDragEnd, onDrop,
  onChange, onSave, onMove, onAskDelete, onCancelDelete, onDelete, onError,
}: EditorProps) {
  const { products: catalogue } = useCatalogue();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  /**
   * The include/exclude fields keep the text as typed, not the parsed list
   * joined back together.
   *
   * Parsing on every keystroke and re-joining looks equivalent and is not:
   * the moment someone types the space in "Galaxy A" it is trimmed away, the
   * field snaps back to "Galaxy", and the next character gives "GalaxyA". A
   * two-word rule becomes literally untypeable. So the draft is what the
   * field shows and the parsed list is what gets stored.
   */
  const [includeDraft, setIncludeDraft] = useState(() => joinWords(p.include));
  const [excludeDraft, setExcludeDraft] = useState(() => joinWords(p.exclude));

  // Re-seed when the stored list stops corresponding to the draft — a reload
  // after saving, or another edit to the same panel. While someone is typing,
  // the stored list is by construction what the draft parses to, so this
  // never fights them for the caret.
  if (joinWords(parseWords(includeDraft)) !== joinWords(p.include)) {
    setIncludeDraft(joinWords(p.include));
  }
  if (joinWords(parseWords(excludeDraft)) !== joinWords(p.exclude)) {
    setExcludeDraft(joinWords(p.exclude));
  }

  // Recomputed as the rule is typed, so staff see the rule working before
  // they save rather than after a visitor does.
  const matched = useMemo(() => panelProducts(catalogue, p), [catalogue, p]);
  const problems = panelProblems(p);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      // The same compression the product gallery gets — see
      // imageOptimize.ts. A panel's hero image renders large, below the
      // carousel on the home page, and was the one image type in the admin
      // console that skipped this entirely.
      const { file: toUpload } = await optimizeImage(file);
      onChange({ heroImage: await uploadImage(p.id, toUpload, IMAGE_BUCKET) });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That upload did not work.');
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    if (!isUsableImageUrl(raw)) {
      setUrlError('Enter a full http(s) address, or a path beginning with "/".');
      return;
    }
    setUrlError(null);
    setUrlDraft('');
    onChange({ heroImage: raw });
  };

  return (
    <div
      className={isDragging ? 'admin-panel bn-card sp-card sp-card--dragging' : 'admin-panel bn-card sp-card'}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onDrop(); }}
    >
      <div className="bn-card__head">
        {/* Only the handle is draggable: making the whole card draggable
            turns every attempt to select text in a field into a drag. */}
        <span
          className="sp-grip"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-hidden="true"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </span>
        <span className={p.active ? 'ord-chip ord-chip-done' : 'ord-chip ord-chip-topack'}>
          {p.active ? 'Live' : 'Off'}
        </span>
        <strong className="bn-card__title">{p.eyebrow || 'Untitled series'}</strong>
        <span className="sp-count">
          {matched.length === 0
            ? 'No products match'
            : `${matched.length} product${matched.length === 1 ? '' : 's'}`}
        </span>
        <span className="sp-moves">
          <button type="button" className="admin-ghost" disabled={first}
            onClick={() => onMove(-1)} aria-label={`Move ${p.eyebrow || 'series'} up`}>
            <ArrowUp size={14} />
          </button>
          <button type="button" className="admin-ghost" disabled={last}
            onClick={() => onMove(1)} aria-label={`Move ${p.eyebrow || 'series'} down`}>
            <ArrowDown size={14} />
          </button>
        </span>
      </div>

      <div className="sp-body">
        <div className="bn-fields">
          <Field label="Series name" hint="Shown above the headline, and read aloud by screen readers.">
            <input className="input" value={p.eyebrow} maxLength={80}
              placeholder="e.g. Samsung Galaxy A · Everyday flagship"
              onChange={e => onChange({ eyebrow: e.target.value })} />
          </Field>

          <Field label="Headline" hint="Two short lines read better than one long one — press Enter for the second.">
            <textarea className="input" value={p.headline} maxLength={120} rows={2}
              placeholder={"e.g. Flagship feel.\nEveryday price."}
              onChange={e => onChange({ headline: e.target.value })} />
          </Field>

          <Field label="Supporting line" hint="One sentence under the headline.">
            <input className="input" value={p.subline} maxLength={240}
              placeholder="e.g. The camera and screen that matter, without the flagship premium."
              onChange={e => onChange({ subline: e.target.value })} />
          </Field>

          <div className="bn-row">
            <Field label="Button text">
              <input className="input" value={p.ctaLabel} maxLength={40}
                placeholder="e.g. Shop Galaxy A"
                onChange={e => onChange({ ctaLabel: e.target.value })} />
            </Field>
            <Field label="Button link" hint="A path inside the shop, e.g. /products?brand=Samsung">
              <input className="input" value={p.ctaHref} maxLength={200}
                placeholder="/products?brand=Samsung"
                onChange={e => onChange({ ctaHref: e.target.value })} />
            </Field>
          </div>

          {/* ── Which products belong to this series ───────────────── */}
          <fieldset className="sp-rule">
            <legend className="sp-rule__legend">Which products appear</legend>

            <div className="bn-row">
              <Field label="Brand" hint="Exactly as it is on the product. Leave blank for any brand.">
                <input className="input" value={p.brand} maxLength={40}
                  placeholder="e.g. Samsung"
                  onChange={e => onChange({ brand: e.target.value })} />
              </Field>
              <Field label="Sort by">
                <select className="input" value={p.sort}
                  onChange={e => onChange({ sort: e.target.value === 'flagship' ? 'flagship' : 'newest' })}>
                  <option value="newest">Newest first</option>
                  <option value="flagship">Pro and Ultra first</option>
                </select>
              </Field>
            </div>

            <Field
              label="Model contains"
              hint='Any one of these words. Separate with commas — e.g. "Fold, Flip". Leave blank for every model of that brand.'
            >
              <input className="input" value={includeDraft} maxLength={200}
                placeholder="e.g. Galaxy A"
                onChange={e => {
                  setIncludeDraft(e.target.value);
                  onChange({ include: parseWords(e.target.value) });
                }} />
            </Field>

            <Field
              label="But not"
              hint="Words that rule a model out, whatever the line above says. Use this to keep watches and tablets out of a phone series."
            >
              <input className="input" value={excludeDraft} maxLength={200}
                placeholder="e.g. Tab, Watch"
                onChange={e => {
                  setExcludeDraft(e.target.value);
                  onChange({ exclude: parseWords(e.target.value) });
                }} />
            </Field>

            <p className={matched.length === 0 ? 'sp-match sp-match--none' : 'sp-match'}>
              {matched.length === 0 ? (
                <><AlertTriangle size={13} /> Nothing in the catalogue matches, so this panel will not appear.</>
              ) : (
                <><Check size={13} /> {matched.length} product{matched.length === 1 ? '' : 's'}: {matched.slice(0, 4).map(m => m.model).join(', ')}{matched.length > 4 ? '…' : ''}</>
              )}
            </p>
          </fieldset>

          <div className="bn-row">
            <Field label="Tone" hint="Panels usually alternate down the page.">
              <select className="input" value={p.tone}
                onChange={e => onChange({ tone: e.target.value === 'dark' ? 'dark' : 'light' })}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
          </div>

          <div className="bn-field">
            <span className="bn-field__label">Hero image</span>
            <input ref={fileRef} type="file" style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="bn-upload">
              {p.heroImage
                ? <img src={p.heroImage} alt="" className="bn-upload__thumb" />
                : <span className="bn-upload__thumb bn-upload__thumb--empty"><ImageIcon size={16} /></span>}
              <button type="button" className="admin-ghost" disabled={uploading}
                onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 size={14} className="admin-spin" /> : <Upload size={14} />}
                {p.heroImage ? 'Replace' : 'Upload'}
              </button>
              {p.heroImage && (
                <button type="button" className="admin-ghost" onClick={() => onChange({ heroImage: '' })}>
                  Remove
                </button>
              )}
            </div>
            <div className="bn-upload__url">
              <input className="input" value={urlDraft}
                onChange={e => { setUrlDraft(e.target.value); setUrlError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                placeholder="…or paste an image URL"
                aria-label={`${p.eyebrow || 'Series'} hero image: add by URL`} />
              <button type="button" className="admin-ghost" disabled={!urlDraft.trim()} onClick={addUrl}>
                <LinkIcon size={14} /> Use
              </button>
            </div>
            {urlError && (
              <span className="bn-field__hint bn-field__hint--error">
                <AlertTriangle size={12} /> {urlError}
              </span>
            )}
            <span className="bn-field__hint">
              Optional. Without one the panel shows the first product in the series.
            </span>
          </div>
        </div>

        {/* Not a mockup — this is SeriesPanelView, the component the home
            page renders, fed the same catalogue. */}
        <div className="sp-preview">
          <div className="bn-preview__head"><span>Live preview</span></div>
          <div className="sp-preview__frame">
            {matched.length > 0 ? (
              <SeriesPanelView panel={p} products={matched} />
            ) : (
              <p className="bn-preview__empty-note">
                Nothing to preview until the rule above matches a product.
              </p>
            )}
          </div>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="bn-problems">
          {problems.map((msg, n) => (
            <li key={n}><AlertTriangle size={13} /> {msg}</li>
          ))}
        </ul>
      )}

      <div className="sp-foot">
        <button type="button" className="admin-ghost" disabled={busy || problems.length > 0}
          onClick={onSave}>
          {busy ? <Loader2 size={14} className="admin-spin" /> : <Check size={14} />}
          {p.active ? 'Save & put live' : 'Save'}
        </button>
        <button type="button" className="admin-ghost"
          onClick={() => onChange({ active: !p.active })}>
          {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
          {p.active ? 'Switch off' : 'Switch on'}
        </button>
        {confirming ? (
          <>
            <button type="button" className="admin-ghost-danger" onClick={onDelete}>
              <Trash2 size={14} /> Delete for good
            </button>
            <button type="button" className="admin-ghost" onClick={onCancelDelete}>Cancel</button>
          </>
        ) : (
          <button type="button" className="admin-ghost-danger" onClick={onAskDelete}>
            <Trash2 size={14} /> Delete
          </button>
        )}
        <span className="bn-field__hint" style={{ marginLeft: 'auto' }}>Position {index + 1}</span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="bn-field">
      <label className="bn-field__labelwrap">
        <span className="bn-field__label">{label}</span>
        {children}
      </label>
      {hint && <span className="bn-field__hint">{hint}</span>}
    </div>
  );
}
