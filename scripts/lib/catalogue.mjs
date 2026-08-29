/**
 * Turn a per-unit stock list into a sellable catalogue.
 *
 * The inventory export is an operations document: one row per physical
 * handset, keyed by IMEI, recording what was paid for it and what condition it
 * is in. A storefront needs the opposite shape — one listing per thing a
 * customer can choose, with the units behind it collapsed into a stock count.
 * This module is the translation, and it is the only place that knows how.
 *
 * Three problems have to be solved before a row can be sold.
 *
 * 1. **The same device is written many ways.** "Galaxy A32 5G",
 *    "SAMSUNG GALAXY A32 5G" and "GALAXY A32 5G" are 90 units of one product
 *    typed by different people on different days. Left alone they become three
 *    listings, splitting the stock and the search results.
 * 2. **Grades are supplier shorthand.** A, A-, B, B-, C and ONU mean nothing to
 *    a customer and do not match the grading explainer already published on the
 *    site.
 * 3. **There is no selling price.** BP is what was paid. Retail is derived, and
 *    deriving it is a commercial decision rather than a technical one — which
 *    is why the markup table below is meant to be edited.
 */

// ── 1. Model names ─────────────────────────────────────────────

/** Brand inferred from the model text, since the export has no brand column. */
export function brandOf(model) {
  const m = String(model).toUpperCase();
  if (/\b(IPHONE|IPAD|IWATCH|APPLE|MACBOOK)\b/.test(m)) return 'Apple';
  if (/\b(GALAXY|SAMSUNG)\b/.test(m) || /^S\d\d/.test(m)) return 'Samsung';
  if (/\b(PIXEL|GOOGLE)\b/.test(m)) return 'Google';
  return 'Other';
}

/** Category, which drives the storefront's navigation and filters. */
export function categoryOf(model) {
  const m = String(model).toUpperCase();
  if (/\b(IPAD|TAB)\b/.test(m)) return 'Ipads & Tabs';
  if (/\b(WATCH|IWATCH)\b/.test(m)) return 'Smartwatches';
  return 'Phones';
}

/**
 * One canonical name per device, so the same handset typed six ways becomes
 * one listing.
 *
 * Deliberately conservative: it normalises case, strips the brand word that is
 * sometimes prefixed and sometimes not, and folds the spelling variants seen in
 * this export. It does NOT try to merge "A32" with "A32 5G" — those are
 * genuinely different devices and merging them would sell the wrong one.
 */
export function canonicalModel(raw) {
  let m = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!m) return '';

  // "SAMSUNG GALAXY A32 5G" -> "GALAXY A32 5G"; "APPLE IPHONE 8" -> "IPHONE 8".
  m = m.replace(/^(SAMSUNG|APPLE|GOOGLE)\s+/i, '');
  // "S25 FE" with no family word is a Galaxy; the export drops it sometimes.
  if (/^S\d{2}\b/i.test(m)) m = `Galaxy ${m}`;
  // "X COVER 5" -> "XCover 5".
  m = m.replace(/\bX\s+COVER\b/i, 'XCover');
  // "IPHONE 13PRO" -> "IPHONE 13 PRO". The suffix is run onto the number often
  // enough that leaving it produces a second listing for one phone.
  m = m.replace(/(\d)(PRO|PLUS|MAX|MINI|ULTRA|FE)\b/i, '$1 $2');
  // "GALAXY S20FE" and "GALAXY S20 FE" are the same phone.
  m = m.replace(/\b(S\d{2})\s*FE\b/i, '$1 FE');
  // "IPAD 11TG GEN" is a typo for 11th; "9TH"/"9th" vary in case.
  m = m.replace(/\b(\d+)\s*(?:TH|ST|ND|RD|TG)\s*GEN\b/i, '$1th Gen');
  // "SAMSUNG GALAXY TAB A T580" and "GALAXY TAB T580" are one tablet.
  m = m.replace(/\bTAB\s+A\s+T580\b/i, 'Tab T580');
  m = m.replace(/\bSE3\b/i, 'SE 3');

  // Samsung writes the family word inconsistently: "SAMSUNG X COVER 5 4G" has
  // no "Galaxy" once the brand prefix is stripped, while "Galaxy XCover 5 4G"
  // does. Same phone, and without this they are two listings sharing no stock.
  if (brandOf(raw) === 'Samsung' && !/^(GALAXY|TAB)\b/i.test(m)) m = `Galaxy ${m}`;

  return titleCase(m);
}

/** Words that must keep their shape when the rest is title-cased. */
const KEEP = new Map([
  ['5g', '5G'], ['4g', '4G'], ['3g', '3G'], ['wifi', 'WiFi'], ['se', 'SE'],
  ['fe', 'FE'], ['ipad', 'iPad'], ['iphone', 'iPhone'], ['iwatch', 'Watch'],
  ['tab', 'Tab'], ['xcover', 'XCover'], ['onu', 'ONU'], ['t580', 'T580'],
  ['plus', 'Plus'], ['ultra', 'Ultra'], ['pro', 'Pro'], ['mini', 'Mini'],
  ['air', 'Air'], ['cellular', 'Cellular'], ['gen', 'Gen'], ['a11', 'A11'],
]);

