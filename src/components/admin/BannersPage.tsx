import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon, Loader2, AlertTriangle, Check, Plus, Trash2, Upload,
  Eye, EyeOff, ArrowUp, ArrowDown, RotateCw, Smartphone, Monitor, Link as LinkIcon,
} from 'lucide-react';
import {
  listBanners, saveBanner, deleteBanner, bannerId, bannerProblems,
  BANNER_SPEC, EMPTY_BANNER, type Banner,
} from '../../lib/banners';
import { uploadImage, describeError, BANNER_BUCKET, isUsableImageUrl } from '../../lib/adminApi';
import { optimizeImage } from '../../lib/imageOptimize';
import HeroCarousel, { type Slide } from '../HeroCarousel';

/**
 * A draft banner, rendered through the exact same carousel the home page
 * uses — see the note on HeroCarousel. Mirrors the mapping Hero.tsx applies
 * to a saved banner, so what staff see here does not silently disagree with
 * what a visitor gets once this is switched on.
 */
function bannerToSlide(b: Banner): Slide {
  return {
    eyebrow: b.eyebrow,
    headline: b.headline,
    subline: b.subline,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    image: b.image || b.imageMobile,
    imageMobile: b.imageMobile || b.image,
    imageAlt: b.alt,
    gradientFrom: '#0b0f1a',
    gradientTo: '#1b2440',
    glowColor: 'rgba(96, 120, 220, 0.30)',
    savings: '',
    fullBleed: true,
    focal: '50% 50%',
    focalMobile: '50% 30%',
  };
}

/**
 * Home-page banners, editable without a deploy.
 *
 * The carousel was a hardcoded array in Hero.tsx, so a seasonal headline or a
 * swapped picture needed a developer. Staff now upload the artwork, type the
 * overlay, and save — active banners are what the home page shows.
 *
 * Every banner renders in the same fixed box (see BANNER_SPEC and the hero's
 * `height` rule), which is the thing that makes this safe to hand over: an
 * uploaded picture cannot change the height of the page, only what is in the
 * frame. The preview below each form is that same box, so what staff approve
 * here is what a visitor gets.
 */
export default function BannersPage() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await listBanners()); }
    catch (err) { setError(describeError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = (id: string, change: Partial<Banner>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...change } : r)));

  const addBanner = () => {
    const fresh: Banner = {
      ...EMPTY_BANNER,
      id: bannerId('new'),
      order: rows.length,
      updatedAt: '',
    };
    setRows(rs => [...rs, fresh]);
  };

  const save = async (b: Banner) => {
    setBusyId(b.id); setError(null); setNotice(null);
    try {
      await saveBanner(b);
      setNotice(b.active
        ? `"${b.headline}" saved and live on the home page.`
        : `"${b.headline}" saved. It is off, so the shop does not show it yet.`);
      await load();
    } catch (err) { setError(describeError(err)); }
    finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteBanner(id);
      setConfirmDelete(null);
      setNotice('Banner deleted.');
      await load();
    } catch (err) { setError(describeError(err)); }
    finally { setBusyId(null); }
  };

  /** Swap order with the neighbour, then persist both. */
  const move = async (id: string, dir: -1 | 1) => {
    const i = rows.findIndex(r => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    const renumbered = next.map((r, n) => ({ ...r, order: n }));
    setRows(renumbered);
    setBusyId(id);
    try {
      await Promise.all([renumbered[i], renumbered[j]].map(saveBanner));
      await load();
    } catch (err) { setError(describeError(err)); }
    finally { setBusyId(null); }
  };

  return (
    <div className="ops-stack">
      <div className="ops-head">
        <div>
          <p className="ops-eyebrow">Shop front</p>
          <h1 className="ops-title">Home banners</h1>
        </div>
        <button type="button" className="btn btn-primary btn-md" onClick={addBanner}>
          <Plus size={15} /> New banner
        </button>
      </div>

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
        <p className="ord-empty"><Loader2 size={18} className="admin-spin" /> Loading banners…</p>
      )}

      {!loading && rows.length === 0 && (
        <div className="admin-panel ord-empty">
          <ImageIcon size={22} />
          <p style={{ margin: 0, maxWidth: 460 }}>
            No banners yet. Until one is saved and switched on, the home page shows
            the built-in set — so the shop is never bannerless.
          </p>
        </div>
      )}

      {rows.map((b, i) => (
        <BannerEditor
          key={b.id}
          banner={b}
          busy={busyId === b.id}
          first={i === 0}
          last={i === rows.length - 1}
          confirming={confirmDelete === b.id}
          onChange={change => patch(b.id, change)}
          onSave={() => void save(b)}
          onMove={dir => void move(b.id, dir)}
          onAskDelete={() => setConfirmDelete(b.id)}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={() => void remove(b.id)}
          onError={setError}
        />
      ))}
    </div>
  );
}

