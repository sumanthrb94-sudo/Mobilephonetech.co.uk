import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * PriceMatchBadge — small trust pill. Tap opens a modal explaining the
 * price-match promise and how to claim it.
 */
export default function PriceMatchBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Price-match promise"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'var(--color-brand-subtle)',
          color: 'var(--brand-cyan-hover)',
          border: '1px solid rgba(0, 186, 219, 0.3)',
          borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <BadgeCheck size={12} />
        Price-match promise
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Our price-match promise"
        footer={
          <button onClick={() => setOpen(false)} className="btn btn-primary btn-md">
            Got it
          </button>
        }
      >
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
          Seen it cheaper somewhere else? We'll match the price — even after you've bought.
        </p>
        <ul style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.6, paddingLeft: '18px', margin: 0 }}>
          <li>Same model, same grade, same storage</li>
          <li>Retailer must be based in the UK and have the device in stock</li>
          <li>Claim within 14 days of your order — we'll refund the difference</li>
        </ul>
      </Modal>
    </>
  );
}
