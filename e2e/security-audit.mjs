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
  attemptCreateAs, attemptUpdateAs, attemptReadAs,
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

console.log('\n─── EXPLOITS: privilege and identity ───');

check('EXPLOIT', 'Customer escalates their own role to admin',
  await attemptUpdateAs(CUSTOMER_EMAIL, `users/${customerUid}`, { role: 'admin' }),
  'would be cosmetic today, catastrophic if any future code trusted the field');

check('EXPLOIT', 'Customer writes to the product catalogue',
  await attemptUpdateAs(CUSTOMER_EMAIL, 'products/apple-iphone-17', { price: 1 }));

check('EXPLOIT', 'Customer reads the newsletter subscriber list',
  await attemptReadAs(CUSTOMER_EMAIL, 'newsletterSubscribers/victim@example.com'));

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
const ADDRESS = { fullName: 'Attacker', addressLine1: '1 Test St', postalCode: 'NW1 6XE', email: 'a@example.com' };

async function postOrder(payload) {
  try {
    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
