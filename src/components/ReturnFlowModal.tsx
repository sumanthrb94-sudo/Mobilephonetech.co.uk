import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useUI } from '../context/UIContext';

const REASONS = [
  'Changed my mind',
  'Arrived late',
  'Not as described',
  'Defective / not working',
  'Wrong item received',
  'Other',
];

/**
 * ReturnFlowModal — lightweight return-initiation UI. Step 1 picks a reason,
 * step 2 captures an optional note/photo intent, step 3 confirms and fires
 * a success toast. No real API call — provides the UX shape for a future
 * returns service.
 */
export default function ReturnFlowModal({
  orderId,
  isOpen,
  onClose,
}: {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { showToast } = useUI();
  const [step, setStep] = useState<'reason' | 'details' | 'done'>('reason');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const close = () => {
    onClose();
    setTimeout(() => { setStep('reason'); setReason(''); setNote(''); }, 300);
  };

  const submit = () => {
    setStep('done');
    showToast(`Return started for ${orderId}`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={step === 'done' ? 'Return started' : 'Start a return'}
      width={520}
    >
      {step === 'reason' && (
        <>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', margin: '0 0 16px 0' }}>
            Tell us why — we'll email a prepaid return label as soon as you confirm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REASONS.map((r) => (
              <label
                key={r}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  border: `1.5px solid ${reason === r ? 'var(--black)' : 'var(--grey-20)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: reason === r ? 'var(--grey-5)' : 'var(--grey-0)',
                }}
              >
                <input
                  type="radio"
                  name="return-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  style={{ accentColor: 'var(--black)' }}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>{r}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button onClick={close} className="btn btn-secondary btn-md">Cancel</button>
            <button
              onClick={() => setStep('details')}
              disabled={!reason}
              className="btn btn-primary btn-md"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', margin: '0 0 16px 0' }}>
            Add any context and photos of the device condition — helps us process faster.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional notes…"
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--grey-20)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--black)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={() => showToast('Photo upload coming soon', 'info')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              padding: '10px 14px',
              background: 'var(--grey-5)',
              border: '1px dashed var(--grey-20)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--grey-60)',
            }}
          >
            <Camera size={14} /> Add photos (optional)
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => setStep('reason')} className="btn btn-secondary btn-md">Back</button>
            <button onClick={submit} className="btn btn-primary btn-md">Confirm return</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '12px 0' }}>
            <div
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--green-5)', color: 'var(--color-trust-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', margin: 0, letterSpacing: '-0.02em' }}>
              Return request submitted
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', margin: 0, lineHeight: 1.55, maxWidth: '360px' }}>
              We've emailed your prepaid Royal Mail return label. Drop it off at any Royal Mail post box — we'll refund within 3-5 business days of receipt.
            </p>
            <button onClick={close} className="btn btn-primary btn-md" style={{ marginTop: '8px' }}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
