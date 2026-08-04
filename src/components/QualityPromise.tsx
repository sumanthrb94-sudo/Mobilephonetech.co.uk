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
        background: '#0f172a',
        paddingTop: 'var(--spacing-48)',
        paddingBottom: 'var(--spacing-48)',
      }}
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>

        {/* ── Header ── */}
        <div style={{ maxWidth: '680px', marginBottom: 'var(--spacing-32)' }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#06b6d4',
            marginBottom: '8px',
          }}>
            The LeHart Standard
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(26px, 3vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#ffffff',
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
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Every LeHart device clears four engineering standards before it ships. This is what separates a certified refurb from a resell.
          </p>
        </div>

        {/* ── Stats grid ── */}
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: '12px' }}
        >
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.2, 0, 0, 1] }}
                style={{
                  padding: '24px 20px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Icon in colored square */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    background: s.accent,
                    border: `1px solid ${s.accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={16} strokeWidth={2.2} style={{ color: s.iconColor }} />
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    {s.label}
                  </span>
                </div>

                {/* Big number + unit */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', position: 'relative' }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '48px',
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    color: '#ffffff',
                    lineHeight: 1,
                  }}>
                    {s.number}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: s.iconColor,
                    lineHeight: 1,
                  }}>
                    {s.unit}
                  </span>
                </div>

                {/* Blurb */}
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.4)',
                  lineHeight: 1.6,
                  margin: 0,
                  position: 'relative',
                }}>
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
