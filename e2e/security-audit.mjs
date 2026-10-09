// Adversarial security audit.
//
//   npm run audit:security      (needs the emulator suite running)
//
// This is not a checklist. Every entry below is an ATTACK executed against the
// real security rules with a real customer ID token, sending requests the UI
// would never construct — because that is exactly what an attacker does.
//
// Two kinds of assertion, and both are load-bearing:
//
//   EXPLOIT — must be DENIED. A pass means the rules refused it.
//   CONTROL — must be ALLOWED. Without these, a suite where every request is
//             malformed would report a clean bill of health while testing
//             nothing at all. The controls prove the requests are well-formed
//             and the transport works, so a denial is a real denial.
import {
  seed, waitForEmulators, seedDoc,
  attemptCreateAs, attemptUpdateAs, attemptReadAs, readAs, tokenFor,
  ADMIN_EMAIL, CUSTOMER_EMAIL,
} from './emulator-seed.mjs';

const findings = [];
const results = [];

const check = (kind, name, outcome, detail = '') => {
  const ok = kind === 'EXPLOIT' ? outcome.startsWith('DENIED') : outcome === 'ALLOWED';
  results.push({ kind, name, ok, outcome });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${kind}] ${name} -> ${outcome}${detail ? ` — ${detail}` : ''}`);
  if (!ok && kind === 'EXPLOIT') findings.push({ name, outcome, detail });
  return ok;
};

await waitForEmulators();
const { customerUid, adminUid } = await seed();

// A second customer, to prove one shopper cannot reach another's data.
const VICTIM_EMAIL = 'victim@lehart.co.uk';

// Attack targets owned by somebody else, written with privileged access so
// the attack starts from a realistic database rather than an empty one.
const VICTIM_UID = 'victim-uid-fixed';
await seedDoc('users', VICTIM_UID, { fullName: 'Victim', email: VICTIM_EMAIL, role: 'customer' });
await seedDoc('orders', 'ORD-VICTIM', {
  userId: VICTIM_UID, total: 759, subtotal: 759, status: 'confirmed',
  createdAt: new Date().toISOString(), items: [],
});
await seedDoc('returns', 'RMA-VICTIM', {
  userId: VICTIM_UID, orderId: 'ORD-VICTIM', status: 'requested', outcome: 'refund',
  customerEmail: VICTIM_EMAIL, refundAmount: 759, items: [{ productId: 'x', quantity: 1, price: 759 }],
  history: [], photoUrls: [], createdAt: new Date().toISOString(),
});
await seedDoc('newsletterSubscribers', 'victim@example.com', {
  email: 'victim@example.com', isActive: true,
  consent: { at: '2026-01-01T00:00:00Z', source: 'website-signup', method: 'single-opt-in' },
});
await seedDoc('orders', 'ORD-MINE', {
  userId: customerUid, total: 759, subtotal: 759, status: 'confirmed',
  createdAt: new Date().toISOString(), items: [],
});
// What a handset cost us, who sold it and its IMEI: staff data kept in
// productPrivate because every product document is public.
await seedDoc('productPrivate', 'apple-iphone-17', {
  buyPrice: 480, supplier: 'MHL', imei: '356789012345678', sku: 'IP17-256', variants: {},
});
// One for the customer's own order below: the probes above use up the
// iPhone's stock.
await seedDoc('products', 'cost-probe-phone', {
  model: 'Cost Probe', brand: 'Apple', category: 'Phones', price: 650, originalPrice: 700,
  grade: 'Good', stock: 2, createdAt: '2025-01-02T00:00:00Z', specs: {},
});
await seedDoc('productPrivate', 'cost-probe-phone', { buyPrice: 480, variants: {} });
// A product written before that split, still carrying its cost on the public
// document. The catalogue routes must not serve it.
await seedDoc('products', 'legacy-cost-phone', {
  model: 'Legacy Phone', brand: 'Apple', category: 'Phones', price: 300, originalPrice: 400,
  grade: 'Good', stock: 1, createdAt: '2025-01-01T00:00:00Z', specs: {},
  buyPrice: 211, supplier: 'LEGACY-SUPPLIER', imei: '351111111111111', sku: 'LEGACY-SKU',
  variants: [{
    id: 'v1', price: 300, originalPrice: 400, stock: 1, condition: 'Good',
    buyPrice: 211, supplier: 'LEGACY-SUPPLIER', notes: 'legacy note',
    inventoryUnits: [{ id: 'u1', imei: '351111111111111', buyPrice: 211, status: 'available' }],
  }],
});
await seedDoc('reviews', 'REV-1', {
  userId: customerUid, productId: 'apple-iphone-17', rating: 5,
  isVerified: false, body: 'Great', createdAt: new Date().toISOString(),
});

console.log('\n─── CONTROLS: the requests are well-formed ───');

check('CONTROL', 'Customer can read their own order',
  await attemptReadAs(CUSTOMER_EMAIL, 'orders/ORD-MINE'));

check('CONTROL', 'Customer can read their own user document',
  await attemptReadAs(CUSTOMER_EMAIL, `users/${customerUid}`));

check('CONTROL', 'Anyone can read the public catalogue',
  await attemptReadAs(null, 'products/apple-iphone-17'));

check('CONTROL', 'Admin can write a product',
  await attemptUpdateAs(ADMIN_EMAIL, 'products/apple-iphone-17', { price: 700 }));

check('CONTROL', 'Admin can read a product\'s costs',
  await attemptReadAs(ADMIN_EMAIL, 'productPrivate/apple-iphone-17'));

check('CONTROL', 'Admin can write a product\'s costs',
  await attemptUpdateAs(ADMIN_EMAIL, 'productPrivate/apple-iphone-17', { buyPrice: 480 }));

console.log('\n─── EXPLOITS: privilege and identity ───');

check('EXPLOIT', 'Customer escalates their own role to admin',
  await attemptUpdateAs(CUSTOMER_EMAIL, `users/${customerUid}`, { role: 'admin' }),
  'would be cosmetic today, catastrophic if any future code trusted the field');

check('EXPLOIT', 'Customer writes to the product catalogue',
  await attemptUpdateAs(CUSTOMER_EMAIL, 'products/apple-iphone-17', { price: 1 }));

check('EXPLOIT', 'Customer reads the newsletter subscriber list',
  await attemptReadAs(CUSTOMER_EMAIL, 'newsletterSubscribers/victim@example.com'));

console.log('\n─── EXPLOITS: the shop\'s costs and stock ledger ───');

check('EXPLOIT', 'Anonymous visitor reads what a product cost',
  await attemptReadAs(null, 'productPrivate/apple-iphone-17'));

check('EXPLOIT', 'Customer reads what a product cost',
  await attemptReadAs(CUSTOMER_EMAIL, 'productPrivate/apple-iphone-17'));

check('EXPLOIT', 'Customer lists every product\'s cost',
  await attemptReadAs(CUSTOMER_EMAIL, 'productPrivate'));

check('EXPLOIT', 'Customer rewrites a product\'s cost',
  await attemptUpdateAs(CUSTOMER_EMAIL, 'productPrivate/apple-iphone-17', { buyPrice: 1 }));

{
  const pub = (await readAs(null, 'products/apple-iphone-17')).data ?? {};
  const leaked = ['buyPrice', 'supplier', 'imei', 'sku'].filter(k => k in pub);
  check('EXPLOIT', 'Public product document carries a cost, supplier, IMEI or SKU',
    leaked.length ? `ALLOWED:${leaked.join(',')}` : 'DENIED:not-on-public-doc');
}

console.log('\n─── EXPLOITS: reading other people\'s data (IDOR) ───');

check('EXPLOIT', "Customer reads another shopper's order",
  await attemptReadAs(CUSTOMER_EMAIL, 'orders/ORD-VICTIM'));

check('EXPLOIT', "Customer reads another shopper's return",
  await attemptReadAs(CUSTOMER_EMAIL, 'returns/RMA-VICTIM'));

check('EXPLOIT', "Customer reads another shopper's user document",
  await attemptReadAs(CUSTOMER_EMAIL, `users/${VICTIM_UID}`));

check('EXPLOIT', "Customer reads another shopper's basket",
  await attemptReadAs(CUSTOMER_EMAIL, `users/${VICTIM_UID}/cart/item-1`));

check('EXPLOIT', "Customer reads another shopper's support thread",
  await attemptReadAs(CUSTOMER_EMAIL, `conversations/${VICTIM_UID}`));

check('EXPLOIT', 'Anonymous visitor reads an order',
  await attemptReadAs(null, 'orders/ORD-VICTIM'));

console.log('\n─── EXPLOITS: writing other people\'s data ───');

check('EXPLOIT', "Customer alters another shopper's order",
  await attemptUpdateAs(CUSTOMER_EMAIL, 'orders/ORD-VICTIM', { status: 'delivered' }));

check('EXPLOIT', "Customer resolves another shopper's return",
  await attemptUpdateAs(CUSTOMER_EMAIL, 'returns/RMA-VICTIM', { status: 'resolved' }));

check('EXPLOIT', 'Customer marks their OWN return resolved',
  await attemptUpdateAs(CUSTOMER_EMAIL, 'returns/RMA-VICTIM', { status: 'resolved' }),
  'self-service refund approval');

console.log('\n─── EXPLOITS: money and trust ───');

check('EXPLOIT', 'Customer orders a £759 phone for 1p',
  await attemptCreateAs(CUSTOMER_EMAIL, 'orders', {
    userId: customerUid, total: 0.01, subtotal: 0.01, status: 'pending',
    createdAt: new Date().toISOString(),
    items: [{ id: 'apple-iphone-17', model: 'iPhone 17', quantity: 1, price: 0.01 }],
  }, 'ORD-CHEAP'),
  'prices must come from the catalogue, server-side');

check('EXPLOIT', 'Customer creates an order already marked paid',
  await attemptCreateAs(CUSTOMER_EMAIL, 'orders', {
    userId: customerUid, total: 759, subtotal: 759, status: 'delivered',
    createdAt: new Date().toISOString(), items: [],
  }, 'ORD-PAID'));

check('EXPLOIT', 'Customer claims a refund larger than they paid',
  await attemptCreateAs(CUSTOMER_EMAIL, 'returns', {
    userId: customerUid, orderId: 'ORD-MINE', status: 'requested', outcome: 'refund',
    customerEmail: CUSTOMER_EMAIL, customerName: 'Attacker',
    refundAmount: 99999, items: [{ productId: 'apple-iphone-17', quantity: 1, price: 99999 }],
    history: [], photoUrls: [], createdAt: new Date().toISOString(),
  }, 'RMA-INFLATED'),
  'refundAmount is client-supplied');

check('EXPLOIT', "Customer raises a return against someone else's order",
  await attemptCreateAs(CUSTOMER_EMAIL, 'returns', {
    userId: customerUid, orderId: 'ORD-VICTIM', status: 'requested', outcome: 'refund',
    customerEmail: CUSTOMER_EMAIL, customerName: 'Attacker',
    refundAmount: 759, items: [{ productId: 'apple-iphone-17', quantity: 1, price: 759 }],
    history: [], photoUrls: [], createdAt: new Date().toISOString(),
  }, 'RMA-STOLEN'),
  'ownership of the referenced order is never verified');

check('EXPLOIT', 'Customer awards their own review the Verified badge',
  await attemptUpdateAs(CUSTOMER_EMAIL, 'reviews/REV-1', { isVerified: true }),
  'create forces isVerified false, but update does not');

// PATCH, not POST-with-id. The first version of this check used POST and
// "passed" on a 409 ALREADY_EXISTS — a conflict, not a refusal. It proved
// nothing about the rules while reporting a clean result.
check('EXPLOIT', "Customer overwrites someone else's newsletter consent record",
  await attemptUpdateAs(CUSTOMER_EMAIL, 'newsletterSubscribers/victim@example.com', {
    isActive: false,
  }),
  'destroys the evidence that makes the list lawfully mailable');

check('EXPLOIT', 'Anonymous visitor writes to the subscriber list',
  await attemptCreateAs(CUSTOMER_EMAIL, 'newsletterSubscribers', {
    email: 'attacker@example.com', isActive: true,
  }, 'attacker@example.com'),
  'signup must go through the rate-limited, consent-recording route');

console.log('\n─── EXPLOITS: support thread integrity ───');

check('EXPLOIT', 'Customer posts a message labelled as staff',
  await attemptCreateAs(CUSTOMER_EMAIL, `conversations/${customerUid}/messages`, {
    body: 'We will refund you £5000', sender: 'admin', senderName: 'LeHart support',
    at: new Date().toISOString(),
  }),
  'would manufacture a promise the shop never made');

check('EXPLOIT', 'Customer edits a message after the fact',
  await attemptUpdateAs(CUSTOMER_EMAIL, `conversations/${customerUid}/messages/anything`, {
    body: 'edited',
  }));

// ── API-level attacks ─────────────────────────────────────────
// The rules stop the browser writing orders at all, so the attack surface
// moved to /api/orders. These probe the handler itself.
const API = process.env.E2E_API_URL || 'http://127.0.0.1:4174';
// Every field the order route requires. It gained a phone requirement after
// this was written, and without one every request below was refused for the
// missing phone before any pricing ran — so each "exploit" was denied for the
// wrong reason and the control that would have caught it read as FAIL. A
// control that fails makes every denial above it unproven, which is the point
// of having one; keep this address complete.
const ADDRESS = { fullName: 'Attacker', addressLine1: '1 Test St', postalCode: 'NW1 6XE', email: 'a@example.com', phone: '07700900123' };

// Each probe comes from its own documentation-range address. The order route
// allows 12 requests a minute per client, and this suite sends more than
// that, so from one address the later probes were refused with 429 before
// any pricing ran — "denied", but for the wrong reason, and the control that
// proves a real order succeeds failed with them. Rate limiting is not what
// this suite tests.
let probe = 0;
async function postOrder(payload) {
  try {
    probe += 1;
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${probe}` },
      body: JSON.stringify({ shippingAddress: ADDRESS, shippingOptionId: 'standard', ...payload }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch (err) {
    return { status: 0, body: { error: String(err.message) } };
  }
}