interface EditorProps {
  banner: Banner;
  busy: boolean;
  first: boolean;
  last: boolean;
  confirming: boolean;
  onChange: (change: Partial<Banner>) => void;
  onSave: () => void;
  onMove: (dir: -1 | 1) => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onError: (message: string) => void;
}

function BannerEditor({
  banner: b, busy, first, last, confirming,
  onChange, onSave, onMove, onAskDelete, onCancelDelete, onDelete, onError,
}: EditorProps) {
  const [uploading, setUploading] = useState<'image' | 'imageMobile' | null>(null);
  const deskRef = useRef<HTMLInputElement>(null);
  const mobRef = useRef<HTMLInputElement>(null);
  const [previewDevice, setPreviewDevice] = useState<'phone' | 'desktop'>('phone');
  const [replayKey, setReplayKey] = useState(0);

  const pick = async (which: 'image' | 'imageMobile', file: File | undefined) => {
    if (!file) return;
    setUploading(which);
    try {
      // Every visitor's first paint of the shop is one of these two photos —
      // above-the-fold, on every device, before anything else on the page
      // has loaded. Skipping the same compression the product gallery
      // already gets would make this the single heaviest image on the site
      // rather than the one most worth keeping light. See imageOptimize.ts.
      const { file: toUpload } = await optimizeImage(file);
      onChange({ [which]: await uploadImage(b.id, toUpload, BANNER_BUCKET) });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That upload did not work.');
    } finally {
      setUploading(null);
    }
  };

  const problems = bannerProblems(b);
  const preview = b.imageMobile || b.image;

  return (
    <div className="admin-panel bn-card">
      <div className="bn-card__head">
        <span className={b.active ? 'ord-chip ord-chip-done' : 'ord-chip ord-chip-topack'}>
          {b.active ? 'Live' : 'Off'}
        </span>
        <strong className="bn-card__title">{b.headline || 'Untitled banner'}</strong>

        <button type="button" className="admin-ghost" onClick={() => onMove(-1)} disabled={first || busy} aria-label="Move up">
          <ArrowUp size={15} />
        </button>
        <button type="button" className="admin-ghost" onClick={() => onMove(1)} disabled={last || busy} aria-label="Move down">
          <ArrowDown size={15} />
        </button>
      </div>

      <div className="bn-grid">
        <div className="bn-fields">
          <Field label="Eyebrow" hint="Small line above the headline. Optional.">
            <input className="input" value={b.eyebrow} maxLength={60}
              placeholder="e.g. iPhone Pro · 30-point audit"
              onChange={e => onChange({ eyebrow: e.target.value })} />
          </Field>

          <Field label="Headline" hint="Two short lines read better than one long one — press Enter for the second.">
            <textarea className="input" style={{ height: 56, paddingTop: 10, paddingBottom: 10, resize: 'none', lineHeight: 1.3 }}
              value={b.headline} maxLength={90} rows={2}
              placeholder={"e.g. Pro, for less\nthan new."}
              onChange={e => onChange({ headline: e.target.value })} />
          </Field>

          <Field label="Supporting line" hint="Shown on desktop only — a phone banner has no room for it.">
            <input className="input" value={b.subline} maxLength={160}
              placeholder="e.g. Every iPhone tested across 30 checks, battery guaranteed, ready to use."
              onChange={e => onChange({ subline: e.target.value })} />
          </Field>

          <div className="bn-row">
            <Field label="Button text">
              <input className="input" value={b.ctaLabel} maxLength={40}
                placeholder="e.g. Shop iPhones"
                onChange={e => onChange({ ctaLabel: e.target.value })} />
            </Field>
            <Field label="Button link" hint="A path inside the shop, e.g. /products?brand=Apple">
              <input className="input" value={b.ctaHref} maxLength={200}
                placeholder="/products?brand=Apple"
                onChange={e => onChange({ ctaHref: e.target.value })} />
            </Field>
          </div>

          <Field label="Image description" hint="Read aloud by screen readers, and shown if the picture fails to load.">
            <input className="input" value={b.alt} maxLength={160}
              placeholder="e.g. An iPhone Pro in a deep crimson finish, shown front and back"
              onChange={e => onChange({ alt: e.target.value })} />
          </Field>

          <div className="bn-row">
            <Uploader
              label="Desktop image"
              spec={BANNER_SPEC.desktop}
              value={b.image}
              busy={uploading === 'image'}
              inputRef={deskRef}
              onPick={f => void pick('image', f)}
              onClear={() => onChange({ image: '' })}
              onUrl={url => onChange({ image: url })}
            />
            <Uploader
              label="Phone image"
              spec={BANNER_SPEC.mobile}
              value={b.imageMobile}
              busy={uploading === 'imageMobile'}
              inputRef={mobRef}
              onPick={f => void pick('imageMobile', f)}
              onClear={() => onChange({ imageMobile: '' })}
              onUrl={url => onChange({ imageMobile: url })}
            />
          </div>
        </div>

        {/* Not a mockup of the home page banner — it IS the home page banner
            component (HeroCarousel), fed this one draft. Same code, same
            animation, so nothing here can quietly disagree with what ships. */}
        <div className={previewDevice === 'desktop' ? 'bn-preview bn-preview--desktop' : 'bn-preview'}>
          <div className="bn-preview__head">
            <p className="bn-preview__label">Live preview</p>
            <div className="bn-preview__tools">
              <div className="bn-preview__toggle" role="group" aria-label="Preview device">
                <button type="button" aria-pressed={previewDevice === 'phone'}
                  className={previewDevice === 'phone' ? 'bn-preview__toggle-btn is-active' : 'bn-preview__toggle-btn'}
                  onClick={() => setPreviewDevice('phone')}>
                  <Smartphone size={13} /> Phone
                </button>
                <button type="button" aria-pressed={previewDevice === 'desktop'}
                  className={previewDevice === 'desktop' ? 'bn-preview__toggle-btn is-active' : 'bn-preview__toggle-btn'}
                  onClick={() => setPreviewDevice('desktop')}>
                  <Monitor size={13} /> Desktop
                </button>
              </div>
              <button type="button" className="admin-ghost" onClick={() => setReplayKey(k => k + 1)}>
                <RotateCw size={13} /> Replay
              </button>
            </div>
          </div>

          {!preview && (
            <p className="bn-preview__empty-note">
              No image uploaded yet — the preview below shows the real layout with a placeholder background.
            </p>
          )}

          <div
            className="bn-preview__stage"
            style={{
              containerType: 'inline-size',
              width: previewDevice === 'phone' ? 220 : '100%',
              maxWidth: previewDevice === 'phone' ? 220 : 640,
            }}
          >
            <div className="bn-preview__frame2">
              <HeroCarousel
                slides={[bannerToSlide(b)]}
                autoAdvance={false}
                isDesktopOverride={previewDevice === 'desktop'}
                replayKey={replayKey}
              />
            </div>
          </div>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="bn-problems">
          {problems.map(p => <li key={p}><AlertTriangle size={13} /> {p}</li>)}
        </ul>
      )}

      <div className="ord-actions">
        <button type="button" className="btn btn-secondary btn-md" disabled={busy || problems.length > 0} onClick={onSave}>
          {busy ? <Loader2 size={15} className="admin-spin" /> : <Check size={15} />}
          {b.active ? 'Save & put live' : 'Save'}
        </button>

        <button type="button" className="admin-ghost" disabled={busy} onClick={() => onChange({ active: !b.active })}>
          {b.active ? <><EyeOff size={15} /> Switch off</> : <><Eye size={15} /> Switch on</>}
        </button>

        {!confirming && (
          <button type="button" className="admin-ghost-danger" disabled={busy} onClick={onAskDelete}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>

      {confirming && (
        <div className="ord-confirm" role="group" aria-label="Confirm delete">
          <span>Delete <strong>{b.headline || 'this banner'}</strong>? This cannot be undone.</span>
          <button type="button" className="btn btn-secondary btn-md" disabled={busy} onClick={onDelete}>
            Yes, delete
          </button>
          <button type="button" className="admin-ghost" onClick={onCancelDelete}>Keep it</button>
        </div>
      )}
    </div>
  );
}

