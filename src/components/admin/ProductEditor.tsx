import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  emptyDraft, productToDraft, validateDraft, slugify, describeError,
  getProduct, createProduct, updateProduct, GRADES,
  listCatalogueVocabulary, snapToCatalogue,
  type ProductDraft, type ValidationErrors, type CatalogueVocabulary,
} from '../../lib/adminApi';
import { useAdmin } from '../../hooks/useAdmin';
import ImageManager from './ImageManager';

const CATEGORIES = ['Phones', 'Tablets', 'Accessories', 'Speakers', 'Hearables', 'Playables'];

/**
 * Create / edit a product.
 *
 * `/admin/inventory/new` starts from a blank draft; `/admin/inventory/:id`
 * loads the existing row. The slug is editable only while creating — it is the
 * primary key and the public URL, so changing it later would break every
 * inbound link and orphan the uploaded images filed under it.
 *
 * Brand and model are suggestion-backed rather than free text, following
 * InventoryManager: staff pick from the catalogue, only a manager may add an
 * entry to it, and what is typed snaps to the catalogue's own spelling. Two
 * free-text boxes are how "iPhone 8" and "iphone  8" became two products, and
 * why src/lib/productSiblings.ts has to normalise spacing and case before it
 * can offer a shopper the other storage sizes of the phone in front of them.
 * Every future feature that groups by model would have to remember the same
 * trick; one rule at the keyboard is cheaper than many at the reader.
 */
