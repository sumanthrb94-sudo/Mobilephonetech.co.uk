import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Breadcrumbs from '../ui/Breadcrumbs';
import Accordion from '../ui/Accordion';

type QA = { q: string; a: string };

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: 'Orders & delivery',
    items: [
      { q: 'How long does delivery take?',        a: 'Orders placed before 4pm ship same-day via Royal Mail Tracked 24, arriving next working day across mainland UK. All delivery is free, every order.' },
      { q: 'Can I track my order?',               a: 'Yes — you\'ll receive a tracked link by email within minutes of your order being packed. You can also view live tracking in your account.' },
      { q: 'Do you deliver to Northern Ireland?', a: 'We deliver to all UK postcodes including NI, Highlands and Islands. Delivery times may extend by 24-48 hours for remote postcodes.' },
      { q: 'Can I change my address after ordering?', a: 'Before dispatch, yes — contact support within 30 minutes of ordering. Once dispatched you\'ll need to redirect via the Royal Mail tracking link.' },
    ],
  },
  {
    title: 'Refurbished grades',
    items: [
      { q: 'What grade should I pick?',          a: 'Pristine if you want a device indistinguishable from new. Excellent is our best-seller — very light marks at most, screen flawless. Good if cosmetics don\'t matter. Functional quality is identical across every grade.' },
      { q: 'Is the battery health guaranteed?',  a: 'Yes. Every refurbished handset ships with battery health 80%+ on Fair/Good, 85%+ on Excellent, and 90-95%+ on Pristine. If it falls below threshold within the warranty period, we replace the cell free.' },
      { q: 'Do I get the original box and accessories?', a: 'Refurbs ship in our recyclable packaging with a new cable. Earphones, chargers and original boxes are not guaranteed (Apple stopped including most of these in 2020 anyway).' },
      { q: 'Are parts genuine?',                 a: 'Replacement parts are either OEM original or OEM-grade equivalents from certified suppliers. We don\'t fit counterfeit components.' },
    ],
  },
  {
    title: 'Warranty & returns',
    items: [
      { q: 'How long is the warranty?',          a: '12 months on every device, every grade. Covers manufacturing defects, battery health, and any functional issue that isn\'t accidental damage, liquid ingress or unauthorised repairs.' },
      { q: 'What\'s the returns window?',        a: '30 days from delivery, no questions asked. We email a prepaid Royal Mail return label; refund processed within 3-5 business days of receipt.' },
      { q: 'Do you repair or replace?',          a: 'Faster route wins. If we can repair in under 48 hours we will; otherwise we replace with an equivalent-or-better device.' },
    ],
  },
  {
    title: 'Payment & finance',
    items: [
      { q: 'Which finance options do you offer?', a: 'Klarna Pay in 3 (three 0% instalments), Clearpay Pay in 4 (four 0% instalments every 2 weeks), and Klarna Pay in 30 (no charge for 30 days). Subject to status, 18+.' },
      { q: 'Do you accept Apple Pay and Google Pay?', a: 'Yes — both are available at checkout on supported devices.' },
      { q: 'Is my payment secure?',              a: 'Every transaction is processed via Stripe over TLS. We never store card details on our servers.' },
    ],
  },
  {
    title: 'Trade-in',
    items: [
      { q: 'How does trade-in work?',            a: 'Tell us the model and condition, we give an instant quote, send a free prepaid envelope, you post the device, and we pay out within 24 hours of receipt.' },
      { q: 'What if my device is worth less than the quote?', a: 'We\'ll email you a revised offer. Accept it and we pay within 24 hours; decline and we return the device free.' },
      { q: 'My phone is broken — will you still take it?', a: 'Often yes. Cracked screens and non-working phones have recycling value. Get an instant quote for "For parts" condition.' },
    ],
  },
];

export default function FaqPage() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({ ...s, items: s.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '880px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Help & FAQ' }]} />

        <header style={{ marginBottom: 'var(--spacing-32)' }}>
          <div className="overline mb-3">Help centre</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px' }}>
            Frequently asked questions
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-60)', lineHeight: 1.65, maxWidth: '620px' }}>
            Can't find an answer? Our UK-based support team replies in under 10 minutes during opening hours.
          </p>
        </header>

        <div style={{ position: 'relative', marginBottom: 'var(--spacing-40)' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-50)', pointerEvents: 'none' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the help centre…"
            aria-label="Search FAQ"
            style={{
              width: '100%',
              height: '48px',
              padding: '0 16px 0 44px',
              background: 'var(--grey-5)',
              border: '1.5px solid transparent',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--black)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--black)')}
            onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = 'transparent')}
          />
        </div>

        {matches.length === 0 && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)' }}>
            No results for "{query}". Try a broader term or contact support.
          </p>
        )}

        {matches.map((section) => (
          <section key={section.title} style={{ marginBottom: 'var(--spacing-32)' }}>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: '0 0 12px 0' }}>
              {section.title}
            </h2>
            <Accordion
              items={section.items.map((it, i) => ({
                id: `${section.title}-${i}`,
                question: it.q,
                answer: it.a,
              }))}
              allowMultiple
            />
          </section>
        ))}
      </div>
    </div>
  );
}
