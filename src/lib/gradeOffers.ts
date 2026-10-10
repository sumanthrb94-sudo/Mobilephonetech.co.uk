import type { ProductGrade, ProductVariant } from '../types';

/**
 * Which unit each condition grade offers on the product page.
 *
 * Two places turn a grade into a unit to sell: the grade list beside the
 * price (VariantSelector) and the grade comparison further down the page
 * (ProductDetail → PdpGradeVisualizer). They used to work it out separately,
 * and the comparison ignored a tablet's Wi-Fi or Cellular radio, so the two
 * could pick different units for the same grade. Both now ask gradeOffer,
 * so they always agree.
 */

export const trimmed = (value?: string) => (value ?? '').trim();

/** A tablet's radio, "Wi-Fi" or "Cellular"; '' for a phone, which has none. */
export const radioOf = (unit?: ProductVariant | null) => trimmed(unit?.connectivity);

/** The grades always listed, best first, in stock or not. */
export const STANDARD_GRADES: readonly ProductGrade[] = ['Pristine', 'Excellent', 'Good'];

/**
 * The grade rows for a model: New first when it has any new unit, the
 * standard three always, Fair last when it has any Fair unit.
 *
 * New and Fair are outside the usual ladder, but some models do carry them
 * (a new iPhone 17, a Fair Galaxy A52s). Leaving them out meant a page
 * selling one had no row for it: the condition read blank while every
 * listed grade said "Out of stock". A model without them never shows them.
 */
export function gradeLadder(variants: readonly ProductVariant[]): ProductGrade[] {
  const has = (grade: ProductGrade) => variants.some(v => trimmed(v.condition) === grade);
  return [
    ...(has('New') ? ['New' as const] : []),
    ...STANDARD_GRADES,
    ...(has('Fair') ? ['Fair' as const] : []),
  ];
}

function cheapest(units: readonly ProductVariant[]): ProductVariant | undefined {
  return units.reduce<ProductVariant | undefined>(
    (best, v) => (!best || v.price < best.price ? v : best), undefined);
}

/**
 * The best tier of `candidates` for a shopper on `radio`: in stock on that
 * radio, else in stock on any radio, else sold out on that radio, else
 * whatever there is. Phones have no radio, so for them this is simply
 * "in stock first".
 */
export function preferredUnits(candidates: readonly ProductVariant[], radio: string): ProductVariant[] {
  const inStock = candidates.filter(v => v.stock > 0);
  const tiers = [
    inStock.filter(v => radioOf(v) === radio),
    inStock,
    candidates.filter(v => radioOf(v) === radio),
    [...candidates],
  ];
  return tiers.find(tier => tier.length > 0) ?? [];
}

/**
 * The unit `grade` offers in the colour and capacity of the `active` unit,
 * or undefined when that grade has nothing for sale there.
 *
 *  - The active unit speaks for its own grade, so that row always agrees
 *    with the page price. If it is sold out the grade has no offer: another
 *    unit's price never stands in for it.
 *  - Any other grade offers its cheapest in-stock unit of exactly that
 *    colour and capacity (never another colour or size, which choosing the
 *    grade could not deliver), on the active unit's radio when one is in
 *    stock there and on the other radio only when not. otherRadio names
 *    that switch so it can be shown.
 */
export function gradeOffer(
  variants: readonly ProductVariant[],
  active: ProductVariant | null | undefined,
  grade: ProductGrade,
): ProductVariant | undefined {
  if (!active) return undefined;
  if (trimmed(active.condition) === grade) return active.stock > 0 ? active : undefined;

  const onShelf = variants.filter(v =>
    v.stock > 0
    && trimmed(v.condition) === grade
    && trimmed(v.color) === trimmed(active.color)
    && trimmed(v.storage) === trimmed(active.storage));
  return cheapest(preferredUnits(onShelf, radioOf(active)));
}

/**
 * The radio `offer` is on when it is not the active unit's, such as
 * "Cellular" on a Wi-Fi tablet's row, so a choice that would switch radio
 * says so. Undefined when it would not.
 */
export function otherRadio(
  offer: ProductVariant | undefined,
  active: ProductVariant | null | undefined,
): string | undefined {
  const radio = radioOf(offer);
  return radio && radio !== radioOf(active) ? radio : undefined;
}

/**
 * Where to land when the shopper changes colour or capacity.
 *
 * `exact` holds the units in the new colour and capacity with the grade
 * already chosen: the cheapest of them in stock on the same radio wins,
 * then in stock on any radio, and only then a sold-out one. It used to take
 * the first that matched, so a tablet could land on an empty Wi-Fi unit
 * beside an in-stock Cellular one, or a sold-out unit beside an in-stock
 * twin. With no unit of that grade, each `wider` set is tried in turn with
 * the same preference.
 */
export function closestUnit(
  radio: string,
  exact: readonly ProductVariant[],
  ...wider: readonly (readonly ProductVariant[])[]
): ProductVariant | undefined {
  const best = cheapest(preferredUnits(exact, radio));
  if (best) return best;
  for (const units of wider) {
    const first = preferredUnits(units, radio)[0];
    if (first) return first;
  }
  return undefined;
}
