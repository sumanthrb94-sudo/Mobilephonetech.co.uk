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
  attemptCreateAs, attemptUpdateAs, attemptReadAs, attemptDeleteAs,
  ADMIN_EMAIL, STAFF_EMAIL, CUSTOMER_EMAIL,
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
const { customerUid, adminUid, staffUid } = await seed();

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
// Every field the order route requires. It gained a phone requirement after
// this was written, and without one every request below was refused for the
// missing phone before any pricing ran — so each "exploit" was denied for the
// wrong reason and the control that would have caught it read as FAIL. A
// control that fails makes every denial above it unproven, which is the point
// of having one; keep this address complete.
const ADDRESS = { fullName: 'Attacker', addressLine1: '1 Test St', postalCode: 'NW1 6XE', email: 'a@example.com', phone: '07700900123' };

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

const probe = await postOrder({ items: [] });
const apiReachable = probe.status !== 0;

// /api/orders was retired when PayPal became the only payment method
// (081d1ea): it no longer takes an order, and answers every request with a
// 503 saying so. Every attack below aims at it, so running them against the
// retired route reports two failures that mean nothing — a "vulnerability"
// that is a disabled endpoint refusing a request, and a control that cannot
// pass because placing an order through here is no longer possible.
//
// This is the failure mode InventoryManager's month-long simulation found in
// its own reorder panel: a check that passes, or fails, without ever reading
// the thing it claims to be about. A suite that cries wolf gets ignored, and
// a suite that is ignored is worse than no suite. So the retirement is
// detected and said out loud rather than scored.
//
// When checkout moves back behind this route, delete this branch: the
// attacks below are still the right attacks.
const ordersRetired = apiReachable
  && probe.status === 503
  && /disabled/i.test(String(probe.body?.error ?? ''));

