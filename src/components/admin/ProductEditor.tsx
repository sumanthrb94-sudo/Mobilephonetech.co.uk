import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  emptyDraft, productToDraft, validateDraft, slugify, describeError,
  getProduct, createProduct, updateProduct, currentActor, GRADES,
  splitProductByColour, SplitError,
  type ProductDraft, type ValidationErrors,
} from '../../lib/adminApi';
import {
  listCatalogueModels, listModelRequests, brandsOf, modelsFor, findCatalogueModel,
  addCatalogueModel, requestModel, modelNameProblem, CatalogueError,
  type CatalogueModel, type ModelRequest,
} from '../../lib/catalogue';
import {
  initialSplitRows, splitProblems, parsedSplitRows, totalSplitStock,
  type ColourSplitRow,
} from '../../lib/productColourSplit';
import { useAdmin } from '../../hooks/useAdmin';
import ImageManager from './ImageManager';

const CATEGORIES = ['Phones', 'Tablets', 'Accessories', 'Speakers', 'Hearables', 'Playables'];

// Option values that are instructions rather than catalogue entries. Entry
// ids are slugs joined by a double underscore and never start with one, so
// these cannot collide with a real model.
const NEW_BRAND = '__new-brand__';
const ADD_MODEL = '__add-model__';
const OTHER_BRAND = '__other-brand__';

type CatalogueState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; models: CatalogueModel[] };

/** A listing's brand, model and catalogue link as they were when it was opened. */
interface LoadedIdentity {
  brand: string;
  model: string;
  catalogueModelId?: string;
}

