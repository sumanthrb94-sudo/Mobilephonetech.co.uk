import React from 'react';
import { useUI } from '../context/UIContext';

/**
 * ExpressPayRow — Apple Pay / Google Pay / PayPal "one-tap" buttons shown
 * above the long-form checkout. UI-only pass-through — clicking them today
 * falls back to the standard flow while surfacing that fast checkout exists.
 *
 * Real integration is a follow-up (Apple Pay requires a merchant-id cert,
 * Google Pay needs a processor). The component renders the canonical brand
 * treatments so visual parity is ready when wiring lands.
 */

type Provider = 'apple' | 'google' | 'paypal';

export default function ExpressPayRow({
  onClick,
  selected,
  onSelect,
}: {
  onClick?: (provider: Provider) => void;
  /** Currently selected provider — when set, the matching button gets a ring. */
  selected?: Provider | null;
  /** Selection callback — when supplied, takes precedence over the legacy
   *  onClick toast behaviour and treats taps as method selection. */
  onSelect?: (provider: Provider) => void;
}) {
  const { showToast } = useUI();

  const handle = (provider: Provider) => {
    if (onSelect) { onSelect(provider); return; }
    onClick?.(provider);
    showToast(`${label(provider)} express checkout coming soon — please use the form below.`, 'info');
  };

  return (
    <div style={{ marginBottom: 'var(--spacing-24)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-50)',
          }}
        >
          Express checkout
        </span>
        <span style={{ height: '1px', flex: 1, background: 'var(--grey-10)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }} className="sm:grid-cols-3">
        <ExpressButton provider="apple"  onClick={() => handle('apple')}  selected={selected === 'apple'} />
        <ExpressButton provider="google" onClick={() => handle('google')} selected={selected === 'google'} />
        <ExpressButton provider="paypal" onClick={() => handle('paypal')} selected={selected === 'paypal'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0 0' }}>
        <span style={{ height: '1px', flex: 1, background: 'var(--grey-10)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', letterSpacing: '0.04em' }}>
          or pay by card
        </span>
        <span style={{ height: '1px', flex: 1, background: 'var(--grey-10)' }} />
      </div>
    </div>
  );
}

function label(p: Provider): string {
  if (p === 'apple') return 'Apple Pay';
  if (p === 'google') return 'Google Pay';
  return 'PayPal';
}

function ExpressButton({ provider, onClick, selected }: { provider: Provider; onClick: () => void; selected?: boolean }) {
  const styles: Record<Provider, React.CSSProperties> = {
    apple:  { background: '#000', color: '#fff' },
    google: { background: '#000', color: '#fff' },
    paypal: { background: '#ffc439', color: '#000' },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pay with ${label(provider)}`}
      className="express-pay-btn"
      aria-pressed={selected}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '0 18px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: '14px',
        letterSpacing: '-0.005em',
        outline: selected ? '2.5px solid var(--brand-cyan)' : 'none',
        outlineOffset: '2px',
        transition: 'filter var(--duration-fast) var(--ease-default), outline var(--duration-fast)',
        ...styles[provider],
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
    >
      {provider === 'apple' && (
        <>
          <AppleMark />
          Pay
        </>
      )}
      {provider === 'google' && (
        <>
          <GoogleMark />
          Pay
        </>
      )}
      {provider === 'paypal' && (
        <span style={{ fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
          Pay<span style={{ color: '#003087' }}>Pal</span>
        </span>
      )}
    </button>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
      <path d="M13.1 9.5c0-2 1.6-3 1.7-3-.9-1.3-2.4-1.5-2.9-1.5-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7C4.7 5 3 6.2 3 8.8c0 .8.1 1.6.4 2.5.4 1.1 1.7 3.9 3.1 3.8.7 0 1.2-.5 2.2-.5.9 0 1.4.5 2.2.5 1.4 0 2.5-2.5 2.9-3.7-2.5-.9-2.7-3.5-2.7-3.9zM10.7 3.6c.6-.7 1-1.7.9-2.6-.9.1-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.3z"/>
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
