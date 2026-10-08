import React from 'react';
import { Leaf, Droplet, Factory } from 'lucide-react';

/**
 * EcoImpact — per-product "buying refurbished saves..." panel. Numbers come
 * from widely-cited refurb industry figures (Back Market, Fraunhofer IZM).
 * The figures are the shop-wide per-device ones the home page uses (see
 * EcoImpactBlock): 70kg CO₂e, 80kg raw materials, 12,000L water. They used
 * to vary per product from a hash of the id, so the same claim appeared as
 * several different numbers across the site.
 */
// productId is kept so callers need not change if figures become per-model.
export default function EcoImpact(_props: { productId: string }) {
  const co2   = '70 kg';
  const raw   = '80 kg';
  const water = '12,000 L';

  return (
    <section
      aria-label="Environmental impact"
      style={{
        background: 'linear-gradient(180deg, var(--green-5) 0%, var(--grey-0) 100%)',
        border: '1px solid var(--green-20)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-24)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Leaf size={18} style={{ color: 'var(--color-trust-text)' }} />
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-trust-text)',
          }}
        >
          By choosing refurbished, you save
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <Metric icon={Factory} value={co2}   label="CO₂ emissions" />
        <Metric icon={Leaf}    value={raw}   label="Raw materials" />
        <Metric icon={Droplet} value={water} label="Water" />
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-60)', margin: '14px 0 0 0', lineHeight: 1.55 }}>
        Versus manufacturing a new device. Figures from industry averages (Fraunhofer IZM, ADEME).
      </p>
    </section>
  );
}

function Metric({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
      <Icon size={18} style={{ color: 'var(--color-trust-text)' }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '18px', color: 'var(--black)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-60)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}
