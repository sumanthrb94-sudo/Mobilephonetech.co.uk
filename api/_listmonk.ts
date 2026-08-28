/**
 * Listmonk — the campaign list, kept in step with Firestore.
 *
 * Listmonk (AGPLv3, https://listmonk.app) is the open-source half of the
 * setup: it owns lists, templates, campaigns, opens and clicks, and it is a
 * single Go binary plus Postgres, so it self-hosts cheaply. What it does not
 * do is deliver mail. It hands every message to an SMTP relay, and that relay
 * is the existing Brevo account — the same sender identity and the same
 * warmed domain the transactional mail in _email.ts already uses. Splitting it
 * that way keeps the marketing list under our own control while leaving
 * deliverability, DKIM alignment and IP reputation with a provider that does
 * it for a living.
 *
 * Firestore stays the source of truth for who signed up and on what consent.
 * Listmonk is a projection of it. That direction matters: if Listmonk is lost
 * or rebuilt, the list can be regenerated with scripts/listmonk-sync.mjs, and
 * the consent evidence never lived anywhere that could vanish with it.
 *
 * Configure with (server-side only, never VITE_):
 *
 *   LISTMONK_URL       base URL, e.g. https://mail.lehart.co.uk
 *   LISTMONK_USERNAME  API user from Listmonk → Admin → Users
 *   LISTMONK_TOKEN     that user's API token
 *   LISTMONK_LIST_ID   numeric id of the target list
 *   LISTMONK_AUTH      'token' (default, Listmonk v4+) or 'basic' (v3 and older)
 *
 * With any of the first four unset every call becomes a logged no-op rather
 * than an error, exactly as the Brevo helper does. A marketing-list outage
 * must never cost us a subscriber: the signup is already durably in Firestore
 * by the time we get here, and the backfill script reconciles the difference.
 */

const SYNC_TIMEOUT_MS = 5000;

export interface ListmonkResult {
  synced: boolean;
  skipped?: string;
  error?: string;
  /** 'created' or 'updated' — useful when reconciling a backfill run. */
  action?: 'created' | 'updated';
}

export function listmonkConfigured(): boolean {
  return Boolean(
    process.env.LISTMONK_URL &&
      process.env.LISTMONK_USERNAME &&
      process.env.LISTMONK_TOKEN &&
      process.env.LISTMONK_LIST_ID,
  );
}

function baseUrl(): string {
  return String(process.env.LISTMONK_URL).replace(/\/+$/, '');
}

function listId(): number {
  return Number(process.env.LISTMONK_LIST_ID);
}

/**
 * Listmonk v4 introduced API users authenticated with `token user:token`.
 * v3 and earlier used HTTP Basic against the admin login. Both are still in
 * the wild, so the scheme is selectable rather than guessed.
 */
function authHeader(): string {
  const user = String(process.env.LISTMONK_USERNAME);
  const token = String(process.env.LISTMONK_TOKEN);
  if ((process.env.LISTMONK_AUTH ?? 'token').toLowerCase() === 'basic') {
    return `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`;
  }
  return `token ${user}:${token}`;
}

async function call(
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<{ ok: boolean; status: number; body: any }> {
  // A hung campaign host must not hold a customer's signup open until the
  // function times out. Five seconds is far longer than a healthy call needs.
  const abort = AbortSignal.timeout(SYNC_TIMEOUT_MS);

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      authorization: authHeader(),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: abort,
  });

  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Listmonk's query language is SQL over the subscribers table. */
function findByEmail(email: string): Promise<{ ok: boolean; status: number; body: any }> {
  const query = encodeURIComponent(`subscribers.email = '${email.replace(/'/g, "''")}'`);
  return call(`/api/subscribers?page=1&per_page=1&query=${query}`);
}

export interface SubscriberInput {
  email: string;
  name?: string | null;
  /** Mirrored into Listmonk attribs so a campaign can segment on them. */
  attribs?: Record<string, unknown>;
}

