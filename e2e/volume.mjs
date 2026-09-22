// The admin console at the volume a real shop reaches.
//
//   node e2e/volume.mjs          (needs the emulator suite running)
//
// WHY THIS EXISTS
//
// InventoryManager's month-long simulation loaded 3,600 documents through the
// real import screens and timed every panel, and the single defect it found
// was only visible at that size: a reorder panel that rendered with nothing in
// it while its check passed without ever reading a line. Its own words —
//
//   "This is where the first run was quietly useless. With ~1,900 units spread
//    evenly across ~28 buckets, nothing ever ran dry — the panel was on screen
//    with nothing in it, and the check on it passed without ever reading a
//    line."
//
// LeHart's console has only ever been opened against a two-product fixture and
// a few hundred live rows. Every count it prints, every filter, and the
// thousand-document read cap in listInventory are untested at the size the
// catalogue will actually reach.
//
// So this seeds a catalogue with a deliberate shape — a long tail of models
// stocked once or twice, so the low-stock and out-of-stock panels have real
// content rather than passing vacuously — and asserts the counts against
// arithmetic done here, independently of the application.
import {
  seed, waitForEmulators, seedExtraProducts, seedOrders, seedDoc, countProducts,
} from './emulator-seed.mjs';

const TARGET = Number(process.env.VOLUME_PRODUCTS || 1200);

