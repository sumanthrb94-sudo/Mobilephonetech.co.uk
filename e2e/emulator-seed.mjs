// Seed the Firebase emulator suite for the admin E2E run.
//
// Talks to the emulators' REST endpoints directly rather than through
// firebase-admin: the emulators accept an "owner" bearer token, so there is no
// service account to configure and no credentials anywhere in the repo.
//
// Creates two accounts — an admin (with the `admin` custom claim, exactly as
// scripts/create-users.mjs sets it in production) and a plain customer — plus
// two products.

const PROJECT = process.env.E2E_FIREBASE_PROJECT || 'demo-lehart';
const HOST = process.env.E2E_EMULATOR_HOST || '127.0.0.1';
const AUTH = `http://${HOST}:9099`;
const FIRESTORE = `http://${HOST}:8080`;

export const ADMIN_EMAIL = 'admin@lehart.co.uk';
export const CUSTOMER_EMAIL = 'customer@lehart.co.uk';
/**
 * The lesser back-office role — see src/lib/adminRoles.ts.
 *
 * Seeded alongside the manager because a role split that is never exercised
 * from the outside is a claim rather than a boundary: the only way to know
 * staff cannot rewrite the shop front is to sign in as one and try.
 */
export const STAFF_EMAIL = 'staff@lehart.co.uk';
// Test-only credential for the local emulator, deliberately NOT the real
// admin password: the emulator is throwaway, but this file is committed, and a
// production password in git is a production password leaked.
export const PASSWORD = 'emulator-test-pw-1';

const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

async function jsonFetch(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} -> ${res.status} ${text.slice(0, 200)}`);
  return body;
}

export async function waitForEmulators(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const [a, f] = await Promise.all([
        fetch(`${AUTH}/`).then(r => r.status, () => 0),
        fetch(`${FIRESTORE}/`).then(r => r.status, () => 0),
      ]);
      if (a && f) return true;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Emulators did not become ready in time');
}

/** Delete every account and product, so each run starts from a known state. */
export async function reset() {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE', headers: authHeaders })
    .catch(() => {});
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE', headers: authHeaders }).catch(() => {});
}

async function createUser(email, password, displayName, claims) {
  const created = await jsonFetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
    },
  );

  // The admin claim is what firestore.rules and storage.rules actually check.
  // Setting it here mirrors auth.setCustomUserClaims in create-users.mjs.
  if (claims) {
    await jsonFetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        localId: created.localId,
        customAttributes: JSON.stringify(claims),
        emailVerified: true,
      }),
    });
  }

  return created.localId;
}

/** Firestore REST wants every value tagged with its type. */
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function writeDoc(collection, id, data) {
  // The emulator's REST surface enforces the security rules like any other
  // client, so seeding as an anonymous caller is rejected by firestore.rules.
  // "Bearer owner" is the emulator's privileged token — the equivalent of the
  // Admin SDK — which is what lets the seed write past the rules the browser
  // will then be held to.
  await jsonFetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(id)}`,
    { method: 'POST', headers: authHeaders, body: JSON.stringify({ fields: toFields(data) }) },
  );
}