/**
 * The hint sits OUTSIDE the <label>.
 *
 * Inside it, the hint becomes part of the control's accessible name: the
 * eyebrow field announced as "Eyebrow Small line above the headline", which
 * is a sentence, not a name, and made two different fields answer to
 * "headline". Out here it is a description, which is what it is.
 */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

function Uploader({
  label, spec, value, busy, inputRef, onPick, onClear, onUrl,
}: {
  label: string;
  spec: { w: number; h: number; ratio: string; note: string };
  value: string;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (f: File | undefined) => void;
  onClear: () => void;
  onUrl: (url: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const addUrl = () => {
    const raw = draft.trim();
    if (!raw) return;
    if (!isUsableImageUrl(raw)) {
      setUrlError('Enter a full http(s) address, or a path beginning with "/".');
      return;
    }
    setUrlError(null);
    setDraft('');
    onUrl(raw);
  };

  return (
    <div className="bn-field">
      <span className="bn-field__label">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={e => { onPick(e.target.files?.[0]); e.target.value = ''; }}
      />
      <div className="bn-upload">
        {value
          ? <img src={value} alt="" className="bn-upload__thumb" />
          : <span className="bn-upload__thumb bn-upload__thumb--empty"><ImageIcon size={16} /></span>}
        <button type="button" className="admin-ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 size={14} className="admin-spin" /> : <Upload size={14} />}
          {value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button type="button" className="admin-ghost" onClick={onClear}>Remove</button>
        )}
      </div>

      {/* An image that already lives somewhere reachable does not need
          re-uploading, and this keeps banners editable when the uploader
          itself is unavailable. The preview below is the real check on
          whether the address works: a host the site's security policy
          refuses, or a typo, shows up there as an empty frame. */}
      <div className="bn-upload__url">
        <input
          className="input"
          value={draft}
          onChange={e => { setDraft(e.target.value); setUrlError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="…or paste an image URL"
          aria-label={`${label}: add by URL`}
        />
        <button
          type="button"
          className="admin-ghost"
          disabled={!draft.trim()}
          onClick={addUrl}
        >
          <LinkIcon size={14} /> Use
        </button>
      </div>
      {urlError && (
        <span className="bn-field__hint bn-field__hint--error">
          <AlertTriangle size={12} /> {urlError}
        </span>
      )}

      <span className="bn-field__hint">
        {spec.w}×{spec.h} ({spec.ratio}). {spec.note}
      </span>
    </div>
  );
}
