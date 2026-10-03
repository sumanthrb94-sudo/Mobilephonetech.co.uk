import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Hero from './Hero';
import BrandShowcase from './BrandShowcase';
import { defaultLayout, loadHomeLayout, visibleSections } from '../lib/homeLayout';

// The hero and category navigation are immediately useful. Everything below
// that fold becomes a separate chunk so it cannot delay the first interaction
// or compete with product imagery on a mobile connection.
const QualityPromise = lazy(() => import('./QualityPromise'));
const EcoImpactBlock = lazy(() => import('./EcoImpactBlock'));
const HomeFaq = lazy(() => import('./HomeFaq'));
const HomeBlog = lazy(() => import('./HomeBlog'));
const NewsletterSignup = lazy(() => import('./NewsletterSignup'));
const TrustSection = lazy(() => import('./TrustSection'));
const TestimonialsSection = lazy(() => import('./TestimonialsSection'));
const WarrantyAndReturns = lazy(() => import('./WarrantyAndReturns'));

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
  hero: () => <Hero />,
  brandShowcase: () => <BrandShowcase />,
  ecoImpact: () => <EcoImpactBlock />,
  trustSection: () => <TrustSection />,
  testimonials: () => <TestimonialsSection />,
  warranty: () => <WarrantyAndReturns />,
  faq: () => <HomeFaq />,
  blog: () => <HomeBlog />,
  qualityPromise: () => <QualityPromise />,
  newsletter: () => <NewsletterSignup />,
};

const ABOVE_THE_FOLD = new Set(['hero', 'brandShowcase']);

function DeferredSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '500px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref}>{visible ? children : null}</div>;
}

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
        if (!View) return null;
        const content = <Suspense fallback={null}>{View()}</Suspense>;
        return ABOVE_THE_FOLD.has(section.id)
          ? <React.Fragment key={section.id}>{content}</React.Fragment>
          : <DeferredSection key={section.id}>{content}</DeferredSection>;
      })}
    </>
  );
}