function searchTerms(brand, model, category) {
  const words = `${brand} ${model} ${category ?? ''}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const terms = new Set(words);
  for (const w of words) for (let i = 2; i < Math.min(w.length, 12); i++) terms.add(w.slice(0, i));
  return [...terms].slice(0, 120);
}

export const SEED_PRODUCTS = [
  {
    id: 'apple-iphone-17',
    model: 'iPhone 17', brand: 'Apple', category: 'Phones', storage: '256GB',
    price: 759, originalPrice: 1099, grade: 'Good', batteryHealth: 90,
    warrantyMonths: 12, returnDays: 30,
    imageUrl: '/assets/iphone-17-pro-max-orange.jpg',
    isCertified: true, stock: 4, createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'samsung-galaxy-s23',
    model: 'Galaxy S23', brand: 'Samsung', category: 'Phones', storage: '128GB',
    price: 399, originalPrice: 849, grade: 'Excellent', batteryHealth: 94,
    warrantyMonths: 12, returnDays: 30,
    imageUrl: '/assets/galaxy-s23.jpg',
    isCertified: true, stock: 0, createdAt: '2026-01-01T00:00:00Z',
  },
];

export async function seed() {
  await reset();

  const adminUid = await createUser(ADMIN_EMAIL, PASSWORD, 'Store Admin', { admin: true });
  // Only the staff claim, never both: firestore.rules reads isStaff() as an
  // OR over the two, so an account carrying admin as well would silently be a
  // manager and every staff-cannot-do-this assertion below would pass by
  // testing a manager.
  const staffUid = await createUser(STAFF_EMAIL, PASSWORD, 'Shop Floor', { staff: true });
  const customerUid = await createUser(CUSTOMER_EMAIL, PASSWORD, 'Demo Customer', null);

  await writeDoc('users', adminUid, { fullName: 'Store Admin', email: ADMIN_EMAIL, role: 'admin' });
  await writeDoc('users', staffUid, { fullName: 'Shop Floor', email: STAFF_EMAIL, role: 'staff' });
  await writeDoc('users', customerUid, { fullName: 'Demo Customer', email: CUSTOMER_EMAIL, role: 'customer' });

  for (const p of SEED_PRODUCTS) {
    const { id, ...rest } = p;
    const catalogueModelId = catalogueIdFor(p.brand, p.model);
    // Catalogue entry first, then the listing that points at it — the order
    // production has to happen in, since staff can only list a model the
    // catalogue already carries.
    await writeDoc('catalogueModels', catalogueModelId, { brand: p.brand, model: p.model });
    await writeDoc('products', id, {
      ...rest,
      catalogueModelId,
      specs: {},
      searchTerms: searchTerms(p.brand, p.model, p.category),
    });
  }

  return { adminUid, staffUid, customerUid };
}

/**
 * The catalogue document id for a brand and model — the same derivation as
 * catalogueModelId() in src/lib/catalogue.ts, repeated here because the
 * harness is plain Node and cannot import the app's TypeScript. If the two
 * ever disagreed, every seeded listing would point at an entry the editor
 * cannot find, and the staff suites would fail for a reason that looks like
 * the catalogue being broken rather than the harness.
 */
export function catalogueIdFor(brand, model) {
  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return `${slug(brand)}__${slug(model)}`;
}

/**
 * Add catalogue entries directly, as a manager's import would.
 *
 * Adding a model that is already there is a no-op, as it is in the app —
 * addCatalogueModel returns the existing entry, and the import skips what is
 * present. The first version created every entry unconditionally, so the
 * volume seed died with a 409 on the Galaxy S23 that seed() had already
 * added, and everything run after it that day ran against the two-product
 * fixture instead of twelve hundred products without saying so.
 */
export async function seedCatalogue(entries) {
  for (const { brand, model, retiredAt } of entries) {
    try {
      await writeDoc('catalogueModels', catalogueIdFor(brand, model), {
        brand, model, ...(retiredAt ? { retiredAt } : {}),
      });
    } catch (err) {
      if (!/ALREADY_EXISTS|-> 409/.test(String(err?.message))) throw err;
    }
  }
}

/**
 * Write additional catalogue rows on top of seed().
 *
 * The two-product fixture is deliberate for tests — it keeps assertions about
 * counts and filters readable. Screenshot capture wants the opposite: an admin
 * console holding two rows misrepresents the thing being photographed.
 */
export async function seedExtraProducts(products) {
  for (const p of products) {
    const { id, ...rest } = p;
    await writeDoc('products', id, {
      ...rest,
      specs: rest.specs ?? {},
      searchTerms: searchTerms(p.brand, p.model, p.category),
    });
  }
}

/**
 * Write a few orders. The dashboard's revenue KPI and recent-orders panel have
 * nothing to show without them, and "no orders yet" is a different code path
 * from "orders rendered" — both are worth being able to exercise.
 */
export async function seedOrders(orders) {
  for (const o of orders) {
    const { id, ...rest } = o;
    await writeDoc('orders', id, rest);
  }
}

/** Read a product back, so a test can assert what actually landed in the DB. */
export async function getProduct(id) {
  const res = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/products/${id}`, { headers: authHeaders });
  if (res.status === 404) return null;
  const body = await res.json();
  const out = {};
  for (const [k, v] of Object.entries(body.fields ?? {})) {
    out[k] = v.stringValue ?? (v.integerValue != null ? Number(v.integerValue)
      : v.doubleValue ?? v.booleanValue ?? (v.nullValue !== undefined ? null : v));
  }
  return out;
}

/**
 * How many products the database actually holds.
 *
 * Follows the page token, which the first version did not. Firestore's REST
 * list endpoint returns a page — thirty documents by default — and a
 * `nextPageToken`, so counting the first response returned 30 for a
 * two-product fixture's worth of truth and 30 for a catalogue of twelve
 * hundred. It read correctly for every test that used it, because every test
 * that used it had fewer than thirty products.
 *
 * That is the shape of bug this helper is now used to hunt: a count that is
 * quietly wrong, on screen, with nothing saying anything is missing.
 */