function titleCase(s) {
  return s.split(' ').map((word) => {
    const lower = word.toLowerCase();
    if (KEEP.has(lower)) return KEEP.get(lower);
    // Model codes keep their case: A32, S21, 9th, 11th.
    if (/^[a-z]\d+/i.test(word)) return word.toUpperCase();
    if (/^\d/.test(word)) return lower;
    return word.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

/** URL-safe, stable, and readable in an order line. */
export function slugify(...parts) {
  return parts.join(' ').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

// ── 2. Grades ──────────────────────────────────────────────────

/**
 * Supplier grade → the grading language already published on /grading.
 *
 * ONU is "open, never used": a returned-unopened or ex-display unit. It is the
 * best condition here and must not be shown as second-hand wear, but it is not
 * "New" either — calling a customer's device new when it has been opened is the
 * kind of claim the DMCC rules exist to punish.
 */
const GRADE_MAP = {
  ONU: 'Pristine',
  A: 'Excellent',
  'A-': 'Excellent',
  B: 'Good',
  'B-': 'Good',
  C: 'Fair',
};

export function gradeOf(raw) {
  return GRADE_MAP[String(raw ?? '').trim().toUpperCase()] ?? 'Good';
}

/** What the customer is told the grade means, in the listing itself. */
export const GRADE_NOTE = {
  Pristine: 'Opened but never used. No marks of any kind.',
  Excellent: 'Light signs of use, invisible at arm’s length. No cracks or dents.',
  Good: 'Visible light scratches on the frame or back. Screen is unmarked.',
  Fair: 'Clear cosmetic wear including scratches and small dents. Fully working.',
};

/**
 * Battery health floor we are willing to state per grade.
 *
 * Stated as a minimum rather than a figure, because the export does not record
 * per-unit battery health and inventing one per handset would be a fabricated
 * measurement about a specific device a customer is about to buy.
 */
export const BATTERY_FLOOR = { Pristine: 100, Excellent: 90, Good: 85, Fair: 80 };

// ── 3. Price ───────────────────────────────────────────────────

/**
 * Retail is derived from the buy price, because the export has no sell column.
 *
 * EDIT THESE NUMBERS. They are a starting point chosen to look sane across a
 * £25–£325 cost range, not a pricing strategy: gross margin lands around 35–45%
 * before VAT, which is ordinary for refurbished handsets but is your decision,
 * not this script's. If the export ever gains an "SP" or "Price" column the
 * importer uses it instead and ignores all of this.
 */
export const MARKUP = { Pristine: 1.75, Excellent: 1.65, Good: 1.55, Fair: 1.40 };

/** A recommended-retail figure to strike through, capped so it stays credible. */
export const RRP_MULTIPLIER = 1.35;

/** Prices ending in 9 read as considered rather than computed. */
export function psychologicalPrice(value) {
  const n = Math.max(9, Math.round(value));
  if (n < 100) return Math.round(n / 5) * 5 - 1;
  return Math.round(n / 10) * 10 - 1;
}

export function priceFor(buyPrice, grade) {
  const bp = Number(buyPrice);
  if (!Number.isFinite(bp) || bp <= 0) return null;
  const price = psychologicalPrice(bp * (MARKUP[grade] ?? MARKUP.Good));
  return { price, originalPrice: psychologicalPrice(price * RRP_MULTIPLIER) };
}

// ── 4. Tidying the remaining columns ───────────────────────────

export function colourOf(raw) {
  const c = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!c) return null;
  const FOLD = { gray: 'grey', 'space gray': 'Space Grey', 'space grey': 'Space Grey' };
  const folded = FOLD[c] ?? c;
  return folded.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** "40MM" and "44MM" are watch sizes in the storage column, not capacities. */
export function storageOf(raw) {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  return /^\d+MM$/.test(s) ? null : s;
}

export function caseSizeOf(raw) {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return /^\d+MM$/.test(s) ? s : null;
}

/** The SIM column is free text with six spellings of three real answers. */
export function simTypeOf(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s || s === 'NOT APPLICABLE' || s === 'NO SIM') return null;

  // Remove the eSIM mentions first and see whether a physical slot is still
  // described. "SIM + eSIM" and "Physical SIM + eSIM" are the same handset
  // written by two people; testing for the word "physical" missed the first.
  const hasESim = /E-?SIM/.test(s);
  const mentionsPhysicalSlot = /\bSIM\b/.test(s.replace(/E-?SIM/g, ''));

  if (hasESim && mentionsPhysicalSlot) return 'Physical SIM + eSIM';
  if (hasESim) return 'eSIM';
  if (s.includes('DUAL')) return 'Dual physical SIM';
  return 'Single physical SIM';
}

// ── 5. Rows → catalogue ────────────────────────────────────────

/**
 * A unit is sellable when it is physically here and not spoken for.
 *
 * SHS rows are awaiting delivery and have no IMEI, so they are stock we do not
 * hold. Listing them would sell a customer a handset that is not in the
 * building — the fastest way to a cancelled order and a bad first review.
 * Returned units are excluded for the same reason: until someone has inspected
 * one, its grade is a guess.
 */
export function isSellable(unit) {
  if (unit.stockType === 'SHS') return false;
  if (unit.returnDate) return false;
  return Boolean(unit.imei);
}

export function parseUnit(row) {
  const model = canonicalModel(row.Model);
  const grade = gradeOf(row.Grade);
  return {
    imei: String(row.IMEI ?? '').trim(),
    model,
    brand: brandOf(row.Model),
    category: categoryOf(row.Model),
    grade,
    supplierGrade: String(row.Grade ?? '').trim().toUpperCase(),
    storage: storageOf(row.Storage),
    caseSize: caseSizeOf(row.Storage),
    colour: colourOf(row.Colour),
    simType: simTypeOf(row['SIM Type']),
    supplier: String(row.Supplier ?? '').trim(),
    buyPrice: Number(row.BP) || 0,
    stockType: String(row['Stock Type'] ?? '').trim().toUpperCase(),
    stockInDate: String(row['Stock In Date'] ?? '').trim(),
    returnDate: String(row['Return Date'] ?? '').trim(),
    notes: String(row.Notes ?? '').trim(),
    // An explicit sell price wins over the derived one, always.
    sellPrice: Number(row.SP ?? row.Price ?? row.RRP) || null,
  };
}

/**
 * Group sellable units into listings.
 *
 * One product per model + storage: those are the two things a customer decides
 * between before anything else, and they are what a search result needs to
 * distinguish. Colour and condition become variants underneath, each carrying
 * its own price and its own stock count, so choosing Fair over Excellent
 * charges the Fair price rather than the listing's headline one.
 */
export function buildCatalogue(rows) {
  const units = rows.map(parseUnit);
  const sellable = units.filter(isSellable);
  const byProduct = new Map();

  for (const unit of sellable) {
    const key = slugify(unit.brand, unit.model, unit.storage ?? unit.caseSize ?? '');
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(unit);
  }

  const products = [];
  for (const [id, group] of byProduct) {
    const first = group[0];
    const variants = [];
    const byVariant = new Map();

    for (const unit of group) {
      const vKey = `${unit.grade}|${unit.colour ?? ''}`;
      if (!byVariant.has(vKey)) byVariant.set(vKey, []);
      byVariant.get(vKey).push(unit);
    }

    for (const [vKey, vUnits] of byVariant) {
      const [grade, colour] = vKey.split('|');
      // The cheapest unit in the group sets the variant price, so the figure
      // shown is one we can actually honour for every unit behind it.
      const cheapest = vUnits.reduce((a, b) => (a.buyPrice <= b.buyPrice ? a : b));
      const priced = cheapest.sellPrice
        ? { price: cheapest.sellPrice, originalPrice: psychologicalPrice(cheapest.sellPrice * RRP_MULTIPLIER) }
        : priceFor(cheapest.buyPrice, grade);
      if (!priced) continue;

      variants.push({
        id: slugify(grade, colour || 'default'),
        condition: grade,
        color: colour || undefined,
        storage: first.storage ?? undefined,
        price: priced.price,
        originalPrice: priced.originalPrice,
        stock: vUnits.length,
        batteryHealth: BATTERY_FLOOR[grade],
      });
    }

    if (!variants.length) continue;
    variants.sort((a, b) => a.price - b.price);
    const lead = variants[0];

    products.push({
      id,
      brand: first.brand,
      model: first.model,
      category: first.category,
      storage: first.storage ?? undefined,
      price: lead.price,
      originalPrice: lead.originalPrice,
      grade: lead.condition,
      batteryHealth: lead.batteryHealth,
      warrantyMonths: 12,
      returnDays: 30,
      isCertified: true,
      stock: group.length,
      variants,
      colorOptions: [...new Set(group.map((u) => u.colour).filter(Boolean))].sort(),
      storageOptions: first.storage ? [first.storage] : [],
      conditionOptions: [...new Set(variants.map((v) => v.condition))],
      specs: {
        storage: first.storage ?? undefined,
        bodySIM: first.simType ?? undefined,
        display: first.caseSize ? `${first.caseSize} case` : undefined,
      },
      conditionDescription: GRADE_NOTE[lead.condition],
    });
  }

  products.sort((a, b) => a.id.localeCompare(b.id));
  return { products, units, sellable };
}
