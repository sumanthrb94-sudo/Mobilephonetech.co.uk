import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, COL, withAdminRetry } from './firebase';

/**
 * Which blocks the home page shows, and in what order.
 *
 * The home page used to be a fixed sequence of components in App.tsx, so
 * hiding the blog for a month or moving testimonials above the FAQ was a
 * developer's job and a deploy. Staff now decide, from /admin/home.
 *
 * The shape of each block is still code — this is a running order, not a page
 * builder. That is the deliberate limit: staff can say what appears and in
 * what sequence without being able to produce a home page nobody designed.
 *
 * SECTIONS below is the source of truth for what exists. A stored layout is
 * only ever read as a set of preferences laid over it, never as the list
 * itself, which is what stops two failure modes:
 *
 *   - A section added in a later release appears for everyone straight away,
 *     in its intended place, instead of silently never rendering because the
 *     row saved last year does not mention it.
 *   - A section deleted from the code disappears cleanly, rather than leaving
 *     a stored id that resolves to nothing.
 */

/** A home-page block, in the order it ships in. */
export interface SectionSpec {
  id: string;
  /** What staff see in the admin list. */
  label: string;
  /** What it is, for someone who has not seen the home page in a while. */
  blurb: string;
  /**
   * Sections that hold the page together rather than merchandise it. They
   * reorder like any other, but cannot be switched off — see `lock` below.
   */
  locked?: boolean;
}

/**
 * Every block on the home page, in the order it ships in.
 *
 * Keep this in the same order as the default render. A new section added here
 * is live for everyone on the next deploy, including shops that saved a
 * layout before it existed.
 */
export const SECTIONS: SectionSpec[] = [
  { id: 'trustBanner', label: 'Trust strip', blurb: 'The thin scrolling strip of promises at the very top.' },
  { id: 'hero', label: 'Banner carousel', blurb: 'The main banners. Edit their content under Home banners.', locked: true },
  { id: 'brandShowcase', label: 'Brand showcase', blurb: 'The large iPhone, Galaxy, Fold and Pixel panels.' },
  { id: 'ecoImpact', label: 'Sustainability', blurb: 'The environmental case for buying refurbished.' },
  { id: 'trustSection', label: 'Why buy from us', blurb: 'The value and trust block.' },
  { id: 'pressLogos', label: 'Press logos', blurb: 'The strip of publications that have covered the shop.' },
  { id: 'testimonials', label: 'Customer reviews', blurb: 'Quotes from customers.' },
  { id: 'tradeIn', label: 'Trade-in', blurb: 'The trade-in programme and its valuation prompt.' },
  { id: 'warranty', label: 'Warranty & returns', blurb: 'The warranty and returns explainer.' },
  { id: 'faq', label: 'FAQ', blurb: 'The accordion of common questions.' },
  { id: 'blog', label: 'Workshop journal', blurb: 'The refurbishment articles.' },
  { id: 'qualityPromise', label: 'Inspected · Tested · Cleaned', blurb: 'The three-step quality badge strip.' },
  { id: 'newsletter', label: 'Newsletter signup', blurb: 'The email capture form above the footer.' },
];

/** One section as the admin edits it and the home page renders it. */
export interface SectionState {
  id: string;
  label: string;
  blurb: string;
  locked: boolean;
  visible: boolean;
  order: number;
}

/** The document the admin saves. Only preferences, never the section list. */
export interface StoredLayout {
  /** Section ids, in the order staff arranged them. Unknown ids are ignored. */
  order: string[];
  /** Ids explicitly switched off. Anything absent is on. */
  hidden: string[];
  updatedAt: string;
}

/** The one document this lives in — a running order, not a collection. */
const LAYOUT_DOC = 'home';

/** The shipped order, with everything visible. Used whenever nothing is stored. */
export function defaultLayout(): SectionState[] {
  return SECTIONS.map((s, i) => ({
    id: s.id,
    label: s.label,
    blurb: s.blurb,
    locked: s.locked === true,
    visible: true,
    order: i,
  }));
}

/**
 * The stored preferences laid over the shipped section list.
 *
 * Order is taken from the stored list for the sections it names; anything it
 * does not name — a section shipped after it was saved — keeps its position
 * relative to the sections around it rather than being dropped or shunted to
 * the end. That is the property that makes this safe to leave running across
 * releases without anyone revisiting the admin page.
 */
export function resolveLayout(stored: Partial<StoredLayout> | null | undefined): SectionState[] {
  const base = defaultLayout();
  if (!stored) return base;

  const storedOrder = Array.isArray(stored.order) ? stored.order.filter(id => typeof id === 'string') : [];
  const hidden = new Set(Array.isArray(stored.hidden) ? stored.hidden.filter(id => typeof id === 'string') : []);

  // Rank by the stored position where there is one. A section the stored list
  // has never heard of inherits the rank of the shipped section before it, so
  // it lands beside its neighbours instead of at the end of the page.
  const rankOf = new Map<string, number>();
  let lastKnown = -1;
  for (const section of base) {
    const at = storedOrder.indexOf(section.id);
    if (at >= 0) {
      lastKnown = at;
      rankOf.set(section.id, at);
    } else {
      // Between the previous known section and the next one.
      rankOf.set(section.id, lastKnown + 0.5);
    }
  }

  return base
    .map(section => ({
      ...section,
      // A locked section stays on however the document was edited, including
      // by hand in the Firebase console.
      visible: section.locked ? true : !hidden.has(section.id),
      order: rankOf.get(section.id) ?? 0,
    }))
    .sort((a, b) => a.order - b.order)
    .map((section, i) => ({ ...section, order: i }));
}

/** What the home page renders, in order. Never empty. */
export function visibleSections(layout: SectionState[]): SectionState[] {
  return layout.filter(s => s.visible);
}

/**
 * The saved layout, or the shipped one.
 *
 * A read failure is not worth blanking the shop over — offline, rules, a
 * missing document on a fresh install — so every one of them resolves to the
 * default rather than propagating.
 */
export async function loadHomeLayout(): Promise<SectionState[]> {
  try {
    const snap = await getDoc(doc(db, COL.siteLayout, LAYOUT_DOC));
    if (!snap.exists()) return defaultLayout();
    return resolveLayout(snap.data() as Partial<StoredLayout>);
  } catch {
    return defaultLayout();
  }
}

/**
 * Store the running order.
 *
 * Only the order and the hidden ids go in, so the document stays a set of
 * preferences. Labels and blurbs are code and would go stale the moment one
 * was reworded.
 */
export async function saveHomeLayout(layout: SectionState[]): Promise<void> {
  const payload: StoredLayout = {
    order: layout.map(s => s.id),
    hidden: layout.filter(s => !s.visible && !s.locked).map(s => s.id),
    updatedAt: new Date().toISOString(),
  };
  await withAdminRetry(() => setDoc(doc(db, COL.siteLayout, LAYOUT_DOC), payload));
}