const apiReachable = (await postOrder({ items: [] })).status !== 0;
if (!apiReachable) {
  console.log('\n─── API ATTACKS: SKIPPED (no api server on ' + API + ') ───');
  results.push({ kind: 'CONTROL', name: 'API server reachable', ok: false, outcome: 'UNREACHABLE' });
  console.log('FAIL [CONTROL] API server reachable -> UNREACHABLE');
} else {
  console.log('\n─── API ATTACKS: order pricing ───');

  const tampered = await postOrder({
    items: [{ productId: 'apple-iphone-17', quantity: 1, price: 0.01 }],
  });
  const pricedAt = tampered.body?.order?.items?.[0]?.price;
  check('EXPLOIT', 'Client-supplied price is used',
    tampered.status === 201 && pricedAt === 0.01 ? 'ALLOWED' : 'DENIED:repriced',
    `server priced it at £${pricedAt}`);

  const statusInjected = await postOrder({
    items: [{ productId: 'apple-iphone-17', quantity: 1 }],
    status: 'delivered',
  });
  check('EXPLOIT', 'Client dictates the order status',
    statusInjected.body?.order?.status === 'delivered' ? 'ALLOWED' : 'DENIED:forced-pending',
    `stored as "${statusInjected.body?.order?.status}"`);

  const negative = await postOrder({
    items: [{ productId: 'apple-iphone-17', quantity: -5 }],
  });
  check('EXPLOIT', 'Negative quantity credits the basket',
    negative.status === 201 ? 'ALLOWED' : `DENIED:${negative.status}`);

  const fakeCoupon = await postOrder({
    items: [{ productId: 'apple-iphone-17', quantity: 1 }],
    couponCode: 'TOTALLY-FREE-100',
  });
  check('EXPLOIT', 'Made-up coupon code is honoured',
    (fakeCoupon.body?.order?.discount ?? 0) > 0 ? 'ALLOWED' : 'DENIED:no-discount');

  const outOfStock = await postOrder({
    items: [{ productId: 'samsung-galaxy-s23', quantity: 1 }],
  });
  check('EXPLOIT', 'Out-of-stock item can still be ordered',
    outOfStock.status === 201 ? 'ALLOWED' : `DENIED:${outOfStock.status}`);

  const ghost = await postOrder({
    items: [{ productId: '../../etc/passwd', quantity: 1 }],
  });
  // A 500 would also be a denial, but a crash is not a control: it means the
  // input reached the database layer. 400 means it was refused on sight.
  check('EXPLOIT', 'Path-like product id reaches the database',
    ghost.status === 400 ? 'DENIED:400' : `ALLOWED:${ghost.status}`,
    'must be refused cleanly, not crash');

  check('CONTROL', 'A legitimate order still succeeds',
    (await postOrder({ items: [{ productId: 'apple-iphone-17', quantity: 1 }] })).status === 201
      ? 'ALLOWED' : 'DENIED');

  console.log('\n─── API ATTACKS: costs on the shopper\'s side ───');

  // A signed-in customer's order, so it is one they can read back directly.
  probe += 1;
  const mine = await fetch(`${API}/api/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${probe}`,
      authorization: `Bearer ${await tokenFor(CUSTOMER_EMAIL)}`,
    },
    body: JSON.stringify({
      shippingAddress: ADDRESS, shippingOptionId: 'standard',
      items: [{ productId: 'cost-probe-phone', quantity: 1 }],
    }),
  }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }), () => ({ status: 0, body: {} }));
  const myOrderId = mine.body?.order?.id;
  check('CONTROL', 'Customer places an order of their own', mine.status === 201 && myOrderId ? 'ALLOWED' : `DENIED:${mine.status}`);

  check('EXPLOIT', 'Order confirmation sent to the browser includes the cost',
    JSON.stringify(mine.body).includes('buyPrice') ? 'ALLOWED' : 'DENIED:stripped');

  if (myOrderId) {
    const own = await readAs(CUSTOMER_EMAIL, `orders/${myOrderId}`);
    check('CONTROL', 'Customer can read that order back', own.status === 200 ? 'ALLOWED' : `DENIED:${own.status}`);
    check('EXPLOIT', 'Customer reads what their order cost the shop',
      JSON.stringify(own.data ?? {}).includes('buyPrice') ? 'ALLOWED' : 'DENIED:not-on-order');
    check('EXPLOIT', 'Customer reads their order\'s private cost record',
      await attemptReadAs(CUSTOMER_EMAIL, `orderPrivate/${myOrderId}`));
    const costs = await readAs(ADMIN_EMAIL, `orderPrivate/${myOrderId}`);
    check('CONTROL', 'Staff still see the cost the order was sold against',
      costs.data?.items?.[0]?.buyPrice === 480 ? 'ALLOWED' : `DENIED:${JSON.stringify(costs.data)}`);
  }

  for (const path of ['/api/catalogue', '/api/products?limit=100']) {
    const text = await fetch(`${API}${path}`, { headers: { 'x-forwarded-for': `198.51.100.${++probe}` } })
      .then(r => r.text(), () => '');
    const leaked = ['buyPrice', 'LEGACY-SUPPLIER', '351111111111111', 'LEGACY-SKU', 'legacy note', 'inventoryUnits']
      .filter(s => text.includes(s));
    check('CONTROL', `${path} serves the legacy product`, text.includes('Legacy Phone') ? 'ALLOWED' : 'DENIED');
    check('EXPLOIT', `${path} serves a legacy document's cost, supplier or IMEI`,
      leaked.length ? `ALLOWED:${leaked.join(',')}` : 'DENIED:stripped');
  }
}

// ── Report ────────────────────────────────────────────────────
const passed = results.filter(r => r.ok).length;
const controlsOk = results.filter(r => r.kind === 'CONTROL').every(r => r.ok);

console.log('\n============ SECURITY AUDIT ============');
console.log(`${passed}/${results.length} checks passed`);
console.log(controlsOk
  ? 'Controls passed — denials above are real denials, not malformed requests.'
  : 'CONTROLS FAILED — treat every denial as unproven.');

if (findings.length) {
  console.log(`\n--- ${findings.length} CONFIRMED VULNERABILIT${findings.length === 1 ? 'Y' : 'IES'} ---`);
  for (const f of findings) console.log(`  ✗ ${f.name}${f.detail ? `\n      ${f.detail}` : ''}`);
}

process.exit(findings.length || !controlsOk ? 1 : 0);
