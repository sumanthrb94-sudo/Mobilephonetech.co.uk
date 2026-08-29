import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import Modal from './ui/Modal';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import {
  RETURN_REASONS, RETURN_OUTCOMES, MAX_RETURN_PHOTOS,
  createReturn, uploadReturnPhoto, legalBasisFor, withinCoolingOff, daysSince,
  COOLING_OFF_DAYS, SHORT_TERM_REJECT_DAYS,
} from '../lib/returns';
import type { ReturnReason, ReturnOutcome, ReturnItem } from '../types';

/**
 * Return request flow: reason → outcome → evidence → submitted.
 *
 * The outcome step is the point of the whole thing — a refund, a replacement
 * and a repair are three different jobs for the shop, and a returns flow that
 * silently assumes "refund" makes replacement an email conversation instead of
 * a tracked one.
 *
 * Photos are requested only when the reason is a fault. Asking someone to
 * photograph a phone they simply changed their mind about is friction for no
 * benefit; a photo of a cracked screen decides the case before the parcel
 * arrives.
 */
export default function ReturnFlowModal({
  orderId,
  orderDate,
  items,
  isOpen,
  onClose,
  onCreated,
}: {
  orderId: string;
  orderDate: string;
  items: ReturnItem[];
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (rmaId: string) => void;
}) {
  const { showToast } = useUI();
  const { user } = useAuth();

  const [step, setStep] = useState<'reason' | 'outcome' | 'details' | 'done'>('reason');
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [outcome, setOutcome] = useState<ReturnOutcome>('refund');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rmaId, setRmaId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs are a leak if the component unmounts mid-flow.
  useEffect(() => () => { photos.forEach(p => URL.revokeObjectURL(p.preview)); }, [photos]);

  const reasonMeta = RETURN_REASONS.find(r => r.value === reason);
  const isFaulty = reasonMeta?.faulty ?? false;
  const coolingOff = withinCoolingOff(orderDate);
  const age = daysSince(orderDate);

  const close = () => {
    onClose();
    setTimeout(() => {
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setStep('reason'); setReason(''); setOutcome('refund');
      setNote(''); setPhotos([]); setError(null); setRmaId('');
    }, 300);
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_RETURN_PHOTOS - photos.length;
    const next = Array.from(files).slice(0, room).map(file => ({
      file, preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...next]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (!reason) return;
    if (!user || user.isGuest) {
      setError('Please sign in to your account to raise a return.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const photoUrls: string[] = [];
      for (const p of photos) {
        photoUrls.push(await uploadReturnPhoto(user.id, p.file));
      }

      const created = await createReturn({
        orderId,
        orderDate,
        userId: user.id,
        customerName: user.fullName || user.email || 'Customer',
        customerEmail: user.email ?? '',
        items,
        reason: reason as ReturnReason,
        outcome,
        note,
        photoUrls,
      });

      setRmaId(created.id);
      setStep('done');
      onCreated?.(created.id);
      showToast(`Return ${created.id} raised`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not raise the return. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : close} title={step === 'done' ? 'Return raised' : 'Return an item'}>
      {error && (
        <div role="alert" style={alertStyle}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Step 1: why ── */}
      {step === 'reason' && (
        <div style={stackStyle}>
          <p style={leadStyle}>
            {coolingOff
              ? `You are within the ${COOLING_OFF_DAYS}-day period to change your mind, so any reason is fine.`
              : `Your ${COOLING_OFF_DAYS}-day change-of-mind window has passed (order placed ${age} days ago), but faults stay covered by your warranty.`}
          </p>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={labelStyle}>What went wrong?</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {RETURN_REASONS.map(r => (
                <label key={r.value} style={optionStyle(reason === r.value)}>
                  <input
                    type="radio" name="return-reason" value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    style={{ accentColor: 'var(--brand-cyan-hover)' }}
                  />
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div style={footerStyle}>
            <button type="button" className="btn btn-secondary btn-md" onClick={close}>Cancel</button>
            <button
              type="button" className="btn btn-primary btn-md"
              disabled={!reason} onClick={() => setStep('outcome')}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: what you want instead ── */}
      {step === 'outcome' && (
        <div style={stackStyle}>
          <p style={leadStyle}>What would you like us to do?</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RETURN_OUTCOMES
              // Repair only makes sense for a fault — offering it for a
              // change of mind would just confuse the choice.
              .filter(o => o.value !== 'repair' || isFaulty)
              .map(o => (
                <label key={o.value} style={optionStyle(outcome === o.value)}>
                  <input
                    type="radio" name="return-outcome" value={o.value}
                    checked={outcome === o.value}
                    onChange={() => setOutcome(o.value)}
                    style={{ accentColor: 'var(--brand-cyan-hover)', marginTop: 3 }}
                  />
                  <span>
                    <span style={{ fontWeight: 700, display: 'block' }}>{o.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--grey-60)' }}>{o.blurb}</span>
                  </span>
                </label>
              ))}
          </div>

          <div style={noticeStyle}>
            <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-trust-text)' }} />
            <span>
              {legalBasisFor(reason as ReturnReason, orderDate) === 'cooling_off'
                ? `Distance-selling cancellation. We refund within ${COOLING_OFF_DAYS} days of the device reaching us.`
                : legalBasisFor(reason as ReturnReason, orderDate) === 'faulty_goods'
                  ? `Within ${SHORT_TERM_REJECT_DAYS} days of delivery you have the right to reject faulty goods for a full refund.`
                  : 'Covered by your 12-month warranty — we repair or replace.'}
            </span>
          </div>

          <div style={footerStyle}>
            <button type="button" className="btn btn-secondary btn-md" onClick={() => setStep('reason')}>Back</button>
            <button type="button" className="btn btn-primary btn-md" onClick={() => setStep('details')}>Continue</button>
          </div>
        </div>
      )}

      {/* ── Step 3: evidence ── */}
      {step === 'details' && (
        <div style={stackStyle}>
          <label style={labelStyle} htmlFor="return-note">
            Anything else we should know? <span style={{ color: 'var(--grey-50)', fontWeight: 500 }}>(optional)</span>
          </label>
          <textarea
            id="return-note" name="returnNote" rows={3}
            value={note} onChange={e => setNote(e.target.value)}
            placeholder={isFaulty ? 'When did it start? What exactly happens?' : 'Anything you would like us to know.'}
            style={textareaStyle}
          />

          <div>
            <span style={labelStyle}>
              {isFaulty ? 'Photos of the fault' : 'Photos'}{' '}
              <span style={{ color: 'var(--grey-50)', fontWeight: 500 }}>
                {isFaulty ? '— these usually settle it faster' : '(optional)'}
              </span>
            </span>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {photos.map((p, i) => (
                <div key={p.preview} style={thumbStyle}>
                  <img src={p.preview} alt={`Return photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button" onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`} style={thumbRemoveStyle}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {photos.length < MAX_RETURN_PHOTOS && (
                <button type="button" onClick={() => fileInput.current?.click()} style={addPhotoStyle}>
                  <Camera size={18} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInput} type="file" accept="image/*" multiple
              onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }} aria-label="Upload return photos"
            />
            <p style={{ fontSize: 12, color: 'var(--grey-50)', margin: '8px 0 0' }}>
              Up to {MAX_RETURN_PHOTOS} photos, 5MB each. Only you and our staff can see them.
            </p>
          </div>

          <div style={footerStyle}>
            <button type="button" className="btn btn-secondary btn-md" onClick={() => setStep('outcome')} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-md" onClick={submit} disabled={busy}>
              {busy
                ? <><Loader2 size={15} className="admin-spin" /> Sending…</>
                : 'Submit return'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: confirmation ── */}
      {step === 'done' && (
        <div style={{ ...stackStyle, textAlign: 'center', alignItems: 'center' }}>
          <CheckCircle2 size={44} style={{ color: 'var(--color-trust-text)' }} />
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, margin: 0 }}>
            {rmaId}
          </p>
          <p style={{ ...leadStyle, textAlign: 'center' }}>
            Keep this reference. We will review your request and email you a prepaid tracked
            label — do not post the device until that arrives, or we cannot track it.
          </p>
          <button type="button" className="btn btn-primary btn-md" onClick={close}>Done</button>
        </div>
      )}
    </Modal>
  );
}

const stackStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 16,
};

const leadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--grey-70)',
  lineHeight: 1.6, margin: 0,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700,
  color: 'var(--black)', display: 'block', padding: 0,
};

const optionStyle = (checked: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '12px 14px', minHeight: 44,
  border: `1.5px solid ${checked ? 'var(--brand-cyan-hover)' : 'var(--grey-20)'}`,
  background: checked ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
  borderRadius: 'var(--radius-md)', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--black)',
});

const footerStyle: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 4,
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid var(--grey-20)', borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--black)',
  background: 'var(--grey-0)', boxSizing: 'border-box', resize: 'vertical',
};

const alertStyle: React.CSSProperties = {
  display: 'flex', gap: 10, alignItems: 'flex-start',
  background: 'var(--color-sale-subtle)', border: '1px solid #fecaca',
  color: '#991b1b', borderRadius: 'var(--radius-md)', padding: '10px 12px',
  fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 14,
};

const noticeStyle: React.CSSProperties = {
  display: 'flex', gap: 10, alignItems: 'flex-start',
  background: 'var(--color-trust)', border: '1px solid var(--green-20)',
  color: 'var(--color-trust-text)', borderRadius: 'var(--radius-md)', padding: '10px 12px',
  fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55,
};

const thumbStyle: React.CSSProperties = {
  position: 'relative', width: 68, height: 68, borderRadius: 'var(--radius-md)',
  overflow: 'hidden', border: '1px solid var(--grey-20)', flexShrink: 0,
};

const thumbRemoveStyle: React.CSSProperties = {
  position: 'absolute', top: 3, right: 3, width: 24, height: 24,
  display: 'grid', placeItems: 'center', borderRadius: '50%',
  background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', cursor: 'pointer',
};

const addPhotoStyle: React.CSSProperties = {
  width: 68, height: 68, display: 'grid', placeItems: 'center', gap: 2,
  borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--grey-30)',
  background: 'var(--grey-0)', color: 'var(--grey-60)', cursor: 'pointer',
};