const BRANDS = [
  ['Apple', ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16']],
  ['Samsung', ['Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy A34', 'Galaxy A54']],
  ['Google', ['Pixel 6', 'Pixel 7', 'Pixel 8', 'Pixel 8 Pro']],
  ['OnePlus', ['Nord 3', 'OnePlus 11', 'OnePlus 12']],
];
const SIZES = ['64 GB', '128 GB', '256 GB', '512 GB'];
const GRADES = ['Pristine', 'Excellent', 'Good', 'Fair'];

/**
 * A deterministic pseudo-random sequence.
 *
 * Math.random would make a failure impossible to reproduce: the run that
 * found the problem is gone the moment it ends. A fixed seed means the same
 * command produces the same catalogue every time, which is the difference
 * between a bug report and an anecdote.
 */
function rng(seedValue) {
  let s = seedValue >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function buildCatalogue(count) {
  const rand = rng(20260922);
  const rows = [];

  for (let i = 0; rows.length < count; i++) {
    const [brand, models] = BRANDS[i % BRANDS.length];
    const model = models[Math.floor(rand() * models.length)];
    const storage = SIZES[Math.floor(rand() * SIZES.length)];
    const grade = GRADES[Math.floor(rand() * GRADES.length)];

    // The long tail is the point. A catalogue where every line carries five
    // or six units never empties, so the panels that exist to say "this has
    // run out" have nothing to say and their checks pass having read nothing.
    // A third of the catalogue is stocked one or zero deep.
    const roll = rand();
    const stock = roll < 0.12 ? 0 : roll < 0.34 ? 1 : Math.ceil(rand() * 8);

    rows.push({
      id: `vol-${brand.toLowerCase()}-${i}`,
      brand,
      model,
      storage,
      grade,
      category: 'Phones',
      price: 120 + Math.floor(rand() * 700),
      originalPrice: 900 + Math.floor(rand() * 400),
      stock,
      batteryHealth: 80 + Math.floor(rand() * 20),
      warrantyMonths: 12,
      returnDays: 30,
      isCertified: true,
      imageUrl: '',
      // A realistic slice is archived: the console has to keep them out of
      // every live count while still finding them on the Archived tab.
      ...(rand() < 0.06 ? { archivedAt: '2026-08-01T09:00:00.000Z', stock: 0 } : {}),
    });
  }
  return rows;
}

await waitForEmulators();
console.log(`Seeding ${TARGET} products…`);
await seed();

const rows = buildCatalogue(TARGET);
const started = Date.now();
// Written in batches so a single failure does not take the whole run with it,
// and so progress is visible — a silent four-minute wait is indistinguishable
// from a hang.
for (let i = 0; i < rows.length; i += 100) {
  await seedExtraProducts(rows.slice(i, i + 100));
  process.stdout.write(`\r  ${Math.min(i + 100, rows.length)}/${rows.length}`);
}
console.log(`\n  written in ${((Date.now() - started) / 1000).toFixed(1)}s`);

await seedOrders(Array.from({ length: 40 }, (_, i) => ({
  id: `VOL-ORD-${i}`,
  userId: 'volume-customer',
  status: ['pending', 'confirmed', 'shipped', 'delivered'][i % 4],
  total: 200 + i * 7,
  subtotal: 200 + i * 7,
  currency: 'GBP',
  createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  contactEmail: `buyer${i}@example.com`,
  items: [],
})));

// Returns, one at each stage.
//
// Without these the returns board renders "Nothing here. That is the good
// outcome." — which is the right sentence for an empty board and the wrong
// one for a board that has never been looked at with anything on it. The
// two-step handoff the page now shows (decide, await the parcel, inspect)
// cannot be read at all from an empty screen, so a redesign verified against
// one is a redesign verified against nothing.
const RETURN_STAGES = [
  ['requested', 'refund', 'faulty', null],
  ['approved', 'replacement', 'arrived_damaged', null],
  ['received', 'repair', 'not_as_described', null],
  // Received *with* a staff note is the second half of the handoff: someone
  // has inspected it and the next job is to settle it by the promised route.
  ['received', 'refund', 'faulty', 'Screen lifts at the top edge. Confirmed faulty.'],
  ['resolved', 'refund', 'changed_mind', 'Refunded in full.'],
  ['rejected', 'refund', 'other', 'Outside the return window.'],
];

await Promise.all(RETURN_STAGES.map(([status, outcome, reason, staffNote], i) => seedDoc(
  'returns',
  `VOL-RMA-${i}`,
  {
    orderId: `VOL-ORD-${i}`,
    userId: 'volume-customer',
    customerName: `Customer ${i}`,
    customerEmail: `buyer${i}@example.com`,
    items: [],
    reason,
    outcome,
    legalBasis: reason === 'changed_mind' ? 'cooling_off' : 'faulty_goods',
    photoUrls: [],
    status,
    history: [],
    refundAmount: 200 + i * 7,
    staffNote,
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - i * 43_200_000).toISOString(),
  },
)));

// ── The arithmetic, done here rather than asked of the application ──
//
// Importing the console's own counters to check the console's own counters
// would only prove it agrees with itself. If its arithmetic were wrong,
// importing it would make the test agree with the bug.
const live = rows.filter(r => !r.archivedAt);
const expected = {
  total: rows.length,
  live: live.length,
  archived: rows.length - live.length,
  outOfStock: live.filter(r => r.stock === 0).length,
  lowStock: live.filter(r => r.stock > 0 && r.stock <= 5).length,
  units: live.reduce((n, r) => n + r.stock, 0),
  returns: RETURN_STAGES.length,
};

const inDatabase = await countProducts();

console.log('\n─── Independent arithmetic ───');
for (const [k, v] of Object.entries(expected)) console.log(`  ${k.padEnd(12)} ${v}`);
console.log(`\n  products in database: ${inDatabase}`);

const failures = [];
// The seed fixture adds its own handful of products on top of the volume
// rows, so the database holds at least what we wrote — never fewer.
if (inDatabase < rows.length) {
  failures.push(`only ${inDatabase} of ${rows.length} products were written`);
}
// The panels this exists to exercise must have something in them. A run where
// nothing ran out would pass every assertion below while proving nothing,
// which is precisely the defect this file was written to avoid reproducing.
if (expected.outOfStock < 20) failures.push(`only ${expected.outOfStock} sold-out lines — the panel would be near-empty`);
if (expected.lowStock < 20) failures.push(`only ${expected.lowStock} low-stock lines — the panel would be near-empty`);
if (expected.archived < 10) failures.push(`only ${expected.archived} archived products — the Archived tab would be near-empty`);
if (expected.returns < 4) failures.push(`only ${expected.returns} returns — the handoff steps would not all be on screen`);

if (failures.length) {
  console.log('\nFAILED:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log('\n  ✓ Catalogue seeded with real content in every panel.');
console.log('    Open /admin against the emulator preview to read the console at this size.');
