import { useState } from 'react';
import { BellRing, Check } from 'lucide-react';

/**
 * "Email me when it's back" for a sold-out product or configuration.
 * Replaces the dead "Out of stock" button: a shopper who wanted something we
 * did not have leaves an address instead of simply leaving.
 */
export default function StockAlertForm({ productId, productName, variant }: {
  productId: string;
  productName: string;
  /** The configuration they picked, e.g. "256GB · Blue · Excellent". */
  variant?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('saving');
    setError('');
    try {
      const res = await fetch('/api/stock-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productId, variant }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save that just now.');
      setState('done');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div id="notify" className="stock-alert stock-alert--done" role="status">
        <Check size={18} aria-hidden="true" />
        <span>We'll email <strong>{email}</strong> as soon as the {productName} is back in stock.</span>
      </div>
    );
  }

  return (
    <form id="notify" className="stock-alert" onSubmit={submit}>
      <p className="stock-alert__title"><BellRing size={16} aria-hidden="true" /> Sold out{variant ? ` in ${variant}` : ''}. Get an email when it's back.</p>
      <div className="stock-alert__row">
        <label htmlFor={`stock-alert-${productId}`} className="sr-only">Email address</label>
        <input
          id={`stock-alert-${productId}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input"
          style={{ fontSize: 16 }}
        />
        <button type="submit" className="btn btn-buy btn-md" disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {state === 'error' && <p role="alert" className="stock-alert__error">{error}</p>}
      <p className="stock-alert__note">One email when it's back. We won't add you to any mailing list.</p>
    </form>
  );
}