export async function countProducts() {
  let count = 0;
  let pageToken;

  do {
    const url = new URL(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/products`);
    url.searchParams.set('pageSize', '300');
    // Only the ids are needed, and asking for no fields keeps a twelve
    // hundred document count from dragging every document body over the wire.
    url.searchParams.set('mask.fieldPaths', '__name__');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url, { headers: authHeaders });
    const body = await res.json();
    count += (body.documents ?? []).length;
    pageToken = body.nextPageToken;
  } while (pageToken);

  return count;
}

/**
 * Sign in for real and return the ID token, which carries the custom claims.
 */
export async function signInForToken(email, password = PASSWORD) {
  const body = await jsonFetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  return body.idToken;
}

/**
 * Attempt a product write as a real signed-in user and report what the
 * security rules decided.
 *
 * This is the check that a stubbed backend cannot make: the rules in
 * firestore.rules are evaluated by the emulator against a genuine ID token, so
 * the result reflects what production would do rather than what a mock was
 * written to return.
 *
 * Returns 'ALLOWED' or 'DENIED:<status>'.
 */
export async function attemptProductWriteAs(email, productId, fields) {
  const idToken = await signInForToken(email);
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/products/${productId}?${mask}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFields(fields) }),
    },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/**
 * Attempt to post a support message as a given user, claiming a given sender.
 *
 * The rule worth proving is that a customer cannot post a message labelled
 * `sender: 'admin'` — otherwise a shopper could manufacture a promise the shop
 * never made and point at it later.
 */
export async function attemptMessageAs(email, conversationId, sender) {
  const idToken = await signInForToken(email);
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: toFields({ body: 'rules probe', sender, senderName: 'probe', at: new Date().toISOString() }),
      }),
    },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/** Attempt to read another customer's return. Must be refused. */
export async function attemptReturnReadAs(email, rmaId) {
  const idToken = await signInForToken(email);
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/returns/${rmaId}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

// ── Raw REST helpers for the security audit ────────────────────
// Deliberately generic: the audit needs to send requests the UI would never
// construct, because that is exactly what an attacker does.

export { toFields };

/** Sign in and return a real ID token for the given account. */
export async function tokenFor(email) {
  return signInForToken(email);
}

/** POST a document as a given user. Returns ALLOWED or DENIED:<status>. */
export async function attemptCreateAs(email, path, data, docId) {
  const idToken = await signInForToken(email);
  const qs = docId ? `?documentId=${encodeURIComponent(docId)}` : '';
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}${qs}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFields(data) }),
    },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/** PATCH specific fields of a document as a given user. */
export async function attemptUpdateAs(email, path, fields) {
  const idToken = await signInForToken(email);
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFields(fields) }),
    },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/** GET a document as a given user (or anonymously when email is null). */
export async function attemptReadAs(email, path) {
  const headers = {};
  if (email) headers.Authorization = `Bearer ${await signInForToken(email)}`;
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/** Write a document with privileged access, for setting up an attack target. */
export async function seedDoc(collection, id, data) {
  return writeDoc(collection, id, data);
}

/**
 * DELETE a document as a given user.
 *
 * Added for the role audit: "a product can no longer be deleted by anybody"
 * is a rule nothing could previously check, because there was no way to try.
 * An assertion you have no means to falsify is not an assertion.
 */
export async function attemptDeleteAs(email, path) {
  const idToken = await signInForToken(email);
  const res = await fetch(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${idToken}` } },
  );
  return res.ok ? 'ALLOWED' : `DENIED:${res.status}`;
}

/**
 * Every document in a collection, read with owner access, as plain objects.
 *
 * For asserting on what the database actually holds after a browser run —
 * that a staff member's model request exists, that approving it made a
 * catalogue entry. What the page says happened and what happened are
 * different claims, and only the second is the one being tested. Follows the
 * page token; countProducts() once did not, and counted thirty for a
 * catalogue of twelve hundred.
 */
export async function listCollection(name) {
  const out = [];
  let pageToken;
  do {
    const url = new URL(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${name}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const body = await (await fetch(url, { headers: authHeaders })).json();
    for (const d of body.documents ?? []) {
      const row = { id: d.name.split('/').pop() };
      for (const [k, v] of Object.entries(d.fields ?? {})) {
        row[k] = v.stringValue ?? (v.integerValue != null ? Number(v.integerValue)
          : v.doubleValue ?? v.booleanValue ?? v.timestampValue ?? (v.nullValue !== undefined ? null : v));
      }
      out.push(row);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out;
}
