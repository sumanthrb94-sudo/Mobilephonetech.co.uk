/**
 * Brevo contacts — the audience behind campaigns and automations.
 *
 * Separate from _email.ts, which only sends. This is the list side: contacts,
 * their attributes, and their subscription state. Brevo needs a contact to
 * exist before an automation (abandoned cart, welcome series) can target it,
 * and before a campaign can reach it.
 *
 * This runs alongside the Listmonk sync rather than instead of it, and both
 * are projections of the same Firestore truth. Which one you actually send
 * campaigns from is a decision you can make later, or change, without
 * touching the signup path — that is the point of keeping Firestore
 * authoritative.
 *
 * Uses BREVO_API_KEY, the same key as the transactional sends. Configure the
 * target list with:
 *
 *   BREVO_LIST_ID   numeric id from Brevo → Contacts → Lists
 *
 * With the key unset every call is a logged no-op, exactly as sendEmail is.
 */

const API = 'https://api.brevo.com/v3';
const TIMEOUT_MS = 5000;

export interface ContactResult {
  synced: boolean;
  skipped?: string;
  error?: string;
}

export function contactsConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

async function call(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'api-key': String(process.env.BREVO_API_KEY),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    // A slow contacts API must not hold a customer's signup open until the
    // function times out.
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  // 204 No Content is the success shape for several of these endpoints.
  const parsed = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: parsed };
}

/** Brevo attribute names are uppercase by convention and case-sensitive. */
export interface ContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  sms?: string | null;
  attributes?: Record<string, unknown>;
}

/**
 * Create or update a contact and put it on the configured list.
 *
 * updateEnabled makes this a genuine upsert, which is the one place Brevo's
 * API is kinder than Listmonk's — no 409-then-lookup-then-PUT dance.
 */
export async function upsertContact(input: ContactInput): Promise<ContactResult> {
  if (!contactsConfigured()) {
    return { synced: false, skipped: 'BREVO_API_KEY is not set' };
  }

  const email = input.email.trim().toLowerCase();
  const listId = Number(process.env.BREVO_LIST_ID);

  const attributes: Record<string, unknown> = { ...(input.attributes ?? {}) };
  if (input.firstName) attributes.FIRSTNAME = input.firstName.trim();
  if (input.lastName) attributes.LASTNAME = input.lastName.trim();
  // Brevo wants SMS in international format without a leading +.
  if (input.sms) attributes.SMS = input.sms.replace(/[^\d]/g, '');

  try {
    const res = await call('/contacts', 'POST', {
      email,
      attributes,
      // Without this a returning subscriber is a 400 "Contact already exist"
      // rather than an update, and the newer attributes are silently lost.
      updateEnabled: true,
      ...(Number.isFinite(listId) && listId > 0 ? { listIds: [listId] } : {}),
    });

    if (res.ok) return { synced: true };
    return {
      synced: false,
      error: `Brevo responded ${res.status}: ${res.body?.message ?? JSON.stringify(res.body).slice(0, 200)}`,
    };
  } catch (err) {
    return { synced: false, error: (err as Error).message };
  }
}

/**
 * Mark a contact as unsubscribed from email.
 *
 * emailBlacklisted is Brevo's own suppression flag — set it and Brevo itself
 * refuses to send, which is stronger than merely removing them from a list.
 * That distinction matters: a contact removed from one list can still be
 * caught by an automation, whereas a blacklisted one cannot.
 */
export async function suppressContact(email: string, reason?: string): Promise<ContactResult> {
  if (!contactsConfigured()) {
    return { synced: false, skipped: 'BREVO_API_KEY is not set' };
  }

  try {
    const res = await call(`/contacts/${encodeURIComponent(email.trim().toLowerCase())}`, 'PUT', {
      emailBlacklisted: true,
      ...(reason ? { attributes: { SUPPRESSION_REASON: reason.slice(0, 100) } } : {}),
    });

    // A contact Brevo has never seen cannot receive anything, so 404 is the
    // desired end state rather than a failure.
    if (res.ok || res.status === 404) return { synced: true };
    return { synced: false, error: `Brevo responded ${res.status} on suppress` };
  } catch (err) {
    return { synced: false, error: (err as Error).message };
  }
}
