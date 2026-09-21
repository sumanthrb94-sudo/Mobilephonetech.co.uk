import { useState, useEffect } from 'react';
import { listLiveBanners } from '../lib/banners';
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
  const [managed, setManaged] = useState<Slide[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listLiveBanners()
      .then(rows => {
        if (cancelled || rows.length === 0) return;
        setManaged(rows.map(b => ({
          eyebrow: b.eyebrow,
          headline: b.headline,
          subline: b.subline,
          ctaLabel: b.ctaLabel,
          ctaHref: b.ctaHref,
          image: b.image || b.imageMobile,
          imageMobile: b.imageMobile || b.image,
          imageAlt: b.alt,
          // Uploaded artwork carries its own colour, so the gradient behind
          // it only shows through the scrim. Neutral dark suits every photo.
          gradientFrom: '#0b0f1a',
          gradientTo: '#1b2440',
          glowColor: 'rgba(96, 120, 220, 0.30)',
          savings: '',
          fullBleed: true,
          focal: '50% 50%',
          focalMobile: '50% 30%',
        })));
      })
      .catch((err) => {
        // The built-in set stands, but say so: a silent catch here means a
        // shop whose banners have stopped loading looks exactly like a shop
        // that has none, and nobody ever finds out.
        console.error('[hero] could not load managed banners:', err);
      });
    return () => { cancelled = true; };
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