export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAdmin();
  const isNew = !id;

  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  // Null until the catalogue has been read, and left null if the read fails.
  // See isNewToCatalogue: nothing known means no opinion, not "nothing valid".
  const [vocabulary, setVocabulary] = useState<CatalogueVocabulary | null>(null);
  // productToDraft drops the audit stamp, because the stamp is written by the
  // data layer on every save and is not the admin's to edit. It is kept here
  // so the footnote can show the record as it was loaded.
  const [savedBy, setSavedBy] = useState<string | undefined>(undefined);
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    getProduct(id!)
      .then(p => {
        if (cancelled) return;
        if (!p) setNotFound(true);
        else {
          setDraft(productToDraft(p));
          setSavedBy(p.updatedBy);
          setSavedAt(p.updatedAt);
        }
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setSaveError(describeError(err));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isNew]);

  useEffect(() => {
    let cancelled = false;
    listCatalogueVocabulary()
      .then(v => { if (!cancelled) setVocabulary(v); })
      // Swallowed on purpose. The suggestions are a convenience and the gate
      // below stays silent without them, so a catalogue that will not load
      // costs the admin a dropdown rather than the ability to save at all.
      .catch(() => { /* no vocabulary, no opinion */ });
    return () => { cancelled = true; };
  }, []);

  // Derive the slug from brand + model until the admin edits it by hand.
  useEffect(() => {
    if (!isNew || slugTouched) return;
    setDraft(d => ({ ...d, id: slugify(d.brand, d.model) }));
  }, [draft.brand, draft.model, isNew, slugTouched]);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft(d => ({ ...d, [key]: value }));

  const saving_disabled = saving || loading;

  const discount = useMemo(() => {
    if (!draft.originalPrice || draft.originalPrice <= draft.price) return null;
    return Math.round((1 - draft.price / draft.originalPrice) * 100);
  }, [draft.price, draft.originalPrice]);

  // Null for a new product, and for a record written before the stamp
  // existed — see auditNote.
  const audit = isNew ? null : auditNote(savedBy, savedAt);

  const mayExtend = can('catalogue:extend');
  const knownBrands = vocabulary?.brands ?? [];
  // Models are offered per brand, because "Galaxy S23" under Apple is noise
  // rather than a suggestion.
  const knownModels = vocabulary?.modelsByBrand[draft.brand.trim().toLowerCase()] ?? [];

  const brandIsNew = isNewToCatalogue(draft.brand, knownBrands);
  const modelIsNew = isNewToCatalogue(draft.model, knownModels);

  /**
   * Replace what was typed with the catalogue's spelling of it.
   *
   * On blur rather than on every keystroke: correcting someone mid-word is
   * what makes an autocomplete infuriating, and "iPhone 1" has to survive
   * being typed on the way to "iPhone 16" even though it is a prefix of an
   * entry that already exists.
   */
  const snapOnBlur = (key: 'brand' | 'model', known: readonly string[]) =>
    set(key, snapToCatalogue(draft[key], known));

  /**
   * Refuse a brand or model the catalogue has never carried, unless the
   * person may extend it.
   *
   * A value nothing in the catalogue matches is a new catalogue entry, and
   * whether that is allowed is a question about who is typing, which is why
   * snapToCatalogue normalises without ever rejecting. A manager gets the
   * note under the field instead; staff get this, naming what they typed,
   * because "invalid brand" leaves someone staring at a word that looks
   * perfectly correct to them.
   */
  const catalogueGate = (): ValidationErrors => {
    if (mayExtend) return {};
    const out: ValidationErrors = {};
    if (brandIsNew) out.brand = refuseNewEntry('brand', draft.brand);
    if (modelIsNew) out.model = refuseNewEntry('model', draft.model);
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const found = { ...validateDraft(draft), ...catalogueGate() };
    setErrors(found);
    if (Object.keys(found).length) {
      // Move focus to the first problem so keyboard and screen-reader users
      // are not left guessing why nothing happened.
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      if (isNew) await createProduct(draft);
      else await updateProduct(draft);
      navigate('/admin/inventory', { state: { flash: `${draft.brand} ${draft.model} saved.` } });
    } catch (err) {
      setSaveError(describeError(err));
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <Shell title="Product not found">
        <p style={bodyStyle}>No product with the slug <code>{id}</code>.</p>
        <Link to="/admin/inventory" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
          Back to inventory
        </Link>
      </Shell>
    );
  }

  if (loading) {
    return <Shell title="Loading…"><p style={bodyStyle} aria-live="polite">Fetching the product…</p></Shell>;
  }

  return (
    <Shell
      title={isNew ? 'Add a product' : `Edit ${draft.brand} ${draft.model}`}
      action={!isNew && (
        <a
          href={`/product/${draft.id}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none' }}
        >
          View live <ExternalLink size={13} />
        </a>
      )}
    >
      <form onSubmit={handleSubmit} noValidate>
        {saveError && (
          <div role="alert" style={alertStyle}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{saveError}</span>
          </div>
        )}

        <Section title="Identity">
          <Row>
            <Field
              label="Brand"
              error={errors.brand}
              id="brand"
              required
              hint={mayExtend && brandIsNew ? 'New brand — will be added to the catalogue.' : undefined}
            >
              {/* A native datalist rather than a custom listbox: one element,
                  keyboard-accessible without any ARIA of our own to get wrong,
                  and it still lets a manager type something that is not on it. */}
              <input id="field-brand" style={inputStyle} value={draft.brand} list="catalogue-brands"
                onChange={e => set('brand', e.target.value)}
                onBlur={() => snapOnBlur('brand', knownBrands)} autoComplete="off" />
              <datalist id="catalogue-brands">
                {knownBrands.map(b => <option key={b} value={b} />)}
              </datalist>
            </Field>
            <Field
              label="Model"
              error={errors.model}
              id="model"
              required
              hint={mayExtend && modelIsNew ? 'New model — will be added to the catalogue.' : undefined}
            >
              <input id="field-model" style={inputStyle} value={draft.model} list="catalogue-models"
                onChange={e => set('model', e.target.value)}
                onBlur={() => snapOnBlur('model', knownModels)} autoComplete="off" />
              <datalist id="catalogue-models">
                {knownModels.map(m => <option key={m} value={m} />)}
              </datalist>
            </Field>
          </Row>

          <Field
            label="URL slug"
            error={errors.id}
            id="id"
            required
            hint={isNew
              ? 'Auto-filled from brand and model. The public URL will be /product/<slug>.'
              : 'Fixed after creation — changing it would break existing links and orphan the images.'}
          >
            <input
              id="field-id"
              style={{ ...inputStyle, ...(isNew ? {} : disabledInputStyle) }}
              value={draft.id}
              readOnly={!isNew}
              onChange={e => { setSlugTouched(true); set('id', e.target.value); }}
              autoComplete="off"
            />
          </Field>

          <Row>
            <Field label="Category" error={errors.category} id="category" required>
              <select id="field-category" style={inputStyle} value={draft.category}
                onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Storage" id="storage" hint="e.g. 256GB. Leave blank if not applicable.">
              <input id="field-storage" style={inputStyle} value={draft.storage ?? ''}
                onChange={e => set('storage', e.target.value)} autoComplete="off" />
            </Field>
          </Row>
        </Section>

        <Section title="Pricing & stock">
          <Row>
            <Field label="Selling price (£)" error={errors.price} id="price" required>
              <input id="field-price" style={inputStyle} type="number" min="0" step="0.01"
                value={draft.price || ''} onChange={e => set('price', parseFloat(e.target.value) || 0)} />
            </Field>
            <Field
              label="Was price (£)"
              error={errors.originalPrice}
              id="originalPrice"
              required
              hint={discount !== null ? `Shows as “save ${discount}%”.` : undefined}
            >
              <input id="field-originalPrice" style={inputStyle} type="number" min="0" step="0.01"
                value={draft.originalPrice || ''} onChange={e => set('originalPrice', parseFloat(e.target.value) || 0)} />
            </Field>
          </Row>

          <Row>
            <Field label="Stock" error={errors.stock} id="stock" required hint="0 marks it sold out on the storefront.">
              <input id="field-stock" style={inputStyle} type="number" min="0" step="1"
                value={draft.stock} onChange={e => set('stock', parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="Condition grade" error={errors.grade} id="grade" required>
              <select id="field-grade" style={inputStyle} value={draft.grade}
                onChange={e => set('grade', e.target.value as ProductDraft['grade'])}>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Condition & cover">
          <Row>
            <Field label="Battery health (%)" error={errors.batteryHealth} id="batteryHealth" hint="Blank for non-battery items.">
              <input id="field-batteryHealth" style={inputStyle} type="number" min="0" max="100" step="1"
                value={draft.batteryHealth ?? ''}
                onChange={e => set('batteryHealth', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} />
            </Field>
            <Field label="Warranty (months)" error={errors.warrantyMonths} id="warrantyMonths" required>
              <input id="field-warrantyMonths" style={inputStyle} type="number" min="0" step="1"
                value={draft.warrantyMonths} onChange={e => set('warrantyMonths', parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="Returns (days)" error={errors.returnDays} id="returnDays" required>
              <input id="field-returnDays" style={inputStyle} type="number" min="0" step="1"
                value={draft.returnDays} onChange={e => set('returnDays', parseInt(e.target.value, 10) || 0)} />
            </Field>
          </Row>

          <label style={checkboxRowStyle}>
            <input type="checkbox" checked={draft.isCertified}
              onChange={e => set('isCertified', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--brand-cyan)' }} />
            <span>LeHart Certified — shows the certified badge on the card and product page</span>
          </label>
        </Section>

        <Section title="Copy">
          <Field label="Description" id="description" hint="Left blank, the storefront generates one from the specs.">
            <textarea id="field-description" style={{ ...inputStyle, minHeight: 96, paddingTop: 10, resize: 'vertical' }}
              value={draft.description ?? ''} onChange={e => set('description', e.target.value)} />
          </Field>
          <Field label="Condition notes" id="conditionDescription" hint="What the buyer should expect from this grade.">
            <textarea id="field-conditionDescription" style={{ ...inputStyle, minHeight: 72, paddingTop: 10, resize: 'vertical' }}
              value={draft.conditionDescription ?? ''} onChange={e => set('conditionDescription', e.target.value)} />
          </Field>
          <Row>
            <Field label="Colour options" id="colorOptions" hint="Comma separated, e.g. Midnight, Starlight.">
              <input id="field-colorOptions" style={inputStyle}
                value={(draft.colorOptions ?? []).join(', ')}
                onChange={e => set('colorOptions', splitList(e.target.value))} />
            </Field>
            <Field label="Storage options" id="storageOptions" hint="Comma separated, e.g. 128GB, 256GB.">
              <input id="field-storageOptions" style={inputStyle}
                value={(draft.storageOptions ?? []).join(', ')}
                onChange={e => set('storageOptions', splitList(e.target.value))} />
            </Field>
          </Row>
        </Section>

        <Section title="Imagery">
          <ImageManager
            productId={draft.id}
            images={galleryOf(draft)}
            onChange={next => setDraft(d => ({ ...d, galleryImages: next, imageUrl: next[0] ?? '' }))}
            disabled={saving}
          />
        </Section>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: 'var(--spacing-32)' }}>
          <button type="submit" className="btn btn-buy btn-lg" disabled={saving_disabled}>
            {saving ? <><Loader2 size={16} className="admin-spin" /> Saving…</> : <><Save size={16} /> {isNew ? 'Create product' : 'Save changes'}</>}
          </button>
          <Link to="/admin/inventory" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>

        {audit && (
          <p className="ops-audit" style={{ marginTop: 'var(--spacing-16)' }}>{audit}</p>
        )}
      </form>
    </Shell>
  );
}

/** The gallery is the single source of truth; imageUrl mirrors its first entry. */
function galleryOf(draft: ProductDraft): string[] {
  if (draft.galleryImages?.length) return draft.galleryImages;
  return draft.imageUrl ? [draft.imageUrl] : [];
}

function splitList(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Whether this value would add an entry the catalogue has never carried.
 *
 * Asked through snapToCatalogue rather than with a second comparison of its
 * own, so there is exactly one idea of when two spellings are the same
 * thing: it returns the catalogue's entry when it recognises what was typed,
 * and the typed text otherwise, so membership is a plain string check.
 *
 * An empty list of known values answers false, every time. That covers the
 * moment before the catalogue has loaded, a shop whose catalogue is genuinely
 * empty, and a read that failed — and in all three "we do not know" is the
 * honest answer. Refusing every save because a read failed would present an
 * unreachable Firestore as though the admin lacked permission, which is the
 * kind of wrong diagnosis that costs an afternoon.
 *
 * An empty value is nobody's new entry either; that is validateDraft's
 * "Required." to report, and two messages under one field say less than one.
 */
function isNewToCatalogue(value: string, known: readonly string[]): boolean {
  const typed = value.trim();
  if (!typed || !known.length) return false;
  return !known.includes(snapToCatalogue(typed, known));
}

/** Why the save stopped, and the two ways out of it. */
function refuseNewEntry(what: 'brand' | 'model', typed: string): string {
  return `The catalogue has no ${what} “${typed.trim()}”. Pick one of the suggestions, or ask a manager to add it.`;
}

/**
 * Who last saved this record, and when.
 *
 * Null unless there is something real to print. A product created before the
 * stamp existed carries neither field; a document echoed back from a write
 * that has not landed carries serverTimestamp()'s sentinel, which
 * productMapper's isoOrUndefined deliberately turns into nothing rather than
 * into 1970; and adminApi writes the literal string "unknown" when it cannot
 * name the signed-in user. "Last saved by unknown on 1 Jan 1970" is worse
 * than a blank space, because it reads as a fact about the record.
 */
function auditNote(by?: string, at?: string): string | null {
  const who = by?.trim();
  if (!who || who === 'unknown') return null;

  const when = at ? new Date(at) : null;
  if (!when || Number.isNaN(when.getTime())) return `Last saved by ${who}`;
  return `Last saved by ${who} · ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// ── Layout helpers ─────────────────────────────────────────────

function Shell({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <Link to="/admin/inventory" style={backLinkStyle}>
        <ArrowLeft size={15} /> Inventory
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '10px 0 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(21px, 3vw, 28px)', fontWeight: 900, color: 'var(--black)', margin: 0 }}>
          {title}
        </h1>
        {action}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={sectionStyle}>
      <legend style={legendStyle}>{title}</legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="admin-field-row">{children}</div>;
}

function Field({
  label, id, children, error, hint, required,
}: {
  label: string; id: string; children: React.ReactNode;
  error?: string; hint?: string; required?: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label htmlFor={`field-${id}`} style={fieldLabelStyle}>
        {label}{required && <span style={{ color: 'var(--color-sale)' }}> *</span>}
      </label>
      {children}
      {error
        ? <p role="alert" style={fieldErrorStyle}>{error}</p>
        : hint ? <p style={fieldHintStyle}>{hint}</p> : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 12px',
  border: '1.5px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)',
  background: 'var(--grey-0)', boxSizing: 'border-box',
};

const disabledInputStyle: React.CSSProperties = {
  background: 'var(--grey-5)', color: 'var(--grey-50)', cursor: 'not-allowed',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)',
};

const fieldHintStyle: React.CSSProperties = {
  margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', lineHeight: 1.45,
};

const fieldErrorStyle: React.CSSProperties = {
  margin: '6px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#b91c1c', fontWeight: 600, lineHeight: 1.45,
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-20)', marginBottom: 'var(--spacing-20)', minWidth: 0,
};

const legendStyle: React.CSSProperties = {
  padding: '0 8px',
  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 800,
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
  color: 'var(--grey-60)', textDecoration: 'none',
};

const alertStyle: React.CSSProperties = {
  display: 'flex', gap: 10, alignItems: 'flex-start',
  background: 'var(--color-sale-subtle)', border: '1px solid #fecaca',
  borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 'var(--spacing-20)',
  fontFamily: 'var(--font-body)', fontSize: '13.5px', color: '#991b1b', lineHeight: 1.5,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', marginBottom: 18,
};
