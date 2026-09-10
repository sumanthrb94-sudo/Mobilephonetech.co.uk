import { useEffect, useRef, useState } from 'react';
import { auth } from '../lib/firebase';

/**
 * PayPal checkout — the client half.
 *
 * Renders nothing at all unless VITE_PAYPAL_CLIENT_ID is set, so it is dark in
 * production until the client's sandbox credentials are in the environment.
 * When it does render, an "under development" banner sits above the buttons:
 * this path is built and testable against sandbox but not yet live, and a
 * shopper must never mistake a sandbox button for a real charge.
 *
 * The flow it drives is deliberately thin on this side. The browser holds no
 * prices and makes no total: it asks the server to open a PayPal order for the
 * basket (create-order), lets PayPal collect approval, then asks the server to
 * capture and record it (capture). Every figure that matters is decided and
 * re-checked server-side.
 */

const CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const CURRENCY = 'GBP';

/**
 * Whether a PayPal client id is present in this build.
 *
 * PayPal is the only gateway, so this is also the answer to "can this shop
 * take an order at all?" — exported so the checkout asks the same question
 * this component answers, rather than re-reading the env var and risking the
 * two disagreeing about whether a payment button exists.
 */
export function isPayPalConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

/**
 * Sandbox until VITE_PAYPAL_ENV says otherwise. Fail-safe on purpose: an
 * unset value shows the "no real money moves" banner, so the only way to
 * remove that warning is to declare the environment live deliberately.
 */
const IS_LIVE = (import.meta.env.VITE_PAYPAL_ENV as string | undefined) === 'live';

/** The basket payload, identical in shape to what /api/orders receives. */
export interface PayPalPayload {
  items: Array<Record<string, unknown>>;
  shippingAddress: Record<string, unknown>;
  shippingOptionId: string;
  couponCode: string | null;
  guestEmail: string | null;
}

interface Props {
  payload: PayPalPayload;
  /** Called with the created order once payment is captured and recorded. */
  onPaid: (order: Record<string, unknown>) => void;
  /** Called with a human-readable reason when a payment could not complete. */
  onError: (message: string) => void;
}

// The SDK attaches itself to window.paypal. One loose type rather than pulling
// in the whole @paypal/paypal-js just for a Buttons signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { paypal?: any } }

let sdkPromise: Promise<void> | null = null;

/** Load the PayPal JS SDK once, memoised across mounts. */
function loadSdk(clientId: string): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${CURRENCY}&intent=capture`;
    s.onload = () => resolve();
    s.onerror = () => { sdkPromise = null; reject(new Error('Could not load PayPal.')); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return token ? { authorization: `Bearer ${token}` } : {};
}

export default function PayPalCheckout({ payload, onPaid, onError }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The latest payload, read at click time rather than closed over at render,
  // so a basket edit between render and click cannot pay for a stale basket.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadSdk(CLIENT_ID)
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !holder.current || !window.paypal) return;
    holder.current.innerHTML = '';

    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', label: 'pay', shape: 'pill' },

      // Ask our server to open the order. The body is the basket only; the
      // server prices it and opens PayPal for that total.
      createOrder: async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify(payloadRef.current),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.paypalOrderId) {
          throw new Error(data.error || 'Could not start the payment.');
        }
        return data.paypalOrderId;
      },

      // Capture server-side. The server re-prices, checks the captured amount,
      // reserves stock and writes the order — or refunds and tells us why.
      onApprove: async (data: { orderID: string }) => {
        const res = await fetch('/api/paypal/capture', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ ...payloadRef.current, paypalOrderId: data.orderID }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.order) {
          onError(body.error || 'The payment could not be completed.');
          return;
        }
        onPaid(body.order);
      },

      onError: () => onError('Something went wrong with PayPal. You have not been charged.'),
    });

    if (buttons.isEligible && !buttons.isEligible()) { setFailed(true); return; }
    buttons.render(holder.current).catch(() => setFailed(true));

    return () => { try { buttons.close(); } catch { /* already gone */ } };
  }, [ready, onPaid, onError]);

  // The single most important rule for this component: invisible unless the
  // credential exists. No credential, no button, no half-built payment UI.
  if (!CLIENT_ID) return null;

  return (
    <div style={{ marginTop: 'var(--spacing-24)' }}>
      {!IS_LIVE && (
      <div
        role="note"
        style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          padding: '12px 14px', marginBottom: '14px',
          background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)',
          fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5, color: '#713f12',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '15px' }}>🛠️</span>
        <span>
          <strong>Payments are under development.</strong> This is a PayPal <em>sandbox</em>
          {' '}checkout for testing — no real money moves. Live card payment is coming soon.
        </span>
      </div>
      )}

      {failed && (
        <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-sale)', margin: '0 0 10px' }}>
          PayPal could not load. Please try again, or use another method once it is available.
        </p>
      )}

      <div ref={holder} aria-busy={!ready} />
    </div>
  );
}
