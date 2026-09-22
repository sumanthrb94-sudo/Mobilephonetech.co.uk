import {
  collection, deleteDoc, doc, getDocs, orderBy, query, setDoc,
} from 'firebase/firestore';
import { db, COL, withAdminRetry } from './firebase';
import type { Product } from '../types';

/**
 * The home page's series panels, editable by staff.
 *
 * These are the big editorial blocks below the banner carousel — iPhone 17,
 * Galaxy S, Fold & Flip, Pixel — each with its own copy, artwork and a rail
 * of the products in that series. They were a hardcoded array, so adding a
 * Galaxy A panel when the A series lands, or retiring the iPhone 17 one when
 * the 18 arrives, meant a developer and a deploy.
 *
 * The hard part was never the copy, it was the rule deciding which products
 * belong to a series. That used to be JavaScript:
 *
 *   match: (p) => p.brand === 'Samsung' && /(Fold|Flip)/i.test(p.model)
 *
 * A stored regular expression would be the obvious translation and the wrong
 * one: staff would have to write regex, a typo is a broken panel rather than
 * an error message, and an expression typed into an admin field is a denial
 * of service against every visitor's browser waiting to happen. So the rule
 * is plain words instead — brand, words the model must contain, words that
 * rule it out — which covers every panel the site shipped with and can be
 * read by someone who has never written code.
 */

export type PanelSort = 'newest' | 'flagship';

export interface SeriesPanel {
  id: string;
  /** Small line above the headline, e.g. "Galaxy Z · Fold & Flip". */
  eyebrow: string;
  /** Two short lines read better than one long one — newlines are kept. */
  headline: string;
  subline: string;
  ctaLabel: string;
  /** A path inside the shop, e.g. /products?brand=Samsung */
  ctaHref: string;
  /** Optional artwork. Without one the panel uses the first matching product. */
  heroImage: string;
  /** Panels alternate light and dark down the page. */
  tone: 'light' | 'dark';
  /** Exact product brand, e.g. "Samsung". Blank matches any brand. */
  brand: string;
  /** The model must contain one of these. Blank matches every model. */
  include: string[];
  /** A model containing any of these is left out, whatever `include` says. */
  exclude: string[];
  sort: PanelSort;
  /** Off means saved but not on the home page. */
  active: boolean;
  /** Ascending. Lower numbers come first. */
  order: number;
  updatedAt: string;
}

/**
 * What ships when nothing is stored.
 *
 * These are the four panels the site launched with, converted from their
 * original JavaScript rules. `galaxy-s` is the one conversion that is not
 * exact: its rule was /Galaxy\s*S\d/i, which required a digit, and "Galaxy S"
 * as a word does not. In this catalogue they select the same products, and a
 * staff member can add an exclusion if that ever stops being true — which is
 * the trade this whole design makes, readable rules over precise ones.
 */