/**
 * Create / edit a product.
 *
 * `/admin/inventory/new` starts from a blank draft; `/admin/inventory/:id`
 * loads the existing row. The slug is editable only while creating — it is the
 * primary key and the public URL, so changing it later would break every
 * inbound link and orphan the uploaded images filed under it.
 *
 * Brand and model are chosen from the catalogue (src/lib/catalogue.ts), never
 * typed. The owner's rule is that staff may only select a model the shop
 * already has, and that a missing one becomes a request for a manager rather
 * than a new model. A free-text box that said no at Save was not that rule:
 * it let someone type "iPhone 8 128GB", which the product page treats as a
 * different phone from "iPhone 8" and so offers no other sizes of, and it
 * told them only at the very end. Two selects cannot be typed wrong.
 *
 * Choosing a model writes the entry's own brand, model and id into the draft
 * together. The database refuses a staff listing whose brand and model are
 * not spelt exactly as the entry it names, so anything assembled any other
 * way would be a permission error at Save.
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
  // productToDraft drops the audit stamp, because the stamp is written by the
  // data layer on every save and is not the admin's to edit. It is kept here
  // so the footnote can show the record as it was loaded.
  const [savedBy, setSavedBy] = useState<string | undefined>(undefined);
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  // Kept apart from the draft so the editor can tell an identity nobody has
  // touched from one somebody changed. The database only checks the catalogue
  // when brand, model or the link change, and this is how the editor makes
  // the same distinction.
  const [loaded, setLoaded] = useState<LoadedIdentity | null>(null);

  const [catalogue, setCatalogue] = useState<CatalogueState>({ status: 'loading' });
  // Bumped by Retry and "Check again" to read the catalogue afresh.
  const [catalogueRead, setCatalogueRead] = useState(0);
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  // A manager's brand or model that is not in the catalogue yet: null when
  // they are choosing from the list, the text typed so far when adding.
  const [newBrand, setNewBrand] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<string | null>(null);
  // A manager choosing a catalogue model for a listing whose own is not in it.
  const [relinking, setRelinking] = useState(false);

  const mayExtend = can('catalogue:extend');
  // Managers never queue a request for themselves: they can simply add it.
  const mayRequest = !mayExtend && can('catalogue:request');
  // Splitting archives the listing it runs on — the same authority as the
  // Archive button on the inventory list, so it needs the same capability.
  const maySplit = can('products:archive');

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
          setLoaded({ brand: p.brand, model: p.model, catalogueModelId: p.catalogueModelId });
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
    setCatalogue({ status: 'loading' });
    listCatalogueModels()
      .then(models => { if (!cancelled) setCatalogue({ status: 'ready', models }); })
      .catch(err => { if (!cancelled) setCatalogue({ status: 'failed', message: describeError(err) }); });
    return () => { cancelled = true; };
  }, [catalogueRead]);

  useEffect(() => {
    if (!mayRequest) return;
    let cancelled = false;
    listModelRequests()
      .then(r => { if (!cancelled) setRequests(r); })
      // Swallowed on purpose. The list only answers "what happened to my
      // request?", and without it the worst that follows is a second request
      // for a model someone already asked for, which the manager sees sitting
      // beside the first. Neither listing nor asking should stop over it.
      .catch(() => { /* no history shown */ });
    return () => { cancelled = true; };
  }, [mayRequest, catalogueRead]);

  // A listing saved before the catalogue existed, whose model the catalogue
  // does carry, is linked to that entry as soon as both have loaded. Without
  // the link it stays outside the rule, and its own spelling — "iphone  8"
  // rather than "iPhone 8" — keeps it apart from its other sizes. A listing
  // already linked is brought to its entry's spelling the same way. A retired
  // match is left alone: linking to it would be refused by the database.
  useEffect(() => {
    if (catalogue.status !== 'ready' || !loaded) return;
    const match = loaded.catalogueModelId
      ? catalogue.models.find(m => m.id === loaded.catalogueModelId)
      : findCatalogueModel(catalogue.models, loaded.brand, loaded.model);
    if (!match || match.retiredAt) return;
    setDraft(d => {
      const untouchedNow = d.brand === loaded.brand && d.model === loaded.model
        && d.catalogueModelId === loaded.catalogueModelId;
      const matches = d.brand === match.brand && d.model === match.model && d.catalogueModelId === match.id;
      return untouchedNow && !matches
        ? { ...d, brand: match.brand, model: match.model, catalogueModelId: match.id }
        : d;
    });
  }, [catalogue, loaded]);

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

  const models = catalogue.status === 'ready' ? catalogue.models : [];
  const brands = brandsOf(models);
  const entryById = (entryId?: string) => (entryId ? models.find(m => m.id === entryId) : undefined);

  // The entry the listing was for when it was opened: by its link, or for a
  // listing older than the catalogue, by the brand and model it carries.
  const loadedEntry = loaded
    ? (loaded.catalogueModelId
      ? entryById(loaded.catalogueModelId)
      : findCatalogueModel(models, loaded.brand, loaded.model))
    : undefined;
  const untouched = !!loaded
    && draft.brand === loaded.brand
    && draft.model === loaded.model
    && draft.catalogueModelId === loaded.catalogueModelId;
  // What the selects show. An untouched listing shows its own entry even
  // when the draft has no link to it, which is how a retired entry on an old
  // listing is displayed without being written.
  const current = entryById(draft.catalogueModelId) ?? (untouched ? loadedEntry : undefined);

  // An existing listing whose model the catalogue does not carry. Its brand
  // and model are shown but not offered for change, and left exactly as they
  // are in the draft, so a price or stock edit saves without the catalogue
  // being consulted at all.
  const unlisted = !isNew && catalogue.status === 'ready' && !loadedEntry && !relinking;

  const brandValue = newBrand !== null ? NEW_BRAND : current?.brand ?? draft.brand;
  // A retired entry is not pickable, so the helpers leave it out; the listing
  // that already uses it still has to be able to show it.
  const brandOptions = current && !brands.includes(current.brand)
    ? [...brands, current.brand].sort((a, b) => a.localeCompare(b))
    : brands;
  const modelOptions = newBrand !== null ? [] : modelsFor(models, brandValue);
  if (current?.retiredAt && current.brand === brandValue && !modelOptions.some(m => m.id === current.id)) {
    modelOptions.push(current);
  }
  const modelValue = newModel !== null ? ADD_MODEL : current?.id ?? '';

  const linkingOnSave = !!loaded && !loaded.catalogueModelId && !!current && !current.retiredAt
    && draft.catalogueModelId === current.id;

  /** Brand, model and the catalogue link change together or not at all. */
  const setIdentity = (brand: string, model: string, catalogueModelId?: string) =>
    setDraft(d => ({ ...d, brand, model, catalogueModelId }));

  const chooseBrand = (value: string) => {
    if (value === NEW_BRAND) {
      // A brand with no models yet has only one model option: a new one.
      setNewBrand('');
      setNewModel('');
      setIdentity('', '');
      return;
    }
    setNewBrand(null);
    setNewModel(null);
    setIdentity(value, '');
  };

  const chooseModel = (value: string) => {
    if (value === ADD_MODEL) {
      setNewModel('');
      setIdentity(brandValue, '');
      return;
    }
    setNewModel(null);
    const entry = entryById(value);
    if (entry) setIdentity(entry.brand, entry.model, entry.id);
  };

  const typeNewBrand = (value: string) => {
    setNewBrand(value);
    setDraft(d => ({ ...d, brand: value, catalogueModelId: undefined }));
  };

  const typeNewModel = (value: string) => {
    setNewModel(value);
    setDraft(d => ({ ...d, model: value, catalogueModelId: undefined }));
  };

  const startRelinking = () => {
    if (!loaded) return;
    setRelinking(true);
    setIdentity(brands.find(b => sameName(b, loaded.brand)) ?? '', '');
  };

  const keepAsItWas = () => {
    if (!loaded) return;
    setRelinking(false);
    setNewBrand(null);
    setNewModel(null);
    setIdentity(loaded.brand, loaded.model, loaded.catalogueModelId);
  };

  /**
   * What stops a save on brand and model, in the same shape as validateDraft
   * so it lands under the field like every other problem.
   *
   * A catalogue model is required whenever the identity is new or has been
   * changed. An existing listing nobody has touched needs nothing, because
   * the database does not check what did not change, and refusing here would
   * stop a stock edit on a listing whose model the catalogue simply lacks.
   */
  const identityErrors = (): ValidationErrors => {
    const out: ValidationErrors = {};
    if (newBrand !== null && !newBrand.trim()) out.newBrand = 'Name the brand.';
    else if (!draft.brand.trim()) out.brand = 'Choose a brand.';

    if (newModel !== null) {
      const problem = modelNameProblem(newModel);
      if (problem) out.newModel = problem;
      return out;
    }

    const changed = !loaded || draft.brand !== loaded.brand || draft.model !== loaded.model;
    if (!draft.catalogueModelId && (changed || !draft.model.trim())) {
      out.model = 'Choose a model from the catalogue.';
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const identity = identityErrors();
    const rest = validateDraft(draft);
    // Brand and model are judged above, against the catalogue. validateDraft's
    // "Required." would be a second message under the same field saying less.
    delete rest.brand;
    delete rest.model;
    // The slug of a new listing is made from its model, so a missing model
    // reported again as a missing slug is one problem counted twice.
    if (isNew && !slugTouched && Object.keys(identity).length) delete rest.id;
    const found = { ...identity, ...rest };
    setErrors(found);
    if (Object.keys(found).length) {
      // Move focus to the first problem so keyboard and screen-reader users
      // are not left guessing why nothing happened.
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      let toSave = draft;
      if (newModel !== null) {
        // The catalogue entry first, so the listing is saved against the
        // entry as the catalogue spells it. If the listing then fails, the
        // model is still there and already selected, and Save again does not
        // add it twice.
        const brand = brands.find(b => sameName(b, draft.brand)) ?? draft.brand.trim();
        const entry = await addCatalogueModel(brand, newModel, models);
        setCatalogue(c => (c.status === 'ready'
          ? { ...c, models: [...c.models.filter(m => m.id !== entry.id), entry] }
          : c));
        setNewBrand(null);
        setNewModel(null);
        toSave = {
          ...draft,
          brand: entry.brand,
          model: entry.model,
          catalogueModelId: entry.id,
          id: isNew && !slugTouched ? slugify(entry.brand, entry.model) : draft.id,
        };
        setDraft(toSave);
      }
      if (isNew) await createProduct(toSave);
      else await updateProduct(toSave);
      navigate('/admin/inventory', { state: { flash: `${toSave.brand} ${toSave.model} saved.` } });
    } catch (err) {
      setSaveError(err instanceof CatalogueError ? err.message : describeError(err));
      setSaving(false);
    }
  };

  // The split leaves this listing archived, so there is nothing left on this
  // page to keep editing — the same destination and the same flash pattern
  // as an ordinary save.
  const handleSplit = (message: string) => navigate('/admin/inventory', { state: { flash: message } });

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

  const me = currentActor();
  const myRequests = requests
    .filter(r => r.requestedBy === me && r.status !== 'approved')
    .slice(0, 5);
  const openRequests = requests.filter(r => r.status === 'open');

  const retry = () => setCatalogueRead(n => n + 1);

  const identityRow = () => {
    if (catalogue.status === 'failed') {
      return (
        <>
          {isNew
            ? <DisabledSelects label="Unavailable" errors={errors} />
            : <Row><Fixed label="Brand" value={draft.brand} /><Fixed label="Model" value={draft.model} /></Row>}
          <div role="alert" style={{ ...alertStyle, marginBottom: 0, flexWrap: 'wrap' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: '1 1 220px' }}>
              Could not load the catalogue: {catalogue.message}{' '}
              {isNew
                ? 'A new listing needs a model from it, so try again.'
                : 'Brand and model cannot be changed until it loads, but everything else on this listing still saves.'}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>Retry</button>
          </div>
        </>
      );
    }

    if (catalogue.status === 'loading') return <DisabledSelects label="Loading…" errors={errors} />;

    if (unlisted) {
      return (
        <>
          <Row><Fixed label="Brand" value={draft.brand} /><Fixed label="Model" value={draft.model} /></Row>
          <p style={noteStyle}>
            “{draft.brand} {draft.model}” is not in the catalogue yet, so it is shown here but cannot be
            changed. Everything else on this listing saves as normal.{' '}
            {mayExtend
              ? 'Add or import the model on the Catalogue page, or choose the catalogue model this listing should be.'
              : 'A manager needs to add or import this model; you can ask for it below.'}
          </p>
          {mayExtend && (
            <div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={startRelinking}>
                Choose a catalogue model
              </button>
            </div>
          )}
        </>
      );
    }

    const empty = brandOptions.length === 0;

    return (
      <>
        <Row>
          <Field label="Brand" error={errors.brand} id="brand" required>
            {/* Native selects rather than a custom listbox: one element each,
                keyboard-accessible without any ARIA of our own to get wrong. */}
            <select
              id="field-brand"
              style={{ ...inputStyle, ...(empty && !mayExtend ? disabledInputStyle : {}) }}
              value={brandValue}
              disabled={empty && !mayExtend}
              onChange={e => chooseBrand(e.target.value)}
            >
              <option value="" disabled>{empty ? 'No models yet' : 'Choose a brand'}</option>
              {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
              {mayExtend && <option value={NEW_BRAND}>+ New brand…</option>}
            </select>
            {newBrand !== null && (
              <div style={{ marginTop: 10 }}>
                <Field
                  label="New brand name"
                  id="newBrand"
                  error={errors.newBrand}
                  hint="Adds this brand to the catalogue for everyone, not just this listing."
                >
                  <input id="field-newBrand" style={inputStyle} value={newBrand} autoComplete="off"
                    onChange={e => typeNewBrand(e.target.value)} />
                </Field>
              </div>
            )}
          </Field>
          <Field
            label="Model"
            error={errors.model}
            id="model"
            required
            hint={current?.retiredAt
              ? 'Retired from the catalogue. This listing keeps it; new listings cannot choose it.'
              : linkingOnSave && current
                ? <>
                    Saved before the catalogue existed. Will be linked to the catalogue entry <em>{current.model}</em> when
                    you save{loaded && loaded.model !== current.model && <>, spelt the catalogue’s way rather than “{loaded.model}”</>}.
                  </>
                : undefined}
          >
            <select
              id="field-model"
              style={{ ...inputStyle, ...(!brandValue ? disabledInputStyle : {}) }}
              value={modelValue}
              disabled={!brandValue}
              onChange={e => chooseModel(e.target.value)}
            >
              {newBrand === null && <option value="" disabled>{brandValue ? 'Choose a model' : 'Choose a brand first'}</option>}
              {modelOptions.map(m => (
                <option key={m.id} value={m.id}>{m.model}{m.retiredAt ? ' (retired)' : ''}</option>
              ))}
              {mayExtend && <option value={ADD_MODEL}>+ Add a model…</option>}
            </select>
            {newModel !== null && (
              <div style={{ marginTop: 10 }}>
                <Field
                  label="New model name"
                  id="newModel"
                  error={errors.newModel ?? (newModel.trim() ? modelNameProblem(newModel) ?? undefined : undefined)}
                  hint="Adds this model to the catalogue for everyone, not just this listing. The model only — storage and colour go on the listing."
                >
                  <input id="field-newModel" style={inputStyle} value={newModel} autoComplete="off"
                    onChange={e => typeNewModel(e.target.value)} />
                </Field>
              </div>
            )}
          </Field>
        </Row>

        {empty && (
          <p style={noteStyle}>
            {mayExtend
              ? <>The catalogue has no models yet. <Link to="/admin/catalogue">Set it up on the Catalogue page</Link> — Import
                  from listings adds every model the shop already sells — or add one here with “+ New brand…”.</>
              : 'The catalogue has no models yet — a manager needs to set it up (Catalogue → Import from listings).'}
          </p>
        )}

        {relinking && loaded && (
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={keepAsItWas}
              style={{ whiteSpace: 'normal', textAlign: 'left', maxWidth: '100%' }}>
              Keep it as “{loaded.brand} {loaded.model}”
            </button>
          </div>
        )}
      </>
    );
  };

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
          {identityRow()}

          {mayRequest && catalogue.status === 'ready' && (
            <RequestModel
              brands={brands}
              catalogue={models}
              open={openRequests}
              mine={myRequests}
              prefill={unlisted ? { brand: draft.brand, model: draft.model } : { brand: brandValue, model: '' }}
              onSent={r => setRequests(rs => (rs.some(x => x.id === r.id) ? rs : [r, ...rs]))}
              onCheckAgain={retry}
            />
          )}

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

          {!isNew && maySplit && (
            <SplitByColour draft={draft} onDone={handleSplit} />
          )}
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

/**
 * How a member of staff gets a model the catalogue lacks.
 *
 * They cannot type one into the listing, so without this the only way
 * forward would be to find a manager in person and hope it was remembered.
 * The request is the task: it waits in front of a manager until it is
 * approved, which adds the model to the list above, or declined with a
 * reason, which is shown here, on the screen where the model was needed.
 *
 * Not a <form> of its own, because it sits inside the product form and
 * forms cannot nest; Enter in its fields is caught so it sends the request
 * rather than trying to save the listing.
 */
function RequestModel({
  brands, catalogue, open, mine, prefill, onSent, onCheckAgain,
}: {
  brands: string[];
  catalogue: CatalogueModel[];
  open: ModelRequest[];
  mine: ModelRequest[];
  prefill: { brand: string; model: string };
  onSent: (request: ModelRequest) => void;
  onCheckAgain: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [brandChoice, setBrandChoice] = useState('');
  const [otherBrand, setOtherBrand] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<ModelRequest | null>(null);

  const brand = brandChoice === OTHER_BRAND ? otherBrand : brandChoice;
  const problem = model.trim() ? modelNameProblem(model) : null;
  const ready = !!brand.trim() && !!model.trim() && !problem && !busy;

  const expand = () => {
    const known = brands.find(b => sameName(b, prefill.brand));
    setBrandChoice(known ?? (prefill.brand.trim() ? OTHER_BRAND : ''));
    setOtherBrand(known ? '' : prefill.brand);
    setModel(prefill.model);
    setNote('');
    setError(null);
    setSent(null);
    setExpanded(true);
  };

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const request = await requestModel({ brand, model, note }, { catalogue, open });
      setSent(request);
      setExpanded(false);
      onSent(request);
    } catch (err) {
      setError(err instanceof CatalogueError ? err.message : describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const sendOnEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void send();
  };

  return (
    <div style={{ minWidth: 0 }}>
      {!expanded && !sent && (
        <button type="button" style={quietLinkStyle} onClick={expand}>
          Model not listed? Ask a manager to add it.
        </button>
      )}

      {sent && (
        <div role="status" style={requestBoxStyle}>
          <p style={{ ...noteStyle, margin: 0, color: 'var(--grey-70)' }}>
            {sent.requestedBy === currentActor()
              ? <>Sent. Your request for <strong>{sent.brand} {sent.model}</strong> is with a manager. Once they
                  approve it, it will appear in the Model list above and you can finish this listing.</>
              : <><strong>{sent.brand} {sent.model}</strong> has already been asked for and is with a manager. It
                  will appear in the Model list above once they approve it.</>}
          </p>
          <div style={buttonRowStyle}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCheckAgain}>Check again</button>
            <button type="button" style={quietLinkStyle} onClick={expand}>Ask for another model</button>
          </div>
        </div>
      )}

      {expanded && (
        <div style={requestBoxStyle}>
          <p style={{ ...noteStyle, margin: '0 0 12px', color: 'var(--grey-70)' }}>
            A manager will see this and either add the model to the catalogue or tell you why not.
          </p>
          {error && <p role="alert" style={{ ...fieldErrorStyle, margin: '0 0 12px' }}>{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row>
              <Field label="Brand you need" id="requestBrand">
                <select id="field-requestBrand" style={inputStyle} value={brandChoice}
                  onChange={e => setBrandChoice(e.target.value)}>
                  <option value="" disabled>Choose a brand</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value={OTHER_BRAND}>A brand not listed…</option>
                </select>
                {brandChoice === OTHER_BRAND && (
                  <div style={{ marginTop: 10 }}>
                    <Field label="Brand name" id="requestBrandName">
                      <input id="field-requestBrandName" style={inputStyle} value={otherBrand} autoComplete="off"
                        onChange={e => setOtherBrand(e.target.value)} onKeyDown={sendOnEnter} />
                    </Field>
                  </div>
                )}
              </Field>
              <Field
                label="Model you need"
                id="requestModel"
                error={problem ?? undefined}
                hint="The model only, as the maker names it — storage and colour go on the listing."
              >
                <input id="field-requestModel" style={inputStyle} value={model} autoComplete="off"
                  onChange={e => setModel(e.target.value)} onKeyDown={sendOnEnter} />
              </Field>
            </Row>
            <Field label="What are you trying to list? (optional)" id="requestNote">
              <textarea id="field-requestNote" style={{ ...inputStyle, minHeight: 64, paddingTop: 10, resize: 'vertical' }}
                value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
            </Field>
          </div>
          <div style={buttonRowStyle}>
            <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={() => void send()}>
              {busy ? 'Sending…' : 'Send to a manager'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpanded(false)}>Cancel</button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ ...fieldLabelStyle, margin: '0 0 6px' }}>Your requests</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mine.map(r => (
              <li key={r.id} style={{ ...noteStyle, margin: 0, overflowWrap: 'anywhere' }}>
                <strong style={{ color: 'var(--black)' }}>{r.brand} {r.model}</strong>
                {r.status === 'open'
                  ? ' — waiting for a manager. It will appear in the Model list once approved.'
                  : <> — declined{r.decidedBy ? ` by ${r.decidedBy}` : ''}: {r.reason ?? 'no reason was given, so ask a manager.'}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Turn one listing that names several colours into one listing per colour.
 *
 * The storage pattern applied to colour: a 64GB and a 128GB have always
 * been separate rows, each with its own stock. A listing that instead names
 * "Blue, Silver" in one Colour options field is the same row claiming to be
 * both, which is why the product page shows it as text rather than as
 * clickable swatches — a customer clicking "Silver" on that row would not
 * get a silver handset, because both colours are the same document with the
 * same stock. This is how that gets fixed: each colour becomes its own real
 * listing, and the ones already built for storage variants pick the change
 * up automatically — nothing about VariantSelector or productSiblings needs
 * to know a split happened.
 *
 * Manager only, because it archives the listing it runs on — the same
 * authority as the Archive button on the inventory list. Shown only when
 * there is something to split: one colour or none is not ambiguous, and
 * this offers nothing for it.
 *
 * Acts on the draft as it stands on screen, not on what was last saved — a
 * price correction made moments before splitting carries into every new
 * listing rather than being lost to it.
 */
function SplitByColour({ draft, onDone }: { draft: ProductDraft; onDone: (message: string) => void }) {
  const colours = draft.colorOptions ?? [];
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ColourSplitRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (colours.length < 2) return null;

  const start = () => {
    setRows(initialSplitRows(draft, colours));
    setError(null);
    setOpen(true);
  };

  const setRow = (i: number, patch: Partial<ColourSplitRow>) =>
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const problems = splitProblems(rows, draft.id);
  const problemAt = (i: number) => problems.find(p => p.index === i)?.message;
  const total = totalSplitStock(rows);

  const submit = async () => {
    if (problems.length) return;
    setBusy(true);
    setError(null);
    try {
      const created = await splitProductByColour(draft, parsedSplitRows(rows));
      const summary = created.map(p => `${p.colorOptions?.[0] ?? '?'} (${p.stock})`).join(', ');
      onDone(`Split "${draft.brand} ${draft.model}" into ${created.length} listings: ${summary}.`);
    } catch (err) {
      setError(err instanceof SplitError ? err.message : describeError(err));
      setBusy(false);
    }
  };

  return (
    <div>
      {!open ? (
        <button type="button" style={quietLinkStyle} onClick={start}>
          Split into one listing per colour
        </button>
      ) : (
        <div style={requestBoxStyle}>
          <p style={{ ...noteStyle, margin: '0 0 12px', color: 'var(--grey-70)' }}>
            Makes {colours.length} new listings, one per colour, each with its own stock and its own page — and
            archives this one. Enter what you actually have of each; they do not have to add up to the{' '}
            {draft.stock} on this listing now, since nobody has ever counted it by colour.
          </p>
          {error && <p role="alert" style={{ ...fieldErrorStyle, margin: '0 0 12px' }}>{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((row, i) => (
              <Row key={row.colour}>
                <Field label={`${row.colour} — stock`} id={`splitStock${i}`} error={problemAt(i)} required>
                  <input
                    id={`field-splitStock${i}`} style={inputStyle} type="number" min="0" step="1"
                    placeholder="Real count" value={row.stock} autoComplete="off"
                    onChange={e => setRow(i, { stock: e.target.value })}
                  />
                </Field>
                <Field label={`${row.colour} — URL slug`} id={`splitSlug${i}`}>
                  <input
                    id={`field-splitSlug${i}`} style={inputStyle} value={row.id} autoComplete="off"
                    onChange={e => setRow(i, { id: e.target.value })}
                  />
                </Field>
              </Row>
            ))}
          </div>
          <p style={{ ...noteStyle, margin: '10px 0 0', fontSize: 12 }}>
            Total entered: {total}
          </p>
          <div style={buttonRowStyle}>
            <button
              type="button" className="btn btn-primary btn-sm"
              disabled={busy || problems.length > 0}
              onClick={() => void submit()}
            >
              {busy ? 'Splitting…' : `Split into ${colours.length} listings`}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The same name, ignoring case and spacing.
 *
 * A manager typing "apple" as a new brand would otherwise give the catalogue
 * an "apple" beside its "Apple", and the Brand list two entries for one maker.
 */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
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
  error?: string; hint?: React.ReactNode; required?: boolean;
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

/**
 * A brand or model shown but not offered for change.
 *
 * Plain text rather than a read-only input, so there is no box that looks as
 * though it could be typed in, and nothing a screen reader announces as an
 * edit field for a value the person cannot edit.
 */
function Fixed({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ ...fieldLabelStyle, margin: '0 0 6px' }}>{label}</p>
      <p style={fixedValueStyle}>{value || '—'}</p>
    </div>
  );
}

/** Brand and model while there is nothing to choose from yet. */
function DisabledSelects({ label, errors }: { label: string; errors: ValidationErrors }) {
  return (
    <Row>
      <Field label="Brand" id="brand" required error={errors.brand}>
        <select id="field-brand" style={{ ...inputStyle, ...disabledInputStyle }} disabled value="">
          <option value="">{label}</option>
        </select>
      </Field>
      <Field label="Model" id="model" required error={errors.model}>
        <select id="field-model" style={{ ...inputStyle, ...disabledInputStyle }} disabled value="">
          <option value="">{label}</option>
        </select>
      </Field>
    </Row>
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

const fixedValueStyle: React.CSSProperties = {
  ...inputStyle, ...disabledInputStyle, cursor: 'default', margin: 0,
  display: 'flex', alignItems: 'center', color: 'var(--grey-70)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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

const noteStyle: React.CSSProperties = {
  margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.5,
};

const quietLinkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)',
  textDecoration: 'underline', textUnderlineOffset: 3,
};

const requestBoxStyle: React.CSSProperties = {
  border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-md)',
  padding: 14, background: 'var(--grey-5)', minWidth: 0,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12,
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
