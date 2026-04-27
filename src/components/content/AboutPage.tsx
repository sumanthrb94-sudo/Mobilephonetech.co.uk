import Breadcrumbs from '../ui/Breadcrumbs';
import { ShieldCheck, Leaf, Users, BadgeCheck } from 'lucide-react';

const STATS = [
  { value: '1.2M+', label: 'Certified devices shipped' },
  { value: '90', label: 'Inspection points per device' },
  { value: '4.9', label: 'Trustpilot rating' },
  { value: '12m', label: 'Warranty on every order' },
];

const PILLARS = [
  { icon: ShieldCheck, title: 'Certified, not just refurbished', body: 'Every device passes a 90-point technical inspection and ships with a 12-month warranty. No third-party exceptions.' },
  { icon: Leaf,        title: 'Better for the planet',          body: 'We extend each device\'s life by 3-5 years, saving an average of 65kg CO₂ and 150L of water per handset.' },
  { icon: Users,       title: 'Real people, real support',      body: 'UK-based customer team, reachable in under 10 minutes on average. No bots, no decision trees.' },
  { icon: BadgeCheck,  title: 'Transparent grading',            body: 'Our grades tell you exactly what you\'re buying — no surprises when the box arrives.' },
];

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '880px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />

        <header style={{ marginBottom: 'var(--spacing-48)' }}>
          <div className="overline mb-3">Our story</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px' }}>
            Great phones. Honest prices. A smaller footprint.
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-60)', lineHeight: 1.65, maxWidth: '640px' }}>
            We're a UK-based marketplace for certified refurbished phones, tablets and consoles.
            Every device is inspected, tested and backed by a real warranty — at prices typically 40–70% below new.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: 'var(--spacing-48)' }} className="sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--grey-60)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: 'var(--spacing-64)' }} className="sm:grid-cols-2">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} style={{ padding: 'var(--spacing-24)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--black)', margin: '0 0 6px 0' }}>{p.title}</h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.6, margin: 0 }}>{p.body}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section style={{ borderTop: '1px solid var(--grey-10)', paddingTop: 'var(--spacing-32)' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--black)', margin: '0 0 16px 0' }}>
            How we got here
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.7, margin: '0 0 14px 0' }}>
            MobilePhoneMarket.co.uk started in 2018 with a simple premise: the best phone for most people is a slightly older one, inspected properly and sold at a fair price. Seven years later, we've shipped more than 1.2 million devices across the UK, built one of the largest in-house refurbishment labs in the country, and planted our flag as the most-trusted refurbisher on Trustpilot.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.7, margin: 0 }}>
            We're independent, we don't lock you into contracts, and every device ships with the same 12-month warranty — no matter the grade. That's the deal.
          </p>
        </section>
      </div>
    </div>
  );
}
