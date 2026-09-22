import type { Product, ProductGrade } from '../types';

/**
 * The other listings of the same phone, and the choices they offer.
 *
 * This shop sells refurbished handsets, so a product row is one physical
 * configuration: its own price, its own stock, its own grade and battery
 * health. A 64GB iPhone 8 and a 256GB one are genuinely different things to
 * buy, not two sizes of one thing — which is why they are separate products
 * and stay that way.
 *
 * The product page still has to offer the other sizes, though, or a shopper
 * has no way to find them. It used to do that by inventing them: a ladder
 * derived from whatever size was in stock, a hardcoded colour list per
 * brand, all four condition grades. Choosing one of those invented options
 * produced a variant carrying the *base product's* price and stock, so a
 * customer could order a 256GB at the 64GB price. The server re-prices every
 * order from the real product, so the money was never wrong — but the
 * customer had bought a phone that was never for sale.
 *
 * Nothing here invents anything. Every option corresponds to a product that
 * exists in the catalogue, carries that product's own price and stock, and
 * knows which product to open when it is chosen.
 */

/** One value a shopper can pick, and where it leads. */
export interface VariantOption {
  /** The value itself — "128 GB", "Gold", "Excellent". */
  value: string;
  /** The product this option opens. The current one when it is already here. */
  productId: string;
  price: number;
  stock: number;
  /** True when this is the product being viewed. */
  current: boolean;
}

export interface VariantChoices {
  storage: VariantOption[];
  colour: VariantOption[];
  condition: VariantOption[];
}

/** Same phone, ignoring spacing and case: "iPhone 8" and "iphone  8" match. */
function modelKey(p: Pick<Product, 'brand' | 'model'>): string {
  return `${p.brand}|${p.model}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Storage compares by size, not alphabetically — "1 TB" sorts above "256 GB". */
function storageBytes(value: string): number {
  const m = value.match(/([\d.]+)\s*(GB|TB|MB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  return unit === 'TB' ? n * 1024 : unit === 'MB' ? n / 1024 : n;
}

/**
 * Every listing of the same phone, including the one being viewed.
 *
 * Only in-stock siblings are offered. A size we have sold out of is not a
 * choice, and showing it as one just moves the disappointment one click
 * later. The current product is always included even at zero stock, because
 * the page has to render the thing it is on.
 */
export function siblingProducts(catalogue: Product[], product: Product): Product[] {
  const key = modelKey(product);
  const out = catalogue.filter(p =>
    modelKey(p) === key && (p.id === product.id || (p.stock ?? 0) > 0));

  // The viewed product may not be in the catalogue array yet — a direct link
  // opened before the shared catalogue finished loading.
  return out.some(p => p.id === product.id) ? out : [product, ...out];
}

/**
 * Turn the siblings into the options for one attribute.
 *
 * Where several siblings share a value — two 128 GB listings in different
 * colours — the cheapest wins, because the option shows a price and the
 * shopper should be sent to the one it named. The product being viewed
 * always wins for its own value, so choosing what is already selected never
 * navigates somewhere else.
 */
function optionsFor(
  siblings: Product[],
  product: Product,
  read: (p: Product) => (string | undefined)[],
): VariantOption[] {
  const best = new Map<string, Product>();

  for (const p of siblings) {
    // A listing can declare more than one value for an attribute — the
    // editor's "Colour options" field is a comma-separated list — so each
    // product contributes every value it names, not just a first one.
    for (const raw of read(p)) {
      const value = (raw ?? '').trim();
      if (!value) continue;

      const held = best.get(value);
      if (p.id === product.id || !held || (held.id !== product.id && p.price < held.price)) {
        best.set(value, p);
      }
    }
  }

  return [...best.entries()]
    .map(([value, p]) => ({
      value,
      productId: p.id,
      price: p.price,
      stock: p.stock ?? 0,
      current: p.id === product.id,
    }))
    // Sizes sort by capacity, so 1 TB lands above 256 GB rather than below
    // it alphabetically. Everything else keeps the order it was declared in:
    // "Gold, Black, Red, White" is how the seller lists their colours, and
    // alphabetising it is a small act of mangling what they typed. Array
    // sort is stable, so returning 0 preserves that order.
    .sort((a, b) => storageBytes(a.value) - storageBytes(b.value));
}

/**
 * What the product page should offer, drawn entirely from real listings.
 *
 * An attribute with only one value across the whole group is returned as a
 * single option. The page can then decide to show it as a plain label rather
 * than a row of one button — a choice of one is not a choice.
 */
export function variantChoices(catalogue: Product[], product: Product): VariantChoices {
  const siblings = siblingProducts(catalogue, product);

  return {
    // Each attribute: what a listing explicitly offers, falling back to the
    // single value it is. Nothing is derived from a ladder or a brand list.
    storage: optionsFor(siblings, product, p =>
      p.storageOptions?.length ? p.storageOptions : [p.storage ?? p.specs?.storage]),
    colour: optionsFor(siblings, product, p => p.colorOptions ?? []),
    condition: optionsFor(siblings, product, p =>
      p.conditionOptions?.length ? p.conditionOptions : [p.grade as ProductGrade | undefined]),
  };
}

/**
 * Whether an attribute is worth showing as a set of buttons.
 *
 * A single option that is already the viewed product is not a decision — a
 * row containing one pressed button reads as though the rest failed to load,
 * so the page shows it as text instead.
 *
 * A single option that belongs to a *different* listing is a decision, even
 * though there is only one of it: it is the only other colour of this phone
 * we stock, and hiding it is how a shopper fails to find it.
 */
export function isChoosable(options: VariantOption[]): boolean {
  return options.length > 1 || options.some(o => !o.current);
}

/**
 * The values describing the viewed listing itself.
 *
 * Usually one. More than one means the listing declares a set — the editor's
 * "Colour options" field is a comma-separated list, so a single row can say
 * it is available in Gold, Black, Red and White while holding two handsets
 * at one price.
 */
export function currentValues(options: VariantOption[]): string[] {
  return options.filter(o => o.current).map(o => o.value);
}

/**
 * The value to print beside the attribute's name.
 *
 * Null when no option describes the viewed product, because labelling this
 * listing with a colour that belongs to a different one is worse than
 * printing nothing: it states something untrue about the thing being bought.
 */
export function currentValue(options: VariantOption[]): string | null {
  return options.find(o => o.current)?.value ?? null;
}

/**
 * Whether the listing describes itself with more than one value.
 *
 * This is not a choice a shopper can make. All of those values are the same
 * product at the same price with the same stock, so rendering them as
 * buttons produces a row where every button is selected and none of them
 * does anything — which is exactly what the page used to do. The honest
 * presentation is a list plus a note that it depends what is on the shelf.
 */
export function isAmbiguous(options: VariantOption[]): boolean {
  return currentValues(options).length > 1;
}

/** The options that lead to a different listing — the real choices. */
export function alternatives(options: VariantOption[]): VariantOption[] {
  return options.filter(o => !o.current);
}
