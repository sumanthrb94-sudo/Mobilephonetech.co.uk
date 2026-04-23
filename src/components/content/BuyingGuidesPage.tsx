import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Apple, Smartphone, CircuitBoard, Battery } from 'lucide-react';
import Breadcrumbs from '../ui/Breadcrumbs';

const GUIDES = [
  {
    id: 'which-iphone',
    icon: Apple,
    title: 'Which iPhone is right for you in 2026?',
    summary: 'Size, camera, battery and chip tradeoffs across the iPhone 13, 14, 15 and 16 ranges — and where to save without regretting it.',
    readTime: '6 min read',
  },
  {
    id: 'android-vs-ios',
    icon: Smartphone,
    title: 'Android vs iOS — the pragmatic comparison',
    summary: 'What actually changes day-to-day once you commit to an ecosystem, and which direction is easier to reverse.',
    readTime: '7 min read',
  },
  {
    id: 'refurb-grades',
    icon: CircuitBoard,
    title: 'Understanding refurbished grades',
    summary: 'Pristine vs Excellent vs Good vs Fair. What each label promises — and what no grade ever compromises on.',
    readTime: '4 min read',
  },
  {
    id: 'battery-health',
    icon: Battery,
    title: 'Battery health: what 85% actually means',
    summary: 'Why battery capacity matters more than age, when you should swap a battery, and how our 80%+ guarantee works.',
    readTime: '5 min read',
  },
];

export default function BuyingGuidesPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '960px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Buying guides' }]} />

        <header style={{ marginBottom: 'var(--spacing-48)' }}>
          <div className="overline mb-3">Learn</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px' }}>
            Buying guides
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-60)', lineHeight: 1.65, maxWidth: '620px' }}>
            Honest, un-hyped write-ups from our in-house engineers to help you pick the right device — whether you're upgrading or switching camps.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }} className="sm:grid-cols-2">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.id}
                to={`/guides/${g.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 'var(--spacing-24)',
                  border: '1px solid var(--grey-10)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--grey-0)',
                  textDecoration: 'none',
                  transition: 'box-shadow var(--duration-normal), border-color var(--duration-normal), transform var(--duration-normal)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--grey-30)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-md)';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--grey-10)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'inline-flex', width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--black)', margin: '0 0 8px 0' }}>{g.title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 14px 0' }}>{g.summary}</p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
                  <span>{g.readTime}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--brand-cyan-hover)', fontWeight: 600 }}>
                    Read guide <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