if (!apiReachable) {
  console.log('\n─── API ATTACKS: SKIPPED (no api server on ' + API + ') ───');
  results.push({ kind: 'CONTROL', name: 'API server reachable', ok: false, outcome: 'UNREACHABLE' });
  console.log('FAIL [CONTROL] API server reachable -> UNREACHABLE');
} else if (ordersRetired) {
  console.log('\n─── API ATTACKS: order pricing ───');
  console.log('SKIP /api/orders is retired — checkout goes through PayPal.');
  console.log('     Nothing below can be proven here; the PayPal capture route');
  console.log('     is what now needs this treatment.');
  check('CONTROL', 'API server reachable', 'ALLOWED');
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

// ── The back-office role boundary ─────────────────────────────
//
// The console used to have one door: `admin === true` and you could do
// everything behind it — change a price, delete a product and every image of
// it, rewrite the home page. That is fine while the only person with the
// claim owns the shop, and stops being fine the moment it is handed to
// someone who employs people, because the smallest job ("mark this order
// dispatched") arrives bundled with the authority to blank the shop front.
//
// There are now two roles (src/lib/adminRoles.ts, and the isStaff()/isAdmin()
// split in firestore.rules). Everything below signs in as a real staff
// account with a real staff claim and tries the manager-only writes. A split
// nobody attacks from the outside is a claim, not a boundary.
{
  await seedDoc('products', 'role-probe', {
    brand: 'Apple', model: 'iPhone 8', price: 55, stock: 3,
    grade: 'Good', category: 'Phones', searchTerms: ['apple', 'iphone'],
  });

  // Controls first. If staff cannot do their own job, every denial below
  // proves only that the account is broken.
  check('CONTROL', 'Staff can edit a product price',
    await attemptUpdateAs(STAFF_EMAIL, 'products/role-probe', { price: 60 }));
  check('CONTROL', 'Staff can set stock',
    await attemptUpdateAs(STAFF_EMAIL, 'products/role-probe', { stock: 2 }));
  // Staff may only list a model the catalogue carries — see the catalogue
  // section below. This control uses one, so a refusal here would mean the
  // staff account itself is broken rather than the catalogue working.
  await seedDoc('catalogueModels', 'apple__iphone-se', { brand: 'Apple', model: 'iPhone SE' });
  check('CONTROL', 'Staff can create a product for a catalogued model',
    await attemptCreateAs(STAFF_EMAIL, 'products', {
      brand: 'Apple', model: 'iPhone SE', catalogueModelId: 'apple__iphone-se',
      price: 99, stock: 1, grade: 'Good', category: 'Phones',
    }, 'role-probe-new'));
  check('CONTROL', 'Manager can still do everything staff can',
    await attemptUpdateAs(ADMIN_EMAIL, 'products/role-probe', { price: 61 }));

  // The shop front. Whoever can write these decides what every visitor sees
  // and where the main call to action points.
  check('EXPLOIT', 'Staff can rewrite the home page running order',
    await attemptCreateAs(STAFF_EMAIL, 'siteLayout', { order: [], hidden: ['hero'] }, 'home'));
  check('EXPLOIT', 'Staff can write a home-page banner',
    await attemptCreateAs(STAFF_EMAIL, 'banners', {
      headline: 'Injected', href: 'https://example.invalid', active: true,
    }, 'attack-banner'));
  check('EXPLOIT', 'Staff can write a series panel',
    await attemptCreateAs(STAFF_EMAIL, 'seriesPanels', {
      headline: 'Injected', active: true, include: [], exclude: [],
    }, 'attack-panel'));

  // Archiving is the one product write staff may not make: it is the change
  // a customer notices and that a member of staff cannot reverse alone.
  check('EXPLOIT', 'Staff can archive a product',
    await attemptUpdateAs(STAFF_EMAIL, 'products/role-probe', {
      archivedAt: '2026-09-22T10:00:00.000Z',
    }));
  check('EXPLOIT', 'Staff can smuggle archivedAt in on create',
    await attemptCreateAs(STAFF_EMAIL, 'products', {
      brand: 'Apple', model: 'Smuggled', price: 1, stock: 0,
      grade: 'Good', category: 'Phones', archivedAt: '2026-09-22T10:00:00.000Z',
    }, 'role-probe-smuggled'));
  check('CONTROL', 'A manager can archive a product',
    await attemptUpdateAs(ADMIN_EMAIL, 'products/role-probe', {
      archivedAt: '2026-09-22T10:00:00.000Z',
    }));

  // Commercially sensitive. What a handset cost us is not something everyone
  // who can mark an order dispatched needs to see.
  await seedDoc('stockUnits', '350000000000001', {
    imei: '350000000000001', buyPrice: 210, supplier: 'Trade supplier',
  });
  await seedDoc('analyticsDaily', '2026-09-22', { views: 400, uniques: 210 });
  check('EXPLOIT', 'Staff can read buy prices',
    await attemptReadAs(STAFF_EMAIL, 'stockUnits/350000000000001'));
  check('EXPLOIT', 'Staff can read traffic figures',
    await attemptReadAs(STAFF_EMAIL, 'analyticsDaily/2026-09-22'));
  check('CONTROL', 'A manager can read buy prices',
    await attemptReadAs(ADMIN_EMAIL, 'stockUnits/350000000000001'));

  // A customer with no back-office claim at all is still refused everything,
  // including the writes staff are now allowed to make.
  check('EXPLOIT', 'A customer can edit a product now that staff can',
    await attemptUpdateAs(CUSTOMER_EMAIL, 'products/role-probe', { price: 1 }));
  check('EXPLOIT', 'A customer can read buy prices',
    await attemptReadAs(CUSTOMER_EMAIL, 'stockUnits/350000000000001'));

  // Nothing deletes a product. A product is referenced by every order that
  // ever contained it, so deleting one rewrites history: an old invoice loses
  // the thing it was for, and a return raised against it has nothing to
  // check. This is the rule the console's Archive button exists to serve, and
  // the rules enforce it rather than trusting the button.
  check('EXPLOIT', 'Staff can delete a product',
    await attemptDeleteAs(STAFF_EMAIL, 'products/role-probe'));
  check('EXPLOIT', 'A manager can delete a product',
    await attemptDeleteAs(ADMIN_EMAIL, 'products/role-probe'));
  check('EXPLOIT', 'A customer can delete a product',
    await attemptDeleteAs(CUSTOMER_EMAIL, 'products/role-probe'));
}

// ── The model catalogue ───────────────────────────────────────
//
// The owner's rule: staff pick a model that is already in the database and
// never create one; a new model is a request a manager approves. The editor
// offers only a picker, but a picker is presentation. What holds is the rule
// that a staff listing's brand and model must be a live catalogue entry,
// spelt exactly as the entry spells it.
//
// The spelling is the attack surface. "iPhone 8" and "iPhone 8 128GB" are two
// different phones to the code that groups a listing with its other sizes, so
// a listing that points at a real entry while carrying a different model name
// is the orphan the catalogue exists to prevent — it has to be refused even
// though the entry it names is real.
{
  await seedDoc('catalogueModels', 'apple__iphone-8', { brand: 'Apple', model: 'iPhone 8' });
  await seedDoc('catalogueModels', 'apple__iphone-7', {
    brand: 'Apple', model: 'iPhone 7', retiredAt: '2026-01-01T00:00:00.000Z',
  });
  const listing = (over) => ({
    brand: 'Apple', model: 'iPhone 8', catalogueModelId: 'apple__iphone-8',
    price: 55, stock: 1, grade: 'Good', category: 'Phones', ...over,
  });

  check('CONTROL', 'Staff list a catalogued model, spelt as the catalogue spells it',
    await attemptCreateAs(STAFF_EMAIL, 'products', listing({}), 'cat-ok'));

  check('EXPLOIT', 'Staff list a model with no catalogue entry at all',
    await attemptCreateAs(STAFF_EMAIL, 'products', {
      brand: 'Nokia', model: '3310', price: 20, stock: 1, grade: 'Good', category: 'Phones',
    }, 'cat-none'));
  check('EXPLOIT', 'Staff point at a real entry but type the storage into the model',
    await attemptCreateAs(STAFF_EMAIL, 'products', listing({ model: 'iPhone 8 128GB' }), 'cat-orphan'),
    'the orphan listing the catalogue exists to prevent');
  check('EXPLOIT', 'Staff point at a real entry but re-spell the model',
    await attemptCreateAs(STAFF_EMAIL, 'products', listing({ model: 'iphone 8' }), 'cat-respelt'));
  check('EXPLOIT', 'Staff point at an entry that does not exist',
    await attemptCreateAs(STAFF_EMAIL, 'products', listing({ catalogueModelId: 'apple__iphone-99' }), 'cat-ghost'));
  check('EXPLOIT', 'Staff list a retired model',
    await attemptCreateAs(STAFF_EMAIL, 'products',
      listing({ model: 'iPhone 7', catalogueModelId: 'apple__iphone-7' }), 'cat-retired'));

  // A listing written before the catalogue existed has no catalogueModelId.
  // An ordinary price or stock edit on it must still go through: the rule
  // only looks at the catalogue when brand or model actually change.
  await seedDoc('products', 'cat-legacy', {
    brand: 'Apple', model: 'iPhone 6s', price: 40, stock: 2, grade: 'Fair', category: 'Phones',
  });
  check('CONTROL', 'Staff edit the price of a pre-catalogue listing',
    await attemptUpdateAs(STAFF_EMAIL, 'products/cat-legacy', { price: 45 }));
  check('EXPLOIT', 'Staff rename a listing to a model the catalogue lacks',
    await attemptUpdateAs(STAFF_EMAIL, 'products/cat-legacy', { model: 'iPhone 6s 64GB' }));

  // The catalogue itself: only a manager adds to it, nobody deletes from it.
  check('EXPLOIT', 'Staff add a model to the catalogue',
    await attemptCreateAs(STAFF_EMAIL, 'catalogueModels', { brand: 'Nokia', model: '3310' }, 'nokia__3310'));
  check('EXPLOIT', 'Staff retire a catalogue model',
    await attemptUpdateAs(STAFF_EMAIL, 'catalogueModels/apple__iphone-8', { retiredAt: '2026-09-23T00:00:00.000Z' }));
  check('CONTROL', 'A manager adds a model to the catalogue',
    await attemptCreateAs(ADMIN_EMAIL, 'catalogueModels', { brand: 'Google', model: 'Pixel 9' }, 'google__pixel-9'));
  check('EXPLOIT', 'A manager deletes a catalogue model listings point at',
    await attemptDeleteAs(ADMIN_EMAIL, 'catalogueModels/apple__iphone-8'),
    'retire it instead — listings reference it');
  check('EXPLOIT', 'A customer reads the catalogue',
    await attemptReadAs(CUSTOMER_EMAIL, 'catalogueModels/apple__iphone-8'));

  // Requests: how staff get a missing model. Any staff may ask, as
  // themselves, and only as an open request.
  const req = (over) => ({
    brand: 'Apple', model: 'iPhone 17e', note: 'Two in from the supplier today',
    status: 'open', requestedBy: STAFF_EMAIL, requestedByUid: staffUid, ...over,
  });
  check('CONTROL', 'Staff ask a manager for a model',
    await attemptCreateAs(STAFF_EMAIL, 'modelRequests', req({}), 'req-ok'));
  check('EXPLOIT', 'Staff file a request that arrives already approved',
    await attemptCreateAs(STAFF_EMAIL, 'modelRequests',
      req({ status: 'approved', catalogueModelId: 'apple__iphone-17e' }), 'req-preapproved'),
    'a model nobody approved');
  check('EXPLOIT', 'Staff file a request in someone else\'s name',
    await attemptCreateAs(STAFF_EMAIL, 'modelRequests', req({ requestedByUid: adminUid }), 'req-forged'));
  check('EXPLOIT', 'Staff approve their own request',
    await attemptUpdateAs(STAFF_EMAIL, 'modelRequests/req-ok', { status: 'approved' }));
  check('CONTROL', 'A manager approves a request',
    await attemptUpdateAs(ADMIN_EMAIL, 'modelRequests/req-ok', { status: 'approved' }));
  check('EXPLOIT', 'A customer files a model request',
    await attemptCreateAs(CUSTOMER_EMAIL, 'modelRequests',
      req({ requestedBy: CUSTOMER_EMAIL, requestedByUid: customerUid }), 'req-customer'));
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
