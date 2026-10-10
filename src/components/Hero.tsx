import { useState, useEffect } from 'react';
import { HOME_BANNER_SET, subscribeLiveBanners } from '../lib/banners';
import HeroCarousel, { BUILT_IN_SLIDES, type Slide } from './HeroCarousel';

/**
 * Hero — BM spec Section 3
 *
 * This component only decides WHICH slides to show. How they render — the
 * carousel, the crossfade, the controls — lives in HeroCarousel, shared with
 * the admin Banners preview so the two can never drift apart.
 */
export default function Hero() {
  /**
   * Banners come from Firestore, where staff edit them (Admin → Banners).
   * The built-in array is the fallback, not the source: an empty collection,
   * a failed read or a shop that has not been given banners yet shows this
   * instead of a blank rectangle where the home page should be.
   */
  // Start from the banners this browser saw last time, so a returning
  // visitor does not watch the built-in set swap for the managed one.
  const [managed, setManaged] = useState<Slide[] | null>(readCachedSlides);

  useEffect(() => {
    return subscribeLiveBanners(
      rows => {
        // Old saved banners remain editable in Admin for reference, but only
        // the approved six-banner campaign is allowed onto the storefront.
        // This prevents an abandoned draft or last season's hero reappearing
        // simply because its Firestore row is still active.
        const campaign = rows.filter(b => b.campaignSet === HOME_BANNER_SET);
        const next = campaign.length ? campaign.map(b => ({
          eyebrow: b.eyebrow,
          headline: b.headline,
          subline: b.subline,
          ctaLabel: b.ctaLabel,
          ctaHref: b.ctaHref,
          image: b.image || b.imageMobile,
          imageWide: b.imageWide,
          imageMobile: b.imageMobile || b.image,
          imageAlt: b.alt,
          // Uploaded artwork carries its own colour, so the gradient behind
          // it only shows through the scrim. Neutral dark suits every photo.
          gradientFrom: '#0b0f1a',
          gradientTo: '#1b2440',
          glowColor: 'rgba(96, 120, 220, 0.30)',
          savings: b.savings,
          fullBleed: true,
          // Campaign artwork is composed with copy-safe negative space on
          // the left and the product on the right. Keep that composition for
          // staff-managed banners too; a centre crop loses the product on a
          // narrow phone.
          focal: 'right center',
          focalMobile: 'center top',
        })) : null;
        setManaged(next);
        cacheSlides(next);
      },
      err => {
        // The built-in set stands, but say so: a silent catch here means a
        // shop whose banners have stopped loading looks exactly like a shop
        // that has none, and nobody ever finds out.
        console.error('[hero] could not load managed banners:', err);
      },
    );
  }, []);

  const SLIDES = managed ?? BUILT_IN_SLIDES;

  return (
    // HeroCarousel sizes itself off this box's width (container query units,
    // not viewport units) so the exact same component works full-width here
    // and inside a fixed-size preview box in the admin Banners screen.
    <div style={{ containerType: 'inline-size' }}>
      <HeroCarousel slides={SLIDES} />
    </div>
  );
}

const SLIDE_CACHE_KEY = 'lehart.heroSlides.v1';

/** Last managed banners, if browser storage has them and they look sound. */
function readCachedSlides(): Slide[] | null {
  try {
    const rows = JSON.parse(window.localStorage.getItem(SLIDE_CACHE_KEY) ?? 'null');
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const ok = rows.every(r => r && typeof r.headline === 'string' && typeof r.imageMobile === 'string'
      && typeof r.image === 'string' && (r.ctaHref === '' || String(r.ctaHref).startsWith('/')));
    return ok ? rows as Slide[] : null;
  } catch {
    return null;
  }
}

function cacheSlides(slides: Slide[] | null): void {
  try {
    if (slides) window.localStorage.setItem(SLIDE_CACHE_KEY, JSON.stringify(slides));
    else window.localStorage.removeItem(SLIDE_CACHE_KEY);
  } catch {
    // Storage blocked: the built-in set shows first, as before.
  }
}
