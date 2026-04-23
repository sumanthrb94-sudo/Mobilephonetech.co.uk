import React from 'react';

/**
 * PressLogosStrip — "As featured in …" row. Text-based wordmarks (no real
 * logos — replace with SVG marks + publication permission when available).
 */

const LOGOS = [
  { name: 'TechRadar',   font: "'Playfair Display', serif", weight: 700, letterSpacing: '-0.04em' },
  { name: 'WIRED',       font: "'DM Sans', sans-serif",     weight: 900, letterSpacing: '0.24em', uppercase: true },
  { name: 'TRUSTED REVIEWS', font: "'DM Sans', sans-serif", weight: 700, letterSpacing: '0.06em', uppercase: true },
  { name: 'Which?',      font: "'DM Sans', sans-serif",     weight: 900, letterSpacing: '-0.03em' },
  { name: 'Pocket-lint', font: "'DM Sans', sans-serif",     weight: 600, letterSpacing: '-0.02em' },
  { name: 'The Guardian', font: "'Playfair Display', serif", weight: 700, letterSpacing: '-0.02em' },
];

export default function PressLogosStrip() {
  return (
    <section
      style={{
        background: 'var(--grey-0)',
        borderTop: '1px solid var(--grey-10)',
        borderBottom: '1px solid var(--grey-10)',
        padding: 'var(--spacing-32) 0',
      }}
      aria-label="Press coverage"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-50)',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          Featured in
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px 32px',
            alignItems: 'center',
            justifyItems: 'center',
            opacity: 0.65,
          }}
          className="sm:grid-cols-6"
        >
          {LOGOS.map((l) => (
            <span
              key={l.name}
              style={{
                fontFamily: l.font,
                fontWeight: l.weight,
                letterSpacing: l.letterSpacing,
                fontSize: '15px',
                color: 'var(--grey-70)',
                textTransform: l.uppercase ? 'uppercase' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
