import {
  collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc,
} from 'firebase/firestore';
import { db, COL, withAdminRetry } from './firebase';

/**
 * Home-page banners, editable by staff.
 *
 * The carousel used to be a hardcoded SLIDES array in Hero.tsx, so changing a
 * headline or swapping a picture meant a developer and a deploy. It now reads
 * this collection, and falls back to that array when the collection is empty —
 * so an empty database shows the shop rather than a blank rectangle, and
 * nothing breaks on the first load after this ships.
 *
 * Every banner is the same shape on screen, whatever is uploaded: see
 * BANNER_SPEC. A fixed box is what lets staff upload a picture without having
 * to reason about how tall it will make the page.
 */

export interface Banner {
  id: string;
  /** Small line above the headline. Optional. */
  eyebrow: string;
  headline: string;
  /** One supporting line. Desktop only — a phone banner has no room. */
  subline: string;
  /** Optional price-drop / saving line shown beneath the call to action. */
  savings: string;
  ctaLabel: string;
  /** In-app path, e.g. /products?brand=Apple */
  ctaHref: string;
  /** Wide image, used at 1024px and above. */
  image: string;
  /** Exact 4.16:1 image for wide desktop screens; optional for staff uploads. */
  imageWide?: string;
  /** Tall image for phones. Falls back to `image` when not set. */
  imageMobile: string;
  alt: string;
  /** Off means saved but not on the site. */
  active: boolean;
  /** Ascending. Lower numbers come first. */
  order: number;
  updatedAt: string;
  /** Identifies the approved campaign set allowed on the public home page. */
  campaignSet?: string;
}

/** Legacy banner drafts remain in Admin, but never return to the storefront. */
export const HOME_BANNER_SET = 'core-campaigns-2026';

/**
 * What an uploaded picture should be, stated once and shown in the form.
 *
 * The shop desktop canvas is a fixed 480px high 3:1 composition and the
 * phone canvas is 4:5. Matching these ratios keeps staff artwork predictable;
 * product detail belongs on the right of desktop images and in the upper half
 * of phone images, leaving the copy-safe area clear.
 */
export const BANNER_SPEC = {
  desktop: { w: 1920, h: 640, ratio: '3:1', note: 'Wide. Keep the subject on the right — the text sits safely on the left.' },
  mobile: { w: 1080, h: 1350, ratio: '4:5', note: 'Tall. Keep the subject in the top half — the text sits over the bottom.' },
} as const;

export const EMPTY_BANNER: Omit<Banner, 'id' | 'updatedAt'> = {
  eyebrow: '', headline: '', subline: '', savings: '', ctaLabel: 'Shop now', ctaHref: '/products',
  image: '', imageWide: '', imageMobile: '', alt: '', active: false, order: 0,
};

const line = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export function toBanner(id: string, d: Record<string, unknown>): Banner {
  return {
    id,
    eyebrow: line(d.eyebrow, 60),
    headline: line(d.headline, 90),
    subline: line(d.subline, 160),
    savings: line(d.savings, 60),
    ctaLabel: line(d.ctaLabel, 40) || 'Shop now',
    ctaHref: line(d.ctaHref, 200) || '/products',
    image: line(d.image, 600),
    imageWide: line(d.imageWide, 600) || undefined,
    imageMobile: line(d.imageMobile, 600),
    alt: line(d.alt, 160),
    active: d.active === true,
    order: Number(d.order ?? 0),
    updatedAt: line(d.updatedAt, 40),
    campaignSet: line(d.campaignSet, 60) || undefined,
  };
}

/** Every banner, including the inactive ones. Staff view. */
export async function listBanners(): Promise<Banner[]> {
  const snap = await getDocs(query(collection(db, COL.banners), orderBy('order', 'asc')));
  return snap.docs.map(d => toBanner(d.id, d.data() as Record<string, unknown>));
}

/**
 * What the shop shows. Inactive banners and banners with nothing to display
 * are dropped here rather than in the carousel, so a half-finished row saved
 * by mistake cannot reach the home page.
 */
export async function listLiveBanners(): Promise<Banner[]> {
  const all = await listBanners();
  return all.filter(b => b.active && b.headline && (b.image || b.imageMobile));
}

/**
 * Keep an open storefront in sync with staff publishing changes. The previous
 * one-off read meant a banner was correct only after a customer refreshed.
 * This is intentionally the same validity filter as listLiveBanners, so a
 * partial draft can never flash on the public home page.
 */
export function subscribeLiveBanners(
  onChange: (banners: Banner[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COL.banners), orderBy('order', 'asc')),
    snap => onChange(snap.docs.map(d => toBanner(d.id, d.data() as Record<string, unknown>))
      .filter(b => b.active && b.headline && (b.image || b.imageMobile))),
    error => onError?.(error),
  );
}

/**
 * A banner is only publishable when it has the things a banner needs. The
 * form shows these before the save is attempted; this is the check that
 * decides, so the two cannot disagree.
 */
export function bannerProblems(b: Pick<Banner, 'headline' | 'image' | 'imageMobile' | 'ctaHref' | 'alt'>): string[] {
  const out: string[] = [];
  if (!b.headline.trim()) out.push('A headline is required.');
  if (!b.image.trim() && !b.imageMobile.trim()) out.push('Upload at least one image.');
  if (!b.alt.trim()) out.push('Describe the image for screen readers and for when it fails to load.');
  // A banner links somewhere in the shop. An external or javascript: URL here
  // would be a link the whole home page points at, set from a text field.
  if (b.ctaHref.trim() && !b.ctaHref.trim().startsWith('/')) {
    out.push('The link must be a path inside the shop, starting with "/".');
  }
  return out;
}

export async function saveBanner(b: Banner): Promise<void> {
  const problems = bannerProblems(b);
  if (problems.length) throw new Error(problems[0]);

  await withAdminRetry(() => setDoc(doc(db, COL.banners, b.id), {
    ...b,
    ctaHref: b.ctaHref.trim() || '/products',
    updatedAt: new Date().toISOString(),
  }));
}

export function deleteBanner(id: string): Promise<void> {
  return withAdminRetry(() => deleteDoc(doc(db, COL.banners, id)));
}

/** Slug-ish id from the headline, so the document is readable in the console. */
export function bannerId(headline: string): string {
  const base = headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${base || 'banner'}-${Date.now().toString(36)}`;
}