export const BUILT_IN_PANELS: SeriesPanel[] = [
  {
    id: 'iphone-17',
    eyebrow: 'iPhone 17 Series · LeHart Certified',
    headline: 'Luxury refurbished.\nUnboxing experience intact.',
    subline: 'Battery health verified. Face ID tested. Every sensor checked. 12-month warranty, 30-day returns — no asterisk.',
    ctaLabel: 'Shop iPhone 17',
    ctaHref: `/products?brand=Apple&model=${encodeURIComponent('iPhone 17')}`,
    heroImage: '/assets/iphone-17-pro-max-trio.jpg',
    tone: 'dark',
    brand: 'Apple',
    include: ['iPhone 17'],
    exclude: [],
    sort: 'flagship',
    active: true,
    order: 0,
    updatedAt: '',
  },
  {
    id: 'galaxy-s',
    eyebrow: 'Samsung Galaxy S · Unlocked',
    headline: 'The Android benchmark.\nCertified, not compromised.',
    subline: 'Galaxy S23, S22 Ultra, S21 — tested to the same standard as our iPhones. Full camera. Full display. Full experience.',
    ctaLabel: 'Shop Galaxy S',
    ctaHref: `/products?brand=Samsung&model=${encodeURIComponent('Samsung Galaxy S')}`,
    heroImage: '',
    tone: 'light',
    brand: 'Samsung',
    include: ['Galaxy S'],
    exclude: ['Tab'],
    sort: 'newest',
    active: true,
    order: 1,
    updatedAt: '',
  },
  {
    id: 'galaxy-fold',
    eyebrow: 'Galaxy Z · Fold & Flip',
    headline: 'Two screens.\nOne refurbished price.',
    subline: 'Hinge tested to 200,000 folds. Both displays verified. Z Fold and Z Flip — the future at a fraction of launch cost.',
    ctaLabel: 'Shop foldables',
    ctaHref: `/products?brand=Samsung&model=${encodeURIComponent('Samsung Galaxy Z')}`,
    heroImage: '',
    tone: 'dark',
    brand: 'Samsung',
    include: ['Fold', 'Flip'],
    exclude: [],
    sort: 'newest',
    active: true,
    order: 2,
    updatedAt: '',
  },
  {
    id: 'pixel',
    eyebrow: 'Google Pixel · Pure Android',
    headline: 'AI photography.\nRefurbished precision.',
    subline: 'Seven years of guaranteed Android updates. Magic Eraser, Photo Unblur, Night Sight — the camera phone that earned its reputation.',
    ctaLabel: 'Shop Pixel',
    ctaHref: `/products?brand=Google&model=${encodeURIComponent('Google Pixel')}`,
    heroImage: '',
    tone: 'light',
    brand: 'Google',
    include: ['Pixel'],
    exclude: ['Watch', 'Buds'],
    sort: 'newest',
    active: true,
    order: 3,
    updatedAt: '',
  },
];

export const EMPTY_PANEL: Omit<SeriesPanel, 'id' | 'updatedAt'> = {
  eyebrow: '', headline: '', subline: '', ctaLabel: 'Shop the series',
  ctaHref: '/products', heroImage: '', tone: 'light',
  brand: '', include: [], exclude: [], sort: 'newest',
  active: false, order: 0,
};

/** How many products a panel's rail shows before it stops. */
export const PANEL_RAIL_LIMIT = 10;

const line = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

/** Comma-separated words in, trimmed list out. "Fold, Flip" → ["Fold","Flip"]. */
export function parseWords(raw: string): string[] {
  return raw.split(',').map(w => w.trim()).filter(Boolean).slice(0, 12);
}

/** The list as staff typed it, for putting back in the field. */
export function joinWords(words: string[]): string {
  return words.join(', ');
}

const wordList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(w => line(w, 60)).filter(Boolean).slice(0, 12) : [];

export function toPanel(id: string, d: Record<string, unknown>): SeriesPanel {
  return {
    id,
    eyebrow: line(d.eyebrow, 80),
    headline: line(d.headline, 120),
    subline: line(d.subline, 240),
    ctaLabel: line(d.ctaLabel, 40) || 'Shop the series',
    ctaHref: line(d.ctaHref, 200) || '/products',
    heroImage: line(d.heroImage, 600),
    tone: d.tone === 'dark' ? 'dark' : 'light',
    brand: line(d.brand, 40),
    include: wordList(d.include),
    exclude: wordList(d.exclude),
    sort: d.sort === 'flagship' ? 'flagship' : 'newest',
    active: d.active === true,
    order: Number(d.order ?? 0),
    updatedAt: line(d.updatedAt, 40),
  };
}

/**
 * Whether a product belongs in a panel's rail.
 *
 * Case-insensitive throughout, because staff type "fold" and the catalogue
 * says "Z Fold 5". Exclusions win over inclusions: "Pixel" with "Watch"
 * excluded should not show a Pixel Watch, and stating it that way round
 * means adding an exclusion can only ever narrow a panel, never surprise
 * someone by widening it.
 */
