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
  const customerUid = await createUser(CUSTOMER_EMAIL, PASSWORD, 'Demo Customer', null);

  await writeDoc('users', adminUid, { fullName: 'Store Admin', email: ADMIN_EMAIL, role: 'admin' });
  await writeDoc('users', customerUid, { fullName: 'Demo Customer', email: CUSTOMER_EMAIL, role: 'customer' });

  for (const p of SEED_PRODUCTS) {
    const { id, ...rest } = p;
    await writeDoc('products', id, {
      ...rest,
      specs: {},
      searchTerms: searchTerms(p.brand, p.model, p.category),
    });
  }

  return { adminUid, customerUid };
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

export async function countProducts() {
  const res = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/products`, { headers: authHeaders });
  const body = await res.json();
  return (body.documents ?? []).length;
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
