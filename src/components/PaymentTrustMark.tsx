import { Lock } from 'lucide-react';
import { isPayPalConfigured } from './PayPalCheckout';

/**
 * Payment marks: PayPal, Visa and Mastercard as small card-shaped badges.
 *
 * All three are honest. PayPal is the only gateway, and its Smart Buttons
 * (loaded without `disable-funding`, see PayPalCheckout) offer "Debit or
 * Credit Card" as a guest option, so a shopper without a PayPal account can
 * still pay by card. Klarna, Clearpay, Apple Pay and Google Pay are not
 * offered and are deliberately absent.
 *
 * Logos rather than a sentence: shoppers recognise the marks at a glance,
 * and three 34×22 badges take less room than "Secure checkout with PayPal".
 *
 * - `variant="card"`: logos only, centred under the product card's button.
 * - `variant="pdp"`: a "Pay securely with" line beside the logos, directly
 *   under Add to cart, which is where the payment question gets asked.
 */
export default function PaymentTrustMark({
  variant = 'card',
  compact = false,
}: {
  variant?: 'card' | 'pdp';
  compact?: boolean;
}) {
  if (!isPayPalConfigured()) return null;

  const badgeH = compact ? 18 : 22;
  const logos = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6 }} aria-hidden="true">
      <Badge height={badgeH} wide><PayPalMark /></Badge>
      <Badge height={badgeH}><VisaMark /></Badge>
      <Badge height={badgeH}><MastercardMark /></Badge>
    </span>
  );

  if (variant === 'pdp') {
    return (
      <div
        className="payment-marks payment-marks--pdp"
        aria-label="Pay securely with PayPal, Visa or Mastercard"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
          fontFamily: 'var(--font-body)', fontSize: '12.5px', color: 'var(--grey-60)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Lock size={13} aria-hidden="true" style={{ color: 'var(--color-trust-text)' }} />
          Pay securely with
        </span>
        {logos}
      </div>
    );
  }

  return (
    <div
      className="payment-marks payment-marks--card"
      aria-label="Pay with PayPal, Visa or Mastercard"
      style={{ display: 'flex', justifyContent: 'center', marginTop: compact ? 7 : 9 }}
    >
      {logos}
    </div>
  );
}

function Badge({ height, wide = false, children }: { height: number; wide?: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height, width: Math.round(height * (wide ? 2.4 : 1.55)),
        background: '#fff', border: '1px solid var(--grey-20)', borderRadius: 4,
        boxSizing: 'border-box', padding: '0 3px',
      }}
    >
      {children}
    </span>
  );
}

/** Two-tone "PayPal" wordmark, as PayPal's own acceptance badge shows it. */
function PayPalMark() {
  return (
    <svg viewBox="0 0 46 14" width="100%" height="78%" role="img" aria-label="PayPal">
      <text x="23" y="11.5" textAnchor="middle" fontFamily="Verdana, Arial, sans-serif" fontSize="12.5" fontWeight="700" fontStyle="italic" letterSpacing="-0.5">
        <tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan>
      </text>
    </svg>
  );
}

function VisaMark() {
  return (
    <svg viewBox="0 0 40 14" width="100%" height="58%" role="img" aria-label="Visa">
      <text x="20" y="12" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="13.5" fontWeight="900" fontStyle="italic" fill="#1a1f71" letterSpacing="-0.3">
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 32 20" width="100%" height="70%" role="img" aria-label="Mastercard">
      <circle cx="12" cy="10" r="8" fill="#eb001b" />
      <circle cx="20" cy="10" r="8" fill="#f79e1b" />
      <path d="M16 3.07a8 8 0 0 1 0 13.86a8 8 0 0 1 0-13.86z" fill="#ff5f00" />
    </svg>
  );
}