export function matchesPanel(product: Product, panel: Pick<SeriesPanel, 'brand' | 'include' | 'exclude'>): boolean {
  if (panel.brand && product.brand.toLowerCase() !== panel.brand.toLowerCase()) return false;

  const model = product.model.toLowerCase();
  if (panel.exclude.some(w => w && model.includes(w.toLowerCase()))) return false;
  if (panel.include.length === 0) return true;
  return panel.include.some(w => w && model.includes(w.toLowerCase()));
}

/** Leading number in a model, used as a rough recency signal. */
const year = (p: Product) => {
  const n = parseInt((p.model.match(/(\d{2,4})/) || ['0'])[0], 10);
  return isNaN(n) ? 0 : n;
};
const proRank = (m: string) => /Pro\s*Max/i.test(m) ? 3 : /Pro|Ultra/i.test(m) ? 2 : 1;

/**
 * The products a panel shows, in the order it shows them.
 *
 * One entry per model: a series rail listing the same phone four times for
 * its storage sizes reads as padding, and the product page is where a size
 * gets chosen anyway.
 */
export function panelProducts(catalogue: Product[], panel: SeriesPanel): Product[] {
  const seen = new Set<string>();
  const deduped: Product[] = [];
  for (const p of catalogue) {
    if (!matchesPanel(p, panel)) continue;
    const key = p.model.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }
  deduped.sort(panel.sort === 'flagship'
    ? (a, b) => proRank(b.model) - proRank(a.model)
    : (a, b) => year(b) - year(a));
  return deduped.slice(0, PANEL_RAIL_LIMIT);
}

/**
 * What stops a panel being publishable.
 *
 * The admin shows these before a save is attempted and this is the check
 * that decides, so the two cannot disagree.
 */
export function panelProblems(
  p: Pick<SeriesPanel, 'eyebrow' | 'headline' | 'ctaHref'>,
): string[] {
  const out: string[] = [];
  if (!p.eyebrow.trim()) out.push('A series name is required — it labels the panel for screen readers.');
  if (!p.headline.trim()) out.push('A headline is required.');
  // This is the panel's main call to action, set from a text field. An
  // external or javascript: URL here would be a link on the home page.
  if (p.ctaHref.trim() && !p.ctaHref.trim().startsWith('/')) {
    out.push('The link must be a path inside the shop, starting with "/".');
  }
  return out;
}

/** Every panel, including the inactive ones. Staff view. */
export async function listPanels(): Promise<SeriesPanel[]> {
  const snap = await getDocs(query(collection(db, COL.seriesPanels), orderBy('order', 'asc')));
  return snap.docs.map(d => toPanel(d.id, d.data() as Record<string, unknown>));
}

/**
 * What the home page shows.
 *
 * An empty collection means nothing has been edited yet, not that the shop
 * front should be blank, so the built-ins stand in. A read failure resolves
 * the same way rather than propagating: the panels are most of the home
 * page, and losing them to a transient Firestore error is worse than showing
 * slightly stale copy.
 */
export async function listLivePanels(): Promise<SeriesPanel[]> {
  try {
    const all = await listPanels();
    const live = all.filter(p => p.active && p.headline);
    return live.length > 0 ? live : BUILT_IN_PANELS;
  } catch {
    return BUILT_IN_PANELS;
  }
}

export async function savePanel(p: SeriesPanel): Promise<void> {
  const problems = panelProblems(p);
  if (problems.length) throw new Error(problems[0]);

  await withAdminRetry(() => setDoc(doc(db, COL.seriesPanels, p.id), {
    ...p,
    ctaHref: p.ctaHref.trim() || '/products',
    updatedAt: new Date().toISOString(),
  }));
}

export function deletePanel(id: string): Promise<void> {
  return withAdminRetry(() => deleteDoc(doc(db, COL.seriesPanels, id)));
}

/** Slug-ish id from the series name, so the document reads in the console. */
export function panelId(eyebrow: string): string {
  const base = eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${base || 'series'}-${Date.now().toString(36)}`;
}