/**
 * Create the subscriber, or update them if the address is already known.
 *
 * Listmonk answers a duplicate create with 409 rather than upserting, so the
 * conflict is the signal to look the id up and PUT instead. Anything else is
 * reported but never thrown — see the module comment on why this is
 * best-effort.
 *
 * preconfirm_subscriptions is set because the consent record written in
 * api/_routes/newsletter.ts is the confirmation. Leaving it false would park
 * every subscriber as 'unconfirmed' and silently exclude them from every
 * campaign sent to a double opt-in list.
 */
export async function upsertSubscriber(input: SubscriberInput): Promise<ListmonkResult> {
  if (!listmonkConfigured()) {
    return { synced: false, skipped: 'LISTMONK_URL, USERNAME, TOKEN or LIST_ID is not set' };
  }

  const email = input.email.trim().toLowerCase();
  const payload = {
    email,
    // Listmonk rejects an empty name, and the address is a fair stand-in.
    name: input.name?.trim() || email.split('@')[0],
    status: 'enabled',
    lists: [listId()],
    attribs: input.attribs ?? {},
    preconfirm_subscriptions: true,
  };

  try {
    const created = await call('/api/subscribers', { method: 'POST', body: payload });
    if (created.ok) return { synced: true, action: 'created' };

    if (created.status !== 409) {
      const detail = created.body?.message ?? JSON.stringify(created.body).slice(0, 200);
      return { synced: false, error: `Listmonk responded ${created.status}: ${detail}` };
    }

    // Already present — find the id and update in place.
    const found = await findByEmail(email);
    const id = found.body?.data?.results?.[0]?.id;
    if (!id) {
      return { synced: false, error: 'Listmonk reported a duplicate but the lookup returned nothing' };
    }

    const updated = await call(`/api/subscribers/${id}`, { method: 'PUT', body: payload });
    if (updated.ok) return { synced: true, action: 'updated' };

    const detail = updated.body?.message ?? JSON.stringify(updated.body).slice(0, 200);
    return { synced: false, error: `Listmonk responded ${updated.status} on update: ${detail}` };
  } catch (err) {
    return { synced: false, error: (err as Error).message };
  }
}

/**
 * Move an address to 'blocklisted', which is how Listmonk records an
 * unsubscribe. Used by the backfill when Firestore says isActive is false, so
 * an opt-out made on the site is honoured on the campaign side too.
 */
export async function blocklistSubscriber(email: string): Promise<ListmonkResult> {
  if (!listmonkConfigured()) {
    return { synced: false, skipped: 'LISTMONK_URL, USERNAME, TOKEN or LIST_ID is not set' };
  }

  try {
    const found = await findByEmail(email.trim().toLowerCase());
    const id = found.body?.data?.results?.[0]?.id;
    // Never subscribed on the Listmonk side; nothing to suppress.
    if (!id) return { synced: true, action: 'updated' };

    const res = await call('/api/subscribers/query/blocklist', {
      method: 'PUT',
      body: { ids: [id] },
    });
    if (res.ok) return { synced: true, action: 'updated' };

    const detail = res.body?.message ?? JSON.stringify(res.body).slice(0, 200);
    return { synced: false, error: `Listmonk responded ${res.status} on blocklist: ${detail}` };
  } catch (err) {
    return { synced: false, error: (err as Error).message };
  }
}

/** Health probe for /api/health — cheap, and proves auth works. */
export async function listmonkHealth(): Promise<{ reachable: boolean; detail?: string }> {
  if (!listmonkConfigured()) return { reachable: false, detail: 'unconfigured' };
  try {
    const res = await call(`/api/lists/${listId()}`);
    if (res.ok) return { reachable: true };
    return { reachable: false, detail: `responded ${res.status}` };
  } catch (err) {
    return { reachable: false, detail: (err as Error).message };
  }
}
