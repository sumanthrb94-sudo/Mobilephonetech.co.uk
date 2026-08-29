import React, { useRef, useState } from 'react';
import { Upload, Trash2, Star, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import {
  uploadImage, deleteImage, validateImageFile, describeError,
  ACCEPTED_IMAGE_TYPES, pathFromPublicUrl,
} from '../../lib/adminApi';

/**
 * Gallery editor: upload, reorder, set the primary shot, delete.
 *
 * The first image in the list is the primary one shown on cards and as the
 * hero on the product page, so "make primary" is a move-to-front rather than
 * a separate field to keep in sync.
 */
export default function ImageManager({
  productId, images, onChange, disabled,
}: {
  productId: string;
  images: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [urlValue, setUrlValue] = useState('');

  /**
   * Link an image that is already hosted somewhere else.
   *
   * Cloud Storage requires Firebase's paid plan just to enable, so uploading
   * is not available on every project. Linking keeps the console fully usable
   * without it — and is genuinely wanted anyway when the artwork already lives
   * on a CDN or in the bundled /assets folder.
   */
  const addUrl = () => {
    const raw = urlValue.trim();
    if (!raw) return;

    // Accept a site-relative path (/assets/…) or an absolute http(s) URL, and
    // nothing else: a data: or javascript: value would end up in an <img src>.
    const isRelative = raw.startsWith('/');
    let ok = isRelative;
    if (!isRelative) {
      try {
        const parsed = new URL(raw);
        ok = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      setErrors([`${raw.slice(0, 60)} — enter a full http(s) address or a path beginning with "/".`]);
      return;
    }
    if (images.includes(raw)) {
      setErrors(['That image is already on this product.']);
      return;
    }

    setErrors([]);
    setUrlValue('');
    onChange([...images, raw]);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = [...fileList];

    // Reject the bad ones up front and tell the user which, rather than
    // failing silently partway through the batch.
    const rejected = files.map(validateImageFile).filter(Boolean) as string[];
    const accepted = files.filter(f => !validateImageFile(f));
    setErrors(rejected);

    if (!accepted.length) return;

    setBusy(true);
    setPendingCount(accepted.length);
    const uploaded: string[] = [];
    const failures: string[] = [];

    for (const file of accepted) {
      try {
        uploaded.push(await uploadImage(productId, file));
      } catch (err) {
        failures.push(`${file.name}: ${describeError(err)}`);
      }
      setPendingCount(c => c - 1);
    }

    // Keep whatever did upload — losing three good uploads because the fourth
    // failed would be worse than a partial success the admin can see.
    if (uploaded.length) onChange([...images, ...uploaded]);
    if (failures.length) setErrors(prev => [...prev, ...failures]);

    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = async (index: number) => {
    const url = images[index];
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    // Remove the stored object too, but only if it is one of ours. A failure
    // here leaves an orphaned file, which is untidy but harmless — the product
    // record is already correct, so it is not worth blocking the admin on.
    try {
      await deleteImage(url);
    } catch (err) {
      setErrors(prev => [...prev, `Removed from the product, but the stored file could not be deleted: ${describeError(err)}`]);
    }
  };

  const canUpload = Boolean(productId) && !disabled;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <label style={labelStyle}>Images</label>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
          {images.length} image{images.length === 1 ? '' : 's'} · first is the primary
        </span>
      </div>

      {!productId && (
        <p style={hintStyle}>
          Give the product a slug first — uploads are filed under it.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        disabled={!canUpload || busy}
        onChange={e => handleFiles(e.target.files)}
        style={{ display: 'none' }}
        aria-label="Upload product images"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!canUpload || busy}
        className="btn btn-secondary btn-md"
        style={{ width: '100%', justifyContent: 'center', opacity: canUpload && !busy ? 1 : 0.55 }}
      >
        {busy
          ? <><Loader2 size={16} className="admin-spin" /> Uploading {pendingCount} more…</>
          : <><Upload size={16} /> Upload images</>}
      </button>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input
          value={urlValue}
          onChange={e => setUrlValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="…or paste an image URL"
          aria-label="Add an image by URL"
          disabled={disabled}
          style={{
            flex: 1, minWidth: 0, height: 40, padding: '0 12px',
            border: '1.5px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--black)',
            background: 'var(--grey-0)', boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={disabled || !urlValue.trim()}
          className="btn btn-secondary btn-md"
          style={{ flexShrink: 0 }}
        >
          <LinkIcon size={15} /> Add
        </button>
      </div>

      {errors.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {errors.map((msg, i) => (
            <li key={i} style={errorRowStyle}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul
          style={{
            listStyle: 'none', padding: 0, margin: '14px 0 0',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: '12px',
          }}
        >
          {images.map((url, i) => (
            <li
              key={url}
              style={{
                border: `1.5px solid ${i === 0 ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--grey-0)',
              }}
            >
              <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--grey-5)' }}>
                <img
                  src={url}
                  alt={i === 0 ? 'Primary product image' : `Product image ${i + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                {i === 0 && (
                  <span style={primaryBadgeStyle}><Star size={10} fill="currentColor" /> Primary</span>
                )}
                {!pathFromPublicUrl(url) && (
                  <span style={bundledBadgeStyle} title="Linked rather than uploaded — removing it here only unlinks it, the file itself is untouched.">
                    Linked
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', borderTop: '1px solid var(--grey-10)' }}>
                <IconBtn label={`Move image ${i + 1} earlier`} onClick={() => move(i, i - 1)} disabled={i === 0 || disabled}>
                  <ArrowLeft size={14} />
                </IconBtn>
                <IconBtn label={`Move image ${i + 1} later`} onClick={() => move(i, i + 1)} disabled={i === images.length - 1 || disabled}>
                  <ArrowRight size={14} />
                </IconBtn>
                <IconBtn label={`Make image ${i + 1} the primary`} onClick={() => move(i, 0)} disabled={i === 0 || disabled}>
                  <Star size={14} />
                </IconBtn>
                <IconBtn label={`Delete image ${i + 1}`} onClick={() => remove(i)} disabled={disabled} danger>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({
  children, label, onClick, disabled, danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        flex: 1,
        // 32px clears the 24px WCAG 2.2 SC 2.5.8 minimum with room to spare.
        height: '32px',
        display: 'grid', placeItems: 'center',
        border: 'none', background: 'transparent',
        color: disabled ? 'var(--grey-30)' : danger ? 'var(--color-sale)' : 'var(--grey-60)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)',
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', margin: '0 0 10px',
};

const errorRowStyle: React.CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'flex-start',
  fontFamily: 'var(--font-body)', fontSize: '12.5px', lineHeight: 1.5,
  color: '#991b1b', background: 'var(--color-sale-subtle)',
  border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '8px 10px',
};

const primaryBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: 6, left: 6,
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'var(--brand-cyan)', color: 'var(--grey-0)',
  fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 800,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '3px 7px', borderRadius: 'var(--radius-full)',
};

const bundledBadgeStyle: React.CSSProperties = {
  position: 'absolute', bottom: 6, right: 6,
  background: 'var(--grey-80)', color: 'var(--grey-0)',
  fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: 700,
  padding: '3px 7px', borderRadius: 'var(--radius-full)',
};
