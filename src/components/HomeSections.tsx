import React, { useEffect, useState } from 'react';
import Hero from './Hero';
import TrustBanner from './TrustBanner';
import BrandShowcase from './BrandShowcase';
import QualityPromise from './QualityPromise';
import EcoImpactBlock from './EcoImpactBlock';
import HomeFaq from './HomeFaq';
import HomeBlog from './HomeBlog';
import NewsletterSignup from './NewsletterSignup';
import TrustSection from './TrustSection';
import TestimonialsSection from './TestimonialsSection';
import PressLogosStrip from './PressLogosStrip';
import TradeInProgram from './TradeInProgram';
import WarrantyAndReturns from './WarrantyAndReturns';
import { defaultLayout, loadHomeLayout, visibleSections } from '../lib/homeLayout';

/**
 * The home page's blocks, rendered in the order staff chose.
 *
 * Which of these appear and in what sequence is editable from /admin/home —
 * see src/lib/homeLayout.ts, which owns the list, the names staff see and the
 * rules about what may be switched off. This module owns only the other half
 * of that pairing: what each id actually renders.
 *
 * The split is deliberate. homeLayout has no JSX, so the resolver can be
 * tested without mounting a home page, and the pairing between the two halves
 * is itself asserted by a test rather than by someone noticing a gap on the
 * live site.
 */
export const SECTION_VIEWS: Record<string, () => React.ReactElement> = {
  trustBanner: () => <TrustBanner />,
  hero: () => <Hero />,
  brandShowcase: () => <BrandShowcase />,
  ecoImpact: () => <EcoImpactBlock />,
  trustSection: () => <TrustSection />,
  pressLogos: () => <PressLogosStrip />,
  testimonials: () => <TestimonialsSection />,
  tradeIn: () => <TradeInProgram />,
  warranty: () => <WarrantyAndReturns />,
  faq: () => <HomeFaq />,
  blog: () => <HomeBlog />,
  qualityPromise: () => <QualityPromise />,
  newsletter: () => <NewsletterSignup />,
};

export default function HomeSections() {
  // The shipped order, not an empty list: the first paint is the real home
  // page, and a stored layout only ever rearranges what is already on screen.
  // A failed read resolves to this same value inside loadHomeLayout, so no
  // path here renders a blank shop.
  const [layout, setLayout] = useState(defaultLayout);

  useEffect(() => {
    let cancelled = false;
    loadHomeLayout().then(next => { if (!cancelled) setLayout(next); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {visibleSections(layout).map(section => {
        const View = SECTION_VIEWS[section.id];
        return View ? <React.Fragment key={section.id}>{View()}</React.Fragment> : null;
      })}
    </>
  );
}
