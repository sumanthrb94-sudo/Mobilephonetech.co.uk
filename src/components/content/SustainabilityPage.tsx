import React from 'react';
import Breadcrumbs from '../ui/Breadcrumbs';
import { Leaf, Droplet, Factory, Recycle } from 'lucide-react';

const IMPACT = [
  { icon: Factory, value: '78,000 tonnes', label: 'CO₂ saved vs buying new' },
  { icon: Leaf,    value: '91,500 tonnes', label: 'Raw materials kept in circulation' },
  { icon: Droplet, value: '194 million L', label: 'Water conserved' },
  { icon: Recycle, value: '1.2M+',         label: 'Devices given a second life' },
];

const PRINCIPLES = [
  { title: 'Repair before recycle',       body: 'Our technicians diagnose at the component level. 94% of the devices we intake are repaired and re-sold rather than broken down.' },
  { title: 'Zero-waste packaging',        body: 'No plastic. Our shipping boxes are 100% recycled card, printed with soy inks, and dispatched with paper void fill.' },
  { title: 'Carbon-neutral delivery',     body: 'Every order ships via Royal Mail\'s carbon-neutral network. The last mile on any UK parcel we send offsets automatically.' },
  { title: 'Certified social enterprise', body: 'We donate 1% of revenue to Digital Access, a UK charity refurbishing devices for families in digital poverty.' },
];

export default function SustainabilityPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '960px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Sustainability' }]} />

        <header style={{ marginBottom: 'var(--spacing-48)' }}>
          <div className="overline mb-3" style={{ color: 'var(--color-trust-text)' }}>Our impact</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px' }}>
            Refurbished isn't just a price — it's a pledge.
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-60)', lineHeight: 1.65, maxWidth: '680px' }}>
            A new smartphone carries roughly 65kg of CO₂ before it's out of the box. Every device we refurbish pushes the next one further down the line — and keeps the rare metals inside already-manufactured hardware in circulation.
          </p>
        </header>

        {/* Impact hero numbers */}
        <section style={{ background: 'linear-gradient(180deg, var(--green-5) 0%, var(--grey-0) 100%)', border: '1px solid var(--green-20)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-32)', marginBottom: 'var(--spacing-48)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-trust-text)', marginBottom: '16px' }}>
            Together so far
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="sm:grid-cols-4">
            {IMPACT.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <Icon size={22} style={{ color: 'var(--color-trust-text)', marginBottom: '8px' }} />
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>
                    {m.value}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-60)', marginTop: '6px', lineHeight: 1.4 }}>
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Principles */}
        <section style={{ marginBottom: 'var(--spacing-48)' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--black)', margin: '0 0 24px 0' }}>
            What we commit to
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }} className="sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} style={{ padding: 'var(--spacing-24)', border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--black)', margin: '0 0 6px 0' }}>{p.title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.6, margin: 0 }}>
            Impact figures are aggregated since 2018 using per-device averages published by Fraunhofer IZM ("Environmental impact of a reused smartphone", 2022) and ADEME ("L'empreinte environnementale du numérique", 2021–2024).
          </p>
        </section>
      </div>
    </div>
  );
}
