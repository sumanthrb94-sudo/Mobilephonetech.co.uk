/**
 * PayPal Orders v2, server side.
 *
 * Dormant until configured, exactly like the email provider: with no
 * PAYPAL_CLIENT_ID / PAYPAL_SECRET set, paypalConfigured() is false and the
 * routes refuse cleanly rather than throwing. The client pastes sandbox
 * credentials into the environment when they arrive; nothing here reads a
 * connected account or a hard-coded value.
 *
 *   PAYPAL_CLIENT_ID   REST app client id   (Developer Dashboard → Apps)
 *   PAYPAL_SECRET      REST app secret
 *   PAYPAL_ENV         "sandbox" (default) or "live"
 *
 * The money never comes from the browser. A PayPal order is created for the
 * total this server computed from the catalogue, and at capture the captured
 * amount is checked back against that total before anything is fulfilled.
 */

export type PayPalEnv = 'sandbox' | 'live';

export function paypalEnv(): PayPalEnv {
  return String(process.env.PAYPAL_ENV ?? '').trim().toLowerCase() === 'live' ? 'live' : 'sandbox';
}

/** The REST API base for the active environment. */
export function paypalApiBase(): string {
  return paypalEnv() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/** True only when both halves of the credential are present. */
export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

/**
 * Every PayPal call gets a hard deadline.
 *
 * A capture that hangs until the platform kills the function is the worst
 * outcome available: the money may already be taken, and no refund is ever
 * attempted because there is no stack frame left to attempt it in. Better to
 * fail while we can still react and write the failure down.
 */
const PAYPAL_TIMEOUT_MS = 8_000;
const deadline = () => AbortSignal.timeout(PAYPAL_TIMEOUT_MS);

export interface PayPalResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * An OAuth access token from the client id and secret.
 *
 * Not cached: these functions run in a serverless instance that may be frozen
 * between requests, so a module-level cache would be unreliable and, worse,
 * could outlive a credential rotation. A token call per checkout is a rounding
 * error next to the payment itself.
 */
async function accessToken(): Promise<PayPalResult<string>> {
  const id = String(process.env.PAYPAL_CLIENT_ID ?? '');
  const secret = String(process.env.PAYPAL_SECRET ?? '');
  if (!id || !secret) return { ok: false, status: 503, error: 'PayPal is not configured' };

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  try {
    const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: deadline(),
    });
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
    if (!res.ok || !body.access_token) {
      // A bad credential is the likeliest cause; say so without echoing it.
      return { ok: false, status: 502, error: body.error_description || `PayPal auth failed (${res.status})` };
    }
    return { ok: true, status: 200, data: body.access_token };
  } catch (err) {
    return { ok: false, status: 502, error: (err as Error).message };
  }
}

export interface CreatedOrder { id: string; status: string }

/**
 * Create a PayPal order for a fixed amount.
 *
 * The amount is whatever this server priced — the caller passes the total from
 * _orderCore, never a figure from the request. `reference` is our own order id,
 * carried through so the capture can be tied back to the basket we priced.
 */
export async function createPayPalOrder(
  amount: number,
  reference: string,
  currency = 'GBP',
): Promise<PayPalResult<CreatedOrder>> {
  const token = await accessToken();
  if (!token.ok) return { ok: false, status: token.status, error: token.error };

  try {
    const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.data}`,
        'content-type': 'application/json',
      },
      signal: deadline(),
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: reference,
          amount: { currency_code: currency, value: amount.toFixed(2) },
        }],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; status?: string; message?: string };
    if (!res.ok || !body.id) {
      return { ok: false, status: 502, error: body.message || `PayPal create failed (${res.status})` };
    }
    return { ok: true, status: 200, data: { id: body.id, status: body.status ?? 'CREATED' } };
  } catch (err) {
    return { ok: false, status: 502, error: (err as Error).message };
  }
}

export interface CaptureResult {
  status: string;
  /** The amount PayPal actually captured, in major units, per purchase unit. */
  capturedTotal: number;
  currency: string;
  captureId: string | null;
}

/**
 * Capture an approved PayPal order and report what was actually taken.
 *
 * The returned capturedTotal is the figure the caller must check against the
 * server-priced total before fulfilling: a mismatch — for any reason — is a
 * transaction to refund, not an order to ship.
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalResult<CaptureResult>> {
  const token = await accessToken();
  if (!token.ok) return { ok: false, status: token.status, error: token.error };

  try {
    const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.data}`,
        'content-type': 'application/json',
      },
      signal: deadline(),
    });
    const body = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      return { ok: false, status: 502, error: body?.message || `PayPal capture failed (${res.status})` };
    }

    const capture = body?.purchase_units?.[0]?.payments?.captures?.[0];
    const amount = capture?.amount ?? {};
    return {
      ok: true,
      status: 200,
      data: {
        status: String(body?.status ?? capture?.status ?? 'UNKNOWN'),
        capturedTotal: Number(amount.value ?? NaN),
        currency: String(amount.currency_code ?? ''),
        captureId: capture?.id ?? null,
      },
    };
  } catch (err) {
    return { ok: false, status: 502, error: (err as Error).message };
  }
}

/**
 * Refund a capture in full.
 *
 * The one honest response to a payment we took but cannot fulfil — the amount
 * was wrong, or the stock vanished between approval and capture. Best-effort:
 * a failed refund is logged loudly for a human, never swallowed.
 */
export async function refundCapture(captureId: string): Promise<PayPalResult<{ status: string }>> {
  const token = await accessToken();
  if (!token.ok) return { ok: false, status: token.status, error: token.error };

  try {
    const res = await fetch(`${paypalApiBase()}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.data}`,
        'content-type': 'application/json',
      },
      signal: deadline(),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
    if (!res.ok) return { ok: false, status: 502, error: body.message || `PayPal refund failed (${res.status})` };
    return { ok: true, status: 200, data: { status: String(body.status ?? 'COMPLETED') } };
  } catch (err) {
    return { ok: false, status: 502, error: (err as Error).message };
  }
}
