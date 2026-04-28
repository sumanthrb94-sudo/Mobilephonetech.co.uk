import { motion } from 'motion/react';
import { ScanLine, BatteryCharging, ShieldCheck, Truck } from 'lucide-react';

const STEPS = [
  {
    icon: ScanLine,
    number: '30',
    unit: 'point',
    label: 'Engineering Audit',
    blurb: 'Every device passes a 30-point physical and functional inspection — screen, chassis, buttons, sensors.',
    accent: '#f0fdf4',
    accentBorder: '#bbf7d0',
    iconColor: '#059669',
  },
  {
    icon: BatteryCharging,
    number: '85',
    unit: '%+',
    label: 'Battery Guarantee',
    blurb: 'We only ship devices with 85%+ battery health. Verified under load, not just self-reported.',
    accent: '#eff6ff',
    accentBorder: '#bfdbfe',
    iconColor: '#2563eb',
  },
  {
    icon: ShieldCheck,
    number: '12',
    unit: 'month',
    label: 'Warranty Included',
    blurb: 'Full 12-month warranty on every device. Biometrics, cameras, speakers — all covered, no asterisk.',
    accent: '#f5f3ff',
    accentBorder: '#ddd6fe',
    iconColor: '#7c3aed',
  },
  {
    icon: Truck,
    number: '30',
    unit: 'day',
    label: 'Free Returns',
    blurb: 'Changed your mind? Free returns within 30 days, no questions asked. We collect from your door.',
    accent: '#fff7ed',
    accentBorder: '#fed7aa',
    iconColor: '#d97706',
  },
] as const;

export default function QualityPromise() {
  return (
    <section
      aria-label="Our quality promise"
      style={{
        background: 'var(--grey-0)',
        borderBottom: '1px solid var(--grey-10)',
        paddingTop: 'var(--spacing-48)',
        paddingBottom: 'var(--spacing-48)',
      }}
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div style={{ maxWidth: '680px', marginBottom: 'var(--spacing-32)' }}>
          <div className="overline" style={{ marginBottom: '8px' }}>
            The MPM Standard
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(24px, 2.8vw, 34px)',
              fontWeight: 700,
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              color: 'var(--brand-header)',
              lineHeight: 1.15,
              margin: '0 0 10px',
            }}
          >
            Not just refurbished. Certified.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-60)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Every MobilePhoneMarket device clears four engineering standards before it ships. This is what separates a certified refurb from a resell.
          </p>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: '12px' }}
        >
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.35, ease: [0.2, 0, 0, 1] }}
                style={{
                  padding: '20px 16px',
                  background: s.accent,
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${s.accentBorder}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={16} strokeWidth={2.2} style={{ color: s.iconColor, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: s.iconColor,
                  }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--brand-header)', lineHeight: 1 }}>
                    {s.number}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--grey-50)' }}>
                    {s.unit}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-60)', lineHeight: 1.55, margin: 0 }}>
                  {s.blurb}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
