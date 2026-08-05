import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  emptyDraft, productToDraft, validateDraft, slugify, describeError,
  getProduct, createProduct, updateProduct, GRADES,
  type ProductDraft, type ValidationErrors,
} from '../../lib/adminApi';
import ImageManager from './ImageManager';

const CATEGORIES = ['Phones', 'Tablets', 'Accessories', 'Speakers', 'Hearables', 'Playables'];

/**
 * Create / edit a product.
 *
 * `/admin/inventory/new` starts from a blank draft; `/admin/inventory/:id`
 * loads the existing row. The slug is editable only while creating — it is the
 * primary key and the public URL, so changing it later would break every
 * inbound link and orphan the uploaded images filed under it.
 */
export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    getProduct(id!)
      .then(p => {
        if (cancelled) return;
        if (!p) setNotFound(true);
        else setDraft(productToDraft(p));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setSaveError(describeError(err));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isNew]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const found = validateDraft(draft);
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
            <Field label="Brand" error={errors.brand} id="brand" required>
              <input id="field-brand" style={inputStyle} value={draft.brand}
                onChange={e => set('brand', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Model" error={errors.model} id="model" required>
              <input id="field-model" style={inputStyle} value={draft.model}
                onChange={e => set('model', e.target.value)} autoComplete="off" />
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
