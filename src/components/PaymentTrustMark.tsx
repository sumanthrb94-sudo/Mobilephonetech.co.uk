import { ShieldCheck } from 'lucide-react';
import { isPayPalConfigured } from './PayPalCheckout';

/**
 * A truthful payment cue for product discovery. Klarna is intentionally not
 * shown here: it is not a checkout option until its payment integration is
 * enabled. Keeping this small preserves the product hierarchy.
 */
export default function PaymentTrustMark({ compact = false }: { compact?: boolean }) {
  if (!isPayPalConfigured()) return null;

  return (
    <div
      aria-label="Secure checkout with PayPal"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: compact ? 5 : 6,
        marginTop: compact ? 7 : 10,
        color: 'var(--grey-60)',
        fontFamily: 'var(--font-body)', fontSize: compact ? '10.5px' : '12px', lineHeight: 1.2,
      }}
    >
      <ShieldCheck size={compact ? 12 : 14} style={{ color: '#0070ba', flexShrink: 0 }} aria-hidden="true" />
      <span>Secure checkout with <strong style={{ color: '#003087', fontFamily: 'var(--font-sans)', fontWeight: 800 }}>PayPal</strong></span>
    </div>
  );
}
